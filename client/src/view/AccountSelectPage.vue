<template>
  <div class="auth-page">
    <h1 class="dbru-text-lg">Выбор приложения</h1>
    <p class="dbru-text-muted dbru-text-base" style="line-height: var(--dbru-line-height-base)">
      Укажите, в какой проект вы входите — для него будут созданы сессия и токены.
    </p>
    <ul class="auth-page__list">
      <li v-for="c in clients" :key="c.slug">
        <DbrCard variant="bordered" as="article" class="dbru-surface">
          <div class="dbru-text-main" style="font-weight: var(--dbru-font-weight-semibold)">
            {{ c.name }}
          </div>
          <p class="dbru-text-xs dbru-text-muted" style="margin: var(--dbru-space-2) 0 var(--dbru-space-3)">
            slug: {{ c.slug }}
          </p>
          <div class="auth-page__actions">
            <RouterLink
              v-slot="{ navigate }"
              :to="{ path: ROUTES.LOGIN, query: { client: c.slug } }"
              custom
            >
              <DbrButton variant="primary" native-type="button" @click="navigate">Войти</DbrButton>
            </RouterLink>
            <RouterLink
              v-slot="{ navigate }"
              :to="{ path: ROUTES.REGISTER, query: { client: c.slug } }"
              custom
            >
              <DbrButton variant="ghost" native-type="button" @click="navigate">Регистрация</DbrButton>
            </RouterLink>
          </div>
        </DbrCard>
      </li>
    </ul>
    <p class="dbru-text-xs dbru-text-muted" style="margin-top: var(--dbru-space-4)">
      Список задаётся переменной <code>VITE_CLIENTS_JSON</code> при сборке (см. конфиг).
    </p>
    <RouterLink v-slot="{ navigate }" :to="ROUTES.HOME" custom>
      <DbrButton variant="ghost" native-type="button" class="dbru-focusable" style="margin-top: var(--dbru-space-3)" @click="navigate">
        ← На главную
      </DbrButton>
    </RouterLink>
  </div>
</template>

<script setup lang="ts">
import { DbrButton, DbrCard } from 'dobruniaui-vue';
import { clientConfig } from '@/config';
import { ROUTES } from '@/constants/app.constants';

const clients = clientConfig.clients;
</script>

<style scoped>
.auth-page {
  max-width: 36rem;
  margin-inline: auto;
  padding: var(--dbru-space-5) var(--dbru-space-4);
}
.auth-page__list {
  list-style: none;
  padding: 0;
  margin: var(--dbru-space-4) 0 0;
  display: flex;
  flex-direction: column;
  gap: var(--dbru-space-3);
}
.auth-page__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dbru-space-2);
}
</style>
