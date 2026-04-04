import { authApiBase } from '@/config';
import { tokens } from '@/lib/tokens';

async function readJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  let body: unknown;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Некорректный JSON (${res.status})`);
  }
  if (!res.ok) {
    const msg =
      body &&
      typeof body === 'object' &&
      'error' in body &&
      body.error &&
      typeof (body.error as { message?: string }).message === 'string'
        ? (body.error as { message: string }).message
        : `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return body as T;
}

export type MeResponse = {
  user: {
    id: string;
    email: string;
    username: string | null;
    firstName: string | null;
    lastName: string | null;
    avatarUrl: string | null;
  };
  session: { id: string; clientId: string; clientSlug: string; clientName: string };
};

export async function fetchMe(): Promise<MeResponse> {
  const access = tokens.getAccess();
  if (!access) {
    throw new Error('Нет access-токена');
  }
  const res = await fetch(`${authApiBase}/auth/me`, {
    headers: { Authorization: `Bearer ${access}` },
  });
  return readJson<MeResponse>(res);
}

export type TokenResponse = {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string };
};

export async function exchangeOAuthCode(code: string, redirectUri: string, clientId: string): Promise<TokenResponse> {
  const res = await fetch(`${authApiBase}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
    }),
  });
  return readJson<TokenResponse>(res);
}
