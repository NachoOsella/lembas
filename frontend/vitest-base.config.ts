import { defineConfig } from 'vitest/config';

/**
 * Base Vitest configuration for Angular unit tests.
 *
 * Sets the test environment to jsdom so DOM APIs (including localStorage)
 * are available in spec files.
 */
export default defineConfig({
  test: {
    environment: 'jsdom',
  },
});
