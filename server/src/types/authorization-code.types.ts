/**
 * OAuth authorization code entity types
 */

export interface AuthorizationCode {
  id: number;
  code_hash: string;
  user_id: number;
  client_id: number;
  redirect_uri: string;
  scope: string | null;
  code_challenge: string | null;
  code_challenge_method: string | null;
  expires_at: Date;
  used_at: Date | null;
  created_at: Date;
}

export interface AuthorizationCodeCreateInput {
  code_hash: string;
  user_id: number;
  client_id: number;
  redirect_uri: string;
  scope?: string | null;
  code_challenge?: string | null;
  code_challenge_method?: string | null;
  expires_at: Date;
}
