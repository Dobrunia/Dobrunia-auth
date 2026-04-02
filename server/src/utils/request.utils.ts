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

export function getBearerToken(req: Request): string | null {
  const h = req.headers.authorization;
  if (!h || typeof h !== 'string') {
    return null;
  }
  const m = /^Bearer\s+(\S+)/i.exec(h.trim());
  return m?.[1] ?? null;
}

/** Полный URL запроса (path + query) — для OAuth `return_url`. Учитывает `X-Forwarded-Proto` за прокси. */
export function buildAbsoluteRequestUrl(req: Request): string {
  const host = req.get('host') ?? 'localhost';
  const xfProto = req.get('x-forwarded-proto');
  const proto =
    (typeof xfProto === 'string' && xfProto.split(',')[0]?.trim()) || (req.secure ? 'https' : 'http');
  return `${proto}://${host}${req.originalUrl}`;
}
