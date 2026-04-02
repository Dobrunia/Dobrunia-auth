<template>
  <div class="auth-page">
    <h1 class="dbru-text-lg">Вход в приложение</h1>
    <div v-if="phase === 'busy'" class="bridge-state">
      <DbrLoader size="md" />
      <p class="dbru-text-sm dbru-text-muted">{{ busyText }}</p>
    </div>
    <div v-else-if="phase === 'err'">
      <p class="dbru-text-sm" style="color: var(--dbru-color-error)">{{ message }}</p>
      <DbrButton
        variant="primary"
        native-type="button"
        class="dbru-focusable"
        style="margin-top: var(--dbru-space-3)"
        @click="goLogin"
      >
        Войти
      </DbrButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { DbrButton, DbrLoader } from 'dobruniaui-vue';
import { fetchMe } from '@/api/auth-api';
import { establishOAuthBrowserSession } from '@/api/oauth-browser-session';
import { ROUTES } from '@/constants/app.constants';
import { isAllowedOAuthReturnUrl, oauthClientKeyFromReturnUrl } from '@/lib/oauth-return-url';
import { tokenStorage } from '@/lib/token-storage';

const route = useRoute();
const router = useRouter();

const phase = ref<'busy' | 'err'>('busy');
const busyText = ref('Проверка сессии…');
const message = ref('');

function returnUrlRaw(): string | null {
  const q = route.query.return_url;
  return typeof q === 'string' && q.length > 0 ? q : null;
}

function goLogin() {
  const raw = returnUrlRaw();
  if (!raw || !isAllowedOAuthReturnUrl(raw)) {
    router.replace(ROUTES.LOGIN).catch(() => {});
    return;
  }
  const clientKey = oauthClientKeyFromReturnUrl(raw);
  router
    .replace({
      path: ROUTES.LOGIN,
      query: {
        oauth: '1',
        return_url: raw,
        ...(clientKey ? { client: clientKey } : {}),
      },
    })
    .catch(() => {});
}

onMounted(async () => {
  const raw = returnUrlRaw();
  if (!raw || !isAllowedOAuthReturnUrl(raw)) {
    phase.value = 'err';
    message.value = 'Некорректный или отсутствующий return_url.';
    return;
  }

  const oauthClientKey = oauthClientKeyFromReturnUrl(raw);

  try {
    if (tokenStorage.getAccess() || tokenStorage.getRefresh()) {
      busyText.value = 'Обновление токена…';
      const me = await fetchMe();
      const match =
        me.session.clientId === oauthClientKey ||
        me.session.clientSlug === oauthClientKey;
      if (match) {
        busyText.value = 'Подготовка входа…';
        const access = tokenStorage.getAccess();
        if (!access) {
          phase.value = 'err';
          message.value = 'Нет access token после проверки.';
          return;
        }
        await establishOAuthBrowserSession(access);
        globalThis.location.assign(raw);
        return;
      }
    }
  } catch {
    /* к логину */
  }

  goLogin();
});
</script>

<style scoped>
.auth-page {
  max-width: 28rem;
  margin-inline: auto;
  padding: var(--dbru-space-5) var(--dbru-space-4);
}
.bridge-state {
  display: flex;
  align-items: center;
  gap: var(--dbru-space-3);
  margin-top: var(--dbru-space-4);
}
</style>
