import { clientConfig } from '@/config';
import { ROUTES } from '@/constants/app.constants';
import { tokenStorage } from '@/lib/token-storage';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type ApiJsonInit = RequestInit & { auth?: boolean; _retryAfterRefresh?: boolean };

async function tryRefreshTokens(): Promise<{ accessToken: string; refreshToken: string } | null> {
  const rt = tokenStorage.getRefresh();
  if (!rt) {
    return null;
  }
  const res = await fetch(`${clientConfig.apiUrl}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: rt }),
  });
  if (!res.ok) {
    return null;
  }
  const data: unknown = await res.json();
  if (
    data &&
    typeof data === 'object' &&
    typeof (data as { accessToken?: unknown }).accessToken === 'string' &&
    typeof (data as { refreshToken?: unknown }).refreshToken === 'string'
  ) {
    return {
      accessToken: (data as { accessToken: string }).accessToken,
      refreshToken: (data as { refreshToken: string }).refreshToken,
    };
  }
  return null;
}

export async function apiJson<T>(path: string, init: ApiJsonInit = {}): Promise<T> {
  const { auth, _retryAfterRefresh, headers: h, ...rest } = init;
  const headers = new Headers(h);
  if (!headers.has('Content-Type') && rest.body != null && typeof rest.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }
  if (auth) {
    const t = tokenStorage.getAccess();
    if (t) {
      headers.set('Authorization', `Bearer ${t}`);
    }
  }

  const res = await fetch(`${clientConfig.apiUrl}${path}`, {
    ...rest,
    headers,
  });

  if (res.status === 204) {
    return undefined as T;
  }

  let body: unknown;
  const text = await res.text();
  if (text) {
    try {
      body = JSON.parse(text) as unknown;
    } catch {
      body = { raw: text };
    }
  }

  if (!res.ok) {
    const msg =
      body &&
      typeof body === 'object' &&
      body !== null &&
      'error' in body &&
      typeof (body as { error?: { message?: string } }).error?.message === 'string'
        ? (body as { error: { message: string } }).error.message
        : res.statusText || 'Request failed';

    if (res.status === 401 && auth) {
      if (!_retryAfterRefresh) {
        const next = await tryRefreshTokens();
        if (next) {
          tokenStorage.setTokens(next.accessToken, next.refreshToken);
          return apiJson<T>(path, { ...init, auth: true, _retryAfterRefresh: true });
        }
      }
      tokenStorage.clear();
      const loc = globalThis.location;
      const here = `${loc.pathname}${loc.search}`;
      const skipReturn = here === ROUTES.LOGIN || here.startsWith(`${ROUTES.LOGIN}?`);
      const suffix = skipReturn ? '' : `?returnTo=${encodeURIComponent(here)}`;
      loc.assign(`${ROUTES.LOGIN}${suffix}`);
    }

    throw new ApiError(msg, res.status);
  }

  return body as T;
}
