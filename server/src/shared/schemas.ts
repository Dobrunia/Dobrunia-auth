import { z } from 'zod';
import { PASSWORD_POLICY } from '../constants/auth.constants';

export const registerSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email format'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(
      PASSWORD_POLICY.MIN_LENGTH,
      `Password must be at least ${PASSWORD_POLICY.MIN_LENGTH} characters`
    )
    .regex(
      /[A-Z]/,
      PASSWORD_POLICY.REQUIRE_UPPERCASE
        ? 'Password must contain at least one uppercase letter'
        : ''
    )
    .regex(
      /[a-z]/,
      PASSWORD_POLICY.REQUIRE_LOWERCASE
        ? 'Password must contain at least one lowercase letter'
        : ''
    )
    .regex(
      /[0-9]/,
      PASSWORD_POLICY.REQUIRE_NUMBER
        ? 'Password must contain at least one number'
        : ''
    ),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;
