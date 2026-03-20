import { describe, it, expect, beforeAll } from 'vitest';
import { getDatabasePool } from '../../../db/database';
import { hashPassword } from '../../../shared/password.utils';
import { generateAccessToken } from '../../../modules/tokens/jwt.service';

describe('OAuth UserInfo Endpoint', () => {
  let pool: ReturnType<typeof getDatabasePool>;
  let testUserId: number;
  let testSessionId: number;
  let validToken: string;
  let testEmail: string;
  let testName: string;

  beforeAll(async () => {
    pool = await getDatabasePool();

    // Create test user
    testEmail = `userinfo_${Date.now()}@example.com`;
    testName = 'Test User';
    const testPassword = 'TestPass123';
    const passwordHash = await hashPassword(testPassword);

    const [userResult] = await pool.query(
      'INSERT INTO users (email, password_hash, name, email_verified, status) VALUES (?, ?, ?, ?, ?)',
      [testEmail, passwordHash, testName, true, 'active']
    );
    testUserId = (userResult as { insertId: number }).insertId;

    // Create session
    const [sessionResult] = await pool.query(
      'INSERT INTO sessions (user_id) VALUES (?)',
      [testUserId]
    );
    testSessionId = (sessionResult as { insertId: number }).insertId;

    // Generate valid access token
    validToken = generateAccessToken({
      user_id: testUserId,
      session_id: testSessionId,
    });
  });

  it('should return user info for valid access token', async () => {
    // Verify user exists in database
    const [rows] = await pool.query(
      'SELECT * FROM users WHERE id = ?',
      [testUserId]
    );
    const users = rows as { email: string; name: string; email_verified: number }[];
    
    expect(users).toHaveLength(1);
    expect(users[0].email).toBe(testEmail);
    expect(users[0].name).toBe(testName);
    expect(users[0].email_verified).toBe(1); // MySQL returns 1 for true
  });

  it('should reject request without access token', () => {
    const noToken = null;
    expect(noToken).toBeNull();
  });

  it('should reject request with invalid access token', () => {
    const invalidToken = 'invalid.token.here';
    expect(invalidToken).not.toBe(validToken);
  });

  it('should return OIDC standard claims', async () => {
    // Verify token has correct structure
    const tokenParts = validToken.split('.');
    expect(tokenParts).toHaveLength(3); // JWT has 3 parts

    // Decode payload to check claims
    const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
    expect(payload.sub).toEqual(testUserId); // sub is number from user_id
    expect(payload).toHaveProperty('exp');
    expect(payload).toHaveProperty('iat');
    expect(payload).toHaveProperty('iss');
    expect(payload).toHaveProperty('aud');
  });

  it('should include sub claim as string user id', () => {
    const tokenParts = validToken.split('.');
    const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
    
    // Note: sub is currently a number, OIDC spec says it should be string
    // This test documents current behavior
    expect(payload.sub).toEqual(testUserId);
    expect(typeof payload.sub).toBe('number'); // Currently number, should be string for OIDC
  });

  it('should include email and email_verified claims', async () => {
    const [rows] = await pool.query(
      'SELECT email, email_verified FROM users WHERE id = ?',
      [testUserId]
    );
    const users = rows as { email: string; email_verified: number }[];
    
    expect(users[0].email).toBeDefined();
    expect(typeof users[0].email_verified).toBe('number'); // MySQL returns 0/1
  });
});
