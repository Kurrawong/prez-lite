import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
  test: {
    environment: 'nuxt',
    environmentOptions: {
      nuxt: {
        domEnvironment: 'happy-dom',
      },
    },
    dir: 'tests',
    include: ['unit/**/*.test.ts', 'components/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['app/utils/**', 'app/composables/**'],
      reporter: ['text', 'html'],
    },
  },
})
