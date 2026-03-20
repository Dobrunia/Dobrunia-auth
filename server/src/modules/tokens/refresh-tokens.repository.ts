import { getDatabasePool } from '../../db/database';
import type { RefreshToken, RefreshTokenCreateInput } from '../../types/refresh-token.types';

export class RefreshTokensRepository {
  async findById(id: number): Promise<RefreshToken | null> {
    const pool = await getDatabasePool();
    const [rows] = await pool.query('SELECT * FROM refresh_tokens WHERE id = ?', [id]);
    const tokens = rows as RefreshToken[];
    return tokens[0] || null;
  }

  async findByHash(token_hash: string): Promise<RefreshToken | null> {
    const pool = await getDatabasePool();
    const [rows] = await pool.query(
      'SELECT * FROM refresh_tokens WHERE token_hash = ?',
      [token_hash]
    );
    const tokens = rows as RefreshToken[];
    return tokens[0] || null;
  }

  async create(input: RefreshTokenCreateInput): Promise<RefreshToken> {
    const pool = await getDatabasePool();
    const [result] = await pool.query(
      'INSERT INTO refresh_tokens (user_id, session_id, token_hash, expires_at) VALUES (?, ?, ?, ?)',
      [input.user_id, input.session_id, input.token_hash, input.expires_at]
    );
    
    const insertId = (result as { insertId: number }).insertId;
    return this.findById(insertId) as Promise<RefreshToken>;
  }

  async revoke(id: number): Promise<void> {
    const pool = await getDatabasePool();
    await pool.query(
      'UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP WHERE id = ?',
      [id]
    );
  }

  async revokeAllForSession(sessionId: number): Promise<void> {
    const pool = await getDatabasePool();
    await pool.query(
      'UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP WHERE session_id = ?',
      [sessionId]
    );
  }

  async revokeAllForUser(userId: number): Promise<void> {
    const pool = await getDatabasePool();
    await pool.query(
      'UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP WHERE user_id = ?',
      [userId]
    );
  }

  async deleteExpired(): Promise<number> {
    const pool = await getDatabasePool();
    const [result] = await pool.query(
      'DELETE FROM refresh_tokens WHERE expires_at < CURRENT_TIMESTAMP'
    );
    return (result as { affectedRows: number }).affectedRows;
  }
}

export const refreshTokensRepository = new RefreshTokensRepository();
