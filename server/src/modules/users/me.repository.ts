import type { PoolConnection } from 'mysql2/promise';

export interface MeQueryRow {
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  session_id: string;
  client_id: string;
  client_slug: string;
  client_name: string;
}

export async function findMeContext(
  connection: PoolConnection,
  userId: string,
  sessionId: string,
  activeStatus: string
): Promise<MeQueryRow | null> {
  const [rows] = await connection.query(
    `SELECT
       u.id AS user_id,
       u.email,
       u.first_name,
       u.last_name,
       u.avatar_url,
       s.id AS session_id,
       s.client_id,
       c.slug AS client_slug,
       c.name AS client_name
     FROM sessions s
     INNER JOIN users u ON u.id = s.user_id AND u.id = ?
     INNER JOIN clients c ON c.id = s.client_id
     WHERE s.id = ? AND s.status = ?
     LIMIT 1`,
    [userId, sessionId, activeStatus]
  );
  const list = rows as MeQueryRow[];
  return list[0] ?? null;
}
