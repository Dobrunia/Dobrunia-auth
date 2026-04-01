import type { z } from 'zod';
import { logoutBodySchema } from '../utils/schemas/logout.schema';

export type LogoutBody = z.infer<typeof logoutBodySchema>;
