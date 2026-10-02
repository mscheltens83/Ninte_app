import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Relatieve paden: het spel werkt op elke host en in elke submap.
  base: './',
  // Versie (bouwmoment) die in de instellingen staat, zodat je ziet welke versie je speelt.
  define: {
    __VERSIE__: JSON.stringify(new Date().toLocaleString('nl-NL', { timeZone: 'Europe/Amsterdam', dateStyle: 'short', timeStyle: 'short' })),
  },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1000,
  },
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
