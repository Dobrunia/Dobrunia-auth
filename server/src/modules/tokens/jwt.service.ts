import jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import { config } from '../../config/env.config';
import { TOKEN_TTL } from '../../constants/auth.constants';

export interface JwtPayload {
  sub: number; // user id
  iss: string; // issuer
  aud: string; // audience
  exp: number; // expiration
  iat: number; // issued at
  scope?: string;
  client_id?: string;
  session_id?: number;
}

export function generateAccessToken(payload: {
  user_id: number;
  session_id: number;
  scope?: string;
  client_id?: string;
}): string {
  const now = Math.floor(Date.now() / 1000);
  const expiresIn = parseTTL(TOKEN_TTL.ACCESS_TOKEN);

  const tokenPayload: JwtPayload = {
    sub: payload.user_id,
    iss: config.app.issuer,
    aud: config.app.url,
    exp: now + expiresIn,
    iat: now,
    scope: payload.scope,
    client_id: payload.client_id,
    session_id: payload.session_id,
  };

  return jwt.sign(tokenPayload, config.jwt.accessSecret);
}

export function verifyAccessToken(token: string): JwtPayload {
  const verified = jwt.verify(token, config.jwt.accessSecret);
  return verified as unknown as JwtPayload;
}

export function generateRefreshToken(): string {
  return jwt.sign(
    {
      jti: crypto.randomUUID(),
      iat: Math.floor(Date.now() / 1000),
    },
    config.jwt.refreshSecret,
    { expiresIn: parseTTL(TOKEN_TTL.REFRESH_TOKEN) }
  );
}

export function verifyRefreshToken(token: string): { jti: string; iat: number } {
  return jwt.verify(token, config.jwt.refreshSecret) as { jti: string; iat: number };
}

function parseTTL(ttl: string): number {
  const match = ttl.match(/^(\d+)([smhd])$/);
  if (!match) {
    throw new Error(`Invalid TTL format: ${ttl}`);
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 's':
      return value;
    case 'm':
      return value * 60;
    case 'h':
      return value * 60 * 60;
    case 'd':
      return value * 60 * 60 * 24;
    default:
      throw new Error(`Invalid TTL unit: ${unit}`);
  }
}
