<template>
  <div class="auth-page">
    <h1 class="dbru-text-lg">{{ APP_NAME }}</h1>
    <p class="dbru-text-muted dbru-text-base" style="line-height: var(--dbru-line-height-base)">
      Веб-приложение входа и управления сессиями (отдельный origin от API).
    </p>
    <nav class="auth-page__nav">
      <RouterLink v-slot="{ navigate }" :to="ROUTES.ACCOUNT" custom>
        <DbrButton variant="ghost" native-type="button" class="dbru-focusable" @click="navigate">
          Выбор приложения
        </DbrButton>
      </RouterLink>
      <RouterLink v-slot="{ navigate }" :to="ROUTES.LOGIN" custom>
        <DbrButton variant="ghost" native-type="button" class="dbru-focusable" @click="navigate">
          Вход
        </DbrButton>
      </RouterLink>
      <RouterLink v-slot="{ navigate }" :to="ROUTES.REGISTER" custom>
        <DbrButton variant="ghost" native-type="button" class="dbru-focusable" @click="navigate">
          Регистрация
        </DbrButton>
      </RouterLink>
      <RouterLink v-slot="{ navigate }" :to="ROUTES.SESSIONS" custom>
        <DbrButton variant="ghost" native-type="button" class="dbru-focusable" @click="navigate">
          Мои сессии
        </DbrButton>
      </RouterLink>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { DbrButton } from 'dobruniaui-vue';
import { ROUTES, APP_NAME } from '@/constants/app.constants';
</script>

<style scoped>
.auth-page {
  max-width: 40rem;
  margin-inline: auto;
  padding: var(--dbru-space-5) var(--dbru-space-4);
}
.auth-page__nav {
  display: flex;
  flex-wrap: wrap;
  gap: var(--dbru-space-2) var(--dbru-space-3);
  margin-top: var(--dbru-space-4);
}
</style>
