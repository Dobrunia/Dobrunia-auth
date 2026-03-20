import jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import { config } from '../../config/env.config';
import { TOKEN_TTL } from '../../constants/auth.constants';
import { signingKeysService } from './signing-keys.service';
import type { SigningKey } from '../../types/signing-key.types';

export interface JwtPayload {
  sub: number; // user id
  iss: string; // issuer
  aud: string; // audience
  exp: number; // expiration
  iat: number; // issued at
  scope?: string;
  client_id?: string;
  session_id?: number;
  kid?: string; // key id
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

  // For now, use the static secret from config
  // In production with key rotation, use signingKeysService.getActiveKey()
  return jwt.sign(tokenPayload, config.jwt.accessSecret);
}

export function verifyAccessToken(token: string): JwtPayload {
  // For key rotation support, try all validation keys
  // For now, use the static secret
  const verified = jwt.verify(token, config.jwt.accessSecret);
  return verified as unknown as JwtPayload;
}

/**
 * Verify token with a specific key
 */
export function verifyTokenWithKey(token: string, key: SigningKey): JwtPayload {
  const verified = jwt.verify(token, key.key_secret);
  return verified as unknown as JwtPayload;
}

/**
 * Verify token trying multiple keys (for key rotation)
 */
export function verifyTokenWithAnyKey(token: string, keys: SigningKey[]): JwtPayload {
  let lastError: Error | null = null;

  for (const key of keys) {
    try {
      const verified = jwt.verify(token, key.key_secret);
      return verified as unknown as JwtPayload;
    } catch (error) {
      lastError = error as Error;
    }
  }

  // If all keys failed, throw the last error
  if (lastError) {
    throw lastError;
  }

  throw new Error('No valid key found for token verification');
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
