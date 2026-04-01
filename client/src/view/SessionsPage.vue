<template>
  <div class="auth-page auth-page--wide">
    <div class="sessions-head">
      <h1 class="dbru-text-lg">Мои сессии</h1>
      <div class="sessions-head__actions">
        <DbrButton variant="ghost" native-type="button" :disabled="logoutLoading" @click="onLogoutEverywhere">
          Выйти (refresh)
        </DbrButton>
      </div>
    </div>
    <p class="dbru-text-muted dbru-text-base" style="line-height: var(--dbru-line-height-base)">
      Все входы в auth-сервисе по всем клиентам. Можно завершить отдельные сессии.
    </p>
    <p v-if="loadError" class="dbru-text-sm" style="color: var(--dbru-color-error)">{{ loadError }}</p>
    <div v-else-if="loading" class="sessions-loading">
      <DbrLoader size="md" />
      <span class="dbru-text-sm dbru-text-muted">Загрузка…</span>
    </div>
    <ul v-else class="sessions-list">
      <li v-for="s in sessions" :key="s.id">
        <DbrCard
          variant="bordered"
          as="article"
          class="dbru-surface session-card"
          :class="{ 'session-card--inactive': s.status !== 'active' }"
        >
          <div class="session-card__row">
            <DbrChip :variant="chipVariant(s.status)">{{ s.status }}</DbrChip>
            <span class="dbru-text-main" style="font-weight: var(--dbru-font-weight-semibold)">
              {{ s.clientName }} ({{ s.clientSlug }})
            </span>
          </div>
          <p class="dbru-text-xs dbru-text-muted session-meta">ID сессии: {{ s.id }}</p>
          <p v-if="s.ipAddress" class="dbru-text-xs dbru-text-muted session-meta">IP: {{ s.ipAddress }}</p>
          <p
            v-if="s.userAgent"
            class="dbru-text-xs dbru-text-muted session-meta"
            :title="s.userAgent"
          >
            UA: {{ truncate(s.userAgent, 80) }}
          </p>
          <p class="dbru-text-xs dbru-text-muted session-meta">Создана: {{ formatDate(s.createdAt) }}</p>
          <p v-if="s.lastSeenAt" class="dbru-text-xs dbru-text-muted session-meta">
            Последняя активность: {{ formatDate(s.lastSeenAt) }}
          </p>
          <DbrButton
            variant="danger"
            native-type="button"
            size="sm"
            class="session-revoke"
            :disabled="deletingId === s.id || s.status !== 'active'"
            @click="onRevoke(s.id)"
          >
            Завершить
          </DbrButton>
        </DbrCard>
      </li>
    </ul>
    <p
      v-if="!loading && !loadError && sessions.length === 0"
      class="dbru-text-sm dbru-text-muted"
      style="margin-top: var(--dbru-space-3)"
    >
      Сессий нет.
    </p>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { DbrButton, DbrCard, DbrChip, DbrLoader } from 'dobruniaui-vue';
import { deleteSession, listSessions, logout } from '@/api/auth-api';
import { ApiError } from '@/api/http';
import { ROUTES } from '@/constants/app.constants';
import { tokenStorage } from '@/lib/token-storage';
import type { SessionItem } from '@/types';

const router = useRouter();
const sessions = ref<SessionItem[]>([]);
const loading = ref(true);
const loadError = ref('');
const deletingId = ref<string | null>(null);
const logoutLoading = ref(false);

function chipVariant(status: string): 'primary' | 'ghost' | 'danger' {
  if (status === 'active') return 'primary';
  if (status === 'revoked') return 'danger';
  return 'ghost';
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function truncate(s: string, n: number) {
  return s.length <= n ? s : `${s.slice(0, n)}…`;
}

async function load() {
  loadError.value = '';
  loading.value = true;
  try {
    const res = await listSessions();
    sessions.value = res.sessions;
  } catch (e) {
    loadError.value = e instanceof ApiError ? e.message : 'Ошибка загрузки';
  } finally {
    loading.value = false;
  }
}

async function onRevoke(id: string) {
  deletingId.value = id;
  try {
    await deleteSession(id);
    await load();
  } catch (e) {
    loadError.value = e instanceof ApiError ? e.message : 'Не удалось завершить сессию';
  } finally {
    deletingId.value = null;
  }
}

async function onLogoutEverywhere() {
  const rt = tokenStorage.getRefresh();
  if (!rt) {
    tokenStorage.clear();
    await router.replace(ROUTES.LOGIN);
    return;
  }
  logoutLoading.value = true;
  try {
    await logout(rt);
  } catch {
    /* идемпотентно */
  } finally {
    tokenStorage.clear();
    logoutLoading.value = false;
    await router.replace(ROUTES.LOGIN);
  }
}

onMounted(() => {
  void load();
});
</script>

<style scoped>
.auth-page {
  margin-inline: auto;
  padding: var(--dbru-space-5) var(--dbru-space-4);
}
.auth-page--wide {
  max-width: 48rem;
}
.sessions-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--dbru-space-3);
}
.sessions-head__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dbru-space-2);
}
.sessions-loading {
  display: flex;
  align-items: center;
  gap: var(--dbru-space-3);
  margin-top: var(--dbru-space-4);
}
.sessions-list {
  list-style: none;
  padding: 0;
  margin: var(--dbru-space-4) 0 0;
  display: flex;
  flex-direction: column;
  gap: var(--dbru-space-3);
}
.session-card--inactive {
  opacity: 0.88;
}
.session-card__row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--dbru-space-2) var(--dbru-space-3);
}
.session-meta {
  margin: var(--dbru-space-2) 0 0;
}
.session-revoke {
  margin-top: var(--dbru-space-3);
}
</style>
