<script setup lang="ts">
const { data: page } = await useAsyncData('about', () =>
  queryCollection('pages').path('/about').first()
)
</script>

<template>
  <div class="py-8">
    <ContentRenderer v-if="page" :value="page" class="prose prose-lg dark:prose-invert max-w-none" />
  </div>
</template>
