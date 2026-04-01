<template>
  <div class="services-dashboard-page">
    <DbrCard title="Connected Services" class="services-card">
      <div v-if="loading" class="loading">
        <DbrLoader />
        <p>Loading services...</p>
      </div>

      <div v-else-if="error" class="error">
        <p>{{ error }}</p>
        <DbrButton variant="primary" @click="loadServices">Retry</DbrButton>
      </div>

      <div v-else-if="services.length === 0" class="empty-state">
        <DbrCard title="No Connected Services" class="empty-card">
          <p>You haven't connected any services yet.</p>
          <p class="hint">When you log in to a service using Dobrunia Auth, it will appear here.</p>
        </DbrCard>
      </div>

      <div v-else class="services-list">
        <div v-for="service in services" :key="service.client_id" class="service-item">
          <div class="service-header">
            <div class="service-info">
              <h3>{{ service.service_name }}</h3>
              <p class="service-meta">
                <span class="session-count">{{ service.session_count }} active session(s)</span>
                <span v-if="service.last_active" class="last-active">
                  Last active: {{ formatRelativeTime(service.last_active) }}
                </span>
              </p>
            </div>
            <DbrButton 
              variant="danger" 
              size="sm"
              @click="confirmLogout(service)"
              :disabled="isLoggingOut"
            >
              {{ isLoggingOut ? 'Signing out...' : 'Sign Out' }}
            </DbrButton>
          </div>
        </div>
      </div>
    </DbrCard>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { DbrCard, DbrButton, DbrLoader } from 'dobruniaui-vue';
import { API_BASE_URL } from '../../constants/app.constants';

interface ActiveService {
  client_id: number;
  service_name: string;
  last_active: string;
  session_count: number;
}

const router = useRouter();

const loading = ref(true);
const error = ref('');
const services = ref<ActiveService[]>([]);
const isLoggingOut = ref(false);

async function loadServices() {
  loading.value = true;
  error.value = '';
  
  try {
    const token = localStorage.getItem('access_token');
    
    if (!token) {
      router.push('/login');
      return;
    }

    const response = await fetch(`${API_BASE_URL}/me/active-services`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Token expired, redirect to login
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        router.push('/login');
        return;
      }
      throw new Error('Failed to load services');
    }

    const data = await response.json();
    services.value = data.data || [];
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load services';
    console.error(err);
  } finally {
    loading.value = false;
  }
}

async function confirmLogout(service: ActiveService) {
  if (!confirm(`Sign out from ${service.service_name}?`)) {
    return;
  }

  isLoggingOut.value = true;

  try {
    const token = localStorage.getItem('access_token');
    
    const response = await fetch(`${API_BASE_URL}/me/sessions/by-client/${service.client_id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.ok) {
      // Remove from list
      services.value = services.value.filter(s => s.client_id !== service.client_id);
    } else {
      error.value = 'Failed to sign out';
    }
  } catch (err) {
    error.value = 'Failed to sign out';
    console.error(err);
  } finally {
    isLoggingOut.value = false;
  }
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) {
    return 'just now';
  } else if (diffMins < 60) {
    return `${diffMins} minute(s) ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour(s) ago`;
  } else {
    return `${diffDays} day(s) ago`;
  }
}

onMounted(() => {
  loadServices();
});
</script>

<style scoped>
.services-dashboard-page {
  max-width: 900px;
  margin: 0 auto;
  padding: var(--dbru-space-6);
}

.loading,
.error,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--dbru-space-4);
  padding: var(--dbru-space-8);
  text-align: center;
}

.error {
  color: var(--dbru-color-danger);
}

.empty-card {
  text-align: center;
}

.empty-card .hint {
  color: var(--dbru-text-muted);
  font-size: var(--dbru-font-size-sm);
  margin-top: var(--dbru-space-2);
}

.services-list {
  display: flex;
  flex-direction: column;
  gap: var(--dbru-space-4);
}

.service-item {
  padding: var(--dbru-space-4);
  border: 1px solid var(--dbru-color-border);
  border-radius: var(--dbru-radius-md);
  background: var(--dbru-color-surface);
}

.service-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.service-info h3 {
  margin: 0 0 var(--dbru-space-2);
  font-size: var(--dbru-font-size-lg);
}

.service-meta {
  display: flex;
  gap: var(--dbru-space-4);
  font-size: var(--dbru-font-size-sm);
  color: var(--dbru-text-muted);
}

.session-count {
  font-weight: 500;
}

.last-active {
  color: var(--dbru-text-muted);
}

@media (max-width: 600px) {
  .service-header {
    flex-direction: column;
    gap: var(--dbru-space-3);
  }

  .service-meta {
    flex-direction: column;
    gap: var(--dbru-space-1);
  }
}
</style>
