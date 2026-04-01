<template>
  <div id="app" class="dbru-root dbru-bg dbru-text-base dbru-text-main app-shell">
    <router-view />
  </div>
</template>

<script setup lang="ts"></script>

<style>
@import 'dobruniaui-vue/styles.css';

body {
  margin: 0;
}

.app-shell {
  min-height: 100vh;
}
</style>
