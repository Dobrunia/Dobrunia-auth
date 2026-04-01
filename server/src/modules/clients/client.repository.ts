import type { PoolConnection } from 'mysql2/promise';
import type { ClientRow } from '../../types/client.types';

/**
 * Resolve by UUID or slug (same string can match either column).
 */
export async function findActiveClientByKey(
  connection: PoolConnection,
  key: string
): Promise<ClientRow | null> {
  const [rows] = await connection.query(
    `SELECT id, slug, name FROM clients
     WHERE is_active = 1 AND (id = ? OR slug = ?)
     LIMIT 1`,
    [key, key]
  );
  const list = rows as ClientRow[];
  return list[0] ?? null;
}
