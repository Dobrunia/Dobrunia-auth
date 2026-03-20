/**
 * OAuth token endpoint types
 */

export interface TokenRequest {
  grant_type: string;
  code?: string;
  redirect_uri?: string;
  client_id?: string;
  client_secret?: string;
  refresh_token?: string;
  code_verifier?: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  refresh_token: string;
  scope?: string;
  id_token?: string; // For OIDC
}

export interface TokenError {
  error: string;
  error_description?: string;
}
