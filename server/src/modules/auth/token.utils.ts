import { createHash, randomBytes } from 'crypto';
import jwt from 'jsonwebtoken';
import { config } from '../../config';
import { HttpError } from '../../middleware/error.middleware';
import type { AccessTokenPayload } from '../../types/access-token.types';

export function generateOpaqueRefreshToken(): string {
  return randomBytes(32).toString('base64url');
}

/** Store only this in DB — never the raw refresh token */
export function hashRefreshToken(plainToken: string): string {
  return createHash('sha256').update(plainToken, 'utf8').digest('hex');
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(
    {
      sub: payload.sub,
      sid: payload.sid,
      email: payload.email,
    },
    config.jwt.accessSecret,
    {
      algorithm: 'HS256',
      expiresIn: config.jwt.accessExpiresSec,
    }
  );
}

const ACCESS_INVALID = 'Invalid or expired access token';

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    const decoded = jwt.verify(token, config.jwt.accessSecret, {
      algorithms: ['HS256'],
    });
    if (typeof decoded === 'string' || decoded === null || typeof decoded !== 'object') {
      throw new HttpError(401, ACCESS_INVALID);
    }
    const d = decoded as Record<string, unknown>;
    if (
      typeof d.sub !== 'string' ||
      typeof d.sid !== 'string' ||
      typeof d.email !== 'string'
    ) {
      throw new HttpError(401, ACCESS_INVALID);
    }
    return { sub: d.sub, sid: d.sid, email: d.email };
  } catch (e) {
    if (e instanceof HttpError) {
      throw e;
    }
    throw new HttpError(401, ACCESS_INVALID);
  }
}
