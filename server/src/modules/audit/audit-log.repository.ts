import { getDatabasePool } from '../../db/database';
import type { AuditLog, AuditLogCreateInput } from '../../types/audit-log.types';

export class AuditLogRepository {
  async create(input: AuditLogCreateInput): Promise<void> {
    const pool = await getDatabasePool();
    
    await pool.query(
      `INSERT INTO audit_logs 
       (event_type, event_category, user_id, client_id, ip_address, user_agent, status, details) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.event_type,
        input.event_category,
        input.user_id ?? null,
        input.client_id ?? null,
        input.ip_address ?? null,
        input.user_agent ?? null,
        input.status,
        input.details ? JSON.stringify(input.details) : null,
      ]
    );
  }

  async findById(id: number): Promise<AuditLog | null> {
    const pool = await getDatabasePool();
    const [rows] = await pool.query(
      'SELECT * FROM audit_logs WHERE id = ?',
      [id]
    );
    const logs = rows as AuditLog[];
    return logs[0] || null;
  }

  async findByUserId(userId: number, limit: number = 100): Promise<AuditLog[]> {
    const pool = await getDatabasePool();
    const [rows] = await pool.query(
      'SELECT * FROM audit_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
      [userId, limit]
    );
    return rows as AuditLog[];
  }

  async findByEventType(eventType: string, limit: number = 100): Promise<AuditLog[]> {
    const pool = await getDatabasePool();
    const [rows] = await pool.query(
      'SELECT * FROM audit_logs WHERE event_type = ? ORDER BY created_at DESC LIMIT ?',
      [eventType, limit]
    );
    return rows as AuditLog[];
  }

  async findRecent(limit: number = 100): Promise<AuditLog[]> {
    const pool = await getDatabasePool();
    const [rows] = await pool.query(
      'SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ?',
      [limit]
    );
    return rows as AuditLog[];
  }

  async deleteOlderThan(days: number): Promise<number> {
    const pool = await getDatabasePool();
    const [result] = await pool.query(
      'DELETE FROM audit_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)',
      [days]
    );
    return (result as { affectedRows: number }).affectedRows;
  }
}

export const auditLogRepository = new AuditLogRepository();
