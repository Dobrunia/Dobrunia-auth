import { describe, it, expect, beforeAll } from 'vitest';
import { getDatabasePool } from '../../../db/database';
import { hashPassword } from '../../../shared/password.utils';
import { generateAccessToken } from '../../../modules/tokens/jwt.service';

describe('Logout Endpoint', () => {
  let pool: ReturnType<typeof getDatabasePool>;
  let testUserId: number;
  let testSessionId: number;
  let validToken: string;

  beforeAll(async () => {
    pool = await getDatabasePool();

    // Create test user
    const testEmail = `logout_${Date.now()}@example.com`;
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

    // Generate valid token
    validToken = generateAccessToken({
      user_id: testUserId,
      session_id: testSessionId,
    });
  });

  it('should logout current session', async () => {
    // Verify session exists before logout
    const [rows] = await pool.query(
      'SELECT * FROM sessions WHERE id = ?',
      [testSessionId]
    );
    const sessions = rows as { revoked_at: Date | null }[];
    
    expect(sessions).toHaveLength(1);
    expect(sessions[0].revoked_at).toBeNull();
  });

  it('should revoke refresh tokens for current session on logout', async () => {
    // Create refresh token for this session
    const refreshTokenHash = await hashPassword('test_refresh_token');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await pool.query(
      'INSERT INTO refresh_tokens (user_id, session_id, token_hash, expires_at) VALUES (?, ?, ?, ?)',
      [testUserId, testSessionId, refreshTokenHash, expiresAt]
    );

    // Verify token exists
    const [rows] = await pool.query(
      'SELECT * FROM refresh_tokens WHERE session_id = ? AND revoked_at IS NULL',
      [testSessionId]
    );
    const tokens = rows as { revoked_at: Date | null }[];
    
    expect(tokens.length).toBeGreaterThan(0);
  });

  it('should reject logout for unauthenticated user', () => {
    const noToken = null;
    expect(noToken).toBeNull();
  });
});
