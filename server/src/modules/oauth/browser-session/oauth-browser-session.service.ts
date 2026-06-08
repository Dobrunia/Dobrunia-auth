import { randomUUID } from 'crypto';
import { SESSION_STATUS } from '../../../constants/auth.constants';
import { OAUTH_BROWSER_COOKIE_MAX_AGE_SEC, OAUTH_BROWSER_COOKIE_NAME } from '../../../constants/oauth.constants';
import { getDatabasePool } from '../../../db/database';
import { HttpError } from '../../../middleware/error.middleware';
import { signOauthBrowserCookie } from '../oauth-browser.jwt';
import { serializeSetCookie } from '../../../utils/cookie.utils';
import { findMeContext } from '../../users/me.repository';
import { findActiveClientByKey } from '../../clients/client.repository';
import {
  findActiveSessionIdForUserAndClient,
  insertSession,
} from '../../sessions/session.repository';

const UNAUTH = 'Invalid or expired access token';

export const oauthBrowserSessionService = {
  /**
   * Проверяет текущую сессию и создаёт сессию целевого OAuth-клиента без повторного ввода пароля.
   */
  async buildSetCookieHeader(
    userId: string,
    sourceSessionId: string,
    targetClientKey: string,
    context: { ipAddress: string | null; userAgent: string | null }
  ): Promise<string> {
    const pool = await getDatabasePool();
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const current = await findMeContext(
        connection,
        userId,
        sourceSessionId,
        SESSION_STATUS.ACTIVE
      );
      if (!current) {
        throw new HttpError(401, UNAUTH);
      }

      const targetClient = await findActiveClientByKey(connection, targetClientKey);
      if (!targetClient) {
        throw new HttpError(400, 'Unknown or inactive client');
      }

      let targetSessionId = sourceSessionId;
      let shouldInsertTargetSession = false;
      if (current.client_id !== targetClient.id) {
        const existingTargetSession = await findActiveSessionIdForUserAndClient(
          connection,
          userId,
          targetClient.id,
          SESSION_STATUS.ACTIVE
        );
        if (existingTargetSession) {
          targetSessionId = existingTargetSession;
        } else {
          targetSessionId = randomUUID();
          shouldInsertTargetSession = true;
        }
      }

      if (shouldInsertTargetSession) {
        await insertSession(connection, {
          id: targetSessionId,
          userId,
          clientId: targetClient.id,
          status: SESSION_STATUS.ACTIVE,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
        });
      }

      await connection.commit();

      const token = signOauthBrowserCookie({ sid: targetSessionId, sub: userId });
      const secure = process.env.NODE_ENV === 'production';
      return serializeSetCookie(OAUTH_BROWSER_COOKIE_NAME, token, {
        maxAgeSec: OAUTH_BROWSER_COOKIE_MAX_AGE_SEC,
        path: '/',
        httpOnly: true,
        sameSite: 'Lax',
        secure,
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },
};
