import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

// Get absolute paths for layer assets
const currentDir = dirname(fileURLToPath(import.meta.url))
const layerCssPath = resolve(currentDir, 'app/assets/css/main.css')
const layerContentPath = resolve(currentDir, 'content')

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: ['@nuxt/ui', '@nuxt/content'],

  // Nuxt Content - use Node.js 22+ native sqlite (no better-sqlite3 needed)
  content: {
    experimental: {
      nativeSqlite: true,
    },
  },

  hooks: {
    // Programmatically add base layer content source for proper layer resolution
    'content:context': (ctx) => {
      // Add prez-lite content as a source if not already present
      if (!ctx.options.sources['prez-lite']) {
        ctx.options.sources['prez-lite'] = {
          driver: 'fs',
          prefix: '',
          base: layerContentPath
        }
      }
      console.log('[prez-lite] Content sources:', Object.keys(ctx.options.sources))
    }
  },

  // Nuxt UI configuration
  ui: {
    theme: {
      colors: ['primary', 'secondary', 'success', 'info', 'warning', 'error', 'neutral']
    }
  },

  // Layer CSS with absolute path for proper resolution
  css: [layerCssPath],

  // Static site generation
  ssr: true,

  app: {
    head: {
      title: 'prez-lite',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Lightweight vocabulary browser' }
      ]
    }
  },

  // Nitro config for static generation
  nitro: {
    preset: 'static',
    prerender: {
      failOnError: false
    }
  },

  // Fix for Vue instance issues when used as a layer (Nuxt UI + UApp)
  // See: https://github.com/nuxt/ui/issues/2622
  build: {
    transpile: ['vue']
  },

  // Dedupe common dependencies to avoid version conflicts with layers
  vite: {
    resolve: {
      dedupe: ['vue', 'vue-router']
    },
    optimizeDeps: {
      include: ['mermaid']
    }
  }
})
