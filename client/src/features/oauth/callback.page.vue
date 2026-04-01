<template>
  <div class="callback-page">
    <DbrCard title="Signing In" class="callback-card">
      <div class="loading">
        <DbrLoader />
        <p>Completing sign in...</p>
      </div>
    </DbrCard>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { DbrCard, DbrLoader } from 'dobruniaui-vue';
import { API_BASE_URL, ROUTES } from '../../constants/app.constants';

const router = useRouter();
const route = useRoute();

async function handleCallback() {
  const code = route.query.code as string;
  const error = route.query.error as string;
  
  if (error) {
    console.error('OAuth error:', route.query.error_description || error);
    router.push(ROUTES.LOGIN);
    return;
  }
  
  if (!code) {
    console.error('No authorization code in callback');
    router.push(ROUTES.LOGIN);
    return;
  }
  
  try {
    // Get code verifier from storage
    const codeVerifier = localStorage.getItem('pkce_code_verifier');
    
    if (!codeVerifier) {
      throw new Error('Code verifier not found');
    }
    
    // Exchange code for tokens
    const response = await fetch(`${API_BASE_URL}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: `${window.location.origin}/callback`,
        client_id: 'dashboard-client',
        code_verifier: codeVerifier,
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.error_description || 'Token exchange failed');
    }
    
    const data = await response.json();
    
    // Store tokens
    localStorage.setItem('access_token', data.data.access_token);
    localStorage.setItem('refresh_token', data.data.refresh_token);
    
    // Clear code verifier
    localStorage.removeItem('pkce_code_verifier');
    
    // Redirect to dashboard
    router.push('/dashboard');
  } catch (err) {
    console.error('Callback error:', err);
    router.push(ROUTES.LOGIN);
  }
}

onMounted(() => {
  handleCallback();
});
</script>

<style scoped>
.callback-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: var(--dbru-space-4);
  background-color: var(--dbru-color-background);
}

.callback-card {
  width: 100%;
  max-width: 400px;
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--dbru-space-4);
  padding: var(--dbru-space-6);
  text-align: center;
}
</style>
