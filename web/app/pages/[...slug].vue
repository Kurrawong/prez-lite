<script setup lang="ts">
const route = useRoute()

// Build content path from slug - empty slug means index/home page
const contentPath = computed(() => {
  const slug = route.params.slug
  if (!slug || (Array.isArray(slug) && slug.length === 0)) {
    return '/'
  }
  const path = Array.isArray(slug) ? slug.join('/') : slug
  return `/${path}`
})

const { data: page, status } = await useAsyncData(
  `page-${contentPath.value}`,
  () => queryCollection('pages').path(contentPath.value).first()
)

// Show 404 if page not found
if (status.value === 'success' && !page.value) {
  throw createError({ statusCode: 404, statusMessage: 'Page Not Found' })
}
</script>

<template>
  <div class="py-8">
    <ContentRenderer v-if="page" :value="page" class="prose prose-lg dark:prose-invert max-w-none" />
  </div>
</template>
