import { randomUUID } from 'crypto';
import { REVOKE_REASON, SESSION_STATUS } from '../../constants/auth.constants';
import { getDatabasePool } from '../../db/database';
import { HttpError } from '../../middleware/error.middleware';
import type {
  ManagedClientSessionDto,
  RegisteredClientDto,
} from '../../types/client-registration.types';
import type {
  ClientRegistrationBody,
  ClientUpdateBody,
} from '../../utils/schemas/client-registration.schema';
import { Log } from '../../utils/log';
import { revokeAllActiveRefreshTokensForSession } from '../auth/refresh-token.repository';
import { revokeSessionById } from '../sessions/session.repository';
import {
  deleteClientByOwner,
  findActiveSessionForClient,
  findClientByIdForOwner,
  insertClient,
  listActiveSessionsForOwnedClient,
  listClientsByOwner,
  updateClientByOwner,
} from './client.repository';

function isMysqlDuplicate(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: string }).code === 'ER_DUP_ENTRY'
  );
}

export const clientsService = {
  async listMine(ownerUserId: string): Promise<RegisteredClientDto[]> {
    const pool = await getDatabasePool();
    const connection = await pool.getConnection();

    try {
      return await listClientsByOwner(connection, ownerUserId, SESSION_STATUS.ACTIVE);
    } finally {
      connection.release();
    }
  },

  async register(ownerUserId: string, body: ClientRegistrationBody): Promise<RegisteredClientDto> {
    const pool = await getDatabasePool();
    const connection = await pool.getConnection();
    const id = randomUUID();
    const createdAt = new Date();

    try {
      await connection.beginTransaction();
      await insertClient(connection, {
        id,
        ownerUserId,
        name: body.name,
        slug: body.slug,
        description: body.description || null,
        baseUrl: body.baseUrl ?? null,
        logoUrl: body.logoUrl ?? null,
        redirectUris: body.redirectUris,
        createdAt,
      });
      await connection.commit();

      Log.success('OAuth client registered', {
        clientId: id,
        clientSlug: body.slug,
        ownerUserId,
      });

      return {
        id,
        name: body.name,
        slug: body.slug,
        description: body.description || null,
        baseUrl: body.baseUrl ?? null,
        logoUrl: body.logoUrl ?? null,
        redirectUris: body.redirectUris,
        isActive: true,
        activeSessionCount: 0,
        activeUserCount: 0,
        createdAt: createdAt.toISOString(),
      };
    } catch (error) {
      await connection.rollback();
      if (isMysqlDuplicate(error)) {
        throw new HttpError(409, 'Client slug already exists');
      }
      throw error;
    } finally {
      connection.release();
    }
  },

  async update(
    ownerUserId: string,
    clientId: string,
    body: ClientUpdateBody
  ): Promise<RegisteredClientDto> {
    const pool = await getDatabasePool();
    const connection = await pool.getConnection();

    try {
      const current = await findClientByIdForOwner(
        connection,
        clientId,
        ownerUserId,
        SESSION_STATUS.ACTIVE
      );
      if (!current) {
        throw new HttpError(404, 'Client not found');
      }

      const updated = await updateClientByOwner(connection, clientId, ownerUserId, {
        name: body.name ?? current.name,
        slug: body.slug ?? current.slug,
        description:
          body.description === undefined ? current.description : body.description || null,
        baseUrl: body.baseUrl === undefined ? current.baseUrl : body.baseUrl || null,
        logoUrl: body.logoUrl === undefined ? current.logoUrl : body.logoUrl || null,
        redirectUris: body.redirectUris ?? current.redirectUris,
        isActive: body.isActive ?? current.isActive,
      });
      if (!updated) {
        throw new HttpError(404, 'Client not found');
      }

      const result = await findClientByIdForOwner(
        connection,
        clientId,
        ownerUserId,
        SESSION_STATUS.ACTIVE
      );
      if (!result) {
        throw new HttpError(404, 'Client not found');
      }

      Log.info('OAuth client updated', { clientId, ownerUserId });
      return result;
    } catch (error) {
      if (isMysqlDuplicate(error)) {
        throw new HttpError(409, 'Client slug already exists');
      }
      throw error;
    } finally {
      connection.release();
    }
  },

  async delete(ownerUserId: string, clientId: string): Promise<void> {
    const pool = await getDatabasePool();
    const connection = await pool.getConnection();

    try {
      const deleted = await deleteClientByOwner(connection, clientId, ownerUserId);
      if (!deleted) {
        throw new HttpError(404, 'Client not found');
      }
      Log.info('OAuth client deleted', { clientId, ownerUserId });
    } finally {
      connection.release();
    }
  },

  async listManagedSessions(
    ownerUserId: string,
    clientId: string
  ): Promise<ManagedClientSessionDto[]> {
    const pool = await getDatabasePool();
    const connection = await pool.getConnection();

    try {
      const client = await findClientByIdForOwner(
        connection,
        clientId,
        ownerUserId,
        SESSION_STATUS.ACTIVE
      );
      if (!client) {
        throw new HttpError(404, 'Client not found');
      }
      return await listActiveSessionsForOwnedClient(
        connection,
        clientId,
        SESSION_STATUS.ACTIVE
      );
    } finally {
      connection.release();
    }
  },

  async revokeManagedSession(
    ownerUserId: string,
    clientId: string,
    sessionId: string
  ): Promise<void> {
    const pool = await getDatabasePool();
    const connection = await pool.getConnection();
    let began = false;

    try {
      const client = await findClientByIdForOwner(
        connection,
        clientId,
        ownerUserId,
        SESSION_STATUS.ACTIVE
      );
      if (!client) {
        throw new HttpError(404, 'Session not found');
      }
      const sessionExists = await findActiveSessionForClient(
        connection,
        sessionId,
        clientId,
        SESSION_STATUS.ACTIVE
      );
      if (!sessionExists) {
        throw new HttpError(404, 'Session not found');
      }

      await connection.beginTransaction();
      began = true;
      await revokeAllActiveRefreshTokensForSession(
        connection,
        sessionId,
        REVOKE_REASON.CLIENT_OWNER_REVOKED
      );
      await revokeSessionById(
        connection,
        sessionId,
        SESSION_STATUS.REVOKED,
        REVOKE_REASON.CLIENT_OWNER_REVOKED,
        SESSION_STATUS.ACTIVE
      );
      await connection.commit();
      began = false;

      Log.info('Session revoked by client owner', {
        clientId,
        sessionId,
        ownerUserId,
      });
    } catch (error) {
      if (began) {
        await connection.rollback();
      }
      throw error;
    } finally {
      connection.release();
    }
  },
};
