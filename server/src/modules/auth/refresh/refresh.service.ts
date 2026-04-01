import { randomUUID } from 'crypto';
import { REVOKE_REASON, SESSION_STATUS } from '../../../constants/auth.constants';
import { HttpError } from '../../../middleware/error.middleware';
import { getDatabasePool } from '../../../db/database';
import { config } from '../../../config';
import {
  generateOpaqueRefreshToken,
  hashRefreshToken,
  signAccessToken,
} from '../token.utils';
import type { RefreshAuthBody, RefreshAuthResult } from '../../../types/refresh-auth.types';
import {
  findActiveRefreshTokenForRotation,
  insertRefreshToken,
  revokeRefreshTokenReplacedBy,
} from '../refresh-token.repository';
import { Log } from '../../../utils/log';
import { isSessionActiveForUser } from '../../sessions/session.repository';

const REFRESH_INVALID = 'Invalid or expired refresh token';

export const refreshService = {
  /**
   * Проверяет refresh, сессию; выдаёт новый access JWT и новый refresh (ротация).
   */
  async execute(body: RefreshAuthBody): Promise<RefreshAuthResult> {
    const tokenHash = hashRefreshToken(body.refreshToken);
    const pool = await getDatabasePool();
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const row = await findActiveRefreshTokenForRotation(connection, tokenHash);
      if (!row) {
        throw new HttpError(401, REFRESH_INVALID);
      }

      const sessionOk = await isSessionActiveForUser(
        connection,
        row.session_id,
        row.user_id,
        SESSION_STATUS.ACTIVE
      );
      if (!sessionOk) {
        throw new HttpError(401, REFRESH_INVALID);
      }

      const newTokenId = randomUUID();
      const plainRefresh = generateOpaqueRefreshToken();
      const newHash = hashRefreshToken(plainRefresh);
      const now = new Date();
      const refreshExpires = new Date(
        now.getTime() + config.jwt.refreshExpiresDays * 86400000
      );
      const familyId = row.family_id ?? row.id;

      await insertRefreshToken(connection, {
        id: newTokenId,
        sessionId: row.session_id,
        userId: row.user_id,
        tokenHash: newHash,
        familyId,
        issuedAt: now,
        expiresAt: refreshExpires,
        previousTokenId: row.id,
      });

      await revokeRefreshTokenReplacedBy(
        connection,
        row.id,
        newTokenId,
        REVOKE_REASON.ROTATED
      );

      await connection.commit();

      const accessToken = signAccessToken({
        sub: row.user_id,
        sid: row.session_id,
        email: row.email,
      });

      Log.info('Refresh token rotated', {
        userId: row.user_id,
        sessionId: row.session_id,
      });

      return { accessToken, refreshToken: plainRefresh };
    } catch (err) {
      await connection.rollback();
      if (err instanceof HttpError) {
        throw err;
      }
      throw err;
    } finally {
      connection.release();
    }
  },
};
