<template>
  <header class="app-health-header dbru-surface" aria-live="polite">
    <span
      class="dbru-text-sm app-health-header__label"
      :class="{
        'app-health-header__label--ok': status === 'ok',
        'app-health-header__label--error': status === 'error',
        'dbru-text-muted': status === 'loading',
      }"
    >
      {{ label }}
    </span>
  </header>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { checkHealth } from '@/api/health';

const POLL_MS = 30_000;

const status = ref<'loading' | 'ok' | 'error'>('loading');
let intervalId: ReturnType<typeof setInterval> | null = null;

const label = computed(() => {
  if (status.value === 'loading') {
    return '…';
  }
  if (status.value === 'ok') {
    return 'OK';
  }
  return 'error';
});

async function runCheck() {
  const ok = await checkHealth();
  status.value = ok ? 'ok' : 'error';
}

onMounted(() => {
  void runCheck();
  intervalId = setInterval(() => {
    void runCheck();
  }, POLL_MS);
});

onUnmounted(() => {
  if (intervalId != null) {
    clearInterval(intervalId);
    intervalId = null;
  }
});
</script>

<style scoped>
.app-health-header {
  display: flex;
  align-items: center;
  padding: var(--dbru-space-2) var(--dbru-space-4);
  border-bottom: var(--dbru-border-size-1) solid var(--dbru-color-border);
}
.app-health-header__label {
  font-weight: var(--dbru-font-weight-semibold);
  letter-spacing: 0.02em;
}
.app-health-header__label--ok {
  color: var(--dbru-color-success);
}
.app-health-header__label--error {
  color: var(--dbru-color-error);
}
</style>
