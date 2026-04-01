import type { z } from 'zod';
import { refreshBodySchema } from '../utils/schemas/refresh.schema';

export type RefreshAuthBody = z.infer<typeof refreshBodySchema>;

export interface RefreshAuthResult {
  accessToken: string;
  refreshToken: string;
}
