import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  test: {
    globals: false,
    environment: 'jsdom',
    include: ['src/tests/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@shared': fileURLToPath(new URL('./src/shared', import.meta.url)),
      '@features': fileURLToPath(new URL('./src/features', import.meta.url)),
      '@types': fileURLToPath(new URL('./src/types', import.meta.url)),
      '@constants': fileURLToPath(new URL('./src/constants', import.meta.url)),
      '@tests': fileURLToPath(new URL('./src/tests', import.meta.url)),
    },
  },
});
