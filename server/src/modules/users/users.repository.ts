import { getDatabasePool } from '../../db/database';
import type { User, UserCreateInput, UserUpdateInput } from '../../types/user.types';

export class UsersRepository {
  async findById(id: number): Promise<User | null> {
    const pool = await getDatabasePool();
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
    const users = rows as User[];
    return users[0] || null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const pool = await getDatabasePool();
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    const users = rows as User[];
    return users[0] || null;
  }

  async create(input: UserCreateInput): Promise<User> {
    const pool = await getDatabasePool();
    const [result] = await pool.query(
      'INSERT INTO users (email, password_hash, name, avatar) VALUES (?, ?, ?, ?)',
      [input.email, input.password_hash, input.name ?? null, input.avatar ?? null]
    );
    
    const insertId = (result as { insertId: number }).insertId;
    return this.findById(insertId) as Promise<User>;
  }

  async update(id: number, input: UserUpdateInput): Promise<User | null> {
    const pool = await getDatabasePool();
    const fields: string[] = [];
    const values: unknown[] = [];

    if (input.name !== undefined) {
      fields.push('name = ?');
      values.push(input.name);
    }
    if (input.avatar !== undefined) {
      fields.push('avatar = ?');
      values.push(input.avatar);
    }
    if (input.status !== undefined) {
      fields.push('status = ?');
      values.push(input.status);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    await pool.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return this.findById(id);
  }

  async updateEmailVerified(email: string, verified: boolean): Promise<User | null> {
    const pool = await getDatabasePool();
    await pool.query(
      'UPDATE users SET email_verified = ? WHERE email = ?',
      [verified, email]
    );
    return this.findByEmail(email);
  }
}

export const usersRepository = new UsersRepository();
