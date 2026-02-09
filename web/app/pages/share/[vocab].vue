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

// We only have one component now (prez-list) with different types
const selectedComponent = ref<'list'>('list')

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
          <NuxtLink
            to="/share/components/list"
            class="text-sm text-primary hover:underline"
          >
            View prez-list documentation →
          </NuxtLink>
        </div>

        <InteractivePreview
          :component="selectedComponent"
          :vocab="vocab"
          :base-url="baseUrl"
        />
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
            <pre class="bg-gray-900 text-gray-100 rounded-lg p-3 text-sm overflow-x-auto"><code>&lt;script src="{{ baseUrl }}/web-components/prez-lite.min.js" type="module"&gt;&lt;/script&gt;

&lt;prez-list vocab="{{ vocab.slug }}"&gt;&lt;/prez-list&gt;</code></pre>
          </div>

          <div>
            <h3 class="font-medium mb-2">Component Documentation</h3>
            <UButton
              to="/share/components/list"
              size="sm"
              variant="outline"
            >
              prez-list Docs
            </UButton>
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>
