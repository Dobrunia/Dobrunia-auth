import type { PoolConnection } from 'mysql2/promise';

export async function isSessionActiveForUser(
  connection: PoolConnection,
  sessionId: string,
  userId: string,
  activeStatus: string
): Promise<boolean> {
  const [rows] = await connection.query(
    'SELECT 1 AS ok FROM sessions WHERE id = ? AND user_id = ? AND status = ? LIMIT 1',
    [sessionId, userId, activeStatus]
  );
  const list = rows as { ok: number }[];
  return list.length > 0;
}

export async function isSessionActiveForUserAndClient(
  connection: PoolConnection,
  sessionId: string,
  userId: string,
  clientId: string,
  activeStatus: string
): Promise<boolean> {
  const [rows] = await connection.query(
    `SELECT 1 AS ok FROM sessions
     WHERE id = ? AND user_id = ? AND client_id = ? AND status = ?
     LIMIT 1`,
    [sessionId, userId, clientId, activeStatus]
  );
  const list = rows as { ok: number }[];
  return list.length > 0;
}

export async function revokeSessionById(
  connection: PoolConnection,
  sessionId: string,
  statusRevoked: string,
  reason: string,
  statusActive: string
): Promise<void> {
  await connection.execute(
    `UPDATE sessions SET
      status = ?,
      revoked_at = CURRENT_TIMESTAMP(3),
      revoke_reason = ?,
      updated_at = CURRENT_TIMESTAMP(3)
     WHERE id = ? AND status = ?`,
    [statusRevoked, reason, sessionId, statusActive]
  );
}

export async function insertSession(
  connection: PoolConnection,
  params: {
    id: string;
    userId: string;
    clientId: string;
    status: string;
    ipAddress: string | null;
    userAgent: string | null;
  }
): Promise<void> {
  await connection.execute(
    `INSERT INTO sessions (
      id, user_id, client_id, status,
      device_name, device_type, browser, os, ip_address, user_agent,
      country, city,
      last_seen_at, expires_at, revoked_at, revoke_reason,
      created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?,
      NULL, NULL, NULL, NULL, ?, ?,
      NULL, NULL,
      CURRENT_TIMESTAMP(3), NULL, NULL, NULL,
      CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
    )`,
    [
      params.id,
      params.userId,
      params.clientId,
      params.status,
      params.ipAddress,
      params.userAgent,
    ]
  );
}
