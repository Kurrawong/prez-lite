// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: ['@nuxt/ui', '@nuxt/content', './modules/layer-css'],

  // Nuxt Content - use Node.js 22+ native sqlite (no better-sqlite3 needed)
  content: {
    experimental: {
      nativeSqlite: true,
    },
  },

  // Nuxt UI configuration
  ui: {
    theme: {
      colors: ['primary', 'secondary', 'success', 'info', 'warning', 'error', 'neutral']
    }
  },

  // CSS is added by ./modules/layer-css for proper path resolution in layers

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
