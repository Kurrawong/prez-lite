import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    dir: 'tests/integration',
    include: ['**/*.test.ts'],
    testTimeout: 30_000,
  },
})
