<template>
  <div class="auth-page auth-page--narrow">
    <h1 class="dbru-text-lg">{{ title }}</h1>
    <p class="dbru-text-sm dbru-text-muted">
      Клиент: <strong class="dbru-text-main">{{ clientSlug }}</strong>
    </p>
    <form class="auth-page__form" @submit.prevent="$emit('submit')">
      <DbrInput
        :model-value="email"
        label="Email"
        type="email"
        name="email"
        autocomplete="username"
        required
        size="md"
        @update:model-value="$emit('update:email', $event)"
      />
      <DbrInput
        :model-value="password"
        label="Пароль"
        type="password"
        name="password"
        :autocomplete="passwordAutocomplete"
        required
        size="md"
        @update:model-value="$emit('update:password', $event)"
      />
      <p v-if="error" class="dbru-text-sm auth-page__error">{{ error }}</p>
      <DbrButton variant="primary" native-type="submit" :disabled="loading" class="dbru-focusable">
        {{ loading ? '…' : submitLabel }}
      </DbrButton>
    </form>
    <p class="dbru-text-sm dbru-text-muted auth-page__footer">
      <slot name="footer" />
    </p>
  </div>
</template>

<script setup lang="ts">
import { DbrButton, DbrInput } from 'dobruniaui-vue';

defineProps<{
  title: string;
  clientSlug: string;
  email: string;
  password: string;
  error: string;
  loading: boolean;
  passwordAutocomplete: 'current-password' | 'new-password';
  submitLabel: string;
}>();

defineEmits<{
  submit: [];
  'update:email': [value: string];
  'update:password': [value: string];
}>();
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
.auth-page__error {
  color: var(--dbru-color-error);
  margin: 0;
}
.auth-page__footer {
  margin-top: var(--dbru-space-4);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: var(--dbru-space-1);
}
</style>
