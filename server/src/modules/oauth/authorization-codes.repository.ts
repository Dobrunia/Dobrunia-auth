import { getDatabasePool } from '../../db/database';
import type { AuthorizationCode, AuthorizationCodeCreateInput } from '../../types/authorization-code.types';

export class AuthorizationCodesRepository {
  async findById(id: number): Promise<AuthorizationCode | null> {
    const pool = await getDatabasePool();
    const [rows] = await pool.query(
      'SELECT * FROM oauth_authorization_codes WHERE id = ?',
      [id]
    );
    const codes = rows as AuthorizationCode[];
    return codes[0] || null;
  }

  async findByCodeHash(code_hash: string): Promise<AuthorizationCode | null> {
    const pool = await getDatabasePool();
    const [rows] = await pool.query(
      'SELECT * FROM oauth_authorization_codes WHERE code_hash = ?',
      [code_hash]
    );
    const codes = rows as AuthorizationCode[];
    return codes[0] || null;
  }

  async findAllActive(): Promise<AuthorizationCode[]> {
    const pool = await getDatabasePool();
    const [rows] = await pool.query(
      'SELECT * FROM oauth_authorization_codes WHERE used_at IS NULL AND expires_at > NOW() ORDER BY created_at DESC'
    );
    return rows as AuthorizationCode[];
  }

  async create(input: AuthorizationCodeCreateInput): Promise<AuthorizationCode> {
    const pool = await getDatabasePool();
    const [result] = await pool.query(
      `INSERT INTO oauth_authorization_codes 
       (code_hash, user_id, client_id, redirect_uri, scope, code_challenge, code_challenge_method, expires_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.code_hash,
        input.user_id,
        input.client_id,
        input.redirect_uri,
        input.scope ?? null,
        input.code_challenge ?? null,
        input.code_challenge_method ?? null,
        input.expires_at,
      ]
    );

    const insertId = (result as { insertId: number }).insertId;
    return this.findById(insertId) as Promise<AuthorizationCode>;
  }

  async markAsUsed(id: number): Promise<void> {
    const pool = await getDatabasePool();
    await pool.query(
      'UPDATE oauth_authorization_codes SET used_at = CURRENT_TIMESTAMP WHERE id = ?',
      [id]
    );
  }

  async deleteExpired(): Promise<number> {
    const pool = await getDatabasePool();
    const [result] = await pool.query(
      'DELETE FROM oauth_authorization_codes WHERE expires_at < CURRENT_TIMESTAMP'
    );
    return (result as { affectedRows: number }).affectedRows;
  }
}

export const authorizationCodesRepository = new AuthorizationCodesRepository();
