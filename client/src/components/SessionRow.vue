<template>
  <div
    class="session-row"
    :class="{ 'session-row--inactive': session.status !== 'active' }"
  >
    <div class="session-row__main">
      <div class="session-row__chips">
        <DbrChip :variant="chipVariant">{{ session.status }}</DbrChip>
        <DbrChip v-if="isCurrent" variant="primary">Текущая</DbrChip>
      </div>
      <p class="session-row__line dbru-text-sm" :title="tooltipLine">
        <span class="dbru-text-main session-row__id">{{ shortId }}</span>
        <span class="session-row__dot dbru-text-muted" aria-hidden="true">·</span>
        <span v-if="session.ipAddress" class="dbru-text-muted">{{ session.ipAddress }}</span>
        <template v-if="session.userAgent">
          <span class="session-row__dot dbru-text-muted" aria-hidden="true">·</span>
          <span class="dbru-text-muted session-row__ellipsis">{{ truncateUa(session.userAgent) }}</span>
        </template>
        <span class="session-row__dot dbru-text-muted" aria-hidden="true">·</span>
        <span class="dbru-text-muted">{{ formatShort(session.createdAt) }}</span>
        <template v-if="session.lastSeenAt">
          <span class="session-row__dot dbru-text-muted" aria-hidden="true">·</span>
          <span class="dbru-text-muted">{{ formatShort(session.lastSeenAt) }}</span>
        </template>
      </p>
    </div>
    <DbrButton
      v-if="!isCurrent"
      variant="danger"
      native-type="button"
      size="sm"
      class="dbru-focusable session-row__action"
      :disabled="revoking || session.status !== 'active'"
      @click="$emit('revoke', session.id)"
    >
      Завершить
    </DbrButton>
    <span v-else class="session-row__hint dbru-text-xs dbru-text-muted">Через «Выйти»</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { DbrButton, DbrChip } from 'dobruniaui-vue';
import type { SessionItem } from '@/types';

const props = defineProps<{
  session: SessionItem;
  /** Совпадает с сессией access token этой вкладки */
  isCurrent?: boolean;
  revoking: boolean;
}>();

defineEmits<{
  revoke: [sessionId: string];
}>();

const chipVariant = computed((): 'primary' | 'ghost' | 'danger' => {
  if (props.session.status === 'active') return 'primary';
  if (props.session.status === 'revoked') return 'danger';
  return 'ghost';
});

const shortId = computed(() => {
  const id = props.session.id;
  return id.length > 10 ? `${id.slice(0, 8)}…` : id;
});

function truncateUa(ua: string, n = 42) {
  return ua.length <= n ? ua : `${ua.slice(0, n)}…`;
}

function formatShort(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

const tooltipLine = computed(() => {
  const s = props.session;
  const parts = [
    `ID: ${s.id}`,
    s.ipAddress && `IP: ${s.ipAddress}`,
    s.userAgent && `UA: ${s.userAgent}`,
    `Создана: ${s.createdAt}`,
    s.lastSeenAt && `Активность: ${s.lastSeenAt}`,
  ].filter(Boolean);
  return parts.join('\n');
});
</script>

<style scoped>
.session-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--dbru-space-3);
  min-height: var(--dbru-control-height-lg);
  padding-block: var(--dbru-space-2);
}
.session-row--inactive {
  opacity: 0.88;
}
.session-row__main {
  display: flex;
  align-items: center;
  gap: var(--dbru-space-3);
  min-width: 0;
  flex: 1;
}
.session-row__chips {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--dbru-space-2);
  flex-shrink: 0;
}
.session-row__line {
  margin: 0;
  min-width: 0;
  flex: 1;
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  overflow: hidden;
  white-space: nowrap;
  line-height: var(--dbru-line-height-tight);
}
.session-row__id {
  flex-shrink: 0;
  font-weight: var(--dbru-font-weight-semibold);
}
.session-row__dot {
  flex-shrink: 0;
  padding-inline: var(--dbru-space-1);
}
.session-row__ellipsis {
  flex: 1 1 4rem;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}
.session-row__action {
  flex-shrink: 0;
}
.session-row__hint {
  flex-shrink: 0;
  max-width: 6.5rem;
  text-align: right;
  line-height: var(--dbru-line-height-tight);
}
</style>
