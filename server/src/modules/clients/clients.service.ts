import { randomUUID } from 'crypto';
import { getDatabasePool } from '../../db/database';
import { HttpError } from '../../middleware/error.middleware';
import type { RegisteredClientDto } from '../../types/client-registration.types';
import type { ClientRegistrationBody } from '../../utils/schemas/client-registration.schema';
import { Log } from '../../utils/log';
import { insertClient, listClientsByOwner } from './client.repository';

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
      return await listClientsByOwner(connection, ownerUserId);
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
};
