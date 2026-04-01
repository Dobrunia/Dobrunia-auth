<template>
  <div>
    <h1>Вход</h1>
    <p class="muted">Example-приложение: только OAuth через Dobrunia Auth.</p>
    <button type="button" class="btn" @click="onLogin">Войти при помощи Dobrunia Auth</button>
    <p class="hint">
      Редирект на <code>{{ authorizeHost }}</code><br />
      client: <code>{{ clientId }}</code>
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { authApiBase, oauthClientId } from '@/config';
import { startDobruniaOAuth } from '@/lib/oauth-start';

const authorizeHost = computed(() => authApiBase);
const clientId = computed(() => oauthClientId);

function onLogin() {
  startDobruniaOAuth();
}
</script>

<style scoped>
h1 {
  font-size: 1.35rem;
  margin: 0 0 0.75rem;
}
.muted {
  opacity: 0.75;
  margin: 0 0 1.25rem;
  line-height: 1.5;
}
.btn {
  padding: 0.65rem 1.1rem;
  font-size: 1rem;
  border-radius: 8px;
  border: 1px solid #3d4655;
  background: #1a56db;
  color: #fff;
  cursor: pointer;
}
.btn:hover {
  filter: brightness(1.08);
}
.hint {
  margin-top: 1.5rem;
  font-size: 0.8rem;
  opacity: 0.65;
  line-height: 1.6;
}
code {
  font-size: 0.85em;
  background: #1a1d24;
  padding: 0.1em 0.35em;
  border-radius: 4px;
}
</style>
