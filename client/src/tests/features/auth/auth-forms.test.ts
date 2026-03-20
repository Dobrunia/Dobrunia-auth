import { describe, it, expect } from 'vitest';
import { registerSchema, loginSchema } from '../../../shared/schemas';

describe('Register Form Validation', () => {
  it('should submit registration form with valid values', () => {
    const validData = {
      email: 'test@example.com',
      password: 'SecurePass123',
      confirm_password: 'SecurePass123',
    };

    const result = registerSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should show validation errors for invalid form fields', () => {
    const invalidData = {
      email: 'not-an-email',
      password: 'weak',
      confirm_password: '',
    };

    const result = registerSchema.safeParse(invalidData);
    expect(result.success).toBe(false);

    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      expect(errors.email).toBeDefined();
      expect(errors.password).toBeDefined();
      expect(errors.confirm_password).toBeDefined();
    }
  });

  it('should reject registration when passwords do not match', () => {
    const mismatchedData = {
      email: 'test@example.com',
      password: 'SecurePass123',
      confirm_password: 'DifferentPass456',
    };

    const result = registerSchema.safeParse(mismatchedData);
    expect(result.success).toBe(false);

    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      expect(errors.confirm_password).toBeDefined();
    }
  });

  it('should reject registration when email is invalid', () => {
    const invalidEmails = [
      '',
      'not-an-email',
      '@example.com',
      'test@',
    ];

    for (const email of invalidEmails) {
      const result = registerSchema.safeParse({
        email,
        password: 'SecurePass123',
        confirm_password: 'SecurePass123',
      });
      expect(result.success).toBe(false);
    }
  });

  it('should reject registration when password is too weak', () => {
    const weakPasswords = [
      'short',
      'alllowercase123',
      'ALLUPPERCASE123',
      'NoNumbersHere',
    ];

    for (const password of weakPasswords) {
      const result = registerSchema.safeParse({
        email: 'test@example.com',
        password,
        confirm_password: password,
      });
      expect(result.success).toBe(false);
    }
  });
});

describe('Login Form Validation', () => {
  it('should submit login form with valid credentials', () => {
    const validData = {
      email: 'test@example.com',
      password: 'anypassword',
    };

    const result = loginSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should show error when email is empty', () => {
    const invalidData = {
      email: '',
      password: 'password',
    };

    const result = loginSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('should show error when password is empty', () => {
    const invalidData = {
      email: 'test@example.com',
      password: '',
    };

    const result = loginSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('should reject login when email format is invalid', () => {
    const invalidEmails = [
      'not-an-email',
      '@example.com',
      'test@',
    ];

    for (const email of invalidEmails) {
      const result = loginSchema.safeParse({
        email,
        password: 'password',
      });
      expect(result.success).toBe(false);
    }
  });
});
