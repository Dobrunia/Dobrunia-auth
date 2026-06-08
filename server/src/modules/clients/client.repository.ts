import type { PoolConnection, ResultSetHeader } from 'mysql2/promise';
import type {
  ManagedClientSessionDto,
  RegisteredClientDto,
  RegisterClientParams,
  UpdateClientParams,
} from '../../types/client-registration.types';
import type { ClientRow, ClientRowWithOAuth } from '../../types/client.types';

interface OwnedClientRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  base_url: string | null;
  logo_url: string | null;
  oauth_redirect_uris: unknown;
  is_active: number | boolean;
  active_session_count: number | string;
  active_user_count: number | string;
  created_at: Date | string;
}

interface ManagedClientSessionRow {
  id: string;
  user_id: string;
  email: string;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  ip_address: string | null;
  user_agent: string | null;
  last_seen_at: Date | string | null;
  created_at: Date | string;
}

export async function insertClient(
  connection: PoolConnection,
  params: RegisterClientParams
): Promise<void> {
  await connection.execute(
    `INSERT INTO clients (
       id, owner_user_id, name, slug, description, base_url, logo_url,
       is_active, oauth_redirect_uris, created_at, updated_at
     )
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
    [
      params.id,
      params.ownerUserId,
      params.name,
      params.slug,
      params.description,
      params.baseUrl,
      params.logoUrl,
      JSON.stringify(params.redirectUris),
      params.createdAt,
      params.createdAt,
    ]
  );
}

/**
 * Resolve by UUID or slug (same string can match either column).
 */
export async function findActiveClientByKey(
  connection: PoolConnection,
  key: string
): Promise<ClientRow | null> {
  const [rows] = await connection.query(
    `SELECT id, slug, name FROM clients
     WHERE is_active = 1 AND (id = ? OR slug = ?)
     LIMIT 1`,
    [key, key]
  );
  const list = rows as ClientRow[];
  return list[0] ?? null;
}

function parseOauthRedirectUris(raw: unknown): string[] {
  if (raw == null) {
    return [];
  }
  if (Array.isArray(raw)) {
    return raw.filter((x): x is string => typeof x === 'string');
  }
  if (Buffer.isBuffer(raw)) {
    try {
      const parsed = JSON.parse(raw.toString('utf8')) as unknown;
      return Array.isArray(parsed)
        ? parsed.filter((x): x is string => typeof x === 'string')
        : [];
    } catch {
      return [];
    }
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed)
        ? parsed.filter((x): x is string => typeof x === 'string')
        : [];
    } catch {
      return [];
    }
  }
  return [];
}

export async function listClientsByOwner(
  connection: PoolConnection,
  ownerUserId: string,
  activeStatus: string
): Promise<RegisteredClientDto[]> {
  const [rows] = await connection.query(
    `SELECT
       c.id, c.name, c.slug, c.description, c.base_url, c.logo_url,
       c.oauth_redirect_uris, c.is_active, c.created_at,
       COUNT(s.id) AS active_session_count,
       COUNT(DISTINCT s.user_id) AS active_user_count
     FROM clients c
     LEFT JOIN sessions s ON s.client_id = c.id AND s.status = ?
     WHERE c.owner_user_id = ?
     GROUP BY
       c.id, c.name, c.slug, c.description, c.base_url, c.logo_url,
       c.oauth_redirect_uris, c.is_active, c.created_at
     ORDER BY c.created_at DESC`,
    [activeStatus, ownerUserId]
  );

  return (rows as OwnedClientRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    baseUrl: row.base_url,
    logoUrl: row.logo_url,
    redirectUris: parseOauthRedirectUris(row.oauth_redirect_uris),
    isActive: Boolean(row.is_active),
    activeSessionCount: Number(row.active_session_count),
    activeUserCount: Number(row.active_user_count),
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : new Date(row.created_at).toISOString(),
  }));
}

export async function findClientByIdForOwner(
  connection: PoolConnection,
  clientId: string,
  ownerUserId: string,
  activeStatus: string
): Promise<RegisteredClientDto | null> {
  const [rows] = await connection.query(
    `SELECT
       c.id, c.name, c.slug, c.description, c.base_url, c.logo_url,
       c.oauth_redirect_uris, c.is_active, c.created_at,
       COUNT(s.id) AS active_session_count,
       COUNT(DISTINCT s.user_id) AS active_user_count
     FROM clients c
     LEFT JOIN sessions s ON s.client_id = c.id AND s.status = ?
     WHERE c.id = ? AND c.owner_user_id = ?
     GROUP BY
       c.id, c.name, c.slug, c.description, c.base_url, c.logo_url,
       c.oauth_redirect_uris, c.is_active, c.created_at
     LIMIT 1`,
    [activeStatus, clientId, ownerUserId]
  );
  const row = (rows as OwnedClientRow[])[0];
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    baseUrl: row.base_url,
    logoUrl: row.logo_url,
    redirectUris: parseOauthRedirectUris(row.oauth_redirect_uris),
    isActive: Boolean(row.is_active),
    activeSessionCount: Number(row.active_session_count),
    activeUserCount: Number(row.active_user_count),
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : new Date(row.created_at).toISOString(),
  };
}

export async function updateClientByOwner(
  connection: PoolConnection,
  clientId: string,
  ownerUserId: string,
  params: UpdateClientParams
): Promise<boolean> {
  const [result] = await connection.execute<ResultSetHeader>(
    `UPDATE clients SET
       name = ?,
       slug = ?,
       description = ?,
       base_url = ?,
       logo_url = ?,
       oauth_redirect_uris = ?,
       is_active = ?,
       updated_at = CURRENT_TIMESTAMP(3)
     WHERE id = ? AND owner_user_id = ?`,
    [
      params.name,
      params.slug,
      params.description,
      params.baseUrl,
      params.logoUrl,
      JSON.stringify(params.redirectUris),
      params.isActive ? 1 : 0,
      clientId,
      ownerUserId,
    ]
  );
  return result.affectedRows > 0;
}

export async function deleteClientByOwner(
  connection: PoolConnection,
  clientId: string,
  ownerUserId: string
): Promise<boolean> {
  const [result] = await connection.execute<ResultSetHeader>(
    'DELETE FROM clients WHERE id = ? AND owner_user_id = ?',
    [clientId, ownerUserId]
  );
  return result.affectedRows > 0;
}

export async function listActiveSessionsForOwnedClient(
  connection: PoolConnection,
  clientId: string,
  activeStatus: string
): Promise<ManagedClientSessionDto[]> {
  const [rows] = await connection.query(
    `SELECT
       s.id, s.user_id, s.ip_address, s.user_agent, s.last_seen_at, s.created_at,
       u.email, u.username, u.first_name, u.last_name
     FROM sessions s
     INNER JOIN users u ON u.id = s.user_id
     WHERE s.client_id = ? AND s.status = ?
     ORDER BY (s.last_seen_at IS NULL), s.last_seen_at DESC, s.created_at DESC`,
    [clientId, activeStatus]
  );

  return (rows as ManagedClientSessionRow[]).map((row) => {
    const fullName = [row.first_name, row.last_name].filter(Boolean).join(' ');
    return {
      id: row.id,
      userId: row.user_id,
      userEmail: row.email,
      userDisplayName: fullName || row.username || null,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      lastSeenAt:
        row.last_seen_at == null
          ? null
          : row.last_seen_at instanceof Date
            ? row.last_seen_at.toISOString()
            : new Date(row.last_seen_at).toISOString(),
      createdAt:
        row.created_at instanceof Date
          ? row.created_at.toISOString()
          : new Date(row.created_at).toISOString(),
    };
  });
}

export async function findActiveSessionForClient(
  connection: PoolConnection,
  sessionId: string,
  clientId: string,
  activeStatus: string
): Promise<boolean> {
  const [rows] = await connection.query(
    `SELECT 1 AS ok FROM sessions
     WHERE id = ? AND client_id = ? AND status = ?
     LIMIT 1`,
    [sessionId, clientId, activeStatus]
  );
  return (rows as { ok: number }[]).length > 0;
}

/**
 * Клиент с разрешёнными redirect_uri для OAuth authorize.
 */
export async function findActiveClientWithOAuthRedirects(
  connection: PoolConnection,
  clientKey: string
): Promise<ClientRowWithOAuth | null> {
  const [rows] = await connection.query(
    `SELECT id, slug, name, oauth_redirect_uris FROM clients
     WHERE is_active = 1 AND (id = ? OR slug = ?)
     LIMIT 1`,
    [clientKey, clientKey]
  );
  const list = rows as (ClientRow & { oauth_redirect_uris: unknown })[];
  const row = list[0];
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    oauthRedirectUris: parseOauthRedirectUris(row.oauth_redirect_uris),
  };
}
