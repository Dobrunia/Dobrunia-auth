/**
 * Vue 3 composable for Dobrunia Auth
 */

import { ref, computed, type Ref } from 'vue';
import { API_BASE_URL } from '../constants/app.constants';

export interface User {
  sub: string;
  name?: string | null;
  email?: string | null;
  email_verified?: boolean;
  picture?: string | null;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

export interface UseAuthOptions {
  /** Auto refresh token before expiration */
  autoRefresh?: boolean;
  /** Refresh token this many seconds before expiration */
  refreshThreshold?: number;
}

export function useAuth(options: UseAuthOptions = {}) {
  const {
    autoRefresh = true,
    refreshThreshold = 60, // 1 minute
  } = options;

  const user: Ref<User | null> = ref(null);
  const loading: Ref<boolean> = ref(true);
  const error: Ref<string | null> = ref(null);

  const isAuthenticated = computed(() => !!user.value);

  let refreshTimer: ReturnType<typeof setTimeout> | null = null;

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
  function storeTokens(tokens: AuthTokens): void {
    if (typeof window === 'undefined') {
      return;
    }
    localStorage.setItem('access_token', tokens.access_token);
    localStorage.setItem('refresh_token', tokens.refresh_token);
  }

  /**
   * Clear tokens
   */
  function clearTokens(): void {
    if (typeof window === 'undefined') {
      return;
    }
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }

  /**
   * Start authorization flow
   */
  function login(returnUrl?: string): void {
    if (typeof window === 'undefined') {
      return;
    }

    // Generate PKCE
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);

    // Store verifier
    localStorage.setItem('pkce_code_verifier', codeVerifier);

    // Build auth URL
    const authUrl = new URL(`${API_BASE_URL}/oauth/authorize`);
    authUrl.searchParams.set('client_id', 'dashboard-client');
    authUrl.searchParams.set('redirect_uri', `${window.location.origin}/callback`);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'openid profile email');
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');

    if (returnUrl) {
      authUrl.searchParams.set('state', btoa(returnUrl));
    }

    // Redirect
    window.location.href = authUrl.toString();
  }

  /**
   * Handle OAuth callback
   */
  async function handleCallback(code: string): Promise<AuthTokens | null> {
    const codeVerifier = localStorage.getItem('pkce_code_verifier');
    localStorage.removeItem('pkce_code_verifier');

    if (!codeVerifier) {
      error.value = 'Code verifier not found';
      return null;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          grant_type: 'authorization_code',
          code,
          client_id: 'dashboard-client',
          redirect_uri: `${window.location.origin}/callback`,
          code_verifier: codeVerifier,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Token exchange failed');
      }

      const data = await response.json();
      storeTokens(data.data);

      await loadUser();
      return data.data;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to get tokens';
      return null;
    }
  }

  /**
   * Load current user
   */
  async function loadUser(): Promise<User | null> {
    const token = getAccessToken();

    if (!token) {
      loading.value = false;
      return null;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/oauth/userinfo`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Token expired, try refresh
          const refreshed = await refreshAccessToken();
          if (refreshed) {
            return loadUser();
          }
        }
        throw new Error('Failed to load user info');
      }

      user.value = await response.json();
      error.value = null;

      // Schedule auto refresh
      if (autoRefresh) {
        scheduleTokenRefresh();
      }

      return user.value;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load user';
      user.value = null;
      clearTokens();
      return null;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Refresh access token
   */
  async function refreshAccessToken(): Promise<AuthTokens | null> {
    const refreshToken = getRefreshToken();

    if (!refreshToken) {
      return null;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: 'dashboard-client',
        }),
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      storeTokens(data.data);

      // Schedule next refresh
      if (autoRefresh) {
        scheduleTokenRefresh();
      }

      return data.data;
    } catch (err) {
      return null;
    }
  }

  /**
   * Schedule token refresh
   */
  function scheduleTokenRefresh(): void {
    if (refreshTimer) {
      clearTimeout(refreshTimer);
    }

    // Decode token to get expiration
    const token = getAccessToken();
    if (!token) {
      return;
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const exp = payload.exp * 1000; // Convert to ms
      const now = Date.now();
      const timeUntilExpiry = exp - now;
      const refreshTime = Math.max(0, timeUntilExpiry - refreshThreshold * 1000);

      refreshTimer = setTimeout(() => {
        refreshAccessToken();
      }, refreshTime);
    } catch (err) {
      // Invalid token
    }
  }

  /**
   * Logout
   */
  async function logout(): Promise<void> {
    const token = getAccessToken();

    if (token) {
      try {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      } catch (err) {
        // Ignore logout errors
      }
    }

    clearTokens();
    user.value = null;

    if (refreshTimer) {
      clearTimeout(refreshTimer);
      refreshTimer = null;
    }
  }

  /**
   * Initialize auth state
   */
  async function init(): Promise<void> {
    await loadUser();
  }

  // Auto-init on mount (client-side only)
  if (typeof window !== 'undefined') {
    init();
  }

  return {
    user,
    loading,
    error,
    isAuthenticated,
    login,
    handleCallback,
    logout,
    refreshAccessToken,
  };
}

// PKCE helpers
function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(new Uint8Array(hash));
}

function base64UrlEncode(buffer: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < buffer.byteLength; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}
