/**
 * OAuth authorize endpoint types
 */

export interface AuthorizeQueryParams {
  client_id: string;
  redirect_uri: string;
  response_type: string;
  scope?: string;
  state?: string;
  code_challenge?: string;
  code_challenge_method?: string;
}

export interface AuthorizeResponse {
  code: string;
  state?: string;
}

export interface AuthorizeError {
  error: string;
  error_description?: string;
  state?: string;
}
