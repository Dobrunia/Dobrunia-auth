import type { PoolConnection } from 'mysql2/promise';

export interface OAuthCodeExchangeRow {
  id: string;
  client_id: string;
  user_id: string;
  session_id: string;
  redirect_uri: string;
  client_slug: string;
}

export async function insertOAuthAuthorizationCode(
  connection: PoolConnection,
  params: {
    id: string;
    codeHash: string;
    clientId: string;
    userId: string;
    sessionId: string;
    redirectUri: string;
    expiresAt: Date;
  }
): Promise<void> {
  await connection.execute(
    `INSERT INTO oauth_authorization_codes (
      id, code_hash, client_id, user_id, session_id, redirect_uri, expires_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP(3))`,
    [
      params.id,
      params.codeHash,
      params.clientId,
      params.userId,
      params.sessionId,
      params.redirectUri,
      params.expiresAt,
    ]
  );
}

/**
 * Блокирует строку для однократного обмена (FOR UPDATE внутри транзакции).
 */
export async function lockValidOAuthCodeByHash(
  connection: PoolConnection,
  codeHash: string
): Promise<OAuthCodeExchangeRow | null> {
  const [rows] = await connection.query(
    `SELECT oc.id, oc.client_id, oc.user_id, oc.session_id, oc.redirect_uri, c.slug AS client_slug
     FROM oauth_authorization_codes oc
     INNER JOIN clients c ON c.id = oc.client_id
     WHERE oc.code_hash = ?
       AND oc.used_at IS NULL
       AND oc.expires_at > CURRENT_TIMESTAMP(3)
     LIMIT 1
     FOR UPDATE`,
    [codeHash]
  );
  const list = rows as OAuthCodeExchangeRow[];
  return list[0] ?? null;
}

export async function markOAuthCodeUsed(connection: PoolConnection, id: string): Promise<void> {
  await connection.execute(
    `UPDATE oauth_authorization_codes
     SET used_at = CURRENT_TIMESTAMP(3)
     WHERE id = ? AND used_at IS NULL`,
    [id]
  );
}
