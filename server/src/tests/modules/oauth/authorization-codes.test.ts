import { describe, it, expect, beforeAll } from 'vitest';
import { getDatabasePool } from '../../../db/database';
import { hashPassword } from '../../../shared/password.utils';
import { authorizationCodesService } from '../../../modules/oauth/authorization-codes.service';
import { authorizationCodesRepository } from '../../../modules/oauth/authorization-codes.repository';

describe('Authorization Codes', () => {
  let pool: ReturnType<typeof getDatabasePool>;
  let testUserId: number;
  let testClientId: number;
  let testCode: string;

  beforeAll(async () => {
    pool = await getDatabasePool();

    // Create test user
    const testEmail = `authcode_${Date.now()}@example.com`;
    const testPassword = 'TestPass123';
    const passwordHash = await hashPassword(testPassword);

    const [userResult] = await pool.query(
      'INSERT INTO users (email, password_hash, status) VALUES (?, ?, ?)',
      [testEmail, passwordHash, 'active']
    );
    testUserId = (userResult as { insertId: number }).insertId;

    // Create test OAuth client
    const [clientResult] = await pool.query(
      'INSERT INTO oauth_clients (client_id, name, redirect_uris, allowed_scopes, grant_types) VALUES (?, ?, ?, ?, ?)',
      [`client_${Date.now()}`, 'Test Client', '["http://localhost:3000/callback"]', '["openid", "profile"]', '["authorization_code"]']
    );
    testClientId = (clientResult as { insertId: number }).insertId;

    // Generate authorization code
    testCode = await authorizationCodesService.createAuthorizationCode({
      user_id: testUserId,
      client_id: testClientId,
      redirect_uri: 'http://localhost:3000/callback',
      scope: 'openid profile',
    });
  });

  it('should store authorization code with required oauth metadata', async () => {
    const [rows] = await pool.query(
      'SELECT * FROM oauth_authorization_codes WHERE user_id = ? AND client_id = ?',
      [testUserId, testClientId]
    );
    const codes = rows as { user_id: number; client_id: number; redirect_uri: string; scope: string }[];
    
    expect(codes.length).toBeGreaterThan(0);
    expect(codes[0].user_id).toBe(testUserId);
    expect(codes[0].client_id).toBe(testClientId);
    expect(codes[0].redirect_uri).toBe('http://localhost:3000/callback');
    expect(codes[0].scope).toBe('openid profile');
  });

  it('should mark authorization code as used', async () => {
    // Validate and consume the code
    const result = await authorizationCodesService.consumeCode(testCode);
    
    expect(result.success).toBe(true);
    expect(result.codeRecord).toBeDefined();

    // Verify code is marked as used
    const [rows] = await pool.query(
      'SELECT used_at FROM oauth_authorization_codes WHERE id = ?',
      [result.codeRecord!.id]
    );
    const codes = rows as { used_at: Date | null }[];
    
    expect(codes[0].used_at).toBeDefined();
    expect(codes[0].used_at).not.toBeNull();
  });

  it('should reject reused authorization code', async () => {
    // Try to use the same code again
    const result = await authorizationCodesService.consumeCode(testCode);
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('used');
  });

  it('should reject expired authorization code', async () => {
    // Create expired code
    const expiredCode = await authorizationCodesService.createAuthorizationCode({
      user_id: testUserId,
      client_id: testClientId,
      redirect_uri: 'http://localhost:3000/callback',
    });

    // Manually expire it in database
    await pool.query(
      'UPDATE oauth_authorization_codes SET expires_at = DATE_SUB(NOW(), INTERVAL 1 HOUR) WHERE code_hash = ?',
      [require('crypto').createHash('sha256').update(expiredCode).digest('hex')]
    );

    const result = await authorizationCodesService.consumeCode(expiredCode);
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('expired');
  });

  it('should support PKCE code challenge', async () => {
    const codeChallenge = 'challenge_' + Date.now();
    
    const pkceCode = await authorizationCodesService.createAuthorizationCode({
      user_id: testUserId,
      client_id: testClientId,
      redirect_uri: 'http://localhost:3000/callback',
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    // Verify code challenge is stored
    const [rows] = await pool.query(
      'SELECT code_challenge, code_challenge_method FROM oauth_authorization_codes WHERE code_hash = ?',
      [require('crypto').createHash('sha256').update(pkceCode).digest('hex')]
    );
    const codes = rows as { code_challenge: string; code_challenge_method: string }[];
    
    expect(codes[0].code_challenge).toBe(codeChallenge);
    expect(codes[0].code_challenge_method).toBe('S256');
  });
});
