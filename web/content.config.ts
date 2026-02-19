import { defineCollection, defineContentConfig, z } from '@nuxt/content'

// defineCollection with zod schema can fail when loaded via jiti from a Nuxt
// layer (unctx context isolation issue). Fall back to schema-less collection.
let pages: ReturnType<typeof defineCollection>
try {
  pages = defineCollection({
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
  })
} catch {
  pages = defineCollection({
    type: 'page',
    source: '**/*.md',
  })
}

export default defineContentConfig({
  collections: { pages },
})
