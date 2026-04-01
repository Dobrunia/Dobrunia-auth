/**
 * Время жизни токенов: дефолты для env и документации.
 * Реальные значения подставляются в `env.config.ts` из `ACCESS_TOKEN_EXPIRES_SEC` / `REFRESH_TOKEN_EXPIRES_DAYS`.
 */
export const JWT_DEFAULT_ACCESS_EXPIRES_SEC = 3600;

export const JWT_DEFAULT_REFRESH_EXPIRES_DAYS = 30;
