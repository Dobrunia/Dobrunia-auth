import type { z } from 'zod';
import { registerBodySchema } from '../utils/schemas/register.schema';

export type RegisterBody = z.infer<typeof registerBodySchema>;

export interface RegisterContext {
  ipAddress: string | null;
  userAgent: string | null;
}

export interface RegisterResult {
  user: { id: string; email: string };
  session: { id: string; clientId: string; clientSlug: string };
  accessToken: string;
  refreshToken: string;
}
