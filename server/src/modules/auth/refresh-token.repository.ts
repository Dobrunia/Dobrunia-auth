import type { PoolConnection } from 'mysql2/promise';
import type { ActiveRefreshTokenLookupRow } from '../../types/refresh-token.types';

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
  }
): Promise<void> {
  await connection.execute(
    `INSERT INTO refresh_tokens (
      id, session_id, user_id, token_hash, family_id, previous_token_id,
      issued_at, expires_at, revoked_at, revoke_reason, replaced_by_token_id,
      created_at
    ) VALUES (
      ?, ?, ?, ?, ?, NULL,
      ?, ?, NULL, NULL, NULL,
      CURRENT_TIMESTAMP(3)
    )`,
    [
      params.id,
      params.sessionId,
      params.userId,
      params.tokenHash,
      params.familyId,
      params.issuedAt,
      params.expiresAt,
    ]
  );
}
