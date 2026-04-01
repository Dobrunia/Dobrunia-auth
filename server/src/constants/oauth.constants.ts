/** Имя httpOnly-куки: браузерная сессия после логина на /oauth/authorize */
export const OAUTH_BROWSER_COOKIE_NAME = 'dobrunia_oauth';

/** Срок жизни одноразового authorization code (секунды) */
export const OAUTH_AUTH_CODE_EXPIRES_SEC = 600;

/** Max-Age куки браузерной OAuth-сессии (секунды), 7 дней */
export const OAUTH_BROWSER_COOKIE_MAX_AGE_SEC = 604800;
