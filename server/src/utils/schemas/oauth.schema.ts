import { z } from 'zod';

/** GET/POST /oauth/authorize: общие поля OAuth2 (query или form). */
export const oauthAuthorizeParamsSchema = z.object({
  client_id: z.string().min(1),
  redirect_uri: z.string().min(1),
  response_type: z.literal('code'),
  state: z.string().optional(),
});

export const oauthAuthorizePostBodySchema = oauthAuthorizeParamsSchema.extend({
  email: z.string().email(),
  password: z.string().min(1),
});

export const oauthTokenBodySchema = z.object({
  grant_type: z.literal('authorization_code'),
  code: z.string().min(1),
  redirect_uri: z.string().min(1),
  client_id: z.string().min(1),
});
