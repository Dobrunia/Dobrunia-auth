import { SESSION_STATUS } from '../../../constants/auth.constants';
import { HttpError } from '../../../middleware/error.middleware';
import { getDatabasePool } from '../../../db/database';
import type { MeResponse } from '../../../types/me.types';
import { findMeContext } from '../../users/me.repository';

const UNAUTHORIZED = 'Invalid or expired access token';

export const meService = {
  async execute(payload: { userId: string; sessionId: string }): Promise<MeResponse> {
    const pool = await getDatabasePool();
    const connection = await pool.getConnection();
    try {
      const row = await findMeContext(
        connection,
        payload.userId,
        payload.sessionId,
        SESSION_STATUS.ACTIVE
      );
      if (!row) {
        throw new HttpError(401, UNAUTHORIZED);
      }

      return {
        user: {
          id: row.user_id,
          email: row.email,
          username: row.username,
          firstName: row.first_name,
          lastName: row.last_name,
          avatarUrl: row.avatar_url,
        },
        session: {
          id: row.session_id,
          clientId: row.client_id,
          clientSlug: row.client_slug,
          clientName: row.client_name,
        },
      };
    } finally {
      connection.release();
    }
  },
};
