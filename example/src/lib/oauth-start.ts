import { authApiBase, oauthClientId, oauthRedirectUri } from '@/config';

const STATE_KEY = 'dobrunia_example_oauth_state';

export function startDobruniaOAuth(): void {
  const state = crypto.randomUUID();
  sessionStorage.setItem(STATE_KEY, state);
  const u = new URL('/oauth/authorize', authApiBase);
  u.searchParams.set('client_id', oauthClientId);
  u.searchParams.set('redirect_uri', oauthRedirectUri());
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('state', state);
  globalThis.location.assign(u.toString());
}

export function consumeOAuthState(fromQuery: string | null): boolean {
  const expected = sessionStorage.getItem(STATE_KEY);
  sessionStorage.removeItem(STATE_KEY);
  return Boolean(expected && fromQuery && expected === fromQuery);
}
