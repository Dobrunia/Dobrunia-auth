import { clientConfig } from '@/config';

/** Разрешён только URL вида `{API}/oauth/authorize?...` (тот же origin, что у API). */
export function isAllowedOAuthReturnUrl(returnUrl: string): boolean {
  let u: URL;
  try {
    u = new URL(returnUrl);
  } catch {
    return false;
  }
  const apiOrigin = new URL(clientConfig.apiUrl).origin;
  if (u.origin !== apiOrigin) {
    return false;
  }
  return u.pathname === '/oauth/authorize';
}

export function oauthClientKeyFromReturnUrl(returnUrl: string): string | null {
  try {
    const u = new URL(returnUrl);
    const id = u.searchParams.get('client_id');
    return id && id.length > 0 ? id : null;
  } catch {
    return null;
  }
}
