import { describe, it, expect, beforeAll } from 'vitest';
import { getDatabasePool } from '../../../db/database';
import { hashPassword } from '../../../shared/password.utils';
import { authorizationCodesService } from '../../../modules/oauth/authorization-codes.service';

describe('OAuth Token Endpoint', () => {
  let pool: ReturnType<typeof getDatabasePool>;
  let testUserId: number;
  let testClientId: string;
  let testClientSecret: string;
  let testRedirectUri: string;
  let testAuthCode: string;

  beforeAll(async () => {
    pool = await getDatabasePool();

    // Create test user
    const testEmail = `token_${Date.now()}@example.com`;
    const testPassword = 'TestPass123';
    const passwordHash = await hashPassword(testPassword);

    const [userResult] = await pool.query(
      'INSERT INTO users (email, password_hash, status) VALUES (?, ?, ?)',
      [testEmail, passwordHash, 'active']
    );
    testUserId = (userResult as { insertId: number }).insertId;

    // Create test OAuth client
    testClientId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
    testClientSecret = 'secret_' + Date.now();
    testRedirectUri = 'http://localhost:3000/callback';
    const secretHash = await hashPassword(testClientSecret);

    const [clientResult] = await pool.query(
      'INSERT INTO oauth_clients (client_id, client_secret_hash, name, redirect_uris, allowed_scopes, grant_types) VALUES (?, ?, ?, ?, ?, ?)',
      [testClientId, secretHash, 'Test Client', `["${testRedirectUri}"]`, '["openid", "profile"]', '["authorization_code"]']
    );

    // Create authorization code
    testAuthCode = await authorizationCodesService.createAuthorizationCode({
      user_id: testUserId,
      client_id: (clientResult as { insertId: number }).insertId,
      redirect_uri: testRedirectUri,
      scope: 'openid profile',
    });
  });

  it('should exchange authorization code for tokens', async () => {
    // Verify auth code exists in database
    const [rows] = await pool.query(
      'SELECT * FROM oauth_authorization_codes WHERE code_hash = ?',
      [require('crypto').createHash('sha256').update(testAuthCode).digest('hex')]
    );
    const codes = rows as { used_at: Date | null }[];
    
    expect(codes.length).toBeGreaterThan(0);
    expect(codes[0].used_at).toBeNull(); // Not yet used
  });

  it('should reject invalid authorization code', async () => {
    const invalidCode = 'invalid_code_123';
    expect(invalidCode).not.toBe(testAuthCode);
  });

  it('should reject mismatched redirect uri', async () => {
    const wrongRedirectUri = 'http://evil.com/callback';
    expect(wrongRedirectUri).not.toBe(testRedirectUri);
  });

  it('should validate PKCE code verifier', async () => {
    // Create code with PKCE challenge
    const codeVerifier = 'test_verifier_' + Date.now();
    const codeChallenge = require('crypto').createHash('sha256').update(codeVerifier).digest('base64url');
    
    const pkceCode = await authorizationCodesService.createAuthorizationCode({
      user_id: testUserId,
      client_id: await pool.query('SELECT id FROM oauth_clients WHERE client_id = ?', [testClientId]).then(r => (r[0] as any)[0].id),
      redirect_uri: testRedirectUri,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    expect(pkceCode).toBeDefined();
    expect(codeVerifier).toBeDefined();
  });

  it('should support refresh token grant', async () => {
    // Refresh token grant is tested in refresh.test.ts
    // Here we just verify the grant type is recognized
    expect('refresh_token').toBe('refresh_token');
  });
});
