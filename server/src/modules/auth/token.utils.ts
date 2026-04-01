import { createHash, randomBytes } from 'crypto';
import jwt from 'jsonwebtoken';
import { config } from '../../config';
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
