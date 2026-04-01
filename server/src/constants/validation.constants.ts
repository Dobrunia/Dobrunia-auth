/** Правила длины и лимиты для валидации входных данных */
export const PASSWORD_LENGTH = {
  MIN: 8,
  MAX: 128,
} as const;

/** Макс. длина строки clientId / clientSlug в теле запроса */
export const CLIENT_LOOKUP_KEY_MAX = 255;
