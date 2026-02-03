import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'PrezVocab',
      fileName: () => 'prez-vocab.js',
      formats: ['es']
    },
    rollupOptions: {
      external: [],
      output: {
        inlineDynamicImports: true
      }
    },
    minify: 'esbuild',
    target: 'es2022'
  },
  esbuild: {
    keepNames: true
  }
})
