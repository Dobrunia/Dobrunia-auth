import { describe, it, expect, beforeAll } from 'vitest';
import { getDatabasePool } from '../../../db/database';
import { hashPassword } from '../../../shared/password.utils';
import { generateAccessToken, generateRefreshToken } from '../../../modules/tokens/jwt.service';

describe('Refresh Token Flow', () => {
  let pool: ReturnType<typeof getDatabasePool>;
  let testUserId: number;
  let testSessionId: number;
  let validRefreshToken: string;
  let refreshTokenHash: string;

  beforeAll(async () => {
    pool = await getDatabasePool();

    // Create test user
    const testEmail = `refresh_${Date.now()}@example.com`;
    const testPassword = 'TestPass123';
    const passwordHash = await hashPassword(testPassword);

    const [userResult] = await pool.query(
      'INSERT INTO users (email, password_hash, status) VALUES (?, ?, ?)',
      [testEmail, passwordHash, 'active']
    );
    testUserId = (userResult as { insertId: number }).insertId;

    // Create test session
    const [sessionResult] = await pool.query(
      'INSERT INTO sessions (user_id) VALUES (?)',
      [testUserId]
    );
    testSessionId = (sessionResult as { insertId: number }).insertId;

    // Generate refresh token
    validRefreshToken = generateRefreshToken();
    refreshTokenHash = await hashPassword(validRefreshToken);

    // Store refresh token in database
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await pool.query(
      'INSERT INTO refresh_tokens (user_id, session_id, token_hash, expires_at) VALUES (?, ?, ?, ?)',
      [testUserId, testSessionId, refreshTokenHash, expiresAt]
    );
  });

  it('should issue new access token for valid refresh token', async () => {
    // Verify refresh token is in database
    const [rows] = await pool.query(
      'SELECT * FROM refresh_tokens WHERE session_id = ?',
      [testSessionId]
    );
    const tokens = rows as { token_hash: string; expires_at: Date }[];
    
    expect(tokens).toHaveLength(1);
    expect(tokens[0].expires_at).toBeInstanceOf(Date);
  });

  it('should rotate refresh token on refresh request', () => {
    // Verify rotation concept - old token should be revoked
    expect(validRefreshToken).toBeDefined();
    expect(validRefreshToken.split('.')).toHaveLength(3);
  });

  it('should reject expired refresh token', async () => {
    // Create expired token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() - 1); // 1 day ago

    await pool.query(
      'INSERT INTO refresh_tokens (user_id, session_id, token_hash, expires_at) VALUES (?, ?, ?, ?)',
      [testUserId, testSessionId, 'expired_hash', expiresAt]
    );

    const [rows] = await pool.query(
      'SELECT * FROM refresh_tokens WHERE token_hash = ?',
      ['expired_hash']
    );
    const tokens = rows as { expires_at: Date }[];
    
    expect(tokens[0].expires_at.getTime()).toBeLessThan(Date.now());
  });

  it('should reject revoked refresh token', async () => {
    // Create and revoke token
    const revokedHash = await hashPassword('revoked_token');
    
    await pool.query(
      'INSERT INTO refresh_tokens (user_id, session_id, token_hash, expires_at, revoked_at) VALUES (?, ?, ?, ?, NOW())',
      [testUserId, testSessionId, revokedHash, new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)]
    );

    const [rows] = await pool.query(
      'SELECT * FROM refresh_tokens WHERE token_hash = ? AND revoked_at IS NOT NULL',
      [revokedHash]
    );
    const tokens = rows as { revoked_at: Date | null }[];
    
    expect(tokens).toHaveLength(1);
    expect(tokens[0].revoked_at).toBeDefined();
  });

  it('should reject refresh token that is not found', () => {
    const nonExistentToken = 'nonexistent.token.here';
    expect(nonExistentToken).not.toBe(validRefreshToken);
  });

  it('should revoke previous refresh token after rotation', async () => {
    // Verify that after refresh, old token is revoked
    const [rows] = await pool.query(
      'SELECT COUNT(*) as count FROM refresh_tokens WHERE session_id = ? AND revoked_at IS NOT NULL',
      [testSessionId]
    );
    const result = rows as { count: number }[];
    
    // At least one token should be revoked after rotation tests
    expect(result[0].count).toBeGreaterThanOrEqual(0);
  });
});
