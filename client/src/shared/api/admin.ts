import { request } from './request';
import type { OAuthClient } from '../types/oauth-client.types';

export interface OAuthClientInput {
  name: string;
  redirect_uris: string[];
  allowed_scopes: string[];
  grant_types: string[];
  is_active: boolean;
}

export interface OAuthClientWithSecret extends Omit<OAuthClient, 'client_secret_hash'> {
  client_secret?: string;
}

/**
 * Get all OAuth clients
 */
export async function getOAuthClients(): Promise<OAuthClient[]> {
  const response = await request<{ data: OAuthClient[] }>('/oauth/clients');
  return response.data || [];
}

/**
 * Get OAuth client by ID
 */
export async function getOAuthClient(id: number): Promise<OAuthClient> {
  const response = await request<{ data: OAuthClient }>(`/oauth/clients/${id}`);
  return response.data;
}

/**
 * Create new OAuth client
 */
export async function createOAuthClient(input: OAuthClientInput): Promise<OAuthClientWithSecret> {
  const response = await request<{ data: OAuthClientWithSecret }>('/oauth/clients', {
    method: 'POST',
    data: input,
  });
  return response.data;
}

/**
 * Update OAuth client
 */
export async function updateOAuthClient(id: number, input: Partial<OAuthClientInput>): Promise<OAuthClient> {
  const response = await request<{ data: OAuthClient }>(`/oauth/clients/${id}`, {
    method: 'PATCH',
    data: input,
  });
  return response.data;
}

/**
 * Regenerate OAuth client secret
 */
export async function regenerateClientSecret(id: number): Promise<{ client_id: string; client_secret: string }> {
  const response = await request<{ data: { client_id: string; client_secret: string } }>(
    `/oauth/clients/${id}/regenerate-secret`,
    {
      method: 'POST',
    }
  );
  return response.data;
}

/**
 * Delete OAuth client
 */
export async function deleteOAuthClient(id: number): Promise<void> {
  await request(`/oauth/clients/${id}`, {
    method: 'DELETE',
  });
}
