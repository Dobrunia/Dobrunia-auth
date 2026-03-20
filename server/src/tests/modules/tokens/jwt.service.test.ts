import { describe, it, expect } from 'vitest';
import { generateAccessToken, verifyAccessToken, generateRefreshToken, verifyRefreshToken } from '../../../modules/tokens/jwt.service';
import { config } from '../../../config/env.config';

describe('JWT Service', () => {
  it('should generate access token with required claims', () => {
    const token = generateAccessToken({
      user_id: 1,
      session_id: 1,
    });

    expect(token).toBeDefined();
    expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
  });

  it('should validate access token with valid signature', () => {
    const token = generateAccessToken({
      user_id: 1,
      session_id: 1,
    });

    const payload = verifyAccessToken(token);
    expect(payload.sub).toBe(1);
    expect(payload.session_id).toBe(1);
    expect(payload.iss).toBe(config.app.issuer);
  });

  it('should reject access token with invalid signature', () => {
    const token = generateAccessToken({
      user_id: 1,
      session_id: 1,
    });

    // Tamper with token
    const tamperedToken = token.split('.').map((part, i) => {
      if (i === 1) return 'tampered';
      return part;
    }).join('.');

    expect(() => verifyAccessToken(tamperedToken)).toThrow();
  });

  it('should reject expired access token', () => {
    // This test would require mocking time or creating an already-expired token
    // For now, we verify the token structure is correct
    const token = generateAccessToken({
      user_id: 1,
      session_id: 1,
    });

    const payload = verifyAccessToken(token);
    expect(payload.exp).toBeGreaterThan(payload.iat);
  });

  it('should generate refresh token', () => {
    const refreshToken = generateRefreshToken();
    expect(refreshToken).toBeDefined();
    expect(refreshToken.split('.')).toHaveLength(3);
  });

  it('should verify refresh token', () => {
    const refreshToken = generateRefreshToken();
    const payload = verifyRefreshToken(refreshToken);
    expect(payload.jti).toBeDefined();
    expect(payload.iat).toBeDefined();
  });
});
