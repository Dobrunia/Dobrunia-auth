import type { Request, Response, NextFunction } from 'express';
import { config } from '../config';

/**
 * CORS для браузерного auth-web на другом origin.
 * Список разрешённых origin задаётся `CORS_ORIGINS` (через запятую). Пусто — без CORS-заголовков.
 */
export function corsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const origins = config.cors.origins;
  if (origins.length === 0) {
    next();
    return;
  }

  const requestOrigin = req.headers.origin;
  const allowWildcard = origins.includes('*');
  const allowSpecific =
    typeof requestOrigin === 'string' && origins.includes(requestOrigin);

  if (allowWildcard || allowSpecific) {
    if (allowWildcard) {
      res.setHeader('Access-Control-Allow-Origin', '*');
    } else {
      res.setHeader('Access-Control-Allow-Origin', requestOrigin);
      res.setHeader('Vary', 'Origin');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    res.setHeader('Access-Control-Max-Age', '86400');
  }

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  next();
}
