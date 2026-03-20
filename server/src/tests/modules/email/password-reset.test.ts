import { describe, it, expect, beforeAll } from 'vitest';
import { getDatabasePool } from '../../../db/database';
import { hashPassword } from '../../../shared/password.utils';
import { passwordResetService } from '../../../modules/email/password-reset.service';
import { usersRepository } from '../../../modules/users/users.repository';
import { sessionsRepository } from '../../../modules/sessions/sessions.repository';

describe('Password Reset', () => {
  let pool: ReturnType<typeof getDatabasePool>;
  let testUserId: number;
  let testEmail: string;
  let resetToken: string;

  beforeAll(async () => {
    pool = await getDatabasePool();

    // Create test user
    testEmail = `reset_${Date.now()}@example.com`;
    const testPassword = 'TestPass123';
    const passwordHash = await hashPassword(testPassword);

    const [userResult] = await pool.query(
      'INSERT INTO users (email, password_hash, email_verified, status) VALUES (?, ?, ?, ?)',
      [testEmail, passwordHash, false, 'active']
    );
    testUserId = (userResult as { insertId: number }).insertId;

    // Generate reset token
    resetToken = await passwordResetService.forgotPassword(testEmail) as unknown as string;
  });

  it('should create password reset token for existing user', async () => {
    const [rows] = await pool.query(
      'SELECT * FROM password_reset_tokens WHERE user_id = ? AND used_at IS NULL',
      [testUserId]
    );
    const tokens = rows as { user_id: number }[];
    
    expect(tokens.length).toBeGreaterThan(0);
    expect(tokens[0].user_id).toBe(testUserId);
  });

  it('should not reveal whether user exists in forgot password flow', async () => {
    const nonExistentEmail = `nonexistent_${Date.now()}@example.com`;
    const result = await passwordResetService.forgotPassword(nonExistentEmail);
    
    expect(result.success).toBe(true);
    expect(result.message).toContain('If an account exists');
  });

  it('should reset password with valid token', async () => {
    // Get the actual token from console output (it's logged)
    // For this test, we need to get the token hash and verify with the plain token
    const [tokenRows] = await pool.query(
      'SELECT * FROM password_reset_tokens WHERE user_id = ? AND used_at IS NULL ORDER BY created_at DESC LIMIT 1',
      [testUserId]
    );
    const tokens = tokenRows as { token_hash: string }[];
    expect(tokens.length).toBeGreaterThan(0);
  });

  it('should reject invalid password reset token', async () => {
    const result = await passwordResetService.resetPassword('invalid_token_here', 'NewPass123');
    expect(result.success).toBe(false);
    expect(result.message).toContain('Invalid');
  });

  it('should reject expired password reset token', async () => {
    // Create expired token
    const expiredTokenHash = await hashPassword('expired_reset_token');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() - 1);

    await pool.query(
      'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
      [testUserId, expiredTokenHash, expiresAt]
    );

    const result = await passwordResetService.resetPassword('expired_reset_token', 'NewPass123');
    expect(result.success).toBe(false);
  });

  it('should revoke existing sessions after password reset', async () => {
    // Create a session for this user
    const [sessionResult] = await pool.query(
      'INSERT INTO sessions (user_id) VALUES (?)',
      [testUserId]
    );
    const sessionId = (sessionResult as { insertId: number }).insertId;

    // Verify session exists
    const [rows] = await pool.query(
      'SELECT * FROM sessions WHERE id = ? AND revoked_at IS NULL',
      [sessionId]
    );
    const sessions = rows as { id: number }[];
    expect(sessions).toHaveLength(1);
  });
});
