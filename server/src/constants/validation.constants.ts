/** Правила длины и лимиты для валидации входных данных */
export const PASSWORD_LENGTH = {
  MIN: 8,
  MAX: 128,
} as const;

/** Макс. длина строки clientId / clientSlug в теле запроса */
export const CLIENT_LOOKUP_KEY_MAX = 255;

/** Лимиты полей профиля пользователя (совпадают с колонками `users`) */
export const PROFILE_FIELD_MAX = {
  USERNAME: 255,
  NAME: 255,
  AVATAR_URL: 2048,
} as const;
