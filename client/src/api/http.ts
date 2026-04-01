import { clientConfig } from '@/config';
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

export async function apiJson<T>(
  path: string,
  init: RequestInit & { auth?: boolean } = {}
): Promise<T> {
  const { auth, headers: h, ...rest } = init;
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
    throw new ApiError(msg, res.status);
  }

  return body as T;
}
