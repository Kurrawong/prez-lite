import { defineCollection, defineContentConfig, z } from '@nuxt/content'

export default defineContentConfig({
  collections: {
    pages: defineCollection({
      type: 'page',
      source: '**/*.md',
      schema: z.object({
        navTitle: z.string().optional(),
        order: z.number().optional(),
        icon: z.string().optional(),
        description: z.string().optional(),
        navigation: z.boolean().optional(),
        redirect: z.string().optional(),
      }),
    }),
  },
})
