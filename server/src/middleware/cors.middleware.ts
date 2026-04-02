import type { Request, Response, NextFunction } from 'express';
import { config } from '../config';
import { isReflectableOrigin } from '../utils/cors.utils';

function applyCorsHeaders(res: Response, allowOrigin: string | '*', withCredentials: boolean): void {
  res.setHeader('Access-Control-Allow-Origin', allowOrigin);
  if (allowOrigin !== '*') {
    res.setHeader('Vary', 'Origin');
  }
  if (withCredentials) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');
}

/**
 * CORS: `CORS_ORIGINS` + автоматически origin из `AUTH_WEB_PUBLIC_URL`;
 * опционально `CORS_REFLECT_ORIGIN` — отражать любой валидный Origin (SPA на произвольных доменах).
 */
export function corsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const origins = config.cors.origins;
  const requestOrigin = req.headers.origin;

  const reflected =
    config.cors.reflectOrigin &&
    typeof requestOrigin === 'string' &&
    isReflectableOrigin(requestOrigin, config.cors.reflectHttpsOnly);

  if (reflected) {
    applyCorsHeaders(res, requestOrigin, true);
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
    return;
  }

  if (origins.length === 0) {
    next();
    return;
  }

  const allowWildcard = origins.includes('*');
  const allowSpecific = typeof requestOrigin === 'string' && origins.includes(requestOrigin);

  if (allowWildcard || allowSpecific) {
    if (allowWildcard) {
      applyCorsHeaders(res, '*', false);
    } else {
      applyCorsHeaders(res, requestOrigin, true);
    }
  }

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  next();
}
