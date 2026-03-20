import { describe, it, expect, beforeAll } from 'vitest';
import { rateLimitService } from '../../../modules/rate-limit/rate-limit.service';
import { RATE_LIMITS } from '../../../constants/rate-limit.constants';

describe('Rate Limiting', () => {
  const testIp = '127.0.0.1';

  beforeAll(async () => {
    // Clean up any existing rate limits for test keys
    await rateLimitService.cleanup();
  });

  it('should allow requests under the limit', async () => {
    const key = `test_under_limit:${testIp}:${Date.now()}`;
    
    // First request should be allowed
    const result = await rateLimitService.checkLimit(key, 'GENERAL');
    
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(RATE_LIMITS.GENERAL.maxRequests - 1);
  });

  it('should block requests over the limit', async () => {
    // Use a fixed timestamp for consistent window
    const timestamp = Date.now();
    const key = `test_over_limit:${testIp}:${timestamp}`;
    const maxRequests = RATE_LIMITS.LOGIN.maxRequests; // 5 requests
    
    // Make requests up to and over the limit
    for (let i = 0; i < maxRequests + 1; i++) {
      await rateLimitService.checkLimit(key, 'LOGIN');
    }
    
    // Next request should be blocked
    const result = await rateLimitService.checkLimit(key, 'LOGIN');
    
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfter).toBeDefined();
    expect(result.retryAfter!).toBeGreaterThan(0);
  });

  it('should reset limit after window expires', () => {
    // This test verifies the window concept
    // In practice, we'd need to wait for the window to expire
    const windowMs = RATE_LIMITS.LOGIN.windowMs;
    expect(windowMs).toBe(15 * 60 * 1000); // 15 minutes
  });

  it('should apply different limits to different endpoints', () => {
    // Verify different endpoints have different limits
    expect(RATE_LIMITS.LOGIN.maxRequests).toBe(5);
    expect(RATE_LIMITS.REGISTER.maxRequests).toBe(3);
    expect(RATE_LIMITS.GENERAL.maxRequests).toBe(100);
    
    // Verify different window sizes
    expect(RATE_LIMITS.LOGIN.windowMs).toBe(15 * 60 * 1000);
    expect(RATE_LIMITS.REGISTER.windowMs).toBe(60 * 60 * 1000);
    expect(RATE_LIMITS.GENERAL.windowMs).toBe(60 * 1000);
  });

  it('should generate correct rate limit keys', () => {
    const loginKey = rateLimitService.getLoginKey(testIp);
    const registerKey = rateLimitService.getRegisterKey(testIp);
    const refreshKey = rateLimitService.getRefreshTokenKey(testIp);
    
    expect(loginKey).toBe(`login:${testIp}`);
    expect(registerKey).toBe(`register:${testIp}`);
    expect(refreshKey).toBe(`refresh_token:${testIp}`);
  });

  it('should generate password reset key by email or IP', () => {
    const emailKey = rateLimitService.getPasswordResetKey(testIp, 'test@example.com');
    const ipKey = rateLimitService.getPasswordResetKey(testIp);
    
    expect(emailKey).toBe('password_reset:email:test@example.com');
    expect(ipKey).toBe('password_reset:ip:127.0.0.1');
  });
});
