<script setup lang="ts">
import { useShare, EXPORT_FORMATS, COMPONENT_TYPES } from '~/composables/useShare'

const { vocabs, status, getDownloadUrl, formats, componentTypes } = useShare()

const baseUrl = computed(() => {
  if (typeof window !== 'undefined') {
    return window.location.origin
  }
  return ''
})

const quickStartCode = computed(() => `<script src="${baseUrl.value}/web-components/prez-lite.min.js" type="module"><\/script>

<prez-list vocab="your-vocab-slug"></prez-list>`)

// Type options for prez-list component
const typeOptions = [
  { id: 'select', label: 'Select', icon: 'i-heroicons-bars-3-bottom-left', attrs: 'type="select"', type: 'select', search: false, description: 'Tree view with expand/collapse' },
  { id: 'dropdown', label: 'Dropdown', icon: 'i-heroicons-chevron-up-down', attrs: 'type="dropdown"', type: 'dropdown', search: false, description: 'Dropdown button with popover' },
  { id: 'autocomplete', label: 'Autocomplete', icon: 'i-heroicons-magnifying-glass', attrs: 'type="dropdown" search', type: 'dropdown', search: true, description: 'Typeahead search with suggestions' },
  { id: 'radio', label: 'Radio', icon: 'i-heroicons-check-circle', attrs: 'type="radio"', type: 'radio', search: false, description: 'Radio button selection' },
  { id: 'table', label: 'Table', icon: 'i-heroicons-table-cells', attrs: 'type="table"', type: 'table', search: false, description: 'Tabular display with columns' }
]
</script>

<template>
  <div class="py-8">
    <UBreadcrumb :items="[{ label: 'Vocabularies', to: '/vocabs' }, { label: 'Share' }]" class="mb-6" />
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
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold">Web Components</h2>
          <NuxtLink to="/share/components/list" class="text-sm text-primary hover:underline">
            View docs →
          </NuxtLink>
        </div>
      </template>

      <div class="mb-4">
        <code class="text-lg text-primary font-semibold">&lt;prez-list /&gt;</code>
        <p class="text-sm text-muted mt-1">
          One component with multiple display modes. Set the <code class="text-primary">type</code> attribute to change the layout.
        </p>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        <NuxtLink
          v-for="t in typeOptions"
          :key="t.id"
          :to="{ path: '/share/components/list', query: { options: JSON.stringify({ type: t.type, search: t.search }) } }"
          class="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-primary hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
        >
          <div class="size-8 rounded-md bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
            <UIcon :name="t.icon" class="size-4 text-primary" />
          </div>
          <div class="min-w-0">
            <div class="font-semibold">{{ t.label }}</div>
            <code class="text-xs text-primary">{{ t.attrs }}</code>
            <p class="text-xs text-muted mt-1">{{ t.description }}</p>
          </div>
        </NuxtLink>
      </div>
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
              :to="getDownloadUrl(vocab.slug, format.id)"
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
