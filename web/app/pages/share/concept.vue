<script setup lang="ts">
import { getLabel } from '~/composables/useVocabData'

const route = useRoute()
const vocabSlug = computed(() => route.query.vocab as string)
const conceptUri = computed(() => route.query.uri as string)

const { getVocab, getConceptDownloadUrl, status: vocabStatus } = useShare()
const vocab = computed(() => vocabSlug.value ? getVocab(vocabSlug.value) : undefined)

const {
  concept,
  status: conceptStatus,
  scheme,
  richMetadata
} = useConcept(conceptUri)

const downloadUrl = computed(() => {
  if (!vocabSlug.value || !conceptUri.value) return undefined
  return getConceptDownloadUrl(vocabSlug.value, conceptUri.value)
})

const fullDownloadUrl = computed(() => {
  if (!downloadUrl.value) return undefined
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  return `${origin}${downloadUrl.value}`
})

const loading = computed(() =>
  vocabStatus.value === 'pending' || vocabStatus.value === 'idle' ||
  conceptStatus.value === 'pending' || conceptStatus.value === 'idle'
)

const breadcrumbs = computed(() => [
  { label: 'Vocabularies', to: '/vocabs' },
  ...(scheme.value
    ? [{ label: getLabel(scheme.value.prefLabel), to: { path: '/scheme', query: { uri: scheme.value.iri } } }]
    : []),
  ...(concept.value
    ? [{ label: getLabel(concept.value.prefLabel), to: { path: '/concept', query: { uri: conceptUri.value } } }]
    : []),
  { label: 'Share' }
])

async function copyUrl(url: string) {
  await navigator.clipboard.writeText(url)
}

// Preview state
const showPreview = ref(false)
const previewContent = ref('')
const previewLoading = ref(false)
type ViewMode = 'source' | 'tree'
const viewMode = ref<ViewMode>('source')

const jsonData = computed(() => {
  if (!previewContent.value) return null
  try {
    return JSON.parse(previewContent.value)
  } catch {
    return null
  }
})

async function togglePreview() {
  if (showPreview.value) {
    showPreview.value = false
    return
  }
  if (!downloadUrl.value) return
  showPreview.value = true
  viewMode.value = 'source'
  previewLoading.value = true
  previewContent.value = ''
  try {
    const res = await fetch(downloadUrl.value)
    const text = await res.text()
    previewContent.value = text.length > 200000 ? text.slice(0, 200000) + '\n\n… (truncated)' : text
  } catch {
    previewContent.value = 'Failed to load preview.'
  } finally {
    previewLoading.value = false
  }
}
</script>

<template>
  <div class="py-8">
    <UBreadcrumb :items="breadcrumbs" class="mb-6" />

    <div v-if="loading">
      <USkeleton class="h-8 w-64 mb-4" />
      <USkeleton class="h-4 w-full mb-8" />
      <USkeleton class="h-48 w-full" />
    </div>

    <div v-else-if="!conceptUri || !vocabSlug">
      <UAlert
        color="warning"
        icon="i-heroicons-exclamation-triangle"
        title="Missing parameters"
        description="Both vocab and uri query parameters are required."
      />
    </div>

    <div v-else-if="!concept">
      <UAlert
        color="warning"
        icon="i-heroicons-exclamation-triangle"
        title="Concept not found"
        :description="`No concept found with IRI: ${conceptUri}`"
      />
    </div>

    <div v-else>
      <h1 class="text-3xl font-bold mb-2">{{ getLabel(concept.prefLabel) }}</h1>
      <p v-if="concept.definition" class="text-muted mb-4">{{ getLabel(concept.definition) }}</p>

      <div class="flex flex-wrap items-center gap-3 text-sm text-muted mb-8">
        <UBadge v-if="concept.notation" color="primary" variant="subtle">
          {{ concept.notation }}
        </UBadge>
        <UBadge color="neutral" variant="subtle">Concept</UBadge>
      </div>

      <!-- Parent vocabulary -->
      <UCard v-if="vocab" class="mb-8">
        <template #header>
          <h2 class="text-lg font-semibold">Vocabulary</h2>
        </template>

        <NuxtLink
          :to="`/share/${vocab.slug}`"
          class="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
        >
          <UIcon name="i-heroicons-book-open" class="text-primary size-5 shrink-0" />
          <div class="min-w-0 flex-1">
            <div class="font-medium">{{ vocab.label }}</div>
            <div v-if="vocab.description" class="text-sm text-muted truncate">{{ vocab.description }}</div>
          </div>
          <UBadge color="neutral" variant="subtle" size="xs">{{ vocab.conceptCount }} concepts</UBadge>
          <UIcon name="i-heroicons-chevron-right" class="size-4 text-muted shrink-0" />
        </NuxtLink>
      </UCard>

      <!-- Download -->
      <UCard class="mb-8">
        <template #header>
          <h2 class="text-lg font-semibold">Download</h2>
        </template>

        <div class="flex items-center gap-4">
          <UButton
            v-if="downloadUrl"
            :to="downloadUrl"
            target="_blank"
            icon="i-heroicons-arrow-down-tray"
            size="lg"
          >
            Annotated JSON-LD
          </UButton>
          <UButton
            v-if="downloadUrl"
            icon="i-heroicons-eye"
            variant="ghost"
            size="sm"
            :color="showPreview ? 'primary' : 'neutral'"
            @click="togglePreview"
          >
            Preview
          </UButton>
          <UButton
            v-if="fullDownloadUrl"
            icon="i-heroicons-clipboard"
            variant="ghost"
            size="sm"
            @click="copyUrl(fullDownloadUrl)"
          >
            Copy URL
          </UButton>
        </div>

        <p class="text-sm text-muted mt-3">
          JSON-LD with resolved labels for all IRIs — suitable for web applications and linked data consumers.
        </p>

        <div v-if="showPreview" class="mt-4">
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-1">
              <UButton
                size="xs"
                :variant="viewMode === 'source' ? 'solid' : 'ghost'"
                @click="viewMode = 'source'"
              >
                Source
              </UButton>
              <UButton
                size="xs"
                :variant="viewMode === 'tree' ? 'solid' : 'ghost'"
                @click="viewMode = 'tree'"
              >
                Tree
              </UButton>
            </div>
            <UButton size="xs" variant="ghost" icon="i-heroicons-x-mark" @click="showPreview = false" />
          </div>

          <div v-if="previewLoading" class="flex items-center justify-center py-8">
            <UIcon name="i-heroicons-arrow-path" class="w-5 h-5 animate-spin text-muted" />
          </div>

          <template v-else-if="viewMode === 'source'">
            <pre class="bg-gray-900 text-gray-100 rounded-lg p-4 text-xs overflow-auto max-h-96"><code>{{ previewContent }}</code></pre>
          </template>

          <div
            v-else-if="viewMode === 'tree' && jsonData"
            class="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 overflow-auto max-h-96 text-sm"
          >
            <ShareJsonTreeNode :data="jsonData" :label="'root'" :expanded="true" :depth="0" />
          </div>
        </div>
      </UCard>

      <!-- Concept Details -->
      <UCard v-if="richMetadata.length" class="mb-8">
        <template #header>
          <h2 class="text-lg font-semibold">Properties</h2>
        </template>

        <RichMetadataTable :properties="richMetadata" />
      </UCard>

      <!-- Quick Reference -->
      <UCard>
        <template #header>
          <h2 class="text-lg font-semibold">Quick Reference</h2>
        </template>

        <div class="space-y-4">
          <div>
            <h3 class="font-medium mb-2">Concept IRI</h3>
            <code class="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-xs break-all">{{ conceptUri }}</code>
          </div>

          <div v-if="vocab">
            <h3 class="font-medium mb-2">Vocabulary</h3>
            <code class="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-sm">{{ vocab.slug }}</code>
          </div>

          <div v-if="scheme">
            <h3 class="font-medium mb-2">Scheme IRI</h3>
            <code class="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-xs break-all">{{ scheme.iri }}</code>
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>
