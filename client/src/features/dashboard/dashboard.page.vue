<template>
  <div class="dashboard-page">
    <DbrCard title="Dashboard" class="dashboard-card">
      <div v-if="loading" class="loading">
        <DbrLoader />
        <p>Loading...</p>
      </div>

      <div v-else-if="error" class="error">
        <p>{{ error }}</p>
        <DbrButton variant="primary" @click="login">Try Again</DbrButton>
      </div>

      <div v-else-if="user" class="user-info">
        <div class="user-header">
          <DbrAvatar 
            v-if="user.picture" 
            :src="user.picture" 
            :alt="user.name || 'User'"
            size="lg"
          />
          <DbrAvatar 
            v-else 
            :label="(user.name || user.email || 'U').charAt(0)"
            size="lg"
          />
          <div class="user-details">
            <h2>{{ user.name || 'User' }}</h2>
            <p class="email">{{ user.email }}</p>
          </div>
        </div>

        <div class="user-stats">
          <div class="stat">
            <span class="stat-label">User ID</span>
            <span class="stat-value">{{ user.sub }}</span>
          </div>
          <div class="stat">
            <span class="stat-label">Email Verified</span>
            <span class="stat-value">{{ user.email_verified ? 'Yes' : 'No' }}</span>
          </div>
        </div>

        <div class="actions">
          <DbrButton variant="danger" @click="logout">Sign Out</DbrButton>
        </div>
      </div>

      <div v-else class="not-logged-in">
        <p>You are not logged in</p>
        <DbrButton variant="primary" @click="login">Sign In</DbrButton>
      </div>
    </DbrCard>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { DbrCard, DbrButton, DbrLoader, DbrAvatar } from 'dobruniaui-vue';
import { API_BASE_URL } from '../../constants/app.constants';

interface UserInfo {
  sub: string;
  name?: string | null;
  email?: string | null;
  email_verified?: boolean;
  picture?: string | null;
}

const loading = ref(true);
const error = ref('');
const user = ref<UserInfo | null>(null);

function login() {
  // Generate PKCE parameters
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  
  // Store code verifier for callback
  localStorage.setItem('pkce_code_verifier', codeVerifier);
  
  // Build authorization URL
  const authUrl = new URL(`${API_BASE_URL}/oauth/authorize`);
  authUrl.searchParams.set('client_id', 'dashboard-client');
  authUrl.searchParams.set('redirect_uri', `${window.location.origin}/callback`);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'openid profile email');
  authUrl.searchParams.set('code_challenge', codeChallenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');
  
  // Redirect to auth server
  window.location.href = authUrl.toString();
}

async function logout() {
  try {
    const token = localStorage.getItem('access_token');
    
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  } catch (err) {
    console.error('Logout error:', err);
  } finally {
    // Clear local state
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    user.value = null;
    window.location.reload();
  }
}

async function loadUserInfo() {
  const token = localStorage.getItem('access_token');
  
  if (!token) {
    loading.value = false;
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}/oauth/userinfo`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        // Token expired, try to refresh
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          await loadUserInfo();
          return;
        }
      }
      throw new Error('Failed to load user info');
    }
    
    user.value = await response.json();
  } catch (err) {
    console.error('Load user info error:', err);
    error.value = 'Failed to load user information';
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  } finally {
    loading.value = false;
  }
}

async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = localStorage.getItem('refresh_token');
  
  if (!refreshToken) {
    return false;
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
      }),
    });
    
    if (!response.ok) {
      return false;
    }
    
    const data = await response.json();
    localStorage.setItem('access_token', data.data.access_token);
    localStorage.setItem('refresh_token', data.data.refresh_token);
    return true;
  } catch (err) {
    console.error('Refresh token error:', err);
    return false;
  }
}

// PKCE helpers (simplified versions)
function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

function generateCodeChallenge(verifier: string): string {
  // For simplicity, using plain method
  // In production, use SHA-256
  return verifier;
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

onMounted(() => {
  loadUserInfo();
});
</script>

<style scoped>
.dashboard-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: var(--dbru-space-4);
  background-color: var(--dbru-color-background);
}

.dashboard-card {
  width: 100%;
  max-width: 500px;
}

.loading,
.error,
.not-logged-in {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--dbru-space-4);
  padding: var(--dbru-space-6);
  text-align: center;
}

.error {
  color: var(--dbru-color-danger);
}

.user-header {
  display: flex;
  align-items: center;
  gap: var(--dbru-space-4);
  margin-bottom: var(--dbru-space-6);
  padding-bottom: var(--dbru-space-4);
  border-bottom: 1px solid var(--dbru-color-border);
}

.user-details {
  flex: 1;
}

.user-details h2 {
  margin: 0 0 var(--dbru-space-1);
  font-size: var(--dbru-font-size-lg);
}

.email {
  margin: 0;
  color: var(--dbru-text-muted);
  font-size: var(--dbru-font-size-sm);
}

.user-stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--dbru-space-4);
  margin-bottom: var(--dbru-space-6);
}

.stat {
  display: flex;
  flex-direction: column;
  gap: var(--dbru-space-1);
  padding: var(--dbru-space-3);
  background: var(--dbru-color-surface);
  border-radius: var(--dbru-radius-md);
}

.stat-label {
  font-size: var(--dbru-font-size-xs);
  color: var(--dbru-text-muted);
  text-transform: uppercase;
}

.stat-value {
  font-size: var(--dbru-font-size-base);
  font-weight: 600;
}

.actions {
  display: flex;
  justify-content: center;
}
</style>
