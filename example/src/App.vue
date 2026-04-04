<template>
  <div class="dbru-root dbru-bg dbru-text-base dbru-text-main shell">
    <router-view />
  </div>
</template>

<style>
@import 'dobruniaui-vue/styles.css';

body {
  margin: 0;
}
.shell {
  min-height: 100vh;
  padding: var(--dbru-space-5) var(--dbru-space-4);
  max-width: 28rem;
  margin: 0 auto;
}
a {
  color: var(--dbru-color-primary, #7cb7ff);
}
</style>
