import { API_BASE_URL } from '@constants/app.constants';
import type { ApiError } from '@/types/api.types';
import { z } from 'zod';

interface RequestConfig extends RequestInit {
  data?: unknown;
  requiresAuth?: boolean;
}

/**
 * Get stored access token
 */
function getAccessToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return localStorage.getItem('access_token');
}

export async function request<T>(
  endpoint: string,
  config: RequestConfig = {}
): Promise<T> {
  const { data, headers: customHeaders, requiresAuth, ...init } = config;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...customHeaders,
  };

  // Add authorization header if required
  if (requiresAuth) {
    const token = getAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...init,
    headers,
    body: data ? JSON.stringify(data) : undefined,
  });

  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({
      message: 'Request failed',
    }));
    throw new Error(error.message);
  }

  return response.json();
}

/**
 * Request with Zod validation of response
 */
export async function requestWithValidation<T>(
  endpoint: string,
  schema: z.ZodSchema<T>,
  config: RequestConfig = {}
): Promise<T> {
  const data = await request<T>(endpoint, config);
  return schema.parse(data);
}
