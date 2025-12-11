import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Note: Global cleanup is handled by individual test files' afterAll hooks
// and by the cleanup script (npm run cleanup-test-data)
