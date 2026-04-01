/** Ответ POST /oauth/token (как у login/register, camelCase JSON). */
export interface OauthTokenResult {
  user: { id: string; email: string };
  session: { id: string; clientId: string; clientSlug: string };
  accessToken: string;
  refreshToken: string;
}
