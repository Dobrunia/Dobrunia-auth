/**
 * Auth types
 */

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface RegisterResponse {
  id: number;
  email: string;
  email_verified: boolean;
  name: string | null;
  avatar: string | null;
  status: string;
  created_at: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

export interface LoginResponse extends AuthTokens {
  user: {
    id: number;
    email: string;
    email_verified: boolean;
    name: string | null;
    avatar: string | null;
  };
}
