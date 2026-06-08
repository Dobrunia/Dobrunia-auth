<template>
  <DbrCard as="article" variant="bordered" class="client-card">
    <header class="client-card__header">
      <div class="client-card__identity">
        <DbrAvatar
          :src="client.logoUrl || undefined"
          :name="client.name"
          :alt="`Логотип ${client.name}`"
          size="lg"
          shape="rounded"
        />
        <div class="client-card__title-block">
          <div class="client-card__title-line">
            <h3 class="dbru-font-size-lg dbru-font-color-base">{{ client.name }}</h3>
            <span
              class="client-status dbru-font-size-sm"
              :class="{ 'client-status--inactive': !client.isActive }"
            >
              <span class="client-status__dot" aria-hidden="true"></span>
              {{ client.isActive ? 'Активно' : 'Отключено' }}
            </span>
          </div>
          <code class="client-card__slug dbru-font-size-xs dbru-font-color-muted">{{ client.slug }}</code>
          <p v-if="client.description" class="client-card__description dbru-font-size-sm dbru-font-color-muted">
            {{ client.description }}
          </p>
        </div>
      </div>

      <div class="client-card__actions">
        <DbrButton
          variant="ghost"
          size="sm"
          native-type="button"
          class="dbru-focus-visible"
          @click="openEdit"
        >
          Редактировать
        </DbrButton>
        <DbrButton
          variant="ghost"
          size="sm"
          native-type="button"
          class="dbru-focus-visible"
          @click="toggleSessions"
        >
          {{ mode === 'sessions' ? 'Скрыть сессии' : 'Активные сессии' }}
        </DbrButton>
        <DbrButton
          variant="danger"
          size="sm"
          native-type="button"
          class="dbru-focus-visible"
          :disabled="deleting"
          @click="removeClient"
        >
          {{ deleting ? 'Удаляем…' : 'Удалить' }}
        </DbrButton>
      </div>
    </header>

    <div class="client-metrics" aria-label="Статистика приложения">
      <div class="client-metric">
        <span class="dbru-font-size-xs dbru-font-color-muted">Активные пользователи</span>
        <strong class="dbru-font-color-base">{{ client.activeUserCount }}</strong>
        <small class="dbru-font-size-xs dbru-font-color-muted">Уникальные аккаунты</small>
      </div>
      <div class="client-metric">
        <span class="dbru-font-size-xs dbru-font-color-muted">Активные сессии</span>
        <strong class="dbru-font-color-base">{{ client.activeSessionCount }}</strong>
        <small class="dbru-font-size-xs dbru-font-color-muted">Все устройства и входы</small>
      </div>
      <div class="client-metric client-metric--wide">
        <span class="dbru-font-size-xs dbru-font-color-muted">client_id</span>
        <code class="client-metric__id dbru-font-size-sm dbru-font-color-base">{{ client.id }}</code>
        <DbrButton
          variant="ghost"
          size="sm"
          native-type="button"
          class="dbru-focus-visible client-metric__copy"
          @click="copyClientId"
        >
          Копировать
        </DbrButton>
      </div>
    </div>

    <div v-if="mode === 'details'" class="client-details">
      <div class="client-details__column">
        <span class="dbru-font-size-xs dbru-font-color-muted">Адрес приложения</span>
        <a
          v-if="client.baseUrl"
          :href="client.baseUrl"
          target="_blank"
          rel="noreferrer"
          class="client-link dbru-font-size-sm dbru-font-color-base"
        >
          {{ client.baseUrl }}
        </a>
        <span v-else class="dbru-font-size-sm dbru-font-color-muted">Не указан</span>
      </div>
      <div class="client-details__column">
        <span class="dbru-font-size-xs dbru-font-color-muted">Создано</span>
        <span class="dbru-font-size-sm dbru-font-color-base">{{ formatDate(client.createdAt) }}</span>
      </div>
      <div class="client-details__callbacks">
        <span class="dbru-font-size-xs dbru-font-color-muted">Разрешенные callback URL</span>
        <code
          v-for="redirectUri in client.redirectUris"
          :key="redirectUri"
          class="callback-url dbru-font-size-sm dbru-font-color-base"
        >
          {{ redirectUri }}
        </code>
      </div>
    </div>

    <form v-else-if="mode === 'edit'" class="client-editor" @submit.prevent="saveEdit">
      <div class="client-editor__heading">
        <div>
          <h4 class="dbru-font-size-base dbru-font-color-base">Настройки приложения</h4>
          <p class="dbru-font-size-sm dbru-font-color-muted">
            Изменение slug может потребовать обновить конфигурацию интеграции. UUID client_id не меняется.
          </p>
        </div>
        <DbrToggle v-model="editIsActive" label="Приложение активно" size="sm" />
      </div>

      <div class="client-editor__grid">
        <DbrInput v-model="editName" label="Название" size="md" required />
        <DbrInput v-model="editSlug" label="Slug" size="md" required autocomplete="off" />
        <DbrInput v-model="editDescription" label="Описание" size="md" autocomplete="off" />
        <DbrInput v-model="editBaseUrl" label="Адрес приложения" type="url" size="md" autocomplete="url" />
        <DbrInput v-model="editLogoUrl" label="URL логотипа" type="url" size="md" autocomplete="url" />
      </div>

      <fieldset class="callback-editor">
        <legend class="dbru-font-size-sm dbru-font-color-base">OAuth callback URL</legend>
        <div
          v-for="(_redirectUri, index) in editRedirectUris"
          :key="index"
          class="callback-editor__row"
        >
          <DbrInput
            v-model="editRedirectUris[index]"
            :label="`Callback URL ${index + 1}`"
            type="url"
            size="md"
            required
            autocomplete="url"
          />
          <DbrButton
            v-if="editRedirectUris.length > 1"
            variant="ghost"
            size="sm"
            native-type="button"
            class="dbru-focus-visible"
            @click="removeEditRedirect(index)"
          >
            Удалить
          </DbrButton>
        </div>
        <DbrButton
          variant="ghost"
          size="sm"
          native-type="button"
          class="dbru-focus-visible callback-editor__add"
          :disabled="editRedirectUris.length >= 10"
          @click="addEditRedirect"
        >
          Добавить callback
        </DbrButton>
      </fieldset>

      <p v-if="editError" class="client-error dbru-font-size-sm">{{ editError }}</p>

      <div class="client-editor__actions">
        <DbrButton
          variant="primary"
          native-type="submit"
          class="dbru-focus-visible"
          :disabled="saving"
        >
          {{ saving ? 'Сохраняем…' : 'Сохранить изменения' }}
        </DbrButton>
        <DbrButton
          variant="ghost"
          native-type="button"
          class="dbru-focus-visible"
          :disabled="saving"
          @click="mode = 'details'"
        >
          Отмена
        </DbrButton>
      </div>
    </form>

    <section v-else class="managed-sessions" aria-label="Активные сессии приложения">
      <div class="managed-sessions__heading">
        <div>
          <h4 class="dbru-font-size-base dbru-font-color-base">Активные сессии пользователей</h4>
          <p class="dbru-font-size-sm dbru-font-color-muted">
            Отзыв немедленно завершает вход на выбранном устройстве.
          </p>
        </div>
        <DbrButton
          variant="ghost"
          size="sm"
          native-type="button"
          class="dbru-focus-visible"
          :disabled="sessionsLoading"
          @click="loadSessions"
        >
          Обновить
        </DbrButton>
      </div>

      <div v-if="sessionsLoading" class="managed-sessions__loading">
        <DbrLoader size="sm" />
        <span class="dbru-font-size-sm dbru-font-color-muted">Загружаем сессии…</span>
      </div>
      <p v-else-if="sessionsError" class="client-error dbru-font-size-sm">{{ sessionsError }}</p>
      <p v-else-if="managedSessions.length === 0" class="dbru-font-size-sm dbru-font-color-muted">
        Активных сессий нет.
      </p>
      <ul v-else class="managed-sessions__list">
        <li v-for="session in managedSessions" :key="session.id" class="managed-session">
          <div class="managed-session__identity">
            <DbrAvatar :name="session.userDisplayName || session.userEmail" size="md" />
            <div>
              <strong class="dbru-font-size-sm dbru-font-color-base">
                {{ session.userDisplayName || session.userEmail }}
              </strong>
              <span
                v-if="session.userDisplayName"
                class="managed-session__email dbru-font-size-xs dbru-font-color-muted"
              >
                {{ session.userEmail }}
              </span>
            </div>
          </div>
          <div class="managed-session__meta">
            <span class="dbru-font-size-sm dbru-font-color-base">{{ sessionAgent(session.userAgent) }}</span>
            <span class="dbru-font-size-xs dbru-font-color-muted">
              {{ session.ipAddress || 'IP не передан' }} · {{ formatActivity(session.lastSeenAt || session.createdAt) }}
            </span>
          </div>
          <DbrButton
            variant="danger"
            size="sm"
            native-type="button"
            class="dbru-focus-visible"
            :disabled="revokingSessionId === session.id"
            @click="revokeSession(session.id)"
          >
            {{ revokingSessionId === session.id ? 'Отзываем…' : 'Завершить' }}
          </DbrButton>
        </li>
      </ul>
    </section>
  </DbrCard>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { toast } from 'vue-sonner';
import {
  DbrAvatar,
  DbrButton,
  DbrCard,
  DbrInput,
  DbrLoader,
  DbrToggle,
} from 'dobruniaui-vue';
import {
  deleteClient,
  listManagedClientSessions,
  revokeManagedClientSession,
  updateClient,
} from '@/api/clients-api';
import { ApiError } from '@/api/http';
import { getSessionAgentDetails } from '@/lib/session-agent';
import type { ManagedClientSession, RegisteredClient } from '@/types';

const props = defineProps<{
  client: RegisteredClient;
}>();

const emit = defineEmits<{
  updated: [client: RegisteredClient];
  deleted: [clientId: string];
}>();

const mode = ref<'details' | 'edit' | 'sessions'>('details');
const deleting = ref(false);
const saving = ref(false);
const editError = ref('');
const sessionsLoading = ref(false);
const sessionsError = ref('');
const managedSessions = ref<ManagedClientSession[]>([]);
const revokingSessionId = ref<string | null>(null);

const editName = ref('');
const editSlug = ref('');
const editDescription = ref('');
const editBaseUrl = ref('');
const editLogoUrl = ref('');
const editIsActive = ref(true);
const editRedirectUris = ref<string[]>([]);

function resetEditor() {
  editName.value = props.client.name;
  editSlug.value = props.client.slug;
  editDescription.value = props.client.description ?? '';
  editBaseUrl.value = props.client.baseUrl ?? '';
  editLogoUrl.value = props.client.logoUrl ?? '';
  editIsActive.value = props.client.isActive;
  editRedirectUris.value = [...props.client.redirectUris];
}

function openEdit() {
  resetEditor();
  editError.value = '';
  mode.value = 'edit';
}

function addEditRedirect() {
  if (editRedirectUris.value.length < 10) {
    editRedirectUris.value.push('');
  }
}

function removeEditRedirect(index: number) {
  editRedirectUris.value.splice(index, 1);
}

async function saveEdit() {
  saving.value = true;
  editError.value = '';
  try {
    const response = await updateClient(props.client.id, {
      name: editName.value.trim(),
      slug: editSlug.value.trim(),
      description: editDescription.value.trim(),
      baseUrl: editBaseUrl.value.trim(),
      logoUrl: editLogoUrl.value.trim(),
      redirectUris: editRedirectUris.value.map((uri) => uri.trim()).filter(Boolean),
      isActive: editIsActive.value,
    });
    emit('updated', response.client);
    mode.value = 'details';
    toast.success('Настройки приложения сохранены');
  } catch (error) {
    editError.value = error instanceof ApiError ? error.message : 'Не удалось сохранить приложение';
  } finally {
    saving.value = false;
  }
}

async function removeClient() {
  const confirmed = globalThis.confirm(
    `Удалить приложение «${props.client.name}»? Все его сессии и OAuth-коды будут удалены.`
  );
  if (!confirmed) return;

  deleting.value = true;
  try {
    await deleteClient(props.client.id);
    emit('deleted', props.client.id);
    toast.success('Приложение удалено');
  } catch (error) {
    toast.error(error instanceof ApiError ? error.message : 'Не удалось удалить приложение');
  } finally {
    deleting.value = false;
  }
}

async function toggleSessions() {
  if (mode.value === 'sessions') {
    mode.value = 'details';
    return;
  }
  mode.value = 'sessions';
  await loadSessions();
}

async function loadSessions() {
  sessionsLoading.value = true;
  sessionsError.value = '';
  try {
    const response = await listManagedClientSessions(props.client.id);
    managedSessions.value = response.sessions;
  } catch (error) {
    sessionsError.value = error instanceof ApiError ? error.message : 'Не удалось загрузить сессии';
  } finally {
    sessionsLoading.value = false;
  }
}

async function revokeSession(sessionId: string) {
  revokingSessionId.value = sessionId;
  try {
    await revokeManagedClientSession(props.client.id, sessionId);
    managedSessions.value = managedSessions.value.filter((session) => session.id !== sessionId);
    const activeUsers = new Set(managedSessions.value.map((session) => session.userId)).size;
    emit('updated', {
      ...props.client,
      activeSessionCount: managedSessions.value.length,
      activeUserCount: activeUsers,
    });
    toast.success('Сессия пользователя завершена');
  } catch (error) {
    toast.error(error instanceof ApiError ? error.message : 'Не удалось завершить сессию');
  } finally {
    revokingSessionId.value = null;
  }
}

async function copyClientId() {
  try {
    await navigator.clipboard.writeText(props.client.id);
    toast.success('client_id скопирован');
  } catch {
    toast.error('Не удалось скопировать client_id');
  }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatActivity(value: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

function sessionAgent(userAgent: string | null) {
  return getSessionAgentDetails(userAgent).primaryLabel;
}
</script>

<style scoped>
.client-card {
  padding: var(--dbru-space-5);
  border-color: var(--dbru-color-border);
  border-radius: var(--dbru-radius-md);
  box-shadow: var(--dbru-shadow-sm);
}

.client-card__header,
.client-card__identity,
.client-card__title-line,
.client-card__actions,
.client-editor__heading,
.managed-sessions__heading,
.managed-session,
.managed-session__identity {
  display: flex;
  align-items: center;
}

.client-card__header,
.client-editor__heading,
.managed-sessions__heading {
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--dbru-space-4);
}

.client-card__identity {
  min-width: 0;
  align-items: flex-start;
  gap: var(--dbru-space-3);
}

.client-card__title-block {
  min-width: 0;
}

.client-card__title-line {
  flex-wrap: wrap;
  gap: var(--dbru-space-2) var(--dbru-space-3);
}

.client-card__title-line h3,
.client-card__description,
.client-editor__heading h4,
.client-editor__heading p,
.managed-sessions__heading h4,
.managed-sessions__heading p {
  margin: 0;
}

.client-card__slug,
.client-metric__id,
.callback-url {
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  overflow-wrap: anywhere;
}

.client-card__description {
  margin-top: var(--dbru-space-2);
  max-width: 48rem;
  line-height: var(--dbru-line-height-base);
}

.client-status {
  display: inline-flex;
  align-items: center;
  gap: var(--dbru-space-1);
  color: var(--dbru-color-success);
  font-weight: var(--dbru-font-weight-semibold);
}

.client-status--inactive {
  color: var(--dbru-color-text-muted);
}

.client-status__dot {
  width: var(--dbru-space-2);
  height: var(--dbru-space-2);
  border-radius: 50%;
  background: currentColor;
}

.client-card__actions {
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: var(--dbru-space-2);
}

.client-metrics {
  display: grid;
  grid-template-columns: minmax(9rem, 0.45fr) minmax(9rem, 0.45fr) minmax(16rem, 1.4fr);
  gap: var(--dbru-space-3);
  margin-top: var(--dbru-space-4);
  padding-block: var(--dbru-space-4);
  border-block: var(--dbru-border-size-1) solid var(--dbru-color-border);
}

.client-metric {
  display: grid;
  align-content: start;
  gap: var(--dbru-space-1);
  min-width: 0;
}

.client-metric + .client-metric {
  padding-left: var(--dbru-space-3);
  border-left: var(--dbru-border-size-1) solid var(--dbru-color-border);
}

.client-metric strong {
  font-size: var(--dbru-font-size-xl);
  line-height: var(--dbru-line-height-tight);
}

.client-metric--wide {
  grid-template-columns: minmax(0, 1fr) auto;
}

.client-metric--wide > span {
  grid-column: 1 / -1;
}

.client-metric__copy {
  align-self: center;
}

.client-details {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(10rem, 0.45fr);
  gap: var(--dbru-space-4);
  padding-top: var(--dbru-space-4);
}

.client-details__column,
.client-details__callbacks {
  display: grid;
  align-content: start;
  gap: var(--dbru-space-2);
}

.client-details__callbacks {
  grid-column: 1 / -1;
}

.client-link {
  overflow-wrap: anywhere;
}

.callback-url {
  display: block;
  padding: var(--dbru-space-2) var(--dbru-space-3);
  border-radius: var(--dbru-radius-sm);
  background: var(--dbru-color-bg);
}

.client-editor,
.managed-sessions {
  display: grid;
  gap: var(--dbru-space-4);
  padding-top: var(--dbru-space-4);
}

.client-editor__heading p,
.managed-sessions__heading p {
  margin-top: var(--dbru-space-1);
}

.client-editor__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--dbru-space-3);
}

.callback-editor {
  display: grid;
  gap: var(--dbru-space-3);
  min-width: 0;
  margin: 0;
  padding: var(--dbru-space-3);
  border: var(--dbru-border-size-1) solid var(--dbru-color-border);
  border-radius: var(--dbru-radius-md);
}

.callback-editor legend {
  padding-inline: var(--dbru-space-2);
  font-weight: var(--dbru-font-weight-semibold);
}

.callback-editor__row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: var(--dbru-space-2);
  align-items: end;
}

.callback-editor__add {
  justify-self: start;
}

.client-editor__actions,
.managed-sessions__loading {
  display: flex;
  align-items: center;
  gap: var(--dbru-space-2);
}

.client-error {
  margin: 0;
  color: var(--dbru-color-error);
}

.managed-sessions__list {
  display: grid;
  gap: var(--dbru-space-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.managed-session {
  display: grid;
  grid-template-columns: minmax(13rem, 0.8fr) minmax(14rem, 1fr) auto;
  gap: var(--dbru-space-3);
  padding: var(--dbru-space-3);
  border: var(--dbru-border-size-1) solid var(--dbru-color-border);
  border-radius: var(--dbru-radius-md);
  background: var(--dbru-color-surface);
}

.managed-session__identity {
  gap: var(--dbru-space-2);
  min-width: 0;
}

.managed-session__identity div,
.managed-session__meta {
  display: grid;
  min-width: 0;
  gap: var(--dbru-space-1);
}

.managed-session__email {
  overflow: hidden;
  text-overflow: ellipsis;
}

@media (max-width: 900px) {
  .client-card__header,
  .client-editor__heading,
  .managed-sessions__heading {
    flex-direction: column;
  }

  .client-card__actions {
    justify-content: flex-start;
  }

  .client-metrics,
  .client-details,
  .client-editor__grid {
    grid-template-columns: 1fr;
  }

  .client-metric + .client-metric {
    padding: var(--dbru-space-3) 0 0;
    border-left: 0;
    border-top: var(--dbru-border-size-1) solid var(--dbru-color-border);
  }

  .managed-session {
    grid-template-columns: 1fr;
    align-items: start;
  }
}

@media (max-width: 640px) {
  .client-card {
    padding: var(--dbru-space-4);
  }

  .callback-editor__row {
    grid-template-columns: 1fr;
  }
}
</style>
