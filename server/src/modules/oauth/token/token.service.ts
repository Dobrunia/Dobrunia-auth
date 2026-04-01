import { randomUUID } from 'crypto';
import { SESSION_STATUS } from '../../../constants/auth.constants';
import { HttpError } from '../../../middleware/error.middleware';
import { getDatabasePool } from '../../../db/database';
import { config } from '../../../config';
import {
  generateOpaqueRefreshToken,
  hashRefreshToken,
  signAccessToken,
} from '../../auth/token.utils';
import { insertRefreshToken } from '../../auth/refresh-token.repository';
import { findActiveClientByKey } from '../../clients/client.repository';
import { isSessionActiveForUserAndClient } from '../../sessions/session.repository';
import { findUserEmailById } from '../../users/user.repository';
import {
  lockValidOAuthCodeByHash,
  markOAuthCodeUsed,
} from '../oauth-code.repository';
import type { OauthTokenResult } from '../../../types/oauth.types';

const TOKEN_ERROR = 'Invalid authorization request';

function isMysqlDuplicate(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: string }).code === 'ER_DUP_ENTRY'
  );
}

export const oauthTokenService = {
  async execute(params: {
    grant_type: 'authorization_code';
    code: string;
    redirect_uri: string;
    client_id: string;
  }): Promise<OauthTokenResult> {
    const codeHash = hashRefreshToken(params.code);

    const pool = await getDatabasePool();
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const client = await findActiveClientByKey(connection, params.client_id);
      if (!client) {
        throw new HttpError(400, TOKEN_ERROR);
      }

      const row = await lockValidOAuthCodeByHash(connection, codeHash);
      if (!row) {
        throw new HttpError(400, TOKEN_ERROR);
      }

      if (row.client_id !== client.id) {
        throw new HttpError(400, TOKEN_ERROR);
      }

      if (row.redirect_uri !== params.redirect_uri) {
        throw new HttpError(400, TOKEN_ERROR);
      }

      const sessionOk = await isSessionActiveForUserAndClient(
        connection,
        row.session_id,
        row.user_id,
        row.client_id,
        SESSION_STATUS.ACTIVE
      );
      if (!sessionOk) {
        throw new HttpError(400, TOKEN_ERROR);
      }

      const email = await findUserEmailById(connection, row.user_id);
      if (!email) {
        throw new HttpError(400, TOKEN_ERROR);
      }

      const refreshTokenId = randomUUID();
      const familyId = randomUUID();
      const plainRefresh = generateOpaqueRefreshToken();
      const refreshHash = hashRefreshToken(plainRefresh);
      const now = new Date();
      const refreshExpires = new Date(
        now.getTime() + config.jwt.refreshExpiresDays * 86400000
      );

      await insertRefreshToken(connection, {
        id: refreshTokenId,
        sessionId: row.session_id,
        userId: row.user_id,
        tokenHash: refreshHash,
        familyId,
        issuedAt: now,
        expiresAt: refreshExpires,
      });

      await markOAuthCodeUsed(connection, row.id);

      await connection.commit();

      const accessToken = signAccessToken({
        sub: row.user_id,
        sid: row.session_id,
        email,
      });

      return {
        user: { id: row.user_id, email },
        session: {
          id: row.session_id,
          clientId: client.id,
          clientSlug: row.client_slug,
        },
        accessToken,
        refreshToken: plainRefresh,
      };
    } catch (err) {
      await connection.rollback();
      if (err instanceof HttpError) {
        throw err;
      }
      if (isMysqlDuplicate(err)) {
        throw new HttpError(409, 'Token conflict');
      }
      throw err;
    } finally {
      connection.release();
    }
  },
};
