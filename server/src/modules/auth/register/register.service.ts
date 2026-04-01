import { randomUUID } from 'crypto';
import { SESSION_STATUS } from '../../../constants/auth.constants';
import { HttpError } from '../../../middleware/error.middleware';
import { getDatabasePool } from '../../../db/database';
import { config } from '../../../config';
import { hashPassword } from '../../../utils/password';
import {
  generateOpaqueRefreshToken,
  hashRefreshToken,
  signAccessToken,
} from '../token.utils';
import type { RegisterBody, RegisterContext, RegisterResult } from '../../../types/register.types';
import { Log } from '../../../utils/log';
import { findActiveClientByKey } from '../../clients/client.repository';
import { findUserIdByEmail, insertUser } from '../../users/user.repository';
import { insertSession } from '../../sessions/session.repository';
import { insertRefreshToken } from '../refresh-token.repository';

function isMysqlDuplicate(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: string }).code === 'ER_DUP_ENTRY'
  );
}

export const registerService = {
  async execute(body: RegisterBody, ctx: RegisterContext): Promise<RegisterResult> {
    const clientKey = body.clientSlug ?? body.clientId;
    if (!clientKey) {
      throw new HttpError(400, 'Either clientId or clientSlug is required');
    }

    const userId = randomUUID();
    const sessionId = randomUUID();
    const refreshTokenId = randomUUID();
    const familyId = randomUUID();
    const plainRefresh = generateOpaqueRefreshToken();
    const refreshHash = hashRefreshToken(plainRefresh);

    const now = new Date();
    const refreshExpires = new Date(
      now.getTime() + config.jwt.refreshExpiresDays * 86400000
    );

    const pool = await getDatabasePool();
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const client = await findActiveClientByKey(connection, clientKey);
      if (!client) {
        throw new HttpError(400, 'Unknown or inactive client');
      }

      const existingId = await findUserIdByEmail(connection, body.email);
      if (existingId) {
        throw new HttpError(409, 'Email already registered');
      }

      const passwordHash = await hashPassword(body.password);
      await insertUser(connection, {
        id: userId,
        email: body.email,
        passwordHash,
      });

      await insertSession(connection, {
        id: sessionId,
        userId,
        clientId: client.id,
        status: SESSION_STATUS.ACTIVE,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      });

      await insertRefreshToken(connection, {
        id: refreshTokenId,
        sessionId,
        userId,
        tokenHash: refreshHash,
        familyId,
        issuedAt: now,
        expiresAt: refreshExpires,
      });

      const accessToken = signAccessToken({
        sub: userId,
        sid: sessionId,
        email: body.email,
      });

      await connection.commit();

      Log.success('User registered', {
        userId,
        email: body.email,
        clientSlug: client.slug,
        sessionId,
      });

      return {
        user: { id: userId, email: body.email },
        session: {
          id: sessionId,
          clientId: client.id,
          clientSlug: client.slug,
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
        throw new HttpError(409, 'Email already registered');
      }
      throw err;
    } finally {
      connection.release();
    }
  },
};
