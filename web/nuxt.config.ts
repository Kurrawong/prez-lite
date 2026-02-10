import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

// Get absolute path for layer CSS
const currentDir = dirname(fileURLToPath(import.meta.url))
const layerCssPath = resolve(currentDir, 'app/assets/css/main.css')

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: ['@nuxt/ui', '@nuxt/content', 'nuxt-monaco-editor'],

  // Monaco editor configuration
  monacoEditor: {
    locale: 'en',
    componentName: {
      codeEditor: 'MonacoEditor',
    },
  },

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

  // Layer CSS with absolute path for proper resolution
  css: [layerCssPath],

  runtimeConfig: {
    public: {
      // GitHub repo for "Edit on GitHub" links (e.g. 'hjohns/prez-lite')
      // Set via NUXT_PUBLIC_GITHUB_REPO env var or override in nuxt.config.ts
      githubRepo: '',
      // Branch for edit links (default: main)
      githubBranch: 'main',
      // Path to vocab TTL files within the repo
      githubVocabPath: 'web/public/sample-data/vocabs',
    }
  },

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
    },
    routeRules: {
      // CORS headers for dev server only
      // For production static deployments, use public/_headers file
      // (supported by Netlify, Cloudflare Pages, etc.)
      '/export/**': { headers: { 'Access-Control-Allow-Origin': '*' } },
      '/web-components/**': { headers: { 'Access-Control-Allow-Origin': '*' } },
      // Security headers (dev server only, static deployments use _headers file)
      '/**': {
        headers: {
          // Content Security Policy - defense-in-depth against XSS
          // Note: 'unsafe-inline' needed for Nuxt SSG hydration scripts
          'Content-Security-Policy': [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'",  // unsafe-inline for Nuxt SSG, wasm for Mermaid
            "style-src 'self' 'unsafe-inline'",                      // unsafe-inline for Nuxt UI/Tailwind
            "img-src 'self' data: https:",
            "font-src 'self'",
            "connect-src 'self' https:",                         // https: needed for SPARQL playground
            "frame-ancestors 'none'",
            "base-uri 'self'",
            "form-action 'self'"
          ].join('; '),
          // Additional security headers
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
          'X-XSS-Protection': '1; mode=block',
          'Referrer-Policy': 'strict-origin-when-cross-origin',
          'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
        }
      }
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
