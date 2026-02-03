import { defineNuxtModule } from '@nuxt/kit'
import { createRequire } from 'module'

/**
 * Fix dayjs ESM import issue when prez-lite is used as a Nuxt layer.
 * dayjs is CommonJS and needs to be aliased to its ESM build.
 */
export default defineNuxtModule({
  meta: {
    name: 'dayjs-fix',
    configKey: 'dayjsFix'
  },
  setup(_options, nuxt) {
    const require = createRequire(import.meta.url)

    // Resolve the absolute path to dayjs ESM build
    let dayjsPath: string
    try {
      // Try to resolve from the extending project's node_modules first
      dayjsPath = require.resolve('dayjs/esm/index.js')
    } catch {
      // Fallback - this shouldn't happen if dayjs is a peer dependency
      console.warn('[dayjs-fix] Could not resolve dayjs/esm/index.js')
      return
    }

    // Add vite alias with absolute path
    nuxt.hook('vite:extendConfig', (config) => {
      config.resolve = config.resolve || {}
      config.resolve.alias = config.resolve.alias || {}

      // Handle both array and object alias formats
      if (Array.isArray(config.resolve.alias)) {
        config.resolve.alias.push({
          find: 'dayjs',
          replacement: dayjsPath
        })
      } else {
        (config.resolve.alias as Record<string, string>)['dayjs'] = dayjsPath
      }

      // Ensure dayjs is included in optimizeDeps
      config.optimizeDeps = config.optimizeDeps || {}
      config.optimizeDeps.include = config.optimizeDeps.include || []
      if (!config.optimizeDeps.include.includes('dayjs')) {
        config.optimizeDeps.include.push('dayjs')
      }
    })
  }
})
