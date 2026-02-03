import { defineNuxtModule } from '@nuxt/kit'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

/**
 * Adds the prez-lite base layer's content as a source.
 * This ensures content from the layer is available when used as an extended layer.
 */
export default defineNuxtModule({
  meta: {
    name: 'prez-lite-content',
    configKey: 'prezLiteContent'
  },
  setup(_options, nuxt) {
    const currentDir = dirname(fileURLToPath(import.meta.url))
    const contentPath = resolve(currentDir, '../content')

    console.log('[prez-lite] Adding content source from:', contentPath)

    // Ensure content config exists
    nuxt.options.content = nuxt.options.content || {}
    nuxt.options.content.sources = nuxt.options.content.sources || {}

    // Add prez-lite content source (lower priority than app's content)
    nuxt.options.content.sources['prez-lite-base'] = {
      driver: 'fs',
      prefix: '',
      base: contentPath
    }

    console.log('[prez-lite] Content sources:', Object.keys(nuxt.options.content.sources))
  }
})
