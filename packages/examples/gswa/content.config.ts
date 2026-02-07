import { defineCollection, defineContentConfig, z } from '@nuxt/content'

export default defineContentConfig({
  collections: {
    pages: defineCollection({
      type: 'page',
      source: '**/*.md',
      schema: z.object({
        navigation: z.boolean().optional(),
        navTitle: z.string().optional(),
        order: z.number().optional(),
      }),
    }),
  },
})
