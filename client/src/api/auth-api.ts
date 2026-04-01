import type { AuthTokensResponse, MeResponse, ProfilePatchBody, SessionItem } from '@/types';
import { apiJson } from './http';

export async function login(body: {
  email: string;
  password: string;
  clientId: string;
}): Promise<AuthTokensResponse> {
  return apiJson<AuthTokensResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function register(body: {
  email: string;
  password: string;
  clientId: string;
}): Promise<AuthTokensResponse> {
  return apiJson<AuthTokensResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function logout(refreshToken: string): Promise<void> {
  await apiJson('/auth/logout', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  });
}

export async function oauthToken(body: {
  grant_type: 'authorization_code';
  code: string;
  redirect_uri: string;
  client_id: string;
}): Promise<AuthTokensResponse> {
  return apiJson<AuthTokensResponse>('/oauth/token', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function listSessions(): Promise<{ sessions: SessionItem[] }> {
  return apiJson<{ sessions: SessionItem[] }>('/sessions', {
    method: 'GET',
    auth: true,
  });
}

export async function deleteSession(sessionId: string): Promise<void> {
  await apiJson(`/sessions/${encodeURIComponent(sessionId)}`, {
    method: 'DELETE',
    auth: true,
  });
}

export async function fetchMe(): Promise<MeResponse> {
  return apiJson<MeResponse>('/auth/me', {
    method: 'GET',
    auth: true,
  });
}

export async function patchProfile(body: ProfilePatchBody): Promise<MeResponse> {
  return apiJson<MeResponse>('/auth/me', {
    method: 'PATCH',
    body: JSON.stringify(body),
    auth: true,
  });
}

export async function deleteAccount(): Promise<void> {
  await apiJson('/auth/me', {
    method: 'DELETE',
    auth: true,
  });
}
