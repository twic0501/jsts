import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// Module-local config: do not change the shared test configuration for other features.
export default defineConfig({
  test: {
    include: [fileURLToPath(new URL('./*.test.ts', import.meta.url)).replaceAll('\\', '/')],
    environment: 'node',
    hookTimeout: 120_000,
    testTimeout: 20_000,
  },
})
