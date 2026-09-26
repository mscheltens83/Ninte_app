import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Relatieve paden: het spel werkt op elke host en in elke submap.
  base: './',
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1000,
  },
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
