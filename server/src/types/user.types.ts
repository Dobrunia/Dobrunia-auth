/**
 * Application shape for table `users`.
 * In raw MySQL rows, `email_verified` / `is_active` are TINYINT (0/1); map when hydrating.
 */
export type UserId = string;

export interface User {
  id: UserId;
  email: string;
  username: string | null;
  password_hash: string | null;
  email_verified: boolean;
  is_active: boolean;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  last_login_at: Date | null;
  created_at: Date;
  updated_at: Date;
}
