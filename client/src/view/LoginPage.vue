<template>
  <AuthCredentialsForm
    v-model:email="email"
    v-model:password="password"
    title="Вход"
    :client-slug="clientSlug"
    :error="error"
    :loading="loading"
    password-autocomplete="current-password"
    submit-label="Войти"
    @submit="onSubmit"
  >
    <template #footer>
      <RouterLink
        v-slot="{ navigate }"
        :to="{ path: ROUTES.REGISTER, query: registerQuery }"
        custom
      >
        <DbrButton variant="ghost" size="sm" native-type="button" class="dbru-focusable" @click="navigate">
          Регистрация
        </DbrButton>
      </RouterLink>
    </template>
  </AuthCredentialsForm>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { DbrButton } from 'dobruniaui-vue';
import { login } from '@/api/auth-api';
import { ApiError } from '@/api/http';
import { establishOAuthBrowserSession } from '@/api/oauth-browser-session';
import AuthCredentialsForm from '@/components/AuthCredentialsForm.vue';
import { clientConfig } from '@/config';
import { ROUTES } from '@/constants/app.constants';
import { isAllowedOAuthReturnUrl } from '@/lib/oauth-return-url';
import { tokenStorage } from '@/lib/token-storage';

const route = useRoute();
const router = useRouter();

const clientSlug = computed(
  () => (typeof route.query.client === 'string' && route.query.client) || clientConfig.defaultClientSlug
);

const registerQuery = computed(() => {
  const base: Record<string, string> = { client: clientSlug.value };
  if (route.query.oauth === '1' && typeof route.query.return_url === 'string') {
    base.oauth = '1';
    base.return_url = route.query.return_url;
  }
  return base;
});

const email = ref('');
const password = ref('');
const loading = ref(false);
const error = ref('');

async function onSubmit() {
  error.value = '';
  loading.value = true;
  try {
    const res = await login({
      email: email.value.trim(),
      password: password.value,
      clientId: clientSlug.value,
    });
    tokenStorage.setTokens(res.accessToken, res.refreshToken);
    const oauthReturn =
      route.query.oauth === '1' && typeof route.query.return_url === 'string'
        ? route.query.return_url
        : '';
    if (oauthReturn && isAllowedOAuthReturnUrl(oauthReturn)) {
      await establishOAuthBrowserSession(res.accessToken);
      globalThis.location.assign(oauthReturn);
      return;
    }
    const returnTo = typeof route.query.returnTo === 'string' ? route.query.returnTo : ROUTES.HOME;
    await router.replace(returnTo || ROUTES.HOME);
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : 'Ошибка сети';
  } finally {
    loading.value = false;
  }
}
</script>
