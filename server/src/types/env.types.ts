import type { z } from 'zod';
import { envSchema } from '../config/env.schema';

export type Env = z.infer<typeof envSchema>;
