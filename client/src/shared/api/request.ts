import { API_BASE_URL } from '@constants/app.constants';
import type { ApiError } from '@/types/api.types';
import { z } from 'zod';

interface RequestConfig extends RequestInit {
  data?: unknown;
}

export async function request<T>(
  endpoint: string,
  config: RequestConfig = {}
): Promise<T> {
  const { data, headers: customHeaders, ...init } = config;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...customHeaders,
  };

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
