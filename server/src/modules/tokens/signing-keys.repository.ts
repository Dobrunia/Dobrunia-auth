import { getDatabasePool } from '../../db/database';
import type { SigningKey, SigningKeyCreateInput, SigningKeyStatus } from '../../types/signing-key.types';

export class SigningKeysRepository {
  /**
   * Get active signing key
   */
  async getActiveKey(): Promise<SigningKey | null> {
    const pool = await getDatabasePool();
    const [rows] = await pool.query(
      'SELECT * FROM signing_keys WHERE status = ? ORDER BY created_at DESC LIMIT 1',
      ['active']
    );
    const keys = rows as SigningKey[];
    return keys[0] || null;
  }

  /**
   * Get all keys that can be used for validation (active + previous)
   */
  async getValidationKeys(): Promise<SigningKey[]> {
    const pool = await getDatabasePool();
    const [rows] = await pool.query(
      'SELECT * FROM signing_keys WHERE status IN (?, ?) ORDER BY created_at DESC',
      ['active', 'previous']
    );
    return rows as SigningKey[];
  }

  /**
   * Get key by ID
   */
  async getById(keyId: string): Promise<SigningKey | null> {
    const pool = await getDatabasePool();
    const [rows] = await pool.query(
      'SELECT * FROM signing_keys WHERE key_id = ?',
      [keyId]
    );
    const keys = rows as SigningKey[];
    return keys[0] || null;
  }

  /**
   * Create new signing key
   */
  async create(input: SigningKeyCreateInput): Promise<SigningKey> {
    const pool = await getDatabasePool();
    const [result] = await pool.query(
      'INSERT INTO signing_keys (key_id, key_secret, algorithm, expires_at) VALUES (?, ?, ?, ?)',
      [input.key_id, input.key_secret, input.algorithm || 'HS256', input.expires_at || null]
    );

    const insertId = (result as { insertId: number }).insertId;
    return this.getById(input.key_id) as Promise<SigningKey>;
  }

  /**
   * Update key status
   */
  async updateStatus(keyId: string, status: SigningKeyStatus): Promise<void> {
    const pool = await getDatabasePool();
    
    if (status === 'expired') {
      await pool.query(
        'UPDATE signing_keys SET status = ?, expired_at = CURRENT_TIMESTAMP WHERE key_id = ?',
        [status, keyId]
      );
    } else {
      await pool.query(
        'UPDATE signing_keys SET status = ? WHERE key_id = ?',
        [status, keyId]
      );
    }
  }

  /**
   * Mark all active keys as previous
   */
  async markAllActiveAsPrevious(): Promise<void> {
    const pool = await getDatabasePool();
    await pool.query(
      "UPDATE signing_keys SET status = 'previous' WHERE status = 'active'"
    );
  }

  /**
   * Expire old previous keys
   */
  async expireOldKeys(daysOld: number): Promise<number> {
    const pool = await getDatabasePool();
    const [result] = await pool.query(
      `UPDATE signing_keys 
       SET status = 'expired', expired_at = CURRENT_TIMESTAMP 
       WHERE status = 'previous' AND created_at < DATE_SUB(NOW(), INTERVAL ? DAY)`,
      [daysOld]
    );
    return (result as { affectedRows: number }).affectedRows;
  }

  /**
   * Delete expired keys
   */
  async deleteExpiredKeys(): Promise<number> {
    const pool = await getDatabasePool();
    const [result] = await pool.query(
      'DELETE FROM signing_keys WHERE status = ?',
      ['expired']
    );
    return (result as { affectedRows: number }).affectedRows;
  }
}

export const signingKeysRepository = new SigningKeysRepository();
