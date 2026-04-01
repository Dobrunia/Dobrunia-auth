import { REVOKE_REASON, SESSION_STATUS } from '../../../constants/auth.constants';
import { getDatabasePool } from '../../../db/database';
import { hashRefreshToken } from '../token.utils';
import type { LogoutBody } from '../../../types/logout.types';
import {
  findActiveRefreshTokenByHash,
  revokeRefreshTokenById,
} from '../refresh-token.repository';
import { revokeSessionById } from '../../sessions/session.repository';

export const logoutService = {
  /**
   * Отзывает refresh-токен и помечает сессию revoked.
   * Если токен не найден / просрочен / уже отозван — без ошибки (идемпотентно).
   */
  async execute(body: LogoutBody): Promise<void> {
    const tokenHash = hashRefreshToken(body.refreshToken);
    const pool = await getDatabasePool();
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const row = await findActiveRefreshTokenByHash(connection, tokenHash);
      if (!row) {
        await connection.commit();
        return;
      }

      await revokeRefreshTokenById(connection, row.id, REVOKE_REASON.LOGOUT);
      await revokeSessionById(
        connection,
        row.session_id,
        SESSION_STATUS.REVOKED,
        REVOKE_REASON.LOGOUT,
        SESSION_STATUS.ACTIVE
      );

      await connection.commit();
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  },
};
