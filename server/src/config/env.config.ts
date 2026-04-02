import dotenv from 'dotenv';
import { JWT_DEFAULT_ACCESS_EXPIRES_SEC, JWT_DEFAULT_REFRESH_EXPIRES_DAYS } from '../constants/jwt.constants';
import { envSchema } from './env.schema';
import type { Env } from '../types/env.types';
import { mergeCorsOriginsCsv } from '../utils/cors.utils';

dotenv.config();

function parsePositiveInt(raw: string, fallback: number): number {
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error('Invalid environment configuration:');
    console.error(parsed.error.format());
    process.exit(1);
  }

  return parsed.data;
}

const env = loadEnv();

const reflectHttpsOnly =
  env.CORS_REFLECT_HTTPS_ONLY === 'true' || env.CORS_REFLECT_HTTPS_ONLY === '1'
    ? true
    : env.CORS_REFLECT_HTTPS_ONLY === 'false' || env.CORS_REFLECT_HTTPS_ONLY === '0'
      ? false
      : process.env.NODE_ENV === 'production';

export const config = {
  database: {
    url: env.DATABASE_URL,
    host: env.DB_HOST,
    port: parseInt(env.DB_PORT, 10),
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    name: env.DB_NAME,
  },
  jwt: {
    accessSecret: env.JWT_ACCESS_SECRET,
    refreshSecret: env.JWT_REFRESH_SECRET,
    accessExpiresSec: parsePositiveInt(env.ACCESS_TOKEN_EXPIRES_SEC, JWT_DEFAULT_ACCESS_EXPIRES_SEC),
    refreshExpiresDays: parsePositiveInt(env.REFRESH_TOKEN_EXPIRES_DAYS, JWT_DEFAULT_REFRESH_EXPIRES_DAYS),
  },
  app: {
    port: parsePositiveInt(env.PORT, 3000),
    host: env.HOST,
  },
  cors: {
    origins: mergeCorsOriginsCsv(env.CORS_ORIGINS, env.AUTH_WEB_PUBLIC_URL),
    reflectOrigin:
      env.CORS_REFLECT_ORIGIN === '1' || env.CORS_REFLECT_ORIGIN.toLowerCase() === 'true',
    reflectHttpsOnly,
  },
  oauth: {
    authWebPublicUrl: env.AUTH_WEB_PUBLIC_URL.trim().replace(/\/$/, ''),
  },
} as const;
