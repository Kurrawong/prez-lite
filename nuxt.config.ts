import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

// Get absolute path for layer CSS
const currentDir = dirname(fileURLToPath(import.meta.url))
const layerCssPath = resolve(currentDir, 'app/assets/css/main.css')

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: ['@nuxt/ui', '@nuxt/content'],

  // Nuxt Content configuration with base layer source
  content: {
    experimental: {
      nativeSqlite: true,
    },
    sources: {
      // Base layer content - defined here so it's available before module init
      'prez-lite-base': {
        driver: 'fs',
        prefix: '',
        base: resolve(currentDir, 'content')
      }
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
