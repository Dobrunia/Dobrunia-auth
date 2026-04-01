import { z } from 'zod';
import { CLIENT_LOOKUP_KEY_MAX, PASSWORD_LENGTH } from '../../constants/validation.constants';

/**
 * Тело POST /auth/register: clientId может быть UUID или slug; альтернатива — clientSlug.
 */
export const registerBodySchema = z
  .object({
    email: z
      .string()
      .min(1)
      .transform((s) => s.trim().toLowerCase())
      .pipe(z.string().email()),
    password: z.string().min(PASSWORD_LENGTH.MIN).max(PASSWORD_LENGTH.MAX),
    clientId: z.string().min(1).max(CLIENT_LOOKUP_KEY_MAX).optional(),
    clientSlug: z.string().min(1).max(CLIENT_LOOKUP_KEY_MAX).optional(),
  })
  .refine((d) => d.clientId != null || d.clientSlug != null, {
    message: 'Either clientId or clientSlug is required',
    path: ['clientId'],
  });
