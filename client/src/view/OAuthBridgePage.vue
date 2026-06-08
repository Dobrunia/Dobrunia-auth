<template>
  <div class="auth-page">
    <h1 class="dbru-font-size-lg">Вход в приложение</h1>
    <div v-if="phase === 'busy'" class="bridge-state">
      <DbrLoader size="md" />
      <p class="dbru-font-size-sm dbru-font-color-muted">{{ busyText }}</p>
    </div>
    <div v-else-if="phase === 'err'">
      <p class="dbru-font-size-sm" style="color: var(--dbru-color-error)">{{ message }}</p>
      <div class="bridge-actions">
        <DbrButton
          variant="primary"
          native-type="button"
          class="dbru-focus-visible"
          @click="retry"
        >
          Повторить
        </DbrButton>
        <DbrButton
          variant="ghost"
          native-type="button"
          class="dbru-focus-visible"
          @click="goLogin"
        >
          Войти заново
        </DbrButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { DbrButton, DbrLoader } from 'dobruniaui-vue';
import { fetchMe } from '@/api/auth-api';
import { RequestTimeoutError } from '@/api/fetch-with-timeout';
import { ApiError } from '@/api/http';
import { submitOAuthBrowserSession } from '@/api/oauth-browser-session';
import { ROUTES } from '@/constants/app.constants';
import {
  clearOAuthBridgeAttempt,
  hasOAuthBridgeAttempt,
  isAllowedOAuthReturnUrl,
  markOAuthBridgeAttempt,
  oauthClientKeyFromReturnUrl,
} from '@/lib/oauth-return-url';
import { tokenStorage } from '@/lib/token-storage';

const route = useRoute();
const router = useRouter();

const phase = ref<'busy' | 'err'>('busy');
const busyText = ref('Проверка сессии…');
const message = ref('');
const activeReturnUrl = ref<string | null>(null);

function returnUrlRaw(): string | null {
  const q = route.query.return_url;
  return typeof q === 'string' && q.length > 0 ? q : null;
}

function goLogin() {
  const raw = activeReturnUrl.value ?? returnUrlRaw();
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
        reauth: '1',
        return_url: raw,
        ...(clientKey ? { client: clientKey } : {}),
      },
    })
    .catch(() => {});
}

function showError(text: string) {
  phase.value = 'err';
  message.value = text;
}

async function runBridge() {
  phase.value = 'busy';
  busyText.value = 'Проверка сессии…';
  message.value = '';

  const raw = activeReturnUrl.value ?? returnUrlRaw();
  if (!raw || !isAllowedOAuthReturnUrl(raw)) {
    showError('Некорректный или отсутствующий return_url.');
    return;
  }
  activeReturnUrl.value = raw;

  const oauthClientKey = oauthClientKeyFromReturnUrl(raw);
  if (!oauthClientKey) {
    showError('В OAuth-запросе отсутствует client_id.');
    return;
  }

  if (hasOAuthBridgeAttempt(raw)) {
    showError(
      'Браузер не подтвердил OAuth-сессию. Проверьте настройки cookies и повторите вход.'
    );
    return;
  }

  try {
    if (tokenStorage.getAccess() || tokenStorage.getRefresh()) {
      busyText.value = 'Обновление токена…';
      await fetchMe({ redirectOnUnauthorized: false });
      busyText.value = 'Подготовка входа…';
      const access = tokenStorage.getAccess();
      if (!access) {
        goLogin();
        return;
      }
      submitOAuthBrowserSession(
        access,
        oauthClientKey,
        markOAuthBridgeAttempt(raw)
      );
      return;
    }
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      goLogin();
      return;
    }
    if (error instanceof RequestTimeoutError) {
      showError('Сервер авторизации не ответил вовремя. Проверьте соединение и повторите.');
      return;
    }
    showError(
      error instanceof Error
        ? error.message
        : 'Не удалось подготовить OAuth-сессию.'
    );
    return;
  }

  goLogin();
}

function retry() {
  const raw = activeReturnUrl.value ?? returnUrlRaw();
  if (raw) {
    activeReturnUrl.value = clearOAuthBridgeAttempt(raw);
  }
  void runBridge();
}

onMounted(() => {
  void runBridge();
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
.bridge-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dbru-space-2);
  margin-top: var(--dbru-space-3);
}
</style>
