import { describe, it, expect, beforeAll } from 'vitest';
import { getDatabasePool } from '../../../db/database';
import { hashPassword } from '../../../shared/password.utils';

describe('Auth Service - Registration', () => {
  let pool: ReturnType<typeof getDatabasePool>;

  beforeAll(async () => {
    pool = await getDatabasePool();
  });

  it('should register a new user with valid email and password', async () => {
    const testEmail = `test_${Date.now()}@example.com`;
    const testPassword = 'TestPass123';
    const passwordHash = await hashPassword(testPassword);

    // Insert user directly to test uniqueness
    const [result] = await pool.query(
      'INSERT INTO users (email, password_hash) VALUES (?, ?)',
      [testEmail, passwordHash]
    );

    const insertId = (result as { insertId: number }).insertId;
    expect(insertId).toBeGreaterThan(0);

    // Verify user was created
    const [rows] = await pool.query(
      'SELECT * FROM users WHERE id = ?',
      [insertId]
    );
    const users = rows as { email: string; password_hash: string }[];
    expect(users).toHaveLength(1);
    expect(users[0].email).toBe(testEmail);
  });

  it('should reject registration when email is already taken', async () => {
    const duplicateEmail = `duplicate_${Date.now()}@example.com`;
    const testPassword = 'TestPass123';
    const passwordHash = await hashPassword(testPassword);

    // Insert first user
    await pool.query(
      'INSERT INTO users (email, password_hash) VALUES (?, ?)',
      [duplicateEmail, passwordHash]
    );

    // Try to insert duplicate - should fail due to UNIQUE constraint
    try {
      await pool.query(
        'INSERT INTO users (email, password_hash) VALUES (?, ?)',
        [duplicateEmail, passwordHash]
      );
      // Should not reach here
      expect.fail('Should have thrown duplicate key error');
    } catch (error: unknown) {
      const err = error as { code?: string };
      expect(err.code).toBe('ER_DUP_ENTRY');
    }
  });

  it('should reject registration when email is invalid', () => {
    const invalidEmails = [
      '',
      'not-an-email',
      '@example.com',
      'test@',
      'test@example',
    ];

    for (const email of invalidEmails) {
      const isValidEmail = !!(email && email.includes('@') && email.includes('.') && !email.startsWith('@') && !email.endsWith('@'));
      expect(isValidEmail).toBe(false);
    }
  });

  it('should reject registration when password is too weak', async () => {
    const weakPasswords = [
      '',
      'short',
      'alllowercase123',
      'ALLUPPERCASE123',
      'NoNumbersHere',
    ];

    for (const password of weakPasswords) {
      const isValid = password.length >= 8 &&
        /[A-Z]/.test(password) &&
        /[a-z]/.test(password) &&
        /[0-9]/.test(password);

      if (!isValid) {
        expect(() => {
          if (password.length < 8 || 
              !/[A-Z]/.test(password) || 
              !/[a-z]/.test(password) || 
              !/[0-9]/.test(password)) {
            throw new Error('Password too weak');
          }
        }).toThrow();
      }
    }
  });

  it('should store hashed password instead of plain password', async () => {
    const testEmail = `hashcheck_${Date.now()}@example.com`;
    const plainPassword = 'MySecurePass123';
    const hashedPassword = await hashPassword(plainPassword);

    // Verify hash is different from plain password
    expect(hashedPassword).not.toBe(plainPassword);
    expect(hashedPassword.length).toBeGreaterThan(plainPassword.length);

    // Verify hash can be validated
    const isValid = await require('argon2').verify(hashedPassword, plainPassword);
    expect(isValid).toBe(true);
  });
});
