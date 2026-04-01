import { SESSION_STATUS } from '../../../constants/auth.constants';
import { HttpError } from '../../../middleware/error.middleware';
import { getDatabasePool } from '../../../db/database';
import { findMeContext } from '../../users/me.repository';
import {
  deleteUserById,
  findUserIdByUsernameExcluding,
  updateUserProfile,
} from '../../users/user.repository';
import type { MeResponse } from '../../../types/me.types';
import type { ProfilePatchBody } from '../../../utils/schemas/profile.schema';
import { Log } from '../../../utils/log';

const UNAUTHORIZED = 'Invalid or expired access token';

export const profileService = {
  async updateProfile(
    userId: string,
    sessionId: string,
    body: ProfilePatchBody
  ): Promise<MeResponse> {
    const pool = await getDatabasePool();
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const ctx = await findMeContext(
        connection,
        userId,
        sessionId,
        SESSION_STATUS.ACTIVE
      );
      if (!ctx) {
        throw new HttpError(401, UNAUTHORIZED);
      }

      if (body.username !== null) {
        const taken = await findUserIdByUsernameExcluding(connection, body.username, userId);
        if (taken) {
          throw new HttpError(409, 'Username already taken');
        }
      }

      await updateUserProfile(connection, userId, {
        username: body.username,
        firstName: body.firstName,
        lastName: body.lastName,
        avatarUrl: body.avatarUrl,
      });

      await connection.commit();

      const row = await findMeContext(
        connection,
        userId,
        sessionId,
        SESSION_STATUS.ACTIVE
      );
      if (!row) {
        throw new HttpError(401, UNAUTHORIZED);
      }

      Log.info('User profile updated', { userId });

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
    } catch (e) {
      await connection.rollback();
      throw e;
    } finally {
      connection.release();
    }
  },

  async deleteAccount(userId: string, sessionId: string): Promise<void> {
    const pool = await getDatabasePool();
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const ctx = await findMeContext(
        connection,
        userId,
        sessionId,
        SESSION_STATUS.ACTIVE
      );
      if (!ctx) {
        throw new HttpError(401, UNAUTHORIZED);
      }

      await deleteUserById(connection, userId);
      await connection.commit();

      Log.success('User account deleted (cascade)', { userId });
    } catch (e) {
      await connection.rollback();
      throw e;
    } finally {
      connection.release();
    }
  },
};
