import jwt from 'jsonwebtoken';
import { config } from '../../config';
import { OAUTH_BROWSER_COOKIE_MAX_AGE_SEC } from '../../constants/oauth.constants';

const PURPOSE = 'oauth_browser';

export interface OauthBrowserPayload {
  sid: string;
  sub: string;
}

export function signOauthBrowserCookie(payload: OauthBrowserPayload): string {
  const days = Math.max(1, Math.ceil(OAUTH_BROWSER_COOKIE_MAX_AGE_SEC / 86400));
  return jwt.sign(
    { sid: payload.sid, sub: payload.sub, purpose: PURPOSE },
    config.jwt.accessSecret,
    {
      algorithm: 'HS256',
      expiresIn: `${days}d`,
    }
  );
}

export function verifyOauthBrowserCookie(token: string | undefined): OauthBrowserPayload | null {
  if (!token || typeof token !== 'string') {
    return null;
  }
  try {
    const decoded = jwt.verify(token, config.jwt.accessSecret, { algorithms: ['HS256'] });
    if (typeof decoded === 'string' || decoded === null || typeof decoded !== 'object') {
      return null;
    }
    const d = decoded as Record<string, unknown>;
    if (d.purpose !== PURPOSE) {
      return null;
    }
    if (typeof d.sid !== 'string' || typeof d.sub !== 'string') {
      return null;
    }
    return { sid: d.sid, sub: d.sub };
  } catch {
    return null;
  }
}
