/**
 * Refresh token entity types
 */

export interface RefreshToken {
  id: number;
  user_id: number;
  session_id: number;
  token_hash: string;
  expires_at: Date;
  revoked_at: Date | null;
  created_at: Date;
}

export interface RefreshTokenCreateInput {
  user_id: number;
  session_id: number;
  token_hash: string;
  expires_at: Date;
}
