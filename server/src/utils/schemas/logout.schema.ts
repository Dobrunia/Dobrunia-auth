import { z } from 'zod';

/** Тело POST /auth/logout: непрозрачный refresh-токен, выданный при register/login. */
export const logoutBodySchema = z.object({
  refreshToken: z.string().min(1),
});
