import { getDatabasePool } from '../../db/database';

export interface PasswordResetToken {
  id: number;
  user_id: number;
  token_hash: string;
  expires_at: Date;
  used_at: Date | null;
  created_at: Date;
}

export interface PasswordResetTokenCreateInput {
  user_id: number;
  token_hash: string;
  expires_at: Date;
}

export class PasswordResetTokensRepository {
  async findById(id: number): Promise<PasswordResetToken | null> {
    const pool = await getDatabasePool();
    const [rows] = await pool.query(
      'SELECT * FROM password_reset_tokens WHERE id = ?',
      [id]
    );
    const tokens = rows as PasswordResetToken[];
    return tokens[0] || null;
  }

  async findByHash(token_hash: string): Promise<PasswordResetToken | null> {
    const pool = await getDatabasePool();
    const [rows] = await pool.query(
      'SELECT * FROM password_reset_tokens WHERE token_hash = ?',
      [token_hash]
    );
    const tokens = rows as PasswordResetToken[];
    return tokens[0] || null;
  }

  async findAllActive(): Promise<PasswordResetToken[]> {
    const pool = await getDatabasePool();
    const [rows] = await pool.query(
      'SELECT * FROM password_reset_tokens WHERE used_at IS NULL AND expires_at > NOW() ORDER BY created_at DESC'
    );
    return rows as PasswordResetToken[];
  }

  async create(input: PasswordResetTokenCreateInput): Promise<PasswordResetToken> {
    const pool = await getDatabasePool();
    const [result] = await pool.query(
      'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
      [input.user_id, input.token_hash, input.expires_at]
    );

    const insertId = (result as { insertId: number }).insertId;
    return this.findById(insertId) as Promise<PasswordResetToken>;
  }

  async markAsUsed(id: number): Promise<void> {
    const pool = await getDatabasePool();
    await pool.query(
      'UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE id = ?',
      [id]
    );
  }

  async deleteExpired(): Promise<number> {
    const pool = await getDatabasePool();
    const [result] = await pool.query(
      'DELETE FROM password_reset_tokens WHERE expires_at < CURRENT_TIMESTAMP'
    );
    return (result as { affectedRows: number }).affectedRows;
  }

  async deleteForUser(userId: number): Promise<void> {
    const pool = await getDatabasePool();
    await pool.query(
      'DELETE FROM password_reset_tokens WHERE user_id = ?',
      [userId]
    );
  }
}

export const passwordResetTokensRepository = new PasswordResetTokensRepository();
