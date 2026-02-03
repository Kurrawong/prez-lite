<script setup lang="ts">
import { useShare, EXPORT_FORMATS, COMPONENT_TYPES } from '~/composables/useShare'

const { vocabs, status, getDownloadUrl, formats, componentTypes } = useShare()

const baseUrl = computed(() => {
  if (typeof window !== 'undefined') {
    return window.location.origin
  }
  return ''
})

const quickStartCode = computed(() => `<script src="${baseUrl.value}/web-components/prez-vocab.min.js" type="module"><\/script>

<prez-vocab-select vocab="your-vocab-slug"></prez-vocab-select>`)

// Component info for docs section
const componentDocs = [
  {
    id: 'select',
    tag: 'prez-vocab-select',
    title: 'Select',
    description: 'Dropdown menu for single or multiple selection',
    icon: 'i-heroicons-chevron-up-down'
  },
  {
    id: 'tree',
    tag: 'prez-vocab-tree',
    title: 'Tree',
    description: 'Hierarchical tree view with expand/collapse',
    icon: 'i-heroicons-bars-3-bottom-left'
  },
  {
    id: 'list',
    tag: 'prez-vocab-list',
    title: 'List',
    description: 'Flat searchable list with filtering',
    icon: 'i-heroicons-list-bullet'
  },
  {
    id: 'autocomplete',
    tag: 'prez-vocab-autocomplete',
    title: 'Autocomplete',
    description: 'Typeahead search with suggestions',
    icon: 'i-heroicons-magnifying-glass'
  }
]
</script>

<template>
  <div class="py-8">
    <h1 class="text-3xl font-bold mb-2">Share Vocabularies</h1>
    <p class="text-muted mb-8">
      Download vocabularies in multiple formats or embed interactive components in your applications.
    </p>

    <!-- Quick Start -->
    <UCard class="mb-8">
      <template #header>
        <h2 class="text-lg font-semibold">Quick Start</h2>
      </template>

      <p class="text-sm text-muted mb-4">
        Add vocabulary selection to any web page with a single script tag.
      </p>

      <pre class="bg-gray-900 text-gray-100 rounded-lg p-4 text-sm overflow-x-auto"><code>{{ quickStartCode }}</code></pre>
    </UCard>

    <!-- Component Documentation -->
    <UCard class="mb-8">
      <template #header>
        <h2 class="text-lg font-semibold">Web Components</h2>
      </template>

      <p class="text-sm text-muted mb-4">
        Four components available for different use cases. Click for full API documentation.
      </p>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <NuxtLink
          v-for="comp in componentDocs"
          :key="comp.id"
          :to="`/share/components/${comp.id}`"
          class="flex items-start gap-3 p-4 border border-gray-200 rounded-lg hover:border-primary hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
        >
          <UIcon :name="comp.icon" class="size-6 text-primary flex-shrink-0 mt-0.5" />
          <div class="flex-1 min-w-0">
            <div class="font-medium">{{ comp.title }}</div>
            <code class="text-xs text-primary">&lt;{{ comp.tag }}&gt;</code>
            <p class="text-xs text-muted mt-1">{{ comp.description }}</p>
          </div>
          <UIcon name="i-heroicons-arrow-right" class="size-4 text-muted flex-shrink-0" />
        </NuxtLink>
      </div>

      <p class="text-xs text-muted mt-4">
        Each component page includes interactive preview, all properties, methods, events, and styling options.
      </p>
    </UCard>

    <!-- Export Formats -->
    <UCard class="mb-8">
      <template #header>
        <h2 class="text-lg font-semibold">Export Formats</h2>
      </template>

      <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div v-for="format in formats" :key="format.id" class="text-sm">
          <div class="font-medium">{{ format.label }}</div>
          <div class="text-muted text-xs">.{{ format.extension }}</div>
          <div class="text-muted text-xs">{{ format.description }}</div>
        </div>
      </div>
    </UCard>

    <!-- Vocabulary List -->
    <h2 class="text-xl font-semibold mb-4">Available Vocabularies</h2>

    <div v-if="status === 'pending' || status === 'idle'" class="space-y-4">
      <USkeleton class="h-24 w-full" v-for="i in 3" :key="i" />
    </div>

    <UAlert
      v-else-if="status === 'error'"
      color="error"
      icon="i-heroicons-exclamation-triangle"
      title="Error"
      description="Failed to load vocabulary list"
    />

    <div v-else-if="vocabs.length === 0">
      <UAlert
        color="info"
        icon="i-heroicons-information-circle"
        title="No exports available"
        description="Run 'pnpm build:export' to generate vocabulary exports."
      />
    </div>

    <div v-else class="space-y-4">
      <UCard v-for="vocab in vocabs" :key="vocab.slug" class="hover:ring-1 hover:ring-primary transition-all">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div class="flex-1 min-w-0">
            <NuxtLink
              :to="`/share/${vocab.slug}`"
              class="text-lg font-semibold text-primary hover:underline"
            >
              {{ vocab.label }}
            </NuxtLink>
            <p v-if="vocab.description" class="text-sm text-muted line-clamp-2 mt-1">
              {{ vocab.description }}
            </p>
            <div class="flex items-center gap-3 mt-2 text-xs text-muted">
              <span>{{ vocab.conceptCount }} concepts</span>
              <span v-if="vocab.version">v{{ vocab.version }}</span>
              <span v-if="vocab.modified">Updated {{ vocab.modified }}</span>
            </div>
          </div>

          <div class="flex flex-wrap gap-2">
            <UButton
              v-for="format in formats"
              :key="format.id"
              :to="getDownloadUrl(vocab.slug, format.extension)"
              target="_blank"
              size="xs"
              variant="outline"
              color="neutral"
            >
              {{ format.label }}
            </UButton>
            <UButton
              :to="`/share/${vocab.slug}`"
              size="xs"
              color="primary"
              icon="i-heroicons-code-bracket"
            >
              Embed
            </UButton>
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>
