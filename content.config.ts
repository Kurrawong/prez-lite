import { defineCollection, defineContentConfig } from '@nuxt/content'

export default defineContentConfig({
  collections: {
    // Pages collection that spans all content sources
    pages: defineCollection({
      type: 'page',
      source: {
        include: '**/*.md',
      },
    }),
  },
})
