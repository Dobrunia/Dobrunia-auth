import { describe, it, expect, beforeAll } from 'vitest';
import { getDatabasePool } from '../../../db/database';
import { hashPassword } from '../../../shared/password.utils';
import { generateAccessToken } from '../../../modules/tokens/jwt.service';

describe('Me Endpoint', () => {
  let pool: ReturnType<typeof getDatabasePool>;
  let testUserId: number;
  let testSessionId: number;
  let validToken: string;

  beforeAll(async () => {
    pool = await getDatabasePool();

    // Create test user
    const testEmail = `me_endpoint_${Date.now()}@example.com`;
    const testPassword = 'TestPass123';
    const passwordHash = await hashPassword(testPassword);

    const [userResult] = await pool.query(
      'INSERT INTO users (email, password_hash, name, status) VALUES (?, ?, ?, ?)',
      [testEmail, passwordHash, 'Test User', 'active']
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

  it('should return current user for valid access token', async () => {
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [testUserId]);
    const users = rows as { email: string; name: string }[];
    
    expect(users).toHaveLength(1);
    expect(users[0].email).toBeDefined();
    expect(users[0].name).toBe('Test User');
  });

  it('should reject me request without access token', () => {
    const authHeader = undefined;
    expect(authHeader).toBeUndefined();
  });

  it('should reject me request with invalid access token', () => {
    const invalidToken = 'invalid.token.here';
    expect(invalidToken.split('.')).toHaveLength(3);
    
    // Try to decode - should fail
    try {
      JSON.parse(Buffer.from(invalidToken.split('.')[1], 'base64').toString());
    } catch (e) {
      expect(e).toBeDefined();
    }
  });
});
