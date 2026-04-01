<template>
  <DbrCard variant="bordered" as="section" class="dbru-surface session-client-group">
    <div class="session-client-group__pad">
      <header class="session-client-group__head">
        <h2 class="dbru-text-base dbru-text-main session-client-group__title">
          {{ clientName }}
        </h2>
        <span class="dbru-text-sm dbru-text-muted">{{ clientSlug }}</span>
      </header>
      <ul class="session-client-group__list">
        <li v-for="s in sessions" :key="s.id" class="session-client-group__item">
          <SessionRow
            :session="s"
            :is-current="s.id === currentSessionId"
            :revoking="deletingId === s.id"
            @revoke="$emit('revoke', $event)"
          />
        </li>
      </ul>
    </div>
  </DbrCard>
</template>

<script setup lang="ts">
import { DbrCard } from 'dobruniaui-vue';
import SessionRow from '@/components/SessionRow.vue';
import type { SessionItem } from '@/types';

defineProps<{
  clientName: string;
  clientSlug: string;
  sessions: SessionItem[];
  /** Совпадает с `session.id` из `GET /auth/me` для этой вкладки */
  currentSessionId: string | null;
  deletingId: string | null;
}>();

defineEmits<{
  revoke: [sessionId: string];
}>();
</script>

<style scoped>
.session-client-group__pad {
  padding: var(--dbru-space-4);
}
.session-client-group__head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: var(--dbru-space-2) var(--dbru-space-3);
  padding-bottom: var(--dbru-space-3);
  margin-bottom: var(--dbru-space-1);
  border-bottom: var(--dbru-border-size-1) solid var(--dbru-color-border);
}
.session-client-group__title {
  margin: 0;
  font-weight: var(--dbru-font-weight-semibold);
}
.session-client-group__list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.session-client-group__item {
  margin: 0;
}
.session-client-group__item + .session-client-group__item {
  margin-top: var(--dbru-space-2);
  padding-top: var(--dbru-space-2);
  border-top: var(--dbru-border-size-1) solid var(--dbru-color-border);
}
</style>
