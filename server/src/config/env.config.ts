import dotenv from 'dotenv';
import { envSchema } from './env.schema';
import type { Env } from '../types/env.types';

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
    accessExpiresSec: parsePositiveInt(env.ACCESS_TOKEN_EXPIRES_SEC, 900),
    refreshExpiresDays: parsePositiveInt(env.REFRESH_TOKEN_EXPIRES_DAYS, 30),
  },
  app: {
    port: parsePositiveInt(env.PORT, 3000),
    host: env.HOST,
  },
  cors: {
    origins: parseCorsOrigins(env.CORS_ORIGINS),
  },
} as const;

function parseCorsOrigins(raw: string): string[] {
  const t = raw.trim();
  if (t === '') {
    return [];
  }
  return t
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}
