<template>
  <div class="admin-clients-page">
    <DbrCard title="OAuth Clients" class="clients-card">
      <div class="page-header">
        <p class="description">Manage OAuth 2.0 clients for your applications</p>
        <DbrButton variant="primary" @click="navigateToCreate">
          + New Client
        </DbrButton>
      </div>

      <div v-if="loading" class="loading">
        <DbrLoader />
        <p>Loading clients...</p>
      </div>

      <div v-else-if="error" class="error">
        <p>{{ error }}</p>
        <DbrButton variant="primary" @click="loadClients">Retry</DbrButton>
      </div>

      <div v-else-if="clients.length === 0" class="empty-state">
        <p>No OAuth clients configured yet</p>
        <DbrButton variant="primary" @click="navigateToCreate">
          Create Your First Client
        </DbrButton>
      </div>

      <div v-else class="clients-list">
        <div
          v-for="client in clients"
          :key="client.id"
          class="client-item"
        >
          <div class="client-info">
            <div class="client-name">
              <h3>{{ client.name }}</h3>
              <DbrBadge v-if="client.is_active">Active</DbrBadge>
              <DbrBadge v-else variant="danger">Inactive</DbrBadge>
            </div>
            <p class="client-id">Client ID: <code>{{ client.client_id }}</code></p>
            <div class="client-meta">
              <span class="meta-item">
                <strong>Scopes:</strong> {{ client.allowed_scopes.join(', ') }}
              </span>
              <span class="meta-item">
                <strong>Grants:</strong> {{ client.grant_types.join(', ') }}
              </span>
            </div>
          </div>

          <div class="client-actions">
            <DbrButton variant="ghost" size="sm" @click="viewClient(client.id)">
              View
            </DbrButton>
            <DbrButton variant="ghost" size="sm" @click="editClient(client.id)">
              Edit
            </DbrButton>
            <DbrButton variant="danger" size="sm" @click="confirmDelete(client)">
              Delete
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
import { DbrCard, DbrButton, DbrLoader, DbrBadge } from 'dobruniaui-vue';
import { getOAuthClients, deleteOAuthClient } from '../../../shared/api/admin';
import type { OAuthClient } from '../../../server/src/types/oauth-client.types';
import { ADMIN_ROUTES } from '../../../constants/admin.constants';

const router = useRouter();

const loading = ref(true);
const error = ref('');
const clients = ref<OAuthClient[]>([]);

async function loadClients() {
  loading.value = true;
  error.value = '';
  
  try {
    clients.value = await getOAuthClients();
  } catch (err) {
    error.value = 'Failed to load OAuth clients';
    console.error(err);
  } finally {
    loading.value = false;
  }
}

function navigateToCreate() {
  router.push(ADMIN_ROUTES.CLIENT_CREATE);
}

function viewClient(id: number) {
  router.push(`${ADMIN_ROUTES.CLIENT_EDIT.replace(':id', String(id))}`);
}

function editClient(id: number) {
  router.push(`${ADMIN_ROUTES.CLIENT_EDIT.replace(':id', String(id))}?mode=edit`);
}

async function confirmDelete(client: OAuthClient) {
  if (confirm(`Are you sure you want to delete "${client.name}"? This action cannot be undone.`)) {
    try {
      await deleteOAuthClient(client.id);
      await loadClients();
    } catch (err) {
      error.value = 'Failed to delete client';
      console.error(err);
    }
  }
}

onMounted(() => {
  loadClients();
});
</script>

<style scoped>
.admin-clients-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--dbru-space-6);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--dbru-space-6);
}

.description {
  color: var(--dbru-text-muted);
  margin: 0;
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

.clients-list {
  display: flex;
  flex-direction: column;
  gap: var(--dbru-space-4);
}

.client-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: var(--dbru-space-4);
  border: 1px solid var(--dbru-color-border);
  border-radius: var(--dbru-radius-md);
  background: var(--dbru-color-surface);
}

.client-name {
  display: flex;
  align-items: center;
  gap: var(--dbru-space-2);
  margin: 0 0 var(--dbru-space-2);
}

.client-name h3 {
  margin: 0;
  font-size: var(--dbru-font-size-lg);
}

.client-id {
  margin: 0 0 var(--dbru-space-2);
  font-size: var(--dbru-font-size-sm);
  color: var(--dbru-text-muted);
}

.client-id code {
  background: var(--dbru-color-surface);
  padding: var(--dbru-space-1) var(--dbru-space-2);
  border-radius: var(--dbru-radius-sm);
  font-family: monospace;
}

.client-meta {
  display: flex;
  gap: var(--dbru-space-4);
  font-size: var(--dbru-font-size-sm);
  color: var(--dbru-text-muted);
}

.meta-item {
  display: flex;
  gap: var(--dbru-space-1);
}

.client-actions {
  display: flex;
  gap: var(--dbru-space-2);
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .client-item {
    flex-direction: column;
    gap: var(--dbru-space-4);
  }

  .client-actions {
    width: 100%;
    justify-content: flex-end;
  }

  .client-meta {
    flex-direction: column;
    gap: var(--dbru-space-2);
  }
}
</style>
