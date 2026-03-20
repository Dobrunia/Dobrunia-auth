import { describe, it, expect, beforeAll } from 'vitest';
import { getDatabasePool, closeDatabasePool } from '../../db/database';

describe('Database Schema', () => {
  let pool: ReturnType<typeof getDatabasePool>;

  beforeAll(async () => {
    pool = await getDatabasePool();
  });

  it('should create users table with required fields', async () => {
    const [rows] = await pool.query(`
      SHOW COLUMNS FROM users
    `);
    const columns = (rows as { Field: string }[]).map((r) => r.Field);

    expect(columns).toContain('id');
    expect(columns).toContain('email');
    expect(columns).toContain('email_verified');
    expect(columns).toContain('password_hash');
    expect(columns).toContain('name');
    expect(columns).toContain('avatar');
    expect(columns).toContain('status');
    expect(columns).toContain('created_at');
    expect(columns).toContain('updated_at');
  });

  it('should create sessions table with required relations', async () => {
    const [rows] = await pool.query(`
      SHOW COLUMNS FROM sessions
    `);
    const columns = (rows as { Field: string }[]).map((r) => r.Field);

    expect(columns).toContain('id');
    expect(columns).toContain('user_id');
    expect(columns).toContain('user_agent');
    expect(columns).toContain('ip_address');
    expect(columns).toContain('created_at');
    expect(columns).toContain('last_seen_at');
    expect(columns).toContain('revoked_at');
  });

  it('should create refresh_tokens table with required relations', async () => {
    const [rows] = await pool.query(`
      SHOW COLUMNS FROM refresh_tokens
    `);
    const columns = (rows as { Field: string }[]).map((r) => r.Field);

    expect(columns).toContain('id');
    expect(columns).toContain('user_id');
    expect(columns).toContain('session_id');
    expect(columns).toContain('token_hash');
    expect(columns).toContain('expires_at');
    expect(columns).toContain('revoked_at');
    expect(columns).toContain('created_at');
  });

  it('should create oauth_clients table with required fields', async () => {
    const [rows] = await pool.query(`
      SHOW COLUMNS FROM oauth_clients
    `);
    const columns = (rows as { Field: string }[]).map((r) => r.Field);

    expect(columns).toContain('id');
    expect(columns).toContain('client_id');
    expect(columns).toContain('client_secret_hash');
    expect(columns).toContain('name');
    expect(columns).toContain('redirect_uris');
    expect(columns).toContain('allowed_scopes');
    expect(columns).toContain('grant_types');
    expect(columns).toContain('is_active');
    expect(columns).toContain('created_at');
  });
});
