<template>
  <div class="auth-page auth-page--wide">
    <div class="sessions-head">
      <h1 class="dbru-text-lg">Мои сессии</h1>
      <div class="sessions-head__actions">
        <RouterLink v-slot="{ navigate }" :to="ROUTES.PROFILE" custom>
          <DbrButton variant="ghost" native-type="button" class="dbru-focusable" @click="navigate">
            Мой аккаунт
          </DbrButton>
        </RouterLink>
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
    <div v-else class="sessions-groups">
      <SessionClientGroup
        v-for="g in sessionGroups"
        :key="g.clientId"
        :client-name="g.clientName"
        :client-slug="g.clientSlug"
        :sessions="g.sessions"
        :current-session-id="currentSessionId"
        :deleting-id="deletingId"
        @revoke="onRevoke"
      />
    </div>
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
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { DbrButton, DbrLoader } from 'dobruniaui-vue';
import { deleteSession, fetchMe, listSessions, logout } from '@/api/auth-api';
import { ApiError } from '@/api/http';
import SessionClientGroup from '@/components/SessionClientGroup.vue';
import { ROUTES } from '@/constants/app.constants';
import { tokenStorage } from '@/lib/token-storage';
import type { SessionItem } from '@/types';

const router = useRouter();
const sessions = ref<SessionItem[]>([]);
const loading = ref(true);
const loadError = ref('');
const deletingId = ref<string | null>(null);
const logoutLoading = ref(false);
const currentSessionId = ref<string | null>(null);

function sessionSortKey(s: SessionItem) {
  const t = s.lastSeenAt ?? s.createdAt;
  try {
    return new Date(t).getTime();
  } catch {
    return 0;
  }
}

const sessionGroups = computed(() => {
  const map = new Map<string, SessionItem[]>();
  for (const s of sessions.value) {
    const list = map.get(s.clientId);
    if (list) {
      list.push(s);
    } else {
      map.set(s.clientId, [s]);
    }
  }
  const groups = Array.from(map.entries()).map(([clientId, items]) => {
    const sorted = [...items].sort((a, b) => sessionSortKey(b) - sessionSortKey(a));
    const first = sorted[0];
    return {
      clientId,
      clientName: first.clientName,
      clientSlug: first.clientSlug,
      sessions: sorted,
    };
  });
  groups.sort((a, b) => a.clientName.localeCompare(b.clientName, 'ru'));
  return groups;
});

async function load() {
  loadError.value = '';
  loading.value = true;
  try {
    const [me, res] = await Promise.all([fetchMe(), listSessions()]);
    currentSessionId.value = me.session.id;
    sessions.value = res.sessions;
  } catch (e) {
    loadError.value = e instanceof ApiError ? e.message : 'Ошибка загрузки';
    currentSessionId.value = null;
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
  max-width: 52rem;
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
.sessions-groups {
  margin-top: var(--dbru-space-4);
  display: flex;
  flex-direction: column;
  gap: var(--dbru-space-4);
}
</style>
