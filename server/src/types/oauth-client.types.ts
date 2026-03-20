/**
 * OAuth client entity types
 */

export interface OAuthClient {
  id: number;
  client_id: string;
  client_secret_hash: string | null;
  name: string;
  redirect_uris: string[];
  allowed_scopes: string[];
  grant_types: string[];
  is_active: boolean;
  created_at: Date;
}

export interface OAuthClientCreateInput {
  client_id: string;
  client_secret_hash?: string | null;
  name: string;
  redirect_uris: string[];
  allowed_scopes: string[];
  grant_types: string[];
}

export interface OAuthClientUpdateInput {
  name?: string;
  redirect_uris?: string[];
  allowed_scopes?: string[];
  grant_types?: string[];
  is_active?: boolean;
}
