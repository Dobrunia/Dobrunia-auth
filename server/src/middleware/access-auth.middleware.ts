import type { Request, Response, NextFunction } from 'express';
import { getBearerToken } from '../utils/request.utils';
import { verifyAccessToken } from '../modules/auth/token.utils';
import { HttpError } from './error.middleware';

/**
 * Требует заголовок `Authorization: Bearer <access JWT>`.
 * Полезная нагрузка доступна как `req.accessAuth` (`sub`, `sid`, `email`).
 */
export function requireAccessToken(req: Request, _res: Response, next: NextFunction): void {
  try {
    const raw = getBearerToken(req);
    if (!raw) {
      throw new HttpError(401, 'Authorization Bearer token required');
    }
    req.accessAuth = verifyAccessToken(raw);
    next();
  } catch (e) {
    next(e);
  }
}
