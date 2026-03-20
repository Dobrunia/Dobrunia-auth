import { Request, Response, NextFunction } from 'express';
import { rateLimitService } from '../modules/rate-limit/rate-limit.service';
import { RATE_LIMITS, type RateLimitKey } from '../constants/rate-limit.constants';

/**
 * Create rate limit middleware for a specific endpoint type
 */
export function rateLimit(limitKey: RateLimitKey, getKey?: (req: Request) => string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Get client IP
    const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
    
    // Get rate limit key
    const key = getKey ? getKey(req) : `general:${ipAddress}`;

    // Check rate limit
    const result = await rateLimitService.checkLimit(key, limitKey);

    // Add rate limit headers to response
    res.set('X-RateLimit-Limit', String(RATE_LIMITS[limitKey].maxRequests));
    res.set('X-RateLimit-Remaining', String(result.remaining));
    res.set('X-RateLimit-Reset', String(Math.floor(result.resetAt.getTime() / 1000)));

    if (!result.allowed) {
      res.set('Retry-After', String(result.retryAfter || 60));
      
      res.status(429).json({
        success: false,
        error: {
          code: 'TOO_MANY_REQUESTS',
          message: 'Too many requests. Please try again later.',
          retryAfter: result.retryAfter,
        },
      });
      return;
    }

    next();
  };
}
