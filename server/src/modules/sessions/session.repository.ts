import type { PoolConnection } from 'mysql2/promise';
import type { SessionListRow } from '../../types/session-list.types';

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

/**
 * Все сессии пользователя с данными клиента (дашборд).
 * Сортировка: свежие last_seen, затем по дате создания.
 */
export async function listSessionsForUser(
  connection: PoolConnection,
  userId: string
): Promise<SessionListRow[]> {
  const [rows] = await connection.query(
    `SELECT
       s.id,
       s.user_id,
       s.client_id,
       s.status,
       s.ip_address,
       s.user_agent,
       s.last_seen_at,
       s.created_at,
       s.revoked_at,
       s.revoke_reason,
       c.slug AS client_slug,
       c.name AS client_name
     FROM sessions s
     INNER JOIN clients c ON c.id = s.client_id
     WHERE s.user_id = ?
     ORDER BY (s.last_seen_at IS NULL), s.last_seen_at DESC, s.created_at DESC`,
    [userId]
  );
  return rows as SessionListRow[];
}

export async function listSessionsForUserAndClient(
  connection: PoolConnection,
  userId: string,
  clientId: string
): Promise<SessionListRow[]> {
  const [rows] = await connection.query(
    `SELECT
       s.id,
       s.user_id,
       s.client_id,
       s.status,
       s.ip_address,
       s.user_agent,
       s.last_seen_at,
       s.created_at,
       s.revoked_at,
       s.revoke_reason,
       c.slug AS client_slug,
       c.name AS client_name
     FROM sessions s
     INNER JOIN clients c ON c.id = s.client_id
     WHERE s.user_id = ? AND s.client_id = ?
     ORDER BY (s.last_seen_at IS NULL), s.last_seen_at DESC, s.created_at DESC`,
    [userId, clientId]
  );
  return rows as SessionListRow[];
}

/** Сессия принадлежит пользователю (любой статус). */
export async function findSessionByIdForUser(
  connection: PoolConnection,
  sessionId: string,
  userId: string
): Promise<{ id: string } | null> {
  const [rows] = await connection.query(
    'SELECT id FROM sessions WHERE id = ? AND user_id = ? LIMIT 1',
    [sessionId, userId]
  );
  const list = rows as { id: string }[];
  return list[0] ?? null;
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
