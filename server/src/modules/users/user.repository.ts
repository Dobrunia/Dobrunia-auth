import type { PoolConnection } from 'mysql2/promise';

export async function findUserIdByEmail(
  connection: PoolConnection,
  email: string
): Promise<string | null> {
  const [rows] = await connection.query('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
  const list = rows as { id: string }[];
  return list[0]?.id ?? null;
}

export async function insertUser(
  connection: PoolConnection,
  params: { id: string; email: string; passwordHash: string }
): Promise<void> {
  await connection.execute(
    `INSERT INTO users (
      id, email, password_hash, email_verified, is_active, created_at, updated_at
    ) VALUES (?, ?, ?, 0, 1, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3))`,
    [params.id, params.email, params.passwordHash]
  );
}
