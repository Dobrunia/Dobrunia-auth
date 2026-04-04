<template>
  <span class="session-agent-icon" :class="[`session-agent-icon--${tone}`]" aria-hidden="true">
    <img
      v-if="name === 'chrome'"
      class="session-agent-icon__brand"
      :src="chromeLogoSrc"
      alt=""
    />

    <img
      v-else-if="name === 'edge'"
      class="session-agent-icon__brand"
      :src="edgeLogoSrc"
      alt=""
    />

    <img
      v-else-if="name === 'firefox'"
      class="session-agent-icon__brand"
      :src="firefoxLogoSrc"
      alt=""
    />

    <img
      v-else-if="name === 'safari'"
      class="session-agent-icon__brand"
      :src="safariLogoSrc"
      alt=""
    />

    <img
      v-else-if="name === 'opera'"
      class="session-agent-icon__brand"
      :src="operaLogoSrc"
      alt=""
    />

    <svg v-else-if="name === 'windows'" viewBox="0 0 24 24" fill="none">
      <path d="M4 5.6 10.2 4.5v7.1H4V5.6Zm7.5-1.3 8.5-1.5v8.8h-8.5V4.3ZM4 12.9h6.2V20L4 18.8v-5.9Zm7.5 0H20v8.8l-8.5-1.4v-7.4Z" fill="currentColor" />
    </svg>

    <img
      v-else-if="name === 'apple'"
      class="session-agent-icon__brand"
      :src="appleLogoSrc"
      alt=""
    />

    <img
      v-else-if="name === 'linux'"
      class="session-agent-icon__brand"
      :src="linuxLogoSrc"
      alt=""
    />

    <img
      v-else-if="name === 'android'"
      class="session-agent-icon__brand"
      :src="androidLogoSrc"
      alt=""
    />

    <img
      v-else-if="name === 'mobile'"
      class="session-agent-icon__brand"
      :src="mobileLogoSrc"
      alt=""
    />

    <img
      v-else-if="name === 'tablet'"
      class="session-agent-icon__brand"
      :src="tabletLogoSrc"
      alt=""
    />

    <svg v-else-if="name === 'bot'" viewBox="0 0 24 24" fill="none">
      <rect x="5" y="7" width="14" height="10.8" rx="3" stroke="currentColor" stroke-width="1.8" />
      <path d="M12 4.2v2.2M8.4 17.8V20M15.6 17.8V20" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
      <circle cx="9.5" cy="12" r="1" fill="currentColor" />
      <circle cx="14.5" cy="12" r="1" fill="currentColor" />
      <path d="M9.2 15h5.6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
    </svg>

    <svg v-else-if="name === 'desktop'" viewBox="0 0 24 24" fill="none">
      <rect x="4" y="5" width="16" height="11" rx="2.4" stroke="currentColor" stroke-width="1.8" />
      <path d="M9.2 19.2h5.6M12 16v3.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
    </svg>

    <svg v-else viewBox="0 0 24 24" fill="none">
      <rect x="4" y="5" width="16" height="13" rx="3" stroke="currentColor" stroke-width="1.8" />
      <path d="M4 9h16M8 7.1h.1M10.8 7.1h.1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
    </svg>
  </span>
</template>

<script setup lang="ts">
import type { SessionAgentIconName } from '@/lib/session-agent';
import androidLogoSrc from '@/assets/android-logo.svg?url';
import appleLogoSrc from '@/assets/apple-logo.svg?url';
import chromeLogoSrc from '@/assets/chrome-logo.svg?url';
import edgeLogoSrc from '@/assets/edge-logo.svg?url';
import firefoxLogoSrc from '@/assets/firefox-logo.svg?url';
import linuxLogoSrc from '@/assets/linux-logo.svg?url';
import mobileLogoSrc from '@/assets/mobile-logo.svg?url';
import operaLogoSrc from '@/assets/opera-logo.svg?url';
import safariLogoSrc from '@/assets/safari-logo.svg?url';
import tabletLogoSrc from '@/assets/tablet-logo.svg?url';

withDefaults(
  defineProps<{
    name: SessionAgentIconName;
    tone?: 'browser' | 'device' | 'neutral' | 'os';
  }>(),
  {
    tone: 'neutral',
  }
);
</script>

<style scoped>
.session-agent-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: calc(var(--dbru-control-height-lg) - var(--dbru-space-1));
  height: calc(var(--dbru-control-height-lg) - var(--dbru-space-1));
  border-radius: var(--dbru-radius-md);
  border: var(--dbru-border-size-1) solid var(--dbru-color-border);
  color: var(--dbru-color-text);
  background: color-mix(in srgb, var(--dbru-color-surface) 88%, var(--dbru-color-bg) 12%);
}

.session-agent-icon svg,
.session-agent-icon img {
  width: calc(var(--dbru-font-size-lg) + var(--dbru-space-1));
  height: calc(var(--dbru-font-size-lg) + var(--dbru-space-1));
}

.session-agent-icon__brand {
  object-fit: contain;
}

.session-agent-icon--browser {
  background: color-mix(in srgb, var(--dbru-color-surface) 84%, var(--dbru-color-primary) 16%);
  border-color: color-mix(in srgb, var(--dbru-color-border) 58%, var(--dbru-color-primary) 42%);
  color: var(--dbru-color-primary);
}

.session-agent-icon--os {
  background: color-mix(in srgb, var(--dbru-color-surface) 78%, var(--dbru-color-text) 22%);
  border-color: color-mix(in srgb, var(--dbru-color-border) 65%, var(--dbru-color-text) 35%);
  color: var(--dbru-color-text);
}

.session-agent-icon--device {
  background: color-mix(in srgb, var(--dbru-color-surface) 84%, var(--dbru-color-success) 16%);
  border-color: color-mix(in srgb, var(--dbru-color-border) 58%, var(--dbru-color-success) 42%);
  color: var(--dbru-color-success);
}

.session-agent-icon--neutral {
  background: color-mix(in srgb, var(--dbru-color-surface) 92%, var(--dbru-color-bg) 8%);
  border-color: var(--dbru-color-border);
  color: var(--dbru-color-text);
}
</style>
