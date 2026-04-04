<template>
  <div>
    <h1 class="dbru-text-lg" style="margin: 0 0 var(--dbru-space-4)">Профиль</h1>
    <p v-if="loading" class="dbru-text-sm dbru-text-muted">Загрузка…</p>
    <template v-else-if="me">
      <DbrCard variant="bordered" as="section" class="dbru-surface profile-card">
        <div class="profile-card__pad">
          <div class="profile-head">
            <DbrAvatar
              :src="avatarSrc"
              :name="displayName"
              :alt="displayName"
              size="lg"
              shape="circle"
            />
            <div class="profile-head__text">
              <p class="dbru-text-base dbru-text-main" style="margin: 0; font-weight: var(--dbru-font-weight-semibold)">
                {{ displayName }}
              </p>
              <p class="dbru-text-sm dbru-text-muted" style="margin: var(--dbru-space-1) 0 0">
                {{ me.user.email }}
              </p>
            </div>
          </div>
          <dl class="profile-fields">
            <div class="profile-fields__row">
              <dt class="dbru-text-xs dbru-text-muted">ID</dt>
              <dd class="dbru-text-sm dbru-text-main">{{ me.user.id }}</dd>
            </div>
            <div class="profile-fields__row">
              <dt class="dbru-text-xs dbru-text-muted">Имя пользователя</dt>
              <dd class="dbru-text-sm dbru-text-main">{{ me.user.username ?? '—' }}</dd>
            </div>
            <div class="profile-fields__row">
              <dt class="dbru-text-xs dbru-text-muted">Имя</dt>
              <dd class="dbru-text-sm dbru-text-main">{{ me.user.firstName ?? '—' }}</dd>
            </div>
            <div class="profile-fields__row">
              <dt class="dbru-text-xs dbru-text-muted">Фамилия</dt>
              <dd class="dbru-text-sm dbru-text-main">{{ me.user.lastName ?? '—' }}</dd>
            </div>
            <div class="profile-fields__row">
              <dt class="dbru-text-xs dbru-text-muted">Аватар (URL)</dt>
              <dd class="dbru-text-sm dbru-text-muted profile-fields__ellipsis" :title="me.user.avatarUrl ?? ''">
                {{ me.user.avatarUrl ?? '—' }}
              </dd>
            </div>
            <div class="profile-fields__row">
              <dt class="dbru-text-xs dbru-text-muted">Приложение</dt>
              <dd class="dbru-text-sm dbru-text-main">
                {{ me.session.clientName }}
                <span class="dbru-text-muted"> ({{ me.session.clientSlug }})</span>
              </dd>
            </div>
            <div class="profile-fields__row">
              <dt class="dbru-text-xs dbru-text-muted">Сессия</dt>
              <dd class="dbru-text-xs dbru-text-muted profile-fields__ellipsis" :title="me.session.id">{{ me.session.id }}</dd>
            </div>
          </dl>
        </div>
      </DbrCard>
      <p class="dbru-text-xs dbru-text-muted" style="margin-top: var(--dbru-space-3)">
        Данные только для просмотра. Изменить профиль можно в основном auth-web.
      </p>
      <DbrButton variant="ghost" native-type="button" class="dbru-focusable" style="margin-top: var(--dbru-space-3)" @click="logout">
        Выйти (очистить токены)
      </DbrButton>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { DbrAvatar, DbrButton, DbrCard } from 'dobruniaui-vue';
import { fetchMe, type MeResponse } from '@/lib/api';
import { tokens } from '@/lib/tokens';
import { ROUTES } from '@/router';

const router = useRouter();
const loading = ref(true);
const me = ref<MeResponse | null>(null);

const displayName = computed(() => {
  const u = me.value?.user;
  if (!u) {
    return '';
  }
  const full = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
  if (full) {
    return full;
  }
  if (u.username) {
    return u.username;
  }
  return u.email;
});

const avatarSrc = computed(() => {
  const url = me.value?.user.avatarUrl?.trim();
  if (!url || !/^https?:\/\//i.test(url)) {
    return undefined;
  }
  return url;
});

onMounted(async () => {
  try {
    me.value = await fetchMe();
  } catch {
    tokens.clear();
    await router.replace({ path: ROUTES.login, query: { returnTo: ROUTES.home } });
    return;
  } finally {
    loading.value = false;
  }
});

function logout() {
  tokens.clear();
  void router.replace(ROUTES.login);
}
</script>

<style scoped>
.profile-card__pad {
  padding: var(--dbru-space-4);
}
.profile-head {
  display: flex;
  align-items: center;
  gap: var(--dbru-space-4);
  margin-bottom: var(--dbru-space-4);
  padding-bottom: var(--dbru-space-4);
  border-bottom: var(--dbru-border-size-1) solid var(--dbru-color-border);
}
.profile-head__text {
  min-width: 0;
  flex: 1;
}
.profile-fields {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--dbru-space-3);
}
.profile-fields__row {
  margin: 0;
  display: grid;
  grid-template-columns: 7.5rem 1fr;
  gap: var(--dbru-space-2);
  align-items: baseline;
}
.profile-fields__row dt {
  margin: 0;
}
.profile-fields__row dd {
  margin: 0;
  min-width: 0;
  word-break: break-word;
}
.profile-fields__ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
@media (max-width: 24rem) {
  .profile-fields__row {
    grid-template-columns: 1fr;
  }
}
</style>
