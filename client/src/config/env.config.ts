import { z } from 'zod';

/**
 * Client environment configuration
 * If env variable exists - use it, otherwise use default
 * No NODE_ENV branching - explicit values only
 */

const envSchema = z.object({
  VITE_API_URL: z.string().default('http://localhost:3000'),
});

export type ClientEnv = z.infer<typeof envSchema>;

function loadEnv(): ClientEnv {
  const parsed = envSchema.safeParse(import.meta.env);

  if (!parsed.success) {
    console.error('Invalid environment configuration:');
    console.error(parsed.error.format());
    throw new Error('Invalid client environment configuration');
  }

  return parsed.data;
}

const env = loadEnv();

export const clientConfig = {
  apiUrl: env.VITE_API_URL,
} as const;
