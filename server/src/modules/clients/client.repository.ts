import type { PoolConnection } from 'mysql2/promise';
import type {
  RegisteredClientDto,
  RegisterClientParams,
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
  ownerUserId: string
): Promise<RegisteredClientDto[]> {
  const [rows] = await connection.query(
    `SELECT id, name, slug, description, base_url, logo_url,
            oauth_redirect_uris, is_active, created_at
     FROM clients
     WHERE owner_user_id = ?
     ORDER BY created_at DESC`,
    [ownerUserId]
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
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : new Date(row.created_at).toISOString(),
  }));
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
