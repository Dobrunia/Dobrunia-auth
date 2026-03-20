import { getDatabasePool } from '../../db/database';
import type { RateLimit } from '../../types/rate-limit.types';

export class RateLimitRepository {
  /**
   * Get current rate limit count for a key within a window
   */
  async getCurrentCount(rateKey: string, windowStart: Date): Promise<number> {
    const pool = await getDatabasePool();
    const [rows] = await pool.query(
      'SELECT request_count FROM rate_limits WHERE rate_key = ? AND window_start = ?',
      [rateKey, windowStart]
    );
    const limits = rows as Pick<RateLimit, 'request_count'>[];
    return limits[0]?.request_count ?? 0;
  }

  /**
   * Increment rate limit counter or create new record
   * Returns the new count
   */
  async increment(rateKey: string, windowStart: Date): Promise<number> {
    const pool = await getDatabasePool();

    await pool.query(
      `INSERT INTO rate_limits (rate_key, window_start, request_count)
       VALUES (?, ?, 1)
       ON DUPLICATE KEY UPDATE request_count = request_count + 1`,
      [rateKey, windowStart]
    );

    return this.getCurrentCount(rateKey, windowStart);
  }

  /**
   * Get rate limit info for a key
   */
  async getRateLimitInfo(rateKey: string, windowStart: Date): Promise<{
    count: number;
    windowStart: Date;
  } | null> {
    const pool = await getDatabasePool();
    const [rows] = await pool.query(
      'SELECT request_count, window_start FROM rate_limits WHERE rate_key = ? AND window_start >= ?',
      [rateKey, windowStart]
    );
    const limits = rows as Pick<RateLimit, 'request_count' | 'window_start'>[];

    if (limits.length === 0) {
      return null;
    }

    return {
      count: limits[0].request_count,
      windowStart: limits[0].window_start,
    };
  }

  /**
   * Clean up old rate limit records
   */
  async cleanupOlderThan(minutes: number): Promise<number> {
    const pool = await getDatabasePool();
    const [result] = await pool.query(
      'DELETE FROM rate_limits WHERE window_start < DATE_SUB(NOW(), INTERVAL ? MINUTE)',
      [minutes]
    );
    return (result as { affectedRows: number }).affectedRows;
  }
}

export const rateLimitRepository = new RateLimitRepository();
