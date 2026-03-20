/**
 * Rate limit entity types
 */

export interface RateLimit {
  id: number;
  rate_key: string;
  window_start: Date;
  request_count: number;
  created_at: Date;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfter?: number; // seconds
}
