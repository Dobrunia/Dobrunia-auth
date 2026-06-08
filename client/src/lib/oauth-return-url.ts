import { clientConfig } from '@/config';

const BRIDGE_ATTEMPT_PARAM = '_dobrunia_bridge_attempt';

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
  if (u.pathname !== '/oauth/authorize' || u.hash !== '') {
    return false;
  }

  const responseTypes = u.searchParams.getAll('response_type');
  const clientIds = u.searchParams.getAll('client_id');
  const redirectUris = u.searchParams.getAll('redirect_uri');
  const states = u.searchParams.getAll('state');

  if (
    responseTypes.length !== 1 ||
    responseTypes[0] !== 'code' ||
    clientIds.length !== 1 ||
    !clientIds[0] ||
    redirectUris.length !== 1 ||
    !redirectUris[0] ||
    states.length > 1
  ) {
    return false;
  }

  try {
    const redirect = new URL(redirectUris[0]);
    return redirect.protocol === 'http:' || redirect.protocol === 'https:';
  } catch {
    return false;
  }
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

export function hasOAuthBridgeAttempt(returnUrl: string): boolean {
  try {
    return new URL(returnUrl).searchParams.get(BRIDGE_ATTEMPT_PARAM) === '1';
  } catch {
    return false;
  }
}

export function markOAuthBridgeAttempt(returnUrl: string): string {
  const url = new URL(returnUrl);
  url.searchParams.set(BRIDGE_ATTEMPT_PARAM, '1');
  return url.toString();
}

export function clearOAuthBridgeAttempt(returnUrl: string): string {
  const url = new URL(returnUrl);
  url.searchParams.delete(BRIDGE_ATTEMPT_PARAM);
  return url.toString();
}
