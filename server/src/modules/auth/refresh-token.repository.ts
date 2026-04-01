import type { PoolConnection } from 'mysql2/promise';

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
