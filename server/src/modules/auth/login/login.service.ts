import { randomUUID } from 'crypto';
import { SESSION_STATUS } from '../../../constants/auth.constants';
import { HttpError } from '../../../middleware/error.middleware';
import { getDatabasePool } from '../../../db/database';
import { config } from '../../../config';
import { verifyPassword } from '../../../utils/password';
import {
  generateOpaqueRefreshToken,
  hashRefreshToken,
  signAccessToken,
} from '../token.utils';
import type { LoginBody, LoginContext, LoginResult } from '../../../types/login.types';
import { findActiveClientByKey } from '../../clients/client.repository';
import {
  findUserForPasswordAuth,
  updateUserLastLogin,
} from '../../users/user.repository';
import { insertSession } from '../../sessions/session.repository';
import { insertRefreshToken } from '../refresh-token.repository';

const LOGIN_FAILED_MESSAGE = 'Invalid email or password';

function isMysqlDuplicate(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: string }).code === 'ER_DUP_ENTRY'
  );
}

export const loginService = {
  async execute(body: LoginBody, ctx: LoginContext): Promise<LoginResult> {
    const clientKey = body.clientSlug ?? body.clientId;
    if (!clientKey) {
      throw new HttpError(400, 'Either clientId or clientSlug is required');
    }

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
        throw new HttpError(401, LOGIN_FAILED_MESSAGE);
      }

      const user = await findUserForPasswordAuth(connection, body.email);
      if (!user) {
        throw new HttpError(401, LOGIN_FAILED_MESSAGE);
      }
      if (!user.is_active) {
        throw new HttpError(401, LOGIN_FAILED_MESSAGE);
      }
      if (user.password_hash == null) {
        throw new HttpError(401, LOGIN_FAILED_MESSAGE);
      }

      const passwordOk = await verifyPassword(user.password_hash, body.password);
      if (!passwordOk) {
        throw new HttpError(401, LOGIN_FAILED_MESSAGE);
      }

      await updateUserLastLogin(connection, user.id);

      await insertSession(connection, {
        id: sessionId,
        userId: user.id,
        clientId: client.id,
        status: SESSION_STATUS.ACTIVE,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      });

      await insertRefreshToken(connection, {
        id: refreshTokenId,
        sessionId,
        userId: user.id,
        tokenHash: refreshHash,
        familyId,
        issuedAt: now,
        expiresAt: refreshExpires,
      });

      await connection.commit();

      const accessToken = signAccessToken({
        sub: user.id,
        sid: sessionId,
        email: user.email,
      });

      return {
        user: { id: user.id, email: user.email },
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
        throw new HttpError(409, 'Session conflict');
      }
      throw err;
    } finally {
      connection.release();
    }
  },
};
