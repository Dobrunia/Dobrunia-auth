import type { Request } from 'express';

export function getClientIp(req: Request): string | null {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded[0]) {
    return forwarded[0].split(',')[0].trim();
  }
  return req.socket.remoteAddress ?? null;
}

export function getUserAgent(req: Request): string | null {
  const ua = req.headers['user-agent'];
  if (typeof ua !== 'string' || ua.length === 0) {
    return null;
  }
  return ua;
}
