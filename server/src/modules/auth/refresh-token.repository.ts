import type { PoolConnection } from 'mysql2/promise';
import type {
  ActiveRefreshTokenLookupRow,
  ActiveRefreshTokenRotationRow,
} from '../../types/refresh-token.types';

export async function findActiveRefreshTokenByHash(
  connection: PoolConnection,
  tokenHash: string
): Promise<ActiveRefreshTokenLookupRow | null> {
  const [rows] = await connection.query(
    `SELECT id, session_id FROM refresh_tokens
     WHERE token_hash = ? AND revoked_at IS NULL AND expires_at > CURRENT_TIMESTAMP(3)
     LIMIT 1`,
    [tokenHash]
  );
  const list = rows as ActiveRefreshTokenLookupRow[];
  return list[0] ?? null;
}

export async function findActiveRefreshTokenForRotation(
  connection: PoolConnection,
  tokenHash: string
): Promise<ActiveRefreshTokenRotationRow | null> {
  const [rows] = await connection.query(
    `SELECT rt.id, rt.session_id, rt.user_id, rt.family_id, u.email
     FROM refresh_tokens rt
     INNER JOIN users u ON u.id = rt.user_id
     WHERE rt.token_hash = ? AND rt.revoked_at IS NULL AND rt.expires_at > CURRENT_TIMESTAMP(3)
     LIMIT 1`,
    [tokenHash]
  );
  const list = rows as ActiveRefreshTokenRotationRow[];
  return list[0] ?? null;
}

export async function revokeRefreshTokenReplacedBy(
  connection: PoolConnection,
  oldTokenId: string,
  newTokenId: string,
  reason: string
): Promise<void> {
  await connection.execute(
    `UPDATE refresh_tokens
     SET revoked_at = CURRENT_TIMESTAMP(3), revoke_reason = ?, replaced_by_token_id = ?
     WHERE id = ? AND revoked_at IS NULL`,
    [reason, newTokenId, oldTokenId]
  );
}

export async function revokeRefreshTokenById(
  connection: PoolConnection,
  id: string,
  reason: string
): Promise<void> {
  await connection.execute(
    `UPDATE refresh_tokens
     SET revoked_at = CURRENT_TIMESTAMP(3), revoke_reason = ?
     WHERE id = ? AND revoked_at IS NULL`,
    [reason, id]
  );
}

/** Отзыв всех ещё активных refresh для сессии (дашборд / принудительный logout сессии). */
export async function revokeAllActiveRefreshTokensForSession(
  connection: PoolConnection,
  sessionId: string,
  reason: string
): Promise<void> {
  await connection.execute(
    `UPDATE refresh_tokens
     SET revoked_at = CURRENT_TIMESTAMP(3), revoke_reason = ?
     WHERE session_id = ? AND revoked_at IS NULL`,
    [reason, sessionId]
  );
}

export async function insertRefreshToken(
  connection: PoolConnection,
  params: {
    id: string;
    sessionId: string;
    userId: string;
    tokenHash: string;
    familyId: string;
    issuedAt: Date;
    expiresAt: Date;
    previousTokenId?: string | null;
  }
): Promise<void> {
  await connection.execute(
    `INSERT INTO refresh_tokens (
      id, session_id, user_id, token_hash, family_id, previous_token_id,
      issued_at, expires_at, revoked_at, revoke_reason, replaced_by_token_id,
      created_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?,
      ?, ?, NULL, NULL, NULL,
      CURRENT_TIMESTAMP(3)
    )`,
    [
      params.id,
      params.sessionId,
      params.userId,
      params.tokenHash,
      params.familyId,
      params.previousTokenId ?? null,
      params.issuedAt,
      params.expiresAt,
    ]
  );
}
