<script setup lang="ts">
import { useShare } from '~/composables/useShare'
import InteractivePreview from '~/components/share/InteractivePreview.vue'

const route = useRoute()
const vocabSlug = computed(() => route.params.vocab as string)

const { vocabs, status, getDownloadUrl, getFullDownloadUrl, formats } = useShare()

const vocab = computed(() => vocabs.value.find(v => v.slug === vocabSlug.value))

const baseUrl = computed(() => {
  if (typeof window !== 'undefined') {
    return window.location.origin
  }
  return ''
})

const selectedComponent = ref<'select' | 'tree' | 'list' | 'autocomplete'>('select')

const componentTypes = [
  { id: 'select', label: 'Select' },
  { id: 'tree', label: 'Tree' },
  { id: 'list', label: 'List' },
  { id: 'autocomplete', label: 'Autocomplete' }
] as const

async function copyUrl(url: string) {
  await navigator.clipboard.writeText(url)
}
</script>

<template>
  <div class="py-8">
    <!-- Back link -->
    <NuxtLink to="/share" class="inline-flex items-center gap-1 text-sm text-muted hover:text-primary mb-4">
      <UIcon name="i-heroicons-arrow-left" class="size-4" />
      Back to all vocabularies
    </NuxtLink>

    <div v-if="status === 'pending' || status === 'idle'">
      <USkeleton class="h-8 w-64 mb-4" />
      <USkeleton class="h-4 w-full mb-8" />
      <USkeleton class="h-64 w-full" />
    </div>

    <div v-else-if="!vocab">
      <UAlert
        color="warning"
        icon="i-heroicons-exclamation-triangle"
        title="Vocabulary not found"
        :description="`No vocabulary with slug '${vocabSlug}' was found.`"
      />
    </div>

    <div v-else>
      <h1 class="text-3xl font-bold mb-2">{{ vocab.label }}</h1>
      <p v-if="vocab.description" class="text-muted mb-4">{{ vocab.description }}</p>

      <div class="flex flex-wrap items-center gap-3 text-sm text-muted mb-8">
        <UBadge color="neutral" variant="subtle">
          {{ vocab.conceptCount }} concepts
        </UBadge>
        <UBadge v-if="vocab.version" color="primary" variant="subtle">
          v{{ vocab.version }}
        </UBadge>
        <span v-if="vocab.modified">Updated {{ vocab.modified }}</span>
      </div>

      <!-- Download Formats -->
      <UCard class="mb-8">
        <template #header>
          <h2 class="text-lg font-semibold">Download</h2>
        </template>

        <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div v-for="format in formats" :key="format.id" class="text-center">
            <UButton
              :to="getDownloadUrl(vocab.slug, format.extension)"
              target="_blank"
              variant="outline"
              class="w-full mb-2"
            >
              .{{ format.extension }}
            </UButton>
            <div class="text-xs text-muted">{{ format.label }}</div>
            <UButton
              icon="i-heroicons-clipboard"
              size="xs"
              variant="ghost"
              class="mt-1"
              @click="copyUrl(getFullDownloadUrl(vocab.slug, format.extension))"
            >
              Copy URL
            </UButton>
          </div>
        </div>
      </UCard>

      <!-- Interactive Preview -->
      <div class="mb-8">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-xl font-semibold">Interactive Preview</h2>
          <div class="flex gap-2">
            <UButton
              v-for="comp in componentTypes"
              :key="comp.id"
              :color="selectedComponent === comp.id ? 'primary' : 'neutral'"
              :variant="selectedComponent === comp.id ? 'solid' : 'outline'"
              size="sm"
              @click="selectedComponent = comp.id"
            >
              {{ comp.label }}
            </UButton>
          </div>
        </div>

        <InteractivePreview
          :component="selectedComponent"
          :vocab="vocab"
          :base-url="baseUrl"
        />

        <p class="text-sm text-muted mt-4">
          <NuxtLink
            :to="`/share/components/${selectedComponent}`"
            class="text-primary hover:underline"
          >
            View full {{ selectedComponent }} component documentation →
          </NuxtLink>
        </p>
      </div>

      <!-- Quick Reference -->
      <UCard>
        <template #header>
          <h2 class="text-lg font-semibold">Quick Reference</h2>
        </template>

        <div class="space-y-4">
          <div>
            <h3 class="font-medium mb-2">Vocab Slug</h3>
            <code class="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-sm">{{ vocab.slug }}</code>
          </div>

          <div>
            <h3 class="font-medium mb-2">Vocab IRI</h3>
            <code class="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-xs break-all">{{ vocab.iri }}</code>
          </div>

          <div>
            <h3 class="font-medium mb-2">Basic Usage</h3>
            <pre class="bg-gray-900 text-gray-100 rounded-lg p-3 text-sm overflow-x-auto"><code>&lt;script src="{{ baseUrl }}/web-components/prez-vocab.min.js" type="module"&gt;&lt;/script&gt;

&lt;prez-vocab-select vocab="{{ vocab.slug }}"&gt;&lt;/prez-vocab-select&gt;</code></pre>
          </div>

          <div>
            <h3 class="font-medium mb-2">Component Documentation</h3>
            <div class="flex flex-wrap gap-2">
              <UButton
                v-for="comp in componentTypes"
                :key="comp.id"
                :to="`/share/components/${comp.id}`"
                size="sm"
                variant="outline"
              >
                {{ comp.label }} Docs
              </UButton>
            </div>
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>
