<template>
  <div>
    <h1>OAuth callback</h1>
    <p v-if="status === 'working'" class="muted">Обмен кода на токены…</p>
    <p v-else-if="status === 'ok'" class="ok">Готово, перенаправление…</p>
    <p v-else class="err">{{ message }}</p>
    <p v-if="status === 'error'" class="hint">
      <router-link to="/login">На страницу входа</router-link>
    </p>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { oauthClientId, oauthRedirectUri } from '@/config';
import { exchangeOAuthCode } from '@/lib/api';
import { consumeOAuthState } from '@/lib/oauth-start';
import { tokens } from '@/lib/tokens';
import { ROUTES } from '@/router';

const route = useRoute();
const router = useRouter();

const status = ref<'working' | 'ok' | 'error'>('working');
const message = ref('');

onMounted(async () => {
  const code = typeof route.query.code === 'string' ? route.query.code : '';
  const state = typeof route.query.state === 'string' ? route.query.state : null;

  if (!code) {
    status.value = 'error';
    message.value = 'В URL нет параметра code.';
    return;
  }

  if (!consumeOAuthState(state)) {
    status.value = 'error';
    message.value = 'Неверный или устаревший state (CSRF). Попробуйте войти снова.';
    return;
  }

  try {
    const res = await exchangeOAuthCode(code, oauthRedirectUri(), oauthClientId);
    tokens.setPair(res.accessToken, res.refreshToken);
    status.value = 'ok';
    await router.replace(ROUTES.home);
  } catch (e) {
    status.value = 'error';
    message.value = e instanceof Error ? e.message : 'Ошибка обмена кода';
  }
});
</script>

<style scoped>
h1 {
  font-size: 1.25rem;
}
.muted {
  opacity: 0.75;
}
.ok {
  color: #6ee7a8;
}
.err {
  color: #f9a8a8;
}
.hint {
  margin-top: 1rem;
}
</style>
