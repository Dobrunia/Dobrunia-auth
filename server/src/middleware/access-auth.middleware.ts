import type { Request, Response, NextFunction } from 'express';
import { SESSION_STATUS } from '../constants/auth.constants';
import { getDatabasePool } from '../db/database';
import { verifyAccessToken } from '../modules/auth/token.utils';
import { isSessionActiveForUser } from '../modules/sessions/session.repository';
import { getBearerToken } from '../utils/request.utils';
import { HttpError } from './error.middleware';

const SESSION_GONE = 'Invalid or expired access token';

/**
 * Требует заголовок `Authorization: Bearer <access JWT>`.
 * Полезная нагрузка доступна как `req.accessAuth` (`sub`, `sid`, `email`).
 * Не проверяет статус сессии в БД — JWT действителен до истечения срока.
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

/**
 * JWT + сессия в БД со статусом `active`. После «Завершить сессию» access с этим `sid` сразу не проходит.
 */
export async function requireActiveAccessToken(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const raw = getBearerToken(req);
  if (!raw) {
    throw new HttpError(401, 'Authorization Bearer token required');
  }
  const payload = verifyAccessToken(raw);
  const pool = await getDatabasePool();
  const connection = await pool.getConnection();
  try {
    const active = await isSessionActiveForUser(
      connection,
      payload.sid,
      payload.sub,
      SESSION_STATUS.ACTIVE
    );
    if (!active) {
      throw new HttpError(401, SESSION_GONE);
    }
    req.accessAuth = payload;
  } finally {
    connection.release();
  }
  next();
}
