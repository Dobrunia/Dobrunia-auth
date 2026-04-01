import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@view': fileURLToPath(new URL('./src/view', import.meta.url)),
      '@features': fileURLToPath(new URL('./src/features', import.meta.url)),
      '@types': fileURLToPath(new URL('./src/types', import.meta.url)),
      '@constants': fileURLToPath(new URL('./src/constants', import.meta.url)),
      '@tests': fileURLToPath(new URL('./src/tests', import.meta.url)),
    },
  },
  server: {
    port: 5173,
  },
});
