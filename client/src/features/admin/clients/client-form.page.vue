<template>
  <div class="admin-client-form-page">
    <DbrCard :title="isEdit ? 'Edit OAuth Client' : 'Create OAuth Client'" class="form-card">
      <form @submit.prevent="handleSubmit" class="client-form">
        <div class="form-section">
          <h3>Basic Information</h3>
          
          <div class="form-field">
            <DbrInput
              v-model="form.name"
              label="Client Name"
              placeholder="My Application"
              :invalid="!!errors.name"
              required
            />
            <span v-if="errors.name" class="error-text">{{ errors.name }}</span>
          </div>
        </div>

        <div class="form-section">
          <h3>Redirect URIs</h3>
          <p class="section-description">
            URLs where users will be redirected after authentication
          </p>
          
          <div v-for="(uri, index) in form.redirect_uris" :key="index" class="redirect-uri-field">
            <DbrInput
              v-model="form.redirect_uris[index]"
              label="Redirect URI"
              type="url"
              placeholder="https://example.com/callback"
              :invalid="!!errors.redirect_uris"
            />
            <DbrButton
              v-if="form.redirect_uris.length > 1"
              variant="ghost"
              size="sm"
              @click="removeRedirectUri(index)"
            >
              Remove
            </DbrButton>
          </div>
          
          <DbrButton variant="ghost" @click="addRedirectUri">
            + Add Another URI
          </DbrButton>
        </div>

        <div class="form-section">
          <h3>Scopes</h3>
          <p class="section-description">
            Permissions this client can request
          </p>
          
          <div class="scopes-grid">
            <label v-for="scope in availableScopes" :key="scope" class="scope-checkbox">
              <input
                type="checkbox"
                :checked="form.allowed_scopes.includes(scope)"
                @change="toggleScope(scope)"
              />
              <span>{{ scope }}</span>
            </label>
          </div>
        </div>

        <div class="form-section">
          <h3>Grant Types</h3>
          <p class="section-description">
            OAuth 2.0 grant types this client can use
          </p>
          
          <div class="grants-grid">
            <label v-for="grant in availableGrantTypes" :key="grant" class="grant-checkbox">
              <input
                type="checkbox"
                :checked="form.grant_types.includes(grant)"
                @change="toggleGrant(grant)"
              />
              <span>{{ grant }}</span>
            </label>
          </div>
        </div>

        <div class="form-section">
          <label class="toggle-field">
            <DbrToggle v-model="form.is_active" />
            <span>Client is active</span>
          </label>
        </div>

        <div v-if="error" class="submit-error">{{ error }}</div>

        <div class="form-actions">
          <DbrButton type="button" variant="ghost" @click="goBack">
            Cancel
          </DbrButton>
          <DbrButton type="submit" variant="primary" :disabled="isSubmitting">
            {{ isSubmitting ? 'Saving...' : (isEdit ? 'Save Changes' : 'Create Client') }}
          </DbrButton>
        </div>
      </form>

      <DbrCard v-if="createdClient" title="Client Created" class="credentials-card">
        <div class="credentials-warning">
          <DbrBadge variant="danger">Important</DbrBadge>
          <p>
            <strong>Save this client secret!</strong> It will not be shown again.
          </p>
        </div>
        
        <div class="credentials">
          <div class="credential-item">
            <label>Client ID</label>
            <code>{{ createdClient.client_id }}</code>
          </div>
          <div class="credential-item">
            <label>Client Secret</label>
            <code>{{ createdClient.client_secret }}</code>
          </div>
        </div>
      </DbrCard>
    </DbrCard>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { DbrCard, DbrButton, DbrInput, DbrToggle, DbrBadge } from 'dobruniaui-vue';
import { createOAuthClient, updateOAuthClient, getOAuthClient } from '../../../shared/api/admin';
import {
  AVAILABLE_SCOPES,
  AVAILABLE_GRANT_TYPES,
  CLIENT_FORM_DEFAULTS,
  ADMIN_ROUTES,
  type AvailableOAuthScope,
  type AvailableGrantType,
} from '../../../constants/admin.constants';
import type { OAuthClientWithSecret } from '../../../shared/api/admin';

const router = useRouter();
const route = useRoute();

const isEdit = computed(() => route.query.mode === 'edit' || !!route.params.id);

const form = reactive({
  name: '',
  redirect_uris: [''],
  allowed_scopes: [...CLIENT_FORM_DEFAULTS.allowed_scopes] as AvailableOAuthScope[],
  grant_types: [...CLIENT_FORM_DEFAULTS.grant_types] as AvailableGrantType[],
  is_active: CLIENT_FORM_DEFAULTS.is_active as boolean,
});

const errors = reactive<Record<string, string>>({});
const error = ref('');
const isSubmitting = ref(false);
const createdClient = ref<OAuthClientWithSecret | null>(null);

const availableScopes = AVAILABLE_SCOPES;
const availableGrantTypes = AVAILABLE_GRANT_TYPES;

function addRedirectUri() {
  form.redirect_uris.push('');
}

function removeRedirectUri(index: number) {
  form.redirect_uris.splice(index, 1);
}

function toggleScope(scope: AvailableOAuthScope) {
  const index = form.allowed_scopes.indexOf(scope);
  if (index === -1) {
    form.allowed_scopes.push(scope);
  } else {
    form.allowed_scopes.splice(index, 1);
  }
}

function toggleGrant(grant: AvailableGrantType) {
  const index = form.grant_types.indexOf(grant);
  if (index === -1) {
    form.grant_types.push(grant);
  } else {
    form.grant_types.splice(index, 1);
  }
}

function validateForm(): boolean {
  errors.name = '';
  errors.redirect_uris = '';

  if (!form.name.trim()) {
    errors.name = 'Client name is required';
    return false;
  }

  const validUris = form.redirect_uris.filter(uri => uri.trim());
  if (validUris.length === 0) {
    errors.redirect_uris = 'At least one redirect URI is required';
    return false;
  }

  for (const uri of validUris) {
    try {
      new URL(uri);
    } catch {
      errors.redirect_uris = 'Invalid URL format';
      return false;
    }
  }

  return true;
}

async function handleSubmit() {
  error.value = '';
  
  if (!validateForm()) {
    return;
  }

  isSubmitting.value = true;

  try {
    const input = {
      name: form.name.trim(),
      redirect_uris: form.redirect_uris.filter(uri => uri.trim()),
      allowed_scopes: form.allowed_scopes,
      grant_types: form.grant_types,
      is_active: form.is_active,
    };

    if (isEdit.value && route.params.id) {
      await updateOAuthClient(Number(route.params.id), input);
      router.push(ADMIN_ROUTES.CLIENTS);
    } else {
      createdClient.value = await createOAuthClient(input);
      // Clear form after successful creation
      form.name = '';
      form.redirect_uris = [''];
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to save client';
    console.error(err);
  } finally {
    isSubmitting.value = false;
  }
}

async function loadClientForEdit() {
  if (!isEdit.value || !route.params.id) return;

  try {
    const client = await getOAuthClient(Number(route.params.id));
    form.name = client.name;
    form.redirect_uris = client.redirect_uris.length > 0 ? client.redirect_uris : [''];
    form.allowed_scopes = client.allowed_scopes as AvailableOAuthScope[];
    form.grant_types = client.grant_types as AvailableGrantType[];
    form.is_active = client.is_active;
  } catch (err) {
    error.value = 'Failed to load client';
    console.error(err);
  }
}

function goBack() {
  router.push(ADMIN_ROUTES.CLIENTS);
}

onMounted(() => {
  if (isEdit.value) {
    loadClientForEdit();
  }
});
</script>

<style scoped>
.admin-client-form-page {
  max-width: 800px;
  margin: 0 auto;
  padding: var(--dbru-space-6);
}

.client-form {
  display: flex;
  flex-direction: column;
  gap: var(--dbru-space-6);
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: var(--dbru-space-3);
  padding-bottom: var(--dbru-space-4);
  border-bottom: 1px solid var(--dbru-color-border);
}

.form-section:last-of-type {
  border-bottom: none;
}

.form-section h3 {
  margin: 0;
  font-size: var(--dbru-font-size-base);
  font-weight: 600;
}

.section-description {
  margin: 0;
  font-size: var(--dbru-font-size-sm);
  color: var(--dbru-text-muted);
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: var(--dbru-space-1);
}

.error-text {
  color: var(--dbru-color-danger);
  font-size: var(--dbru-font-size-sm);
}

.redirect-uri-field {
  display: flex;
  gap: var(--dbru-space-2);
  align-items: flex-start;
}

.scopes-grid,
.grants-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: var(--dbru-space-2);
}

.scope-checkbox,
.grant-checkbox {
  display: flex;
  align-items: center;
  gap: var(--dbru-space-2);
  padding: var(--dbru-space-2);
  border-radius: var(--dbru-radius-sm);
  cursor: pointer;
  font-size: var(--dbru-font-size-sm);
}

.scope-checkbox:hover,
.grant-checkbox:hover {
  background: var(--dbru-color-surface);
}

.toggle-field {
  display: flex;
  align-items: center;
  gap: var(--dbru-space-3);
  font-size: var(--dbru-font-size-base);
}

.submit-error {
  color: var(--dbru-color-danger);
  font-size: var(--dbru-font-size-sm);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--dbru-space-3);
  padding-top: var(--dbru-space-4);
}

.credentials-card {
  margin-top: var(--dbru-space-6);
  border-color: var(--dbru-color-warning);
}

.credentials-warning {
  display: flex;
  align-items: center;
  gap: var(--dbru-space-2);
  margin-bottom: var(--dbru-space-4);
}

.credentials-warning p {
  margin: 0;
  color: var(--dbru-text-main);
}

.credentials {
  display: flex;
  flex-direction: column;
  gap: var(--dbru-space-3);
}

.credential-item {
  display: flex;
  flex-direction: column;
  gap: var(--dbru-space-1);
}

.credential-item label {
  font-size: var(--dbru-font-size-xs);
  color: var(--dbru-text-muted);
  text-transform: uppercase;
}

.credential-item code {
  background: var(--dbru-color-surface);
  padding: var(--dbru-space-2);
  border-radius: var(--dbru-radius-sm);
  font-family: monospace;
  word-break: break-all;
}
</style>
