<template>
  <div class="shell">
    <router-view />
  </div>
</template>

<style>
body {
  margin: 0;
  font-family: system-ui, sans-serif;
  background: #0f1115;
  color: #e8eaed;
}
.shell {
  min-height: 100vh;
  padding: 1.5rem;
  max-width: 40rem;
  margin: 0 auto;
}
a {
  color: #7cb7ff;
}
</style>
