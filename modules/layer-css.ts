import { defineNuxtModule } from '@nuxt/kit'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

/**
 * Adds the layer's CSS using absolute path resolution.
 * This ensures CSS loads correctly when prez-lite is used as a layer.
 */
export default defineNuxtModule({
  meta: {
    name: 'prez-lite-css',
    configKey: 'prezLiteCss'
  },
  setup(_options, nuxt) {
    // Get absolute path to this module's directory
    const currentDir = dirname(fileURLToPath(import.meta.url))
    const cssPath = resolve(currentDir, '../app/assets/css/main.css')

    // Add CSS to the beginning of the array so org styles can override
    nuxt.options.css.unshift(cssPath)
  }
})
