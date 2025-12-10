import { defineConfig } from 'vitest/config';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', override: true });

export default defineConfig({
  test: {
    environment: 'jsdom', // Changed from 'node' to support React components
    globals: true,
    testTimeout: 15000,
    setupFiles: ['./tests/setup.ts'], // Setup file for testing library
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});


