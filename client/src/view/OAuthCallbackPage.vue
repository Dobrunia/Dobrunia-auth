<template>
  <div class="auth-page auth-page--oauth">
    <h1 class="dbru-text-lg">OAuth</h1>
    <div v-if="status === 'loading'" class="oauth-state">
      <DbrLoader size="md" />
      <p class="dbru-text-sm dbru-text-muted">Обмен кода на токены…</p>
    </div>
    <p v-else-if="status === 'ok'" class="dbru-text-sm" style="color: var(--dbru-color-success)">
      Готово. Перенаправление…
    </p>
    <div v-else>
      <p class="dbru-text-sm" style="color: var(--dbru-color-error)">{{ message }}</p>
      <RouterLink v-slot="{ navigate }" :to="ROUTES.HOME" custom>
        <DbrButton variant="ghost" native-type="button" class="dbru-focusable" style="margin-top: var(--dbru-space-3)" @click="navigate">
          На главную
        </DbrButton>
      </RouterLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { DbrButton, DbrLoader } from 'dobruniaui-vue';
import { oauthToken } from '@/api/auth-api';
import { ApiError } from '@/api/http';
import { clientConfig } from '@/config';
import { ROUTES } from '@/constants/app.constants';
import { tokenStorage } from '@/lib/token-storage';

const route = useRoute();
const router = useRouter();

const status = ref<'loading' | 'ok' | 'error'>('loading');
const message = ref('');

onMounted(async () => {
  const code = typeof route.query.code === 'string' ? route.query.code : '';
  if (!code) {
    status.value = 'error';
    message.value = 'В URL нет параметра code. Откройте страницу после редиректа с auth-сервера.';
    return;
  }

  const redirectUri = `${globalThis.location.origin}${ROUTES.OAUTH_CALLBACK}`;

  try {
    const res = await oauthToken({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: clientConfig.oauthClientId,
    });
    tokenStorage.setTokens(res.accessToken, res.refreshToken);
    status.value = 'ok';
    await router.replace(ROUTES.SESSIONS);
  } catch (e) {
    status.value = 'error';
    message.value = e instanceof ApiError ? e.message : 'Ошибка обмена кода';
  }
});
</script>

<style scoped>
.auth-page {
  margin-inline: auto;
  padding: var(--dbru-space-5) var(--dbru-space-4);
}
.auth-page--oauth {
  max-width: 28rem;
}
.oauth-state {
  display: flex;
  align-items: center;
  gap: var(--dbru-space-3);
  margin-top: var(--dbru-space-3);
}
</style>
