<template>
  <DbrCard variant="bordered" as="section" class="dbru-surface session-client-group">
    <div class="session-client-group__hero">
      <div class="session-client-group__intro">
        <p class="session-client-group__eyebrow dbru-text-xs dbru-text-muted">Клиент приложения</p>
        <h2 class="session-client-group__title dbru-text-main">{{ clientName }}</h2>
        <p class="session-client-group__subtitle dbru-text-base dbru-text-muted">
          Здесь собраны все входы, созданные для этого клиента. Каждая карточка ниже показывает устройство, служебные
          данные и хронологию активности отдельно.
        </p>
      </div>

      <div class="session-client-group__meta">
        <DbrChip variant="ghost" class="session-client-group__slug">{{ clientSlug }}</DbrChip>
        <div class="session-client-group__stats">
          <DbrCard variant="surface" class="session-client-group__stat dbru-surface">
            <span class="dbru-text-xs dbru-text-muted">Всего сессий</span>
            <strong class="dbru-text-main">{{ sessions.length }}</strong>
          </DbrCard>
          <DbrCard variant="surface" class="session-client-group__stat dbru-surface">
            <span class="dbru-text-xs dbru-text-muted">Активных</span>
            <strong class="dbru-text-main">{{ activeCount }}</strong>
          </DbrCard>
          <DbrCard variant="surface" class="session-client-group__stat dbru-surface">
            <span class="dbru-text-xs dbru-text-muted">Завершенных</span>
            <strong class="dbru-text-main">{{ revokedCount }}</strong>
          </DbrCard>
        </div>
      </div>
    </div>

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
  </DbrCard>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { DbrCard, DbrChip } from 'dobruniaui-vue';
import SessionRow from '@/components/SessionRow.vue';
import type { SessionItem } from '@/types';

const props = defineProps<{
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

const activeCount = computed(() => props.sessions.filter((session) => session.status === 'active').length);
const revokedCount = computed(() => props.sessions.filter((session) => session.status === 'revoked').length);
</script>

<style scoped>
.session-client-group {
  overflow: hidden;
  border-radius: calc(var(--dbru-radius-md) + var(--dbru-space-2));
  border-color: var(--dbru-color-border);
  box-shadow: var(--dbru-shadow-md);
}

.session-client-group__hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--dbru-space-5);
  padding: var(--dbru-space-5);
  background:
    linear-gradient(
      135deg,
      color-mix(in srgb, var(--dbru-color-surface) 92%, var(--dbru-color-bg) 8%) 0%,
      color-mix(in srgb, var(--dbru-color-surface) 86%, var(--dbru-color-primary) 14%) 100%
    );
  border-bottom: var(--dbru-border-size-1) solid var(--dbru-color-border);
}

.session-client-group__intro {
  min-width: 0;
  max-width: 48rem;
}

.session-client-group__eyebrow {
  margin: 0 0 0.35rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.session-client-group__title {
  margin: 0;
  font-size: var(--dbru-font-size-lg);
  font-weight: var(--dbru-font-weight-semibold);
  line-height: 1.15;
}

.session-client-group__subtitle {
  margin: 0.6rem 0 0;
  line-height: 1.55;
}

.session-client-group__meta {
  display: grid;
  gap: var(--dbru-space-3);
  min-width: min(22rem, 100%);
}

.session-client-group__slug {
  justify-self: flex-start;
}

.session-client-group__stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--dbru-space-3);
}

.session-client-group__stat {
  padding: var(--dbru-space-3) var(--dbru-space-4);
  border-radius: var(--dbru-radius-md);
  border-color: var(--dbru-color-border);
  box-shadow: none;
  background: color-mix(in srgb, var(--dbru-color-surface) 94%, var(--dbru-color-bg) 6%);
}

.session-client-group__stat span {
  display: block;
  margin-bottom: var(--dbru-space-1);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.session-client-group__stat strong {
  font-size: var(--dbru-font-size-lg);
  line-height: 1;
}

.session-client-group__list {
  list-style: none;
  margin: 0;
  padding: var(--dbru-space-4) var(--dbru-space-5) var(--dbru-space-5);
}

.session-client-group__item {
  margin: 0;
}

.session-client-group__item + .session-client-group__item {
  margin-top: var(--dbru-space-4);
}

@media (max-width: 980px) {
  .session-client-group__hero {
    flex-direction: column;
  }

  .session-client-group__meta {
    min-width: 0;
    width: 100%;
  }
}

@media (max-width: 640px) {
  .session-client-group__hero {
    padding: var(--dbru-space-4);
  }

  .session-client-group__list {
    padding: var(--dbru-space-3) var(--dbru-space-4) var(--dbru-space-4);
  }

  .session-client-group__stats {
    grid-template-columns: 1fr;
  }
}
</style>
