<script setup lang="ts">
const props = defineProps<{
  code?: string
  language?: string
  filename?: string
  highlights?: number[]
  meta?: string
  class?: string
}>()

const isMermaid = computed(() => props.language === 'mermaid')
</script>

<template>
  <MermaidDiagram v-if="isMermaid" :code="code ?? ''" />
  <pre v-else :class="[$props.class, language ? `language-${language}` : undefined]">
    <slot />
  </pre>
</template>
