import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

// Single jsdom environment for all tests. Pure-logic tests in tests/unit/ do
// not use the DOM but run fine here, and jsdom provides a real localStorage —
// which the persistence unit tests need — so a separate node project would
// only add a localStorage-mock burden for no benefit.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['tests/e2e/**', 'node_modules/**'],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
