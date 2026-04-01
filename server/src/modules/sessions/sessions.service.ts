import { REVOKE_REASON, SESSION_STATUS } from '../../constants/auth.constants';
import { HttpError } from '../../middleware/error.middleware';
import { getDatabasePool } from '../../db/database';
import { findActiveClientByKey } from '../clients/client.repository';
import { revokeAllActiveRefreshTokensForSession } from '../auth/refresh-token.repository';
import {
  findSessionByIdForUser,
  listSessionsForUser,
  listSessionsForUserAndClient,
  revokeSessionById,
} from './session.repository';
import type {
  SessionListItemDto,
  SessionListResponse,
  SessionListRow,
} from '../../types/session-list.types';
import { Log } from '../../utils/log';

function toIso(value: Date | string | null | undefined): string | null {
  if (value == null) {
    return null;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function mapRow(row: SessionListRow): SessionListItemDto {
  return {
    id: row.id,
    status: row.status,
    clientId: row.client_id,
    clientSlug: row.client_slug,
    clientName: row.client_name,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    lastSeenAt: toIso(row.last_seen_at),
    createdAt: toIso(row.created_at) ?? '',
    revokedAt: toIso(row.revoked_at),
    revokeReason: row.revoke_reason,
  };
}

export const sessionsService = {
  async listForUser(userId: string): Promise<SessionListResponse> {
    const pool = await getDatabasePool();
    const connection = await pool.getConnection();
    try {
      const rows = await listSessionsForUser(connection, userId);
      return { sessions: rows.map(mapRow) };
    } finally {
      connection.release();
    }
  },

  async listForUserByClientKey(userId: string, clientKey: string): Promise<SessionListResponse> {
    const pool = await getDatabasePool();
    const connection = await pool.getConnection();
    try {
      const client = await findActiveClientByKey(connection, clientKey);
      if (!client) {
        throw new HttpError(404, 'Client not found');
      }
      const rows = await listSessionsForUserAndClient(connection, userId, client.id);
      return { sessions: rows.map(mapRow) };
    } finally {
      connection.release();
    }
  },

  /**
   * Отзыв сессии и всех связанных refresh (идемпотентно: уже отозванная сессия → 204).
   */
  async revokeSessionForUser(userId: string, sessionId: string): Promise<void> {
    const pool = await getDatabasePool();
    const connection = await pool.getConnection();
    let began = false;
    try {
      const owned = await findSessionByIdForUser(connection, sessionId, userId);
      if (!owned) {
        throw new HttpError(404, 'Session not found');
      }

      await connection.beginTransaction();
      began = true;

      await revokeAllActiveRefreshTokensForSession(
        connection,
        sessionId,
        REVOKE_REASON.SESSION_REVOKED
      );
      await revokeSessionById(
        connection,
        sessionId,
        SESSION_STATUS.REVOKED,
        REVOKE_REASON.SESSION_REVOKED,
        SESSION_STATUS.ACTIVE
      );

      await connection.commit();
      began = false;

      Log.info('Session revoked by user (dashboard)', { userId, sessionId });
    } catch (e) {
      if (began) {
        await connection.rollback();
      }
      throw e;
    } finally {
      connection.release();
    }
  },
};
