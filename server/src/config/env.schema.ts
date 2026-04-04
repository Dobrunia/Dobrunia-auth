import { z } from 'zod';
import { JWT_DEFAULT_ACCESS_EXPIRES_SEC, JWT_DEFAULT_REFRESH_EXPIRES_DAYS } from '../constants/jwt.constants';

/**
 * Схема переменных окружения (только Zod; тип `Env` — в `src/types/env.types.ts`).
 */
export const envSchema = z.object({
  DATABASE_URL: z.string().default('mysql://root:password@localhost:3306/dobrunia_auth'),
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.string().default('3306'),
  DB_USER: z.string().default('root'),
  DB_PASSWORD: z.string().default('password'),
  DB_NAME: z.string().default('dobrunia_auth'),
  /** Пусто — только DATABASE_URL (TCP). На shared-хостинге часто: /run/mysqld/mysqld.sock */
  MYSQL_SOCKET: z.string().default(''),

  JWT_ACCESS_SECRET: z.string().default('dev-access-secret-min-32-characters-long'),
  JWT_REFRESH_SECRET: z.string().default('dev-refresh-secret-min-32-characters-long'),
  ACCESS_TOKEN_EXPIRES_SEC: z.string().default(String(JWT_DEFAULT_ACCESS_EXPIRES_SEC)),
  REFRESH_TOKEN_EXPIRES_DAYS: z.string().default(String(JWT_DEFAULT_REFRESH_EXPIRES_DAYS)),

  PORT: z.string().default('3000'),
  HOST: z.string().default('localhost'),

  /** Разрешённые Origin для SPA (через запятую). Пустая строка — не слать CORS (кроме режима reflect). */
  CORS_ORIGINS: z
    .string()
    .default('http://localhost:5173,http://localhost:5174'),

  /**
   * Публичный URL SPA (auth-web), без завершающего слэша, напр. https://auth.example.com.
   * Если задан: GET /oauth/authorize без куки редиректит на {URL}/oauth-bridge?return_url=…
   * и его **origin** автоматически добавляется к списку CORS (не нужно дублировать в CORS_ORIGINS).
   */
  AUTH_WEB_PUBLIC_URL: z.string().default(''),

  /**
   * Если true: для любого запроса с заголовком Origin, прошедшим проверку `isReflectableOrigin`,
   * ответ содержит `Access-Control-Allow-Origin: <тот же Origin>` и `Allow-Credentials: true`.
   * Нужно, чтобы браузерные SPA на **любых доменах** (магазины, партнёрские приложения) могли звать API с Bearer/credentials.
   * В production по умолчанию отражаются только https (и localhost/http для dev); см. CORS_REFLECT_HTTPS_ONLY.
   */
  CORS_REFLECT_ORIGIN: z.string().default('false'),

  /**
   * Пусто — при CORS_REFLECT_ORIGIN в production отражать только https (+ localhost http).
   * `false` — разрешить и http-Origin (только если понимаете риски).
   * `true` — только https (+ localhost).
   */
  CORS_REFLECT_HTTPS_ONLY: z.string().default(''),
});
