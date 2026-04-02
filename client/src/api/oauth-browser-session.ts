import { clientConfig } from '@/config';

/**
 * Ставит httpOnly-куку OAuth-сессии на домене API (нужен `credentials: 'include'` + CORS credentials).
 * После успеха можно делать `location.assign(return_url)` на GET /oauth/authorize.
 */
export async function establishOAuthBrowserSession(accessToken: string): Promise<void> {
  const res = await fetch(`${clientConfig.apiUrl}/oauth/browser-session`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    credentials: 'include',
  });
  if (res.status === 204) {
    return;
  }
  let msg = res.statusText || 'Request failed';
  try {
    const body = (await res.json()) as { error?: { message?: string } };
    if (body?.error?.message) {
      msg = body.error.message;
    }
  } catch {
    /* ignore */
  }
  throw new Error(msg);
}
