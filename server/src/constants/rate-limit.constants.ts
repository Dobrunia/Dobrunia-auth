/**
 * Rate limiting constants
 */

export const RATE_LIMITS = {
  // Login: 5 attempts per 15 minutes (brute force protection)
  LOGIN: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
  },

  // Register: 3 attempts per hour (spam protection)
  REGISTER: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3,
  },

  // Password reset: 3 attempts per hour (enumeration protection)
  PASSWORD_RESET: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3,
  },

  // Token refresh: 10 attempts per 15 minutes
  REFRESH_TOKEN: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 10,
  },

  // General API: 100 requests per minute
  GENERAL: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
  },
} as const;

export type RateLimitKey = keyof typeof RATE_LIMITS;
