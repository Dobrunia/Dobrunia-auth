import { z } from 'zod';

/**
 * Client environment configuration
 * If env variable exists - use it, otherwise use default
 * No NODE_ENV branching - explicit values only
 */

const envSchema = z.object({
  VITE_API_URL: z.string().default('http://localhost:3000'),
  VITE_DEFAULT_CLIENT_SLUG: z.string().default('dobrunia-auth-web'),
  /** client_id для POST /oauth/token (slug или UUID) */
  VITE_OAUTH_CLIENT_ID: z.string().default('dobrunia-auth-web'),
  /** JSON: [{"slug":"dobrunia-auth-web","name":"Dobrunia Auth Web"}] — экран выбора приложения */
  VITE_CLIENTS_JSON: z.string().optional(),
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

const DEFAULT_CLIENTS = [{ slug: 'dobrunia-auth-web', name: 'Dobrunia Auth Web' }] as const;

function parseClientsJson(raw: string | undefined): { slug: string; name: string }[] {
  if (!raw?.trim()) {
    return [...DEFAULT_CLIENTS];
  }
  try {
    const p = JSON.parse(raw) as unknown;
    if (!Array.isArray(p)) {
      return [...DEFAULT_CLIENTS];
    }
    const out: { slug: string; name: string }[] = [];
    for (const x of p) {
      if (x && typeof x === 'object' && typeof (x as { slug: string }).slug === 'string') {
        const slug = (x as { slug: string }).slug;
        const name =
          typeof (x as { name?: string }).name === 'string' ? (x as { name: string }).name : slug;
        out.push({ slug, name });
      }
    }
    return out.length > 0 ? out : [...DEFAULT_CLIENTS];
  } catch {
    return [...DEFAULT_CLIENTS];
  }
}

export const clientConfig = {
  apiUrl: env.VITE_API_URL,
  defaultClientSlug: env.VITE_DEFAULT_CLIENT_SLUG,
  oauthClientId: env.VITE_OAUTH_CLIENT_ID,
  clients: parseClientsJson(env.VITE_CLIENTS_JSON),
} as const;
