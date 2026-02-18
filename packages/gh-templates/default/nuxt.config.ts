import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

// Support local development within prez-lite monorepo
const localWebPath = resolve(__dirname, '../../../web')
const useLocalLayer = process.env.LOCAL_LAYER || (existsSync(localWebPath) && existsSync(resolve(localWebPath, 'nuxt.config.ts')))

// When inside prez-lite monorepo, use local layer for development
// When deployed as standalone repo, use GitHub layer (with optional version pinning)
const version = process.env.PREZ_LITE_VERSION || 'main'
const layer = useLocalLayer
  ? localWebPath
  : [`github:hjohns/prez-lite/web#${version}`, { auth: process.env.GITHUB_TOKEN }]

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  extends: [layer],
  css: ['~/assets/css/main.css'],

  // n3 depends on the buffer polyfill (CJS) — ensure Vite pre-bundles it correctly
  vite: {
    optimizeDeps: {
      include: ['n3', 'buffer', 'readable-stream'],
    },
    resolve: {
      alias: {
        buffer: 'buffer/',
      },
    },
  },

  hooks: {
    // Prevent parent layer's public/ dirs from leaking into this app's build.
    // Without this, Nuxt merges web/public/export/ (36 vocabs), archive/, etc.
    'nitro:config': (config) => {
      if (config.publicAssets) {
        config.publicAssets = config.publicAssets.filter(asset => {
          const isParentLayer = asset.dir?.includes('/web/public/')
          return !isParentLayer
        })
      }
    },
  },
})
