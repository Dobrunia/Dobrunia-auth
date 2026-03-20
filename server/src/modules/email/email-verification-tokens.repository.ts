import { getDatabasePool } from '../../db/database';

export interface EmailVerificationToken {
  id: number;
  user_id: number;
  token_hash: string;
  expires_at: Date;
  used_at: Date | null;
  created_at: Date;
}

export interface EmailVerificationTokenCreateInput {
  user_id: number;
  token_hash: string;
  expires_at: Date;
}

export class EmailVerificationTokensRepository {
  async findById(id: number): Promise<EmailVerificationToken | null> {
    const pool = await getDatabasePool();
    const [rows] = await pool.query(
      'SELECT * FROM email_verification_tokens WHERE id = ?',
      [id]
    );
    const tokens = rows as EmailVerificationToken[];
    return tokens[0] || null;
  }

  async findByHash(token_hash: string): Promise<EmailVerificationToken | null> {
    const pool = await getDatabasePool();
    const [rows] = await pool.query(
      'SELECT * FROM email_verification_tokens WHERE token_hash = ?',
      [token_hash]
    );
    const tokens = rows as EmailVerificationToken[];
    return tokens[0] || null;
  }

  async findAllActive(): Promise<EmailVerificationToken[]> {
    const pool = await getDatabasePool();
    const [rows] = await pool.query(
      'SELECT * FROM email_verification_tokens WHERE used_at IS NULL AND expires_at > NOW() ORDER BY created_at DESC'
    );
    return rows as EmailVerificationToken[];
  }

  async create(input: EmailVerificationTokenCreateInput): Promise<EmailVerificationToken> {
    const pool = await getDatabasePool();
    const [result] = await pool.query(
      'INSERT INTO email_verification_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
      [input.user_id, input.token_hash, input.expires_at]
    );

    const insertId = (result as { insertId: number }).insertId;
    return this.findById(insertId) as Promise<EmailVerificationToken>;
  }

  async markAsUsed(id: number): Promise<void> {
    const pool = await getDatabasePool();
    await pool.query(
      'UPDATE email_verification_tokens SET used_at = CURRENT_TIMESTAMP WHERE id = ?',
      [id]
    );
  }

  async deleteExpired(): Promise<number> {
    const pool = await getDatabasePool();
    const [result] = await pool.query(
      'DELETE FROM email_verification_tokens WHERE expires_at < CURRENT_TIMESTAMP'
    );
    return (result as { affectedRows: number }).affectedRows;
  }

  async deleteForUser(userId: number): Promise<void> {
    const pool = await getDatabasePool();
    await pool.query(
      'DELETE FROM email_verification_tokens WHERE user_id = ?',
      [userId]
    );
  }
}

export const emailVerificationTokensRepository = new EmailVerificationTokensRepository();
