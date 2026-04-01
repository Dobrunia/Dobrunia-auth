const apiUrl = import.meta.env.VITE_AUTH_API_URL ?? 'http://localhost:3000';
const clientId = import.meta.env.VITE_OAUTH_CLIENT_ID ?? 'dobrunia-auth-example';

export const authApiBase = apiUrl.replace(/\/$/, '');
export const oauthClientId = clientId;

/** Callback на этом origin (должен совпадать с oauth_redirect_uris клиента в БД). */
export function oauthRedirectUri(): string {
  return `${globalThis.location.origin}/oauth/callback`;
}
