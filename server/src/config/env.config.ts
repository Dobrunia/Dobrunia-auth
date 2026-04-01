import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

/**
 * Environment variables schema with sensible defaults
 * If env variable exists - use it, otherwise use default
 * No NODE_ENV branching - explicit values only
 */

const envSchema = z.object({
  // Database - MySQL 8 defaults
  DATABASE_URL: z.string().default('mysql://root:password@localhost:3306/dobrunia_auth'),
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.string().default('3306'),
  DB_USER: z.string().default('root'),
  DB_PASSWORD: z.string().default('password'),
  DB_NAME: z.string().default('dobrunia_auth'),

  // JWT secrets - must be provided in production
  JWT_ACCESS_SECRET: z.string().default('dev-access-secret-min-32-characters-long'),
  JWT_REFRESH_SECRET: z.string().default('dev-refresh-secret-min-32-characters-long'),

  // Server
  PORT: z.string().default('3000'),
  HOST: z.string().default('localhost'),
});

export type Env = z.infer<typeof envSchema>;

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
  },
  app: {
    port: parseInt(env.PORT, 10),
    host: env.HOST,
  },
} as const;
