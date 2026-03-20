import { API_BASE_URL } from '@constants/app.constants';
import type { ApiError } from '@/types/api.types';
import { z } from 'zod';

interface RequestConfig extends RequestInit {
  data?: unknown;
  requiresAuth?: boolean;
  skipRefresh?: boolean;
}

let isRefreshing = false;
let refreshSubscribers: Array<() => void> = [];

function subscribeToRefresh(callback: () => void) {
  refreshSubscribers.push(callback);
}

function onRefreshed() {
  refreshSubscribers.forEach((callback) => callback());
  refreshSubscribers = [];
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

/**
 * Get stored refresh token
 */
function getRefreshToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return localStorage.getItem('refresh_token');
}

/**
 * Store tokens
 */
function storeTokens(accessToken: string, refreshToken: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
  }
}

/**
 * Clear stored tokens
 */
function clearTokens(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }
}

/**
 * Refresh access token
 * Server is the single source of truth - tokens are only stored on successful response
 */
async function refreshAccessToken(): Promise<{ access_token: string; refresh_token: string }> {
  const refreshToken = getRefreshToken();

  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!response.ok) {
    // Don't clear tokens here - let the server decide when to invalidate
    // Server will revoke tokens on logout/logout-all, not on 401
    throw new Error('Failed to refresh access token');
  }

  const result = await response.json();
  const tokens = result.data;

  // Only store new tokens after successful server response
  storeTokens(tokens.access_token, tokens.refresh_token);
  return tokens;
}

export async function request<T>(
  endpoint: string,
  config: RequestConfig = {}
): Promise<T> {
  const { data, headers: customHeaders, requiresAuth, skipRefresh, ...init } = config;

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

  // Handle 401 - try to refresh token
  if (response.status === 401 && requiresAuth && !skipRefresh) {
    if (!isRefreshing) {
      isRefreshing = true;
      
      try {
        await refreshAccessToken();
        onRefreshed();
      } catch (error) {
        // Redirect to login or handle auth failure
        window.location.href = '/login';
        throw error;
      } finally {
        isRefreshing = false;
      }
    }

    // Wait for refresh to complete and retry
    return new Promise((resolve, reject) => {
      subscribeToRefresh(async () => {
        try {
          const newToken = getAccessToken();
          if (newToken) {
            headers['Authorization'] = `Bearer ${newToken}`;
          }
          
          const retryResponse = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...init,
            headers,
            body: data ? JSON.stringify(data) : undefined,
          });

          if (!retryResponse.ok) {
            const error: ApiError = await retryResponse.json().catch(() => ({
              message: 'Request failed',
            }));
            reject(new Error(error.message));
            return;
          }

          resolve(retryResponse.json());
        } catch (error) {
          reject(error);
        }
      });
    });
  }

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

export { clearTokens, storeTokens };
