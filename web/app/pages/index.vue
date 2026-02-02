<script setup lang="ts">
const { data: page } = await useAsyncData('home', () =>
  queryCollection('pages').path('/').first()
)
</script>

<template>
  <div class="py-8">
    <ContentRenderer v-if="page" :value="page" class="prose prose-lg dark:prose-invert max-w-none" />
  </div>
</template>
