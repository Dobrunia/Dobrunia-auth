<template>
  <DbrCard
    as="article"
    variant="bordered"
    :hoverable="session.status === 'active'"
    class="session-card"
    :class="{
      'session-card--current': isCurrent,
      'session-card--inactive': session.status !== 'active',
    }"
  >
    <header class="session-card__header">
      <div class="session-card__heading">
        <p class="session-card__eyebrow dbru-text-xs dbru-text-muted">{{ isCurrent ? 'Текущая сессия' : 'Сессия аккаунта' }}</p>
        <h3 class="session-card__title dbru-text-main">{{ agent.primaryLabel }}</h3>
        <p class="session-card__subtitle dbru-text-base dbru-text-muted">{{ agent.secondaryLabel }}</p>
      </div>

      <div class="session-card__header-side">
        <div class="session-card__badges">
          <DbrChip :variant="statusChipVariant">{{ statusLabel }}</DbrChip>
          <DbrChip v-if="isCurrent" variant="ghost">Этот браузер</DbrChip>
        </div>

        <DbrButton
          v-if="!isCurrent"
          variant="danger"
          native-type="button"
          size="sm"
          class="dbru-focusable session-card__action"
          :disabled="revoking || session.status !== 'active'"
          @click="$emit('revoke', session.id)"
        >
          {{ revoking ? 'Завершаем…' : 'Завершить сессию' }}
        </DbrButton>
        <p v-else class="session-card__action-hint dbru-text-sm dbru-text-muted">
          Эта вкладка завершает вход через кнопку «Выйти из текущей сессии» сверху.
        </p>
      </div>
    </header>

    <div class="session-card__layout">
      <DbrCard as="section" variant="surface" class="session-card__panel dbru-surface">
        <p class="session-card__section-label dbru-text-xs dbru-text-muted">Устройство и ПО</p>

        <div class="session-card__agent-list">
          <div class="session-card__agent-item">
            <SessionAgentIcon :name="agent.browser.icon" tone="browser" />
            <div>
              <p class="session-card__agent-label dbru-text-xs dbru-text-muted">Браузер</p>
              <p class="session-card__agent-value dbru-text-main">{{ agent.browser.name }}</p>
            </div>
          </div>

          <div class="session-card__agent-item">
            <SessionAgentIcon :name="agent.os.icon" tone="os" />
            <div>
              <p class="session-card__agent-label dbru-text-xs dbru-text-muted">Операционная система</p>
              <p class="session-card__agent-value dbru-text-main">{{ agent.os.name }}</p>
            </div>
          </div>

          <div class="session-card__agent-item">
            <SessionAgentIcon :name="agent.device.icon" tone="device" />
            <div>
              <p class="session-card__agent-label dbru-text-xs dbru-text-muted">Тип устройства</p>
              <p class="session-card__agent-value dbru-text-main">{{ agent.device.name }}</p>
            </div>
          </div>
        </div>

        <div class="session-card__ua-block">
          <p class="session-card__fact-label dbru-text-xs dbru-text-muted">User-Agent</p>
          <p class="session-card__ua dbru-text-sm" :title="session.userAgent ?? ''">
            {{ session.userAgent || 'Сервис не передал строку user-agent для этой сессии.' }}
          </p>
        </div>
      </DbrCard>

      <DbrCard as="section" variant="surface" class="session-card__panel dbru-surface">
        <p class="session-card__section-label dbru-text-xs dbru-text-muted">Данные сессии</p>

        <dl class="session-card__facts">
          <div class="session-card__fact">
            <dt class="session-card__fact-label dbru-text-xs dbru-text-muted">Статус</dt>
            <dd class="session-card__fact-value dbru-text-main">{{ statusDescription }}</dd>
          </div>

          <div class="session-card__fact">
            <dt class="session-card__fact-label dbru-text-xs dbru-text-muted">IP-адрес</dt>
            <dd class="session-card__fact-value dbru-text-main">{{ session.ipAddress || 'Не был передан' }}</dd>
          </div>

          <div class="session-card__fact">
            <dt class="session-card__fact-label dbru-text-xs dbru-text-muted">ID сессии</dt>
            <dd class="session-card__fact-value session-card__fact-value--mono dbru-text-main">{{ session.id }}</dd>
          </div>

          <div class="session-card__fact">
            <dt class="session-card__fact-label dbru-text-xs dbru-text-muted">Клиент</dt>
            <dd class="session-card__fact-value dbru-text-main">
              {{ session.clientName }}
              <DbrChip variant="ghost" class="session-card__slug">{{ session.clientSlug }}</DbrChip>
            </dd>
          </div>
        </dl>
      </DbrCard>

      <DbrCard as="section" variant="surface" class="session-card__panel dbru-surface">
        <p class="session-card__section-label dbru-text-xs dbru-text-muted">Активность</p>

        <dl class="session-card__facts">
          <div class="session-card__fact">
            <dt class="session-card__fact-label dbru-text-xs dbru-text-muted">Создана</dt>
            <dd class="session-card__fact-value session-card__fact-value--stack dbru-text-main">
              <span>{{ formatDateTime(session.createdAt) }}</span>
              <small class="dbru-text-xs dbru-text-muted">{{ formatRelative(session.createdAt) }}</small>
            </dd>
          </div>

          <div class="session-card__fact">
            <dt class="session-card__fact-label dbru-text-xs dbru-text-muted">Последняя активность</dt>
            <dd class="session-card__fact-value session-card__fact-value--stack dbru-text-main">
              <span>{{ lastSeenPrimary }}</span>
              <small class="dbru-text-xs dbru-text-muted">{{ lastSeenSecondary }}</small>
            </dd>
          </div>

          <div class="session-card__fact">
            <dt class="session-card__fact-label dbru-text-xs dbru-text-muted">Завершена</dt>
            <dd class="session-card__fact-value session-card__fact-value--stack dbru-text-main">
              <span>{{ revokedPrimary }}</span>
              <small class="dbru-text-xs dbru-text-muted">{{ revokedSecondary }}</small>
            </dd>
          </div>

          <div class="session-card__fact">
            <dt class="session-card__fact-label dbru-text-xs dbru-text-muted">Причина</dt>
            <dd class="session-card__fact-value dbru-text-main">{{ revokeReasonLabel }}</dd>
          </div>
        </dl>
      </DbrCard>
    </div>
  </DbrCard>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { DbrButton, DbrCard, DbrChip } from 'dobruniaui-vue';
import SessionAgentIcon from '@/components/SessionAgentIcon.vue';
import { getSessionAgentDetails } from '@/lib/session-agent';
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

const agent = computed(() => getSessionAgentDetails(props.session.userAgent));

const statusLabel = computed(() => {
  if (props.session.status === 'active') return 'Активна';
  if (props.session.status === 'revoked') return 'Завершена';
  return props.session.status || 'Неизвестно';
});

const statusDescription = computed(() => {
  if (props.session.status === 'active') {
    return props.isCurrent ? 'Текущий действующий вход в этом браузере.' : 'Сессия действует и может быть завершена вручную.';
  }
  if (props.session.status === 'revoked') {
    return 'Сессия уже закрыта и больше не может использоваться.';
  }
  return 'Состояние сессии не удалось интерпретировать автоматически.';
});

const statusChipVariant = computed((): 'primary' | 'ghost' | 'danger' => {
  if (props.session.status === 'active') return 'primary';
  if (props.session.status === 'revoked') return 'danger';
  return 'ghost';
});

const lastSeenPrimary = computed(() => {
  if (!props.session.lastSeenAt) return 'Нет данных';
  return formatDateTime(props.session.lastSeenAt);
});

const lastSeenSecondary = computed(() => {
  if (!props.session.lastSeenAt) return 'Сервис не передал отметку последней активности.';
  return formatRelative(props.session.lastSeenAt);
});

const revokedPrimary = computed(() => {
  if (!props.session.revokedAt) return props.session.status === 'active' ? 'Еще активна' : 'Нет отметки времени';
  return formatDateTime(props.session.revokedAt);
});

const revokedSecondary = computed(() => {
  if (!props.session.revokedAt) return props.session.status === 'active' ? 'Сессия пока не была завершена.' : 'Время завершения не зафиксировано.';
  return formatRelative(props.session.revokedAt);
});

const revokeReasonLabel = computed(() => {
  if (!props.session.revokeReason) {
    return props.session.status === 'active' ? 'Причина отсутствует, потому что сессия еще активна.' : 'Причина завершения не указана.';
  }
  return props.session.revokeReason;
});

function formatDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString('ru-RU', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function formatRelative(iso: string) {
  try {
    const diffMs = new Date(iso).getTime() - Date.now();
    const minutes = Math.round(diffMs / 60000);
    const formatter = new Intl.RelativeTimeFormat('ru-RU', { numeric: 'auto' });

    if (Math.abs(minutes) < 60) return formatter.format(minutes, 'minute');

    const hours = Math.round(minutes / 60);
    if (Math.abs(hours) < 24) return formatter.format(hours, 'hour');

    const days = Math.round(hours / 24);
    return formatter.format(days, 'day');
  } catch {
    return iso;
  }
}
</script>

<style scoped>
.session-card {
  position: relative;
  padding: var(--dbru-space-5);
  border-radius: calc(var(--dbru-radius-md) + var(--dbru-space-1));
  border-color: var(--dbru-color-border);
  background:
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--dbru-color-surface) 92%, var(--dbru-color-bg) 8%) 0%,
      var(--dbru-color-surface) 100%
    );
  box-shadow: var(--dbru-shadow-sm);
}

.session-card--current {
  border-color: color-mix(in srgb, var(--dbru-color-border) 40%, var(--dbru-color-primary) 60%);
  box-shadow: var(--dbru-shadow-md);
}

.session-card--inactive {
  background:
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--dbru-color-surface) 84%, var(--dbru-color-bg) 16%) 0%,
      var(--dbru-color-surface) 100%
    );
  opacity: 0.94;
}

.session-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--dbru-space-4) var(--dbru-space-5);
  margin-bottom: var(--dbru-space-4);
}

.session-card__heading {
  min-width: 0;
}

.session-card__eyebrow {
  margin: 0 0 0.35rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.session-card__title {
  margin: 0;
  font-size: var(--dbru-font-size-lg);
  font-weight: var(--dbru-font-weight-semibold);
  line-height: 1.15;
}

.session-card__subtitle {
  margin: 0.45rem 0 0;
  line-height: 1.45;
  max-width: 44rem;
}

.session-card__header-side {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--dbru-space-3);
  min-width: min(20rem, 100%);
}

.session-card__badges {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: var(--dbru-space-2);
}

.session-card__action {
  white-space: nowrap;
}

.session-card__action-hint {
  margin: 0;
  max-width: 18rem;
  line-height: 1.45;
  text-align: right;
}

.session-card__layout {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(16rem, 1fr) minmax(16rem, 1fr);
  gap: var(--dbru-space-3);
}

.session-card__panel {
  padding: var(--dbru-space-4);
  border-radius: var(--dbru-radius-md);
  background: color-mix(in srgb, var(--dbru-color-surface) 90%, var(--dbru-color-bg) 10%);
  border-color: var(--dbru-color-border);
  box-shadow: none;
}

.session-card__section-label {
  margin: 0 0 0.9rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.session-card__agent-list {
  display: grid;
  gap: var(--dbru-space-3);
}

.session-card__agent-item {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: var(--dbru-space-3);
  align-items: center;
  min-width: 0;
  padding: var(--dbru-space-3);
  border-radius: var(--dbru-radius-md);
  background: color-mix(in srgb, var(--dbru-color-surface) 96%, var(--dbru-color-bg) 4%);
  border: var(--dbru-border-size-1) solid var(--dbru-color-border);
}

.session-card__agent-label,
.session-card__fact-label {
  margin: 0 0 0.2rem;
  line-height: 1.35;
}

.session-card__agent-value,
.session-card__fact-value {
  margin: 0;
  line-height: 1.45;
  font-weight: var(--dbru-font-weight-semibold);
}

.session-card__ua-block {
  margin-top: var(--dbru-space-3);
  padding-top: var(--dbru-space-3);
  border-top: var(--dbru-border-size-1) solid var(--dbru-color-border);
}

.session-card__ua {
  margin: 0;
  line-height: 1.55;
  word-break: break-word;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  overflow: hidden;
}

.session-card__facts {
  display: grid;
  gap: var(--dbru-space-3);
  margin: 0;
}

.session-card__fact {
  margin: 0;
}

.session-card__fact-value--stack {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.session-card__fact-value--stack small {
  font-weight: 400;
}

.session-card__fact-value--mono {
  font-family: 'Consolas', 'SFMono-Regular', 'Liberation Mono', monospace;
  word-break: break-all;
}

.session-card__slug {
  margin-left: 0.5rem;
  vertical-align: middle;
}

@media (max-width: 1100px) {
  .session-card__layout {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }

  .session-card__panel:first-child {
    grid-column: 1 / -1;
  }
}

@media (max-width: 760px) {
  .session-card {
    padding: var(--dbru-space-4);
  }

  .session-card__header {
    flex-direction: column;
  }

  .session-card__header-side {
    align-items: stretch;
    min-width: 0;
  }

  .session-card__badges {
    justify-content: flex-start;
  }

  .session-card__action-hint {
    max-width: none;
    text-align: left;
  }

  .session-card__layout {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
