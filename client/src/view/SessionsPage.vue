<template>
  <div class="sessions-page">
    <DbrCard as="section" variant="bordered" class="dbru-surface sessions-hero">
      <div class="sessions-hero__content">
        <div class="sessions-hero__copy">
          <p class="sessions-hero__eyebrow dbru-text-xs dbru-text-muted">Безопасность аккаунта</p>
          <h1 class="sessions-hero__title dbru-text-main">Сессии и устройства</h1>
          <p class="sessions-hero__text dbru-text-base dbru-text-muted">
            Контролируйте все входы в Dobrunia Auth по разным приложениям. Экран ниже показывает, с какого устройства
            выполнен вход, какой браузер и ОС использовались, когда сессия была создана и когда проявляла активность.
          </p>
        </div>

        <div class="sessions-hero__stats">
          <DbrCard variant="surface" class="sessions-stat dbru-surface">
            <span class="dbru-text-xs dbru-text-muted">Приложений</span>
            <strong class="dbru-text-main">{{ sessionGroups.length }}</strong>
            <small class="dbru-text-sm dbru-text-muted">Группы клиентов, в которых есть сохраненные сессии.</small>
          </DbrCard>

          <DbrCard variant="surface" class="sessions-stat dbru-surface">
            <span class="dbru-text-xs dbru-text-muted">Активных сессий</span>
            <strong class="dbru-text-main">{{ activeSessionsCount }}</strong>
            <small class="dbru-text-sm dbru-text-muted">Действующие входы, которые можно завершить вручную.</small>
          </DbrCard>

          <DbrCard variant="surface" class="sessions-stat dbru-surface">
            <span class="dbru-text-xs dbru-text-muted">Текущий клиент</span>
            <strong class="dbru-text-main">{{ currentClientName }}</strong>
            <small class="dbru-text-sm dbru-text-muted">Сессия этой вкладки выделена отдельным акцентом в списке.</small>
          </DbrCard>
        </div>
      </div>

      <div class="sessions-hero__actions">
        <RouterLink v-slot="{ navigate }" :to="ROUTES.PROFILE" custom>
          <DbrButton variant="ghost" native-type="button" class="dbru-focusable" @click="navigate">
            Мой аккаунт
          </DbrButton>
        </RouterLink>
        <DbrButton variant="danger" native-type="button" :disabled="logoutLoading" @click="onLogoutEverywhere">
          {{ logoutLoading ? 'Выходим…' : 'Выйти из текущей сессии' }}
        </DbrButton>
      </div>
    </DbrCard>

    <DbrCard v-if="loadError" variant="bordered" class="sessions-state sessions-state--error">
      <p class="dbru-text-sm" style="margin: 0">{{ loadError }}</p>
    </DbrCard>

    <DbrCard v-else-if="loading" variant="bordered" class="sessions-state sessions-state--loading">
      <div class="sessions-loading">
        <div class="sessions-loading__head">
          <DbrLoader size="md" />
          <span class="dbru-text-sm dbru-text-muted">Загружаем сессии и группируем их по приложениям…</span>
        </div>
        <div class="sessions-loading__grid">
          <DbrSkeleton height="calc(var(--dbru-control-height-lg) * 2)" radius="var(--dbru-radius-md)" />
          <DbrSkeleton height="calc(var(--dbru-control-height-lg) * 2)" radius="var(--dbru-radius-md)" />
          <DbrSkeleton height="calc(var(--dbru-control-height-lg) * 2)" radius="var(--dbru-radius-md)" />
        </div>
      </div>
    </DbrCard>

    <DbrCard v-else-if="sessions.length === 0" variant="bordered" class="sessions-state">
      <div class="sessions-empty">
        <span class="sessions-state__title dbru-text-main">Сессий пока нет</span>
        <span class="dbru-text-sm dbru-text-muted">
          Когда появятся входы в сервис, здесь будут показаны все устройства и точки входа.
        </span>
      </div>
    </DbrCard>

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
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { DbrButton, DbrCard, DbrLoader, DbrSkeleton } from 'dobruniaui-vue';
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

function sessionSortKey(session: SessionItem) {
  const target = session.lastSeenAt ?? session.createdAt;
  try {
    return new Date(target).getTime();
  } catch {
    return 0;
  }
}

const sessionGroups = computed(() => {
  const map = new Map<string, SessionItem[]>();

  for (const session of sessions.value) {
    const list = map.get(session.clientId);
    if (list) {
      list.push(session);
    } else {
      map.set(session.clientId, [session]);
    }
  }

  const groups = Array.from(map.entries()).map(([clientId, items]) => {
    const sorted = [...items].sort((left, right) => sessionSortKey(right) - sessionSortKey(left));
    const first = sorted[0];

    return {
      clientId,
      clientName: first.clientName,
      clientSlug: first.clientSlug,
      sessions: sorted,
    };
  });

  groups.sort((left, right) => {
    const leftHasCurrent = left.sessions.some((session) => session.id === currentSessionId.value);
    const rightHasCurrent = right.sessions.some((session) => session.id === currentSessionId.value);

    if (leftHasCurrent !== rightHasCurrent) return leftHasCurrent ? -1 : 1;
    return left.clientName.localeCompare(right.clientName, 'ru');
  });

  return groups;
});

const activeSessionsCount = computed(() => sessions.value.filter((session) => session.status === 'active').length);

const currentClientName = computed(() => {
  if (!currentSessionId.value) return 'Не определен';

  return sessions.value.find((session) => session.id === currentSessionId.value)?.clientName ?? 'Не удалось определить';
});

async function load() {
  loadError.value = '';
  loading.value = true;

  try {
    const [me, response] = await Promise.all([fetchMe(), listSessions()]);
    currentSessionId.value = me.session.id;
    sessions.value = response.sessions;
  } catch (error) {
    loadError.value = error instanceof ApiError ? error.message : 'Ошибка загрузки';
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
  } catch (error) {
    loadError.value = error instanceof ApiError ? error.message : 'Не удалось завершить сессию';
  } finally {
    deletingId.value = null;
  }
}

async function onLogoutEverywhere() {
  const refreshToken = tokenStorage.getRefresh();

  if (!refreshToken) {
    tokenStorage.clear();
    await router.replace(ROUTES.LOGIN);
    return;
  }

  logoutLoading.value = true;

  try {
    await logout(refreshToken);
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
.sessions-page {
  max-width: 92rem;
  margin-inline: auto;
  padding: var(--dbru-space-5) var(--dbru-space-5) calc(var(--dbru-space-6) + var(--dbru-space-2));
  color: var(--dbru-color-text);
}

.sessions-hero {
  position: relative;
  overflow: hidden;
  padding: var(--dbru-space-6);
  border-radius: calc(var(--dbru-radius-md) + var(--dbru-space-2));
  border-color: var(--dbru-color-border);
  background:
    linear-gradient(
      135deg,
      color-mix(in srgb, var(--dbru-color-surface) 94%, var(--dbru-color-bg) 6%) 0%,
      color-mix(in srgb, var(--dbru-color-surface) 86%, var(--dbru-color-primary) 14%) 100%
    );
  box-shadow: var(--dbru-shadow-md);
}

.sessions-hero::before,
.sessions-hero::after {
  content: '';
  position: absolute;
  border-radius: 999px;
  pointer-events: none;
}

.sessions-hero::before {
  top: calc(var(--dbru-space-6) * -1);
  right: calc(var(--dbru-space-5) * -1);
  width: 14rem;
  height: 14rem;
  background:
    radial-gradient(
      circle,
      color-mix(in srgb, var(--dbru-color-primary) 22%, transparent) 0%,
      transparent 72%
    );
}

.sessions-hero::after {
  bottom: calc(var(--dbru-space-6) * -1);
  left: calc(var(--dbru-space-4) * -1);
  width: 13rem;
  height: 13rem;
  background:
    radial-gradient(
      circle,
      color-mix(in srgb, var(--dbru-color-success) 18%, transparent) 0%,
      transparent 72%
    );
}

.sessions-hero__content {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(19rem, 1fr);
  gap: var(--dbru-space-5) calc(var(--dbru-space-6) + var(--dbru-space-1));
  align-items: start;
}

.sessions-hero__copy {
  min-width: 0;
}

.sessions-hero__eyebrow {
  margin: 0 0 var(--dbru-space-2);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.sessions-hero__title {
  margin: 0;
  font-size: calc(var(--dbru-font-size-lg) + var(--dbru-space-4));
  font-weight: var(--dbru-font-weight-semibold);
  line-height: 0.98;
}

.sessions-hero__text {
  margin: var(--dbru-space-3) 0 0;
  max-width: 52rem;
  line-height: 1.7;
}

.sessions-hero__stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--dbru-space-3);
}

.sessions-stat {
  position: relative;
  z-index: 1;
  display: grid;
  gap: var(--dbru-space-1);
  min-height: 8.5rem;
  padding: var(--dbru-space-4);
  border-radius: var(--dbru-radius-md);
  border-color: var(--dbru-color-border);
  background: color-mix(in srgb, var(--dbru-color-surface) 94%, var(--dbru-color-bg) 6%);
  box-shadow: none;
}

.sessions-stat span {
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.sessions-stat strong {
  font-size: calc(var(--dbru-font-size-lg) + var(--dbru-space-1));
  line-height: 1.1;
}

.sessions-stat small {
  line-height: 1.45;
}

.sessions-hero__actions {
  position: relative;
  z-index: 1;
  display: flex;
  flex-wrap: wrap;
  gap: var(--dbru-space-3);
  margin-top: var(--dbru-space-4);
}

.sessions-state {
  margin-top: var(--dbru-space-4);
  padding: var(--dbru-space-4);
  border-radius: calc(var(--dbru-radius-md) + var(--dbru-space-1));
  border-color: var(--dbru-color-border);
  box-shadow: var(--dbru-shadow-sm);
}

.sessions-state--loading,
.sessions-empty {
  display: grid;
  gap: var(--dbru-space-3);
}

.sessions-loading {
  display: grid;
  gap: var(--dbru-space-4);
}

.sessions-loading__head {
  display: flex;
  align-items: center;
  gap: var(--dbru-space-3);
}

.sessions-loading__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--dbru-space-3);
}

.sessions-state--error {
  border-color: color-mix(in srgb, var(--dbru-color-border) 35%, var(--dbru-color-danger) 65%);
  background: color-mix(in srgb, var(--dbru-color-surface) 88%, var(--dbru-color-danger) 12%);
}

.sessions-state__title {
  font-weight: var(--dbru-font-weight-semibold);
}

.sessions-groups {
  display: flex;
  flex-direction: column;
  gap: var(--dbru-space-5);
  margin-top: var(--dbru-space-5);
}

@media (max-width: 1080px) {
  .sessions-hero__content {
    grid-template-columns: minmax(0, 1fr);
  }

  .sessions-hero__stats {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .sessions-page {
    padding: var(--dbru-space-4) var(--dbru-space-4) var(--dbru-space-6);
  }

  .sessions-hero {
    padding: var(--dbru-space-4);
    border-radius: calc(var(--dbru-radius-md) + var(--dbru-space-1));
  }

  .sessions-hero__title {
    font-size: calc(var(--dbru-font-size-lg) + var(--dbru-space-2));
  }

  .sessions-hero__text {
    font-size: var(--dbru-font-size-base);
  }

  .sessions-hero__stats {
    grid-template-columns: 1fr;
  }

  .sessions-loading__head {
    align-items: flex-start;
  }

  .sessions-loading__grid {
    grid-template-columns: 1fr;
  }
}
</style>
