import { defineCollection, defineContentConfig } from '@nuxt/content'
import { z } from 'zod'

export default defineContentConfig({
  collections: {
    pages: defineCollection({
      type: 'page',
      source: {
        include: '**/*.md',
        cwd: './content',
      },
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
