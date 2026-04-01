import type { PoolConnection } from 'mysql2/promise';
import type { UserPasswordAuthRow } from '../../types/user.types';

export async function findUserIdByEmail(
  connection: PoolConnection,
  email: string
): Promise<string | null> {
  const [rows] = await connection.query('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
  const list = rows as { id: string }[];
  return list[0]?.id ?? null;
}

export async function findUserEmailById(
  connection: PoolConnection,
  userId: string
): Promise<string | null> {
  const [rows] = await connection.query(
    'SELECT email FROM users WHERE id = ? LIMIT 1',
    [userId]
  );
  const list = rows as { email: string }[];
  return list[0]?.email ?? null;
}

export async function findUserForPasswordAuth(
  connection: PoolConnection,
  email: string
): Promise<UserPasswordAuthRow | null> {
  const [rows] = await connection.query(
    'SELECT id, email, password_hash, is_active FROM users WHERE email = ? LIMIT 1',
    [email]
  );
  const list = rows as {
    id: string;
    email: string;
    password_hash: string | null;
    is_active: number | boolean;
  }[];
  const row = list[0];
  if (!row) {
    return null;
  }
  const active = row.is_active === true || row.is_active === 1;
  return {
    id: row.id,
    email: row.email,
    password_hash: row.password_hash,
    is_active: active,
  };
}

export async function updateUserLastLogin(connection: PoolConnection, userId: string): Promise<void> {
  await connection.execute(
    'UPDATE users SET last_login_at = CURRENT_TIMESTAMP(3), updated_at = CURRENT_TIMESTAMP(3) WHERE id = ?',
    [userId]
  );
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

export async function findUserIdByUsernameExcluding(
  connection: PoolConnection,
  username: string,
  excludeUserId: string
): Promise<string | null> {
  const [rows] = await connection.query(
    'SELECT id FROM users WHERE username = ? AND id != ? LIMIT 1',
    [username, excludeUserId]
  );
  const list = rows as { id: string }[];
  return list[0]?.id ?? null;
}

export async function updateUserProfile(
  connection: PoolConnection,
  userId: string,
  params: {
    username: string | null;
    firstName: string | null;
    lastName: string | null;
    avatarUrl: string | null;
  }
): Promise<void> {
  await connection.execute(
    `UPDATE users SET
      username = ?,
      first_name = ?,
      last_name = ?,
      avatar_url = ?,
      updated_at = CURRENT_TIMESTAMP(3)
     WHERE id = ?`,
    [params.username, params.firstName, params.lastName, params.avatarUrl, userId]
  );
}

export async function deleteUserById(connection: PoolConnection, userId: string): Promise<void> {
  await connection.execute('DELETE FROM users WHERE id = ?', [userId]);
}
