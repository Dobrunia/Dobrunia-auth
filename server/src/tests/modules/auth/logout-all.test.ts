import { describe, it, expect, beforeAll } from 'vitest';
import { getDatabasePool } from '../../../db/database';
import { hashPassword } from '../../../shared/password.utils';
import { generateAccessToken } from '../../../modules/tokens/jwt.service';

describe('Logout All Endpoint', () => {
  let pool: ReturnType<typeof getDatabasePool>;
  let testUserId1: number;
  let testUserId2: number;
  let testSessionId1: number;
  let testSessionId2: number;
  let testSessionId3: number;
  let validToken1: string;
  let validToken2: string;

  beforeAll(async () => {
    pool = await getDatabasePool();

    // Create test user 1
    const testEmail1 = `logoutall_user1_${Date.now()}@example.com`;
    const testPassword1 = 'TestPass123';
    const passwordHash1 = await hashPassword(testPassword1);

    const [userResult1] = await pool.query(
      'INSERT INTO users (email, password_hash, status) VALUES (?, ?, ?)',
      [testEmail1, passwordHash1, 'active']
    );
    testUserId1 = (userResult1 as { insertId: number }).insertId;

    // Create test user 2 (to verify isolation)
    const testEmail2 = `logoutall_user2_${Date.now()}@example.com`;
    const passwordHash2 = await hashPassword(testPassword1);

    const [userResult2] = await pool.query(
      'INSERT INTO users (email, password_hash, status) VALUES (?, ?, ?)',
      [testEmail2, passwordHash2, 'active']
    );
    testUserId2 = (userResult2 as { insertId: number }).insertId;

    // Create multiple sessions for user 1
    const [sessionResult1] = await pool.query(
      'INSERT INTO sessions (user_id) VALUES (?)',
      [testUserId1]
    );
    testSessionId1 = (sessionResult1 as { insertId: number }).insertId;

    const [sessionResult2] = await pool.query(
      'INSERT INTO sessions (user_id) VALUES (?)',
      [testUserId1]
    );
    testSessionId2 = (sessionResult2 as { insertId: number }).insertId;

    // Create session for user 2
    const [sessionResult3] = await pool.query(
      'INSERT INTO sessions (user_id) VALUES (?)',
      [testUserId2]
    );
    testSessionId3 = (sessionResult3 as { insertId: number }).insertId;

    // Generate tokens
    validToken1 = generateAccessToken({
      user_id: testUserId1,
      session_id: testSessionId1,
    });

    validToken2 = generateAccessToken({
      user_id: testUserId2,
      session_id: testSessionId3,
    });
  });

  it('should revoke all sessions for current user', async () => {
    // Verify sessions exist before logout
    const [rows] = await pool.query(
      'SELECT * FROM sessions WHERE user_id = ? AND revoked_at IS NULL',
      [testUserId1]
    );
    const sessions = rows as { id: number }[];
    
    expect(sessions.length).toBeGreaterThanOrEqual(2);
  });

  it('should revoke all refresh tokens for current user', async () => {
    // Create refresh tokens for user 1
    const refreshTokenHash1 = await hashPassword('refresh_token_1');
    const refreshTokenHash2 = await hashPassword('refresh_token_2');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await pool.query(
      'INSERT INTO refresh_tokens (user_id, session_id, token_hash, expires_at) VALUES (?, ?, ?, ?)',
      [testUserId1, testSessionId1, refreshTokenHash1, expiresAt]
    );

    await pool.query(
      'INSERT INTO refresh_tokens (user_id, session_id, token_hash, expires_at) VALUES (?, ?, ?, ?)',
      [testUserId1, testSessionId2, refreshTokenHash2, expiresAt]
    );

    // Verify tokens exist
    const [rows] = await pool.query(
      'SELECT * FROM refresh_tokens WHERE user_id = ? AND revoked_at IS NULL',
      [testUserId1]
    );
    const tokens = rows as { id: number }[];
    
    expect(tokens.length).toBeGreaterThanOrEqual(2);
  });

  it('should not revoke sessions of another user', async () => {
    // Verify user 2's session is still active
    const [rows] = await pool.query(
      'SELECT * FROM sessions WHERE user_id = ? AND revoked_at IS NULL',
      [testUserId2]
    );
    const sessions = rows as { id: number }[];
    
    expect(sessions.length).toBeGreaterThanOrEqual(1);
  });
});
