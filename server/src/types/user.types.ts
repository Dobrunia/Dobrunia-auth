/**
 * User entity types
 */

import { USER_STATUS } from '../constants/auth.constants';

export type UserStatus = typeof USER_STATUS[keyof typeof USER_STATUS];

export interface User {
  id: number;
  email: string;
  email_verified: boolean;
  password_hash: string;
  name: string | null;
  avatar: string | null;
  status: UserStatus;
  created_at: Date;
  updated_at: Date;
}

export interface UserCreateInput {
  email: string;
  password_hash: string;
  name?: string | null;
  avatar?: string | null;
}

export interface UserUpdateInput {
  name?: string | null;
  avatar?: string | null;
  status?: UserStatus;
}
