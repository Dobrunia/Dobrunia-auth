import { describe, it, expect, beforeAll } from 'vitest';
import { getDatabasePool } from '../../../db/database';
import { hashPassword } from '../../../shared/password.utils';
import { emailVerificationService } from '../../../modules/email/email-verification.service';
import { usersRepository } from '../../../modules/users/users.repository';

describe('Email Verification', () => {
  let pool: ReturnType<typeof getDatabasePool>;
  let testUserId: number;
  let testEmail: string;
  let verificationToken: string;

  beforeAll(async () => {
    pool = await getDatabasePool();

    // Create test user with email_verified = false
    testEmail = `verify_${Date.now()}@example.com`;
    const testPassword = 'TestPass123';
    const passwordHash = await hashPassword(testPassword);

    const [userResult] = await pool.query(
      'INSERT INTO users (email, password_hash, email_verified, status) VALUES (?, ?, ?, ?)',
      [testEmail, passwordHash, false, 'active']
    );
    testUserId = (userResult as { insertId: number }).insertId;

    // Generate verification token and capture it from console
    verificationToken = await emailVerificationService.sendVerificationEmail(testUserId, testEmail);
  });

  it('should create email verification token for user', async () => {
    const [rows] = await pool.query(
      'SELECT * FROM email_verification_tokens WHERE user_id = ? AND used_at IS NULL',
      [testUserId]
    );
    const tokens = rows as { user_id: number }[];
    
    expect(tokens.length).toBe(1);
    expect(tokens[0].user_id).toBe(testUserId);
  });

  it('should verify email with valid token', async () => {
    // First verify token exists in database
    const [tokenRows] = await pool.query(
      'SELECT * FROM email_verification_tokens WHERE user_id = ? AND used_at IS NULL',
      [testUserId]
    );
    const tokens = tokenRows as { token_hash: string }[];
    expect(tokens.length).toBe(1);

    // Verify user is not verified yet
    const userBefore = await usersRepository.findById(testUserId);
    expect(userBefore?.email_verified).toBeFalsy();

    // Verify email with the token
    const result = await emailVerificationService.verifyEmail(verificationToken);
    
    expect(result.success).toBe(true);
    expect(result.message).toBe('Email verified successfully');

    // Verify user is now verified
    const userAfter = await usersRepository.findById(testUserId);
    expect(userAfter?.email_verified).toBeTruthy();
  });

  it('should reject invalid email verification token', async () => {
    const result = await emailVerificationService.verifyEmail('invalid_token_here');
    expect(result.success).toBe(false);
    expect(result.message).toContain('Invalid');
  });

  it('should reject expired email verification token', async () => {
    // Create a new user for this test to avoid conflicts
    const expiredEmail = `verify_expired_${Date.now()}@example.com`;
    const passwordHash = await hashPassword('TestPass123');
    
    const [userResult] = await pool.query(
      'INSERT INTO users (email, password_hash, email_verified, status) VALUES (?, ?, ?, ?)',
      [expiredEmail, passwordHash, false, 'active']
    );
    const expiredUserId = (userResult as { insertId: number }).insertId;

    // Create expired token
    const expiredToken = 'expired_test_token';
    const expiredTokenHash = await hashPassword(expiredToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() - 1);

    await pool.query(
      'INSERT INTO email_verification_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
      [expiredUserId, expiredTokenHash, expiresAt]
    );

    const result = await emailVerificationService.verifyEmail(expiredToken);
    expect(result.success).toBe(false);
  });

  it('should mark email as verified after successful verification', async () => {
    // User was already verified in "should verify email with valid token" test
    const user = await usersRepository.findById(testUserId);
    expect(user?.email_verified).toBeTruthy();
  });
});
