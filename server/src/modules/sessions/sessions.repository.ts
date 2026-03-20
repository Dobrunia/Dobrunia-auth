import { getDatabasePool } from '../../db/database';
import type { Session, SessionCreateInput } from '../../types/session.types';

export class SessionsRepository {
  async findById(id: number): Promise<Session | null> {
    const pool = await getDatabasePool();
    const [rows] = await pool.query('SELECT * FROM sessions WHERE id = ?', [id]);
    const sessions = rows as Session[];
    return sessions[0] || null;
  }

  async findByUserId(userId: number): Promise<Session[]> {
    const pool = await getDatabasePool();
    const [rows] = await pool.query(
      'SELECT * FROM sessions WHERE user_id = ? AND revoked_at IS NULL ORDER BY last_seen_at DESC',
      [userId]
    );
    return rows as Session[];
  }

  async create(input: SessionCreateInput): Promise<Session> {
    const pool = await getDatabasePool();
    const [result] = await pool.query(
      'INSERT INTO sessions (user_id, user_agent, ip_address) VALUES (?, ?, ?)',
      [input.user_id, input.user_agent ?? null, input.ip_address ?? null]
    );
    
    const insertId = (result as { insertId: number }).insertId;
    return this.findById(insertId) as Promise<Session>;
  }

  async updateLastSeen(id: number): Promise<void> {
    const pool = await getDatabasePool();
    await pool.query(
      'UPDATE sessions SET last_seen_at = CURRENT_TIMESTAMP WHERE id = ?',
      [id]
    );
  }

  async revoke(id: number): Promise<void> {
    const pool = await getDatabasePool();
    await pool.query(
      'UPDATE sessions SET revoked_at = CURRENT_TIMESTAMP WHERE id = ?',
      [id]
    );
  }

  async revokeAllForUser(userId: number): Promise<void> {
    const pool = await getDatabasePool();
    await pool.query(
      'UPDATE sessions SET revoked_at = CURRENT_TIMESTAMP WHERE user_id = ?',
      [userId]
    );
  }
}

export const sessionsRepository = new SessionsRepository();
