import dotenv from 'dotenv';
import { envSchema } from './env.schema';
import type { Env } from '../types/env.types';

dotenv.config();

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
    accessExpiresSec: parseInt(env.ACCESS_TOKEN_EXPIRES_SEC, 10),
    refreshExpiresDays: parseInt(env.REFRESH_TOKEN_EXPIRES_DAYS, 10),
  },
  app: {
    port: parseInt(env.PORT, 10),
    host: env.HOST,
  },
} as const;
