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

  JWT_ACCESS_SECRET: z.string().default('dev-access-secret-min-32-characters-long'),
  JWT_REFRESH_SECRET: z.string().default('dev-refresh-secret-min-32-characters-long'),
  ACCESS_TOKEN_EXPIRES_SEC: z.string().default(String(JWT_DEFAULT_ACCESS_EXPIRES_SEC)),
  REFRESH_TOKEN_EXPIRES_DAYS: z.string().default(String(JWT_DEFAULT_REFRESH_EXPIRES_DAYS)),

  PORT: z.string().default('3000'),
  HOST: z.string().default('localhost'),

  /** Разрешённые Origin для SPA auth-web (через запятую). Пустая строка — не слать CORS. */
  CORS_ORIGINS: z
    .string()
    .default('http://localhost:5173,http://localhost:5174'),
});
