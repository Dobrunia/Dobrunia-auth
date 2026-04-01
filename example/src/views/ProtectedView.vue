<template>
  <div>
    <h1>Защищённая страница</h1>
    <p v-if="loading" class="muted">Загрузка профиля…</p>
    <template v-else-if="me">
      <p>Вы вошли как <strong>{{ me.user.email }}</strong></p>
      <p class="muted small">Клиент: {{ me.session.clientName }} ({{ me.session.clientSlug }})</p>
    </template>
    <button type="button" class="btn ghost" @click="logout">Выйти (очистить токены)</button>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { fetchMe, type MeResponse } from '@/lib/api';
import { tokens } from '@/lib/tokens';
import { ROUTES } from '@/router';

const router = useRouter();
const loading = ref(true);
const me = ref<MeResponse | null>(null);
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
h1 {
  font-size: 1.35rem;
  margin: 0 0 1rem;
}
.muted {
  opacity: 0.75;
}
.small {
  font-size: 0.9rem;
}
.btn {
  margin-top: 1.25rem;
  padding: 0.5rem 0.9rem;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.95rem;
}
.btn.ghost {
  border: 1px solid #3d4655;
  background: transparent;
  color: #e8eaed;
}
</style>
