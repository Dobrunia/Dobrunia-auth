import { rateLimitRepository } from './rate-limit.repository';
import { RATE_LIMITS, type RateLimitKey } from '../../constants/rate-limit.constants';
import type { RateLimitResult } from '../../types/rate-limit.types';

export class RateLimitService {
  /**
   * Check if request is allowed under rate limit
   * Uses fixed window algorithm
   */
  async checkLimit(key: string, limitKey: RateLimitKey): Promise<RateLimitResult> {
    const config = RATE_LIMITS[limitKey];
    const now = new Date();
    
    // Calculate window start (fixed window)
    const windowStart = new Date(
      Math.floor(now.getTime() / config.windowMs) * config.windowMs
    );

    // Get current count
    const info = await rateLimitRepository.getRateLimitInfo(key, windowStart);
    
    if (!info) {
      // No requests in this window yet
      await rateLimitRepository.increment(key, windowStart);
      
      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetAt: new Date(windowStart.getTime() + config.windowMs),
      };
    }

    // Calculate reset time
    const resetAt = new Date(info.windowStart.getTime() + config.windowMs);

    // Check if limit exceeded
    if (info.count >= config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetAt,
        retryAfter: Math.ceil((resetAt.getTime() - now.getTime()) / 1000),
      };
    }

    // Increment counter
    const newCount = await rateLimitRepository.increment(key, windowStart);

    return {
      allowed: true,
      remaining: config.maxRequests - newCount,
      resetAt,
    };
  }

  /**
   * Get rate limit key for login attempts (by IP)
   */
  getLoginKey(ipAddress: string): string {
    return `login:${ipAddress}`;
  }

  /**
   * Get rate limit key for registration (by IP)
   */
  getRegisterKey(ipAddress: string): string {
    return `register:${ipAddress}`;
  }

  /**
   * Get rate limit key for password reset (by IP or email)
   */
  getPasswordResetKey(ipAddress: string, email?: string): string {
    if (email) {
      return `password_reset:email:${email}`;
    }
    return `password_reset:ip:${ipAddress}`;
  }

  /**
   * Get rate limit key for token refresh (by IP)
   */
  getRefreshTokenKey(ipAddress: string): string {
    return `refresh_token:${ipAddress}`;
  }

  /**
   * Clean up old rate limit records (call periodically)
   */
  async cleanup(): Promise<number> {
    // Clean up records older than 1 hour
    return rateLimitRepository.cleanupOlderThan(60);
  }
}

export const rateLimitService = new RateLimitService();
