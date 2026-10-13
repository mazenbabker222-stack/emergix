import path from 'path';
import { defineConfig } from 'vitest/config';

// Separate from vite.config.ts on purpose: that file requires PORT and BASE_PATH.
export default defineConfig({
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
  test: { environment: 'node', include: ['src/**/*.test.{ts,tsx}'] },
});
