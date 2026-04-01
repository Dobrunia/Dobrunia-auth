import type { z } from 'zod';
import { loginBodySchema } from '../utils/schemas/login.schema';
import type { RegisterContext, RegisterResult } from './register.types';

export type LoginBody = z.infer<typeof loginBodySchema>;

export type LoginContext = RegisterContext;

export type LoginResult = RegisterResult;
