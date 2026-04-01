<template>
  <div class="auth-page auth-page--narrow">
    <h1 class="dbru-text-lg">Регистрация</h1>
    <p class="dbru-text-sm dbru-text-muted">
      Клиент: <strong class="dbru-text-main">{{ clientSlug }}</strong>
    </p>
    <form class="auth-page__form" @submit.prevent="onSubmit">
      <DbrInput
        v-model="email"
        label="Email"
        type="email"
        name="email"
        autocomplete="username"
        required
        size="md"
      />
      <DbrInput
        v-model="password"
        label="Пароль"
        type="password"
        name="password"
        autocomplete="new-password"
        required
        size="md"
      />
      <p v-if="error" class="dbru-text-sm" style="color: var(--dbru-color-error); margin: 0">
        {{ error }}
      </p>
      <DbrButton variant="primary" native-type="submit" :disabled="loading" class="dbru-focusable">
        {{ loading ? '…' : 'Создать аккаунт' }}
      </DbrButton>
    </form>
    <p class="dbru-text-sm dbru-text-muted auth-page__footer">
      <RouterLink
        v-slot="{ navigate }"
        :to="{ path: ROUTES.LOGIN, query: { client: clientSlug } }"
        custom
      >
        <DbrButton variant="ghost" size="sm" native-type="button" class="dbru-focusable" @click="navigate">
          Уже есть аккаунт
        </DbrButton>
      </RouterLink>
      <span aria-hidden="true"> · </span>
      <RouterLink v-slot="{ navigate }" :to="ROUTES.HOME" custom>
        <DbrButton variant="ghost" size="sm" native-type="button" class="dbru-focusable" @click="navigate">
          Главная
        </DbrButton>
      </RouterLink>
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { DbrButton, DbrInput } from 'dobruniaui-vue';
import { register } from '@/api/auth-api';
import { ApiError } from '@/api/http';
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
    await router.replace(ROUTES.SESSIONS);
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : 'Ошибка сети';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.auth-page {
  margin-inline: auto;
  padding: var(--dbru-space-5) var(--dbru-space-4);
}
.auth-page--narrow {
  max-width: 22rem;
}
.auth-page__form {
  display: flex;
  flex-direction: column;
  gap: var(--dbru-space-3);
  margin-top: var(--dbru-space-4);
}
.auth-page__footer {
  margin-top: var(--dbru-space-4);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--dbru-space-1);
}
</style>
