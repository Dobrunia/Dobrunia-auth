import { SESSION_STATUS } from '../../../constants/auth.constants';
import { OAUTH_BROWSER_COOKIE_MAX_AGE_SEC, OAUTH_BROWSER_COOKIE_NAME } from '../../../constants/oauth.constants';
import { getDatabasePool } from '../../../db/database';
import { HttpError } from '../../../middleware/error.middleware';
import { signOauthBrowserCookie } from '../oauth-browser.jwt';
import { serializeSetCookie } from '../../../utils/cookie.utils';
import { findMeContext } from '../../users/me.repository';

const UNAUTH = 'Invalid or expired access token';

export const oauthBrowserSessionService = {
  /** Проверяет access JWT + активную сессию, возвращает заголовок Set-Cookie для OAuth-куки. */
  async buildSetCookieHeader(userId: string, sessionId: string): Promise<string> {
    const pool = await getDatabasePool();
    const connection = await pool.getConnection();
    try {
      const row = await findMeContext(connection, userId, sessionId, SESSION_STATUS.ACTIVE);
      if (!row) {
        throw new HttpError(401, UNAUTH);
      }
      const token = signOauthBrowserCookie({ sid: sessionId, sub: userId });
      const secure = process.env.NODE_ENV === 'production';
      return serializeSetCookie(OAUTH_BROWSER_COOKIE_NAME, token, {
        maxAgeSec: OAUTH_BROWSER_COOKIE_MAX_AGE_SEC,
        path: '/',
        httpOnly: true,
        sameSite: 'Lax',
        secure,
      });
    } finally {
      connection.release();
    }
  },
};
