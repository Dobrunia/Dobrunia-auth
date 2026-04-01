import type { PoolConnection } from 'mysql2/promise';
import type { ClientRow, ClientRowWithOAuth } from '../../types/client.types';

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
