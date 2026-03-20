import { getDatabasePool } from '../../db/database';
import type { Session, SessionCreateInput, SessionGroupedByClient } from '../../types/session.types';

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

  async findAllByUserId(userId: number): Promise<Session[]> {
    const pool = await getDatabasePool();
    const [rows] = await pool.query(
      'SELECT * FROM sessions WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
    return rows as Session[];
  }

  /**
   * Find sessions grouped by client for a user
   */
  async findByUserIdGroupedByClient(userId: number): Promise<SessionGroupedByClient[]> {
    const sessions = await this.findAllByUserId(userId);
    
    const grouped = sessions.reduce((acc, session) => {
      const key = session.client_id?.toString() || 'direct';
      if (!acc.has(key)) {
        acc.set(key, {
          client_id: session.client_id || 'direct',
          service_name: session.service_name || 'Direct Login',
          sessions: [],
          session_count: 0,
        });
      }
      const group = acc.get(key)!;
      group.sessions.push(session);
      group.session_count++;
      if (!group.last_active || session.last_seen_at > group.last_active) {
        group.last_active = session.last_seen_at;
      }
      return acc;
    }, new Map<string, SessionGroupedByClient>());

    return Array.from(grouped.values());
  }

  async create(input: SessionCreateInput): Promise<Session> {
    const pool = await getDatabasePool();
    const [result] = await pool.query(
      'INSERT INTO sessions (user_id, client_id, service_name, user_agent, ip_address) VALUES (?, ?, ?, ?, ?)',
      [
        input.user_id,
        input.client_id ?? null,
        input.service_name ?? null,
        input.user_agent ?? null,
        input.ip_address ?? null,
      ]
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

  /**
   * Revoke all sessions for a specific client
   */
  async revokeAllForClient(userId: number, clientId: number): Promise<void> {
    const pool = await getDatabasePool();
    await pool.query(
      'UPDATE sessions SET revoked_at = CURRENT_TIMESTAMP WHERE user_id = ? AND client_id = ?',
      [userId, clientId]
    );
  }
}

export const sessionsRepository = new SessionsRepository();
