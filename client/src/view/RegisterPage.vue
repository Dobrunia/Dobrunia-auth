<template>
  <AuthCredentialsForm
    v-model:email="email"
    v-model:password="password"
    title="Регистрация"
    :client-slug="clientSlug"
    :error="error"
    :loading="loading"
    password-autocomplete="new-password"
    submit-label="Создать аккаунт"
    @submit="onSubmit"
  >
    <template #footer>
      <RouterLink
        v-slot="{ navigate }"
        :to="{ path: ROUTES.LOGIN, query: { client: clientSlug } }"
        custom
      >
        <DbrButton variant="ghost" size="sm" native-type="button" class="dbru-focusable" @click="navigate">
          Уже есть аккаунт
        </DbrButton>
      </RouterLink>
    </template>
  </AuthCredentialsForm>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { DbrButton } from 'dobruniaui-vue';
import { register } from '@/api/auth-api';
import { ApiError } from '@/api/http';
import AuthCredentialsForm from '@/components/AuthCredentialsForm.vue';
import { clientConfig } from '@/config';
import { ROUTES } from '@/constants/app.constants';
import { tokenStorage } from '@/lib/token-storage';

const route = useRoute();
const router = useRouter();

const clientSlug = computed(
  () => (typeof route.query.client === 'string' && route.query.client) || clientConfig.defaultClientSlug
);

const email = ref('');
const password = ref('');
const loading = ref(false);
const error = ref('');

async function onSubmit() {
  error.value = '';
  loading.value = true;
  try {
    const res = await register({
      email: email.value.trim(),
      password: password.value,
      clientId: clientSlug.value,
    });
    tokenStorage.setTokens(res.accessToken, res.refreshToken);
    await router.replace(ROUTES.HOME);
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : 'Ошибка сети';
  } finally {
    loading.value = false;
  }
}
</script>
