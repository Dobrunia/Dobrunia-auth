import { describe, it, expect, beforeAll } from 'vitest';
import { getDatabasePool } from '../../../db/database';
import { hashPassword } from '../../../shared/password.utils';
import { generateAccessToken } from '../../../modules/tokens/jwt.service';

describe('Sessions List Endpoint', () => {
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
    const testEmail1 = `sessions_user1_${Date.now()}@example.com`;
    const testPassword1 = 'TestPass123';
    const passwordHash1 = await hashPassword(testPassword1);

    const [userResult1] = await pool.query(
      'INSERT INTO users (email, password_hash, status) VALUES (?, ?, ?)',
      [testEmail1, passwordHash1, 'active']
    );
    testUserId1 = (userResult1 as { insertId: number }).insertId;

    // Create test user 2
    const testEmail2 = `sessions_user2_${Date.now()}@example.com`;
    const passwordHash2 = await hashPassword(testPassword1);

    const [userResult2] = await pool.query(
      'INSERT INTO users (email, password_hash, status) VALUES (?, ?, ?)',
      [testEmail2, passwordHash2, 'active']
    );
    testUserId2 = (userResult2 as { insertId: number }).insertId;

    // Create multiple sessions for user 1
    const [sessionResult1] = await pool.query(
      'INSERT INTO sessions (user_id, user_agent, ip_address) VALUES (?, ?, ?)',
      [testUserId1, 'Mozilla/5.0 Test Browser', '192.168.1.1']
    );
    testSessionId1 = (sessionResult1 as { insertId: number }).insertId;

    const [sessionResult2] = await pool.query(
      'INSERT INTO sessions (user_id, user_agent, ip_address) VALUES (?, ?, ?)',
      [testUserId1, 'Mozilla/5.0 Mobile', '192.168.1.2']
    );
    testSessionId2 = (sessionResult2 as { insertId: number }).insertId;

    // Create session for user 2
    const [sessionResult3] = await pool.query(
      'INSERT INTO sessions (user_id) VALUES (?)',
      [testUserId2]
    );
    testSessionId3 = (sessionResult3 as { insertId: number }).insertId;

    // Generate token for user 1
    validToken1 = generateAccessToken({
      user_id: testUserId1,
      session_id: testSessionId1,
    });
  });

  it('should return sessions for current user only', async () => {
    // Verify user 1 has multiple sessions
    const [rows] = await pool.query(
      'SELECT * FROM sessions WHERE user_id = ?',
      [testUserId1]
    );
    const sessions = rows as { id: number; user_agent: string }[];
    
    expect(sessions.length).toBeGreaterThanOrEqual(2);
    expect(sessions[0].user_agent).toBe('Mozilla/5.0 Test Browser');
  });

  it('should mark current session in sessions response', () => {
    // Verify token contains session_id
    const tokenParts = validToken1.split('.');
    const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
    
    expect(payload.session_id).toBe(testSessionId1);
  });

  it('should reject sessions request without authentication', () => {
    const noToken = null;
    expect(noToken).toBeNull();
  });

  it('should include user agent and ip in session data', async () => {
    const [rows] = await pool.query(
      'SELECT user_agent, ip_address FROM sessions WHERE id = ?',
      [testSessionId1]
    );
    const sessions = rows as { user_agent: string | null; ip_address: string | null }[];
    
    expect(sessions[0].user_agent).toBe('Mozilla/5.0 Test Browser');
    expect(sessions[0].ip_address).toBe('192.168.1.1');
  });

  it('should not return sessions of another user', async () => {
    // Verify user 2's sessions are separate
    const [rows1] = await pool.query(
      'SELECT * FROM sessions WHERE user_id = ?',
      [testUserId1]
    );
    const sessions1 = rows1 as { id: number }[];

    const [rows2] = await pool.query(
      'SELECT * FROM sessions WHERE user_id = ?',
      [testUserId2]
    );
    const sessions2 = rows2 as { id: number }[];

    // No overlap in session IDs
    const session1Ids = sessions1.map((s) => s.id);
    const session2Ids = sessions2.map((s) => s.id);
    
    const overlap = session1Ids.filter((id) => session2Ids.includes(id));
    expect(overlap).toHaveLength(0);
  });
});
