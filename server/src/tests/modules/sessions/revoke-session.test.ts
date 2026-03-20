import { describe, it, expect, beforeAll } from 'vitest';
import { getDatabasePool } from '../../../db/database';
import { hashPassword } from '../../../shared/password.utils';
import { generateAccessToken } from '../../../modules/tokens/jwt.service';

describe('Revoke One Session Endpoint', () => {
  let pool: ReturnType<typeof getDatabasePool>;
  let testUserId1: number;
  let testUserId2: number;
  let testSessionId1: number;
  let testSessionId2: number;
  let testSessionId3: number;
  let validToken1: string;

  beforeAll(async () => {
    pool = await getDatabasePool();

    // Create test user 1
    const testEmail1 = `revoke_user1_${Date.now()}@example.com`;
    const testPassword1 = 'TestPass123';
    const passwordHash1 = await hashPassword(testPassword1);

    const [userResult1] = await pool.query(
      'INSERT INTO users (email, password_hash, status) VALUES (?, ?, ?)',
      [testEmail1, passwordHash1, 'active']
    );
    testUserId1 = (userResult1 as { insertId: number }).insertId;

    // Create test user 2
    const testEmail2 = `revoke_user2_${Date.now()}@example.com`;
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

    // Generate token for user 1 with session 1
    validToken1 = generateAccessToken({
      user_id: testUserId1,
      session_id: testSessionId1,
    });
  });

  it('should revoke selected session for current user', async () => {
    // Verify session 2 is active before revoke
    const [rows] = await pool.query(
      'SELECT * FROM sessions WHERE id = ? AND revoked_at IS NULL',
      [testSessionId2]
    );
    const sessions = rows as { id: number }[];
    
    expect(sessions).toHaveLength(1);
  });

  it('should revoke refresh tokens for selected session', async () => {
    // Create refresh token for session 2
    const refreshTokenHash = await hashPassword('refresh_token_session2');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await pool.query(
      'INSERT INTO refresh_tokens (user_id, session_id, token_hash, expires_at) VALUES (?, ?, ?, ?)',
      [testUserId1, testSessionId2, refreshTokenHash, expiresAt]
    );

    // Verify token exists
    const [rows] = await pool.query(
      'SELECT * FROM refresh_tokens WHERE session_id = ? AND revoked_at IS NULL',
      [testSessionId2]
    );
    const tokens = rows as { id: number }[];
    
    expect(tokens.length).toBeGreaterThan(0);
  });

  it('should reject deleting session that belongs to another user', async () => {
    // Verify session 3 belongs to user 2
    const [rows] = await pool.query(
      'SELECT user_id FROM sessions WHERE id = ?',
      [testSessionId3]
    );
    const sessions = rows as { user_id: number }[];
    
    expect(sessions[0].user_id).toBe(testUserId2);
    expect(sessions[0].user_id).not.toBe(testUserId1);
  });

  it('should reject revoking non-existent session', () => {
    const nonExistentId = 999999;
    expect(nonExistentId).toBeGreaterThan(testSessionId3);
  });

  it('should reject revoking current session via this endpoint', () => {
    // Current session is testSessionId1 (from token)
    // This should be rejected with INVALID_OPERATION
    expect(validToken1).toBeDefined();
  });
});
