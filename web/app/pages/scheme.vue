<script setup lang="ts">
import { getLabel } from '~/composables/useVocabData'

const route = useRoute()
const router = useRouter()
const uri = computed(() => route.query.uri as string)
const selectedConceptUri = computed(() => route.query.concept as string | undefined)

const {
  scheme,
  concepts,
  status,
  treeItems,
  metadataRows,
  richMetadata,
  breadcrumbs
} = useScheme(uri)

// Keep track of last valid data to prevent flicker on back navigation
const lastValidScheme = ref<typeof scheme.value>(null)
const lastValidTreeItems = ref<typeof treeItems.value>([])
const lastValidConcepts = ref<typeof concepts.value>([])

// Update last valid data when we have successful data
watch([scheme, treeItems, concepts], () => {
  if (scheme.value && status.value === 'success') {
    lastValidScheme.value = scheme.value
    lastValidTreeItems.value = treeItems.value
    lastValidConcepts.value = concepts.value ?? []
  }
}, { immediate: true })

// Display values that fall back to previous data during loading
const displayScheme = computed(() => scheme.value ?? lastValidScheme.value)
const displayTreeItems = computed(() => treeItems.value.length ? treeItems.value : lastValidTreeItems.value)
const displayConcepts = computed(() => concepts.value?.length ? concepts.value : lastValidConcepts.value)

const isLoading = computed(() => status.value === 'idle' || status.value === 'pending')
// Only show skeleton on initial load (no previous data)
const showTreeSkeleton = computed(() => isLoading.value && !lastValidTreeItems.value.length)
// Show loading indicator when refreshing existing data
const isTreeLoading = computed(() => isLoading.value && lastValidTreeItems.value.length > 0)

// Share functionality
const { getShareUrl, getVocabByIri } = useShare()
const shareUrl = computed(() => uri.value ? getShareUrl(uri.value) : undefined)

// Edit on GitHub
const { githubRepo, githubBranch, githubVocabPath } = useRuntimeConfig().public
const githubEditUrl = computed(() => {
  if (!githubRepo || !uri.value) return null
  const vocab = getVocabByIri(uri.value)
  if (!vocab) return null
  return `https://github.dev/${githubRepo}/blob/${githubBranch}/${githubVocabPath}/${vocab.slug}.ttl`
})

// Tree controls
const searchQuery = ref('')
const expandAll = ref(false)

// Handle concept selection - update URL without navigation
function selectConcept(conceptUri: string) {
  router.replace({
    path: '/scheme',
    query: { uri: uri.value, concept: conceptUri }
  })
}

// Clear concept selection
function clearConceptSelection() {
  router.replace({
    path: '/scheme',
    query: { uri: uri.value }
  })
}

// Filter tree items based on search (uses displayTreeItems for stable display)
const filteredTreeItems = computed(() => {
  const sourceItems = displayTreeItems.value
  if (!searchQuery.value) return sourceItems

  const query = searchQuery.value.toLowerCase()

  function filterNode(item: any): any | null {
    const matchesSelf = item.label.toLowerCase().includes(query)
    const filteredChildren = item.children?.map(filterNode).filter(Boolean) || []

    if (matchesSelf || filteredChildren.length > 0) {
      return {
        ...item,
        children: filteredChildren.length > 0 ? filteredChildren : item.children,
        defaultExpanded: true // Expand matching branches
      }
    }
    return null
  }

  return sourceItems.map(filterNode).filter(Boolean)
})

// Count total concepts including nested
function countNodes(items: any[]): number {
  return items.reduce((count, item) => {
    return count + 1 + (item.children ? countNodes(item.children) : 0)
  }, 0)
}

// True if any node in the tree has children (can be expanded/collapsed)
const hasExpandableNodes = computed(() => {
  function hasChildren(items: any[]): boolean {
    return items.some((item) => item.children?.length > 0 || (item.children && hasChildren(item.children)))
  }
  return hasChildren(filteredTreeItems.value)
})

// Description expand/collapse
const descriptionExpanded = ref(false)
const descriptionRef = useTemplateRef<HTMLElement>('descriptionRef')
const isDescriptionClamped = ref(false)

onMounted(() => {
  nextTick(() => {
    if (descriptionRef.value) {
      isDescriptionClamped.value = descriptionRef.value.scrollHeight > descriptionRef.value.clientHeight
    }
  })
})

watch(() => displayScheme.value, () => {
  nextTick(() => {
    if (descriptionRef.value) {
      isDescriptionClamped.value = descriptionRef.value.scrollHeight > descriptionRef.value.clientHeight
    }
  })
})

function copyIriToClipboard(iri: string) {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(iri).catch(() => {})
  }
}
</script>

<template>
  <div class="py-8">
    <UBreadcrumb :items="breadcrumbs" class="mb-6" />

    <div v-if="!uri" class="text-center py-12">
      <UAlert color="warning" title="No scheme selected" description="Please select a vocabulary from the vocabularies page" />
    </div>

    <template v-else-if="displayScheme">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold mb-2">{{ getLabel(displayScheme.prefLabel) }}</h1>
        <div class="flex items-center gap-2 text-sm text-muted mb-4">
          <a :href="displayScheme.iri" target="_blank" class="text-primary hover:underline break-all">
            {{ displayScheme.iri }}
          </a>
          <UButton
            icon="i-heroicons-clipboard"
            color="neutral"
            variant="ghost"
            size="xs"
            @click="copyIriToClipboard(displayScheme.iri)"
          />
          <UButton
            v-if="shareUrl"
            :to="shareUrl"
            icon="i-heroicons-share"
            color="neutral"
            variant="ghost"
            size="xs"
            aria-label="Share or embed this vocabulary"
          />
          <UButton
            v-if="githubEditUrl"
            :to="githubEditUrl"
            target="_blank"
            icon="i-heroicons-pencil-square"
            color="neutral"
            variant="ghost"
            size="xs"
            aria-label="Edit source on GitHub"
          />
        </div>
        <div v-if="displayScheme.definition">
          <p
            ref="descriptionRef"
            :class="['text-lg text-muted', descriptionExpanded ? '' : 'line-clamp-[8]']"
          >
            {{ getLabel(displayScheme.definition) }}
          </p>
          <UButton
            v-if="isDescriptionClamped || descriptionExpanded"
            variant="link"
            color="primary"
            size="sm"
            class="mt-2 px-0"
            @click="descriptionExpanded = !descriptionExpanded"
          >
            {{ descriptionExpanded ? 'Show less' : 'Show more' }}
          </UButton>
        </div>
      </div>

      <!-- Concepts Tree with inline panel -->
      <UCard class="mb-8">
        <template #header>
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h2 class="font-semibold flex items-center gap-2">
              <UIcon name="i-heroicons-list-bullet" />
              Concepts
              <UBadge color="primary" variant="subtle">{{ displayConcepts?.length || 0 }} total</UBadge>
              <UIcon v-if="isTreeLoading" name="i-heroicons-arrow-path" class="size-4 text-primary animate-spin" />
            </h2>

            <div class="flex items-center gap-2">
              <UInput
                v-model="searchQuery"
                icon="i-heroicons-magnifying-glass"
                placeholder="Search concepts..."
                size="sm"
                class="w-48"
              />
              <UButton
                v-if="hasExpandableNodes"
                :icon="expandAll ? 'i-heroicons-minus' : 'i-heroicons-plus'"
                color="neutral"
                variant="ghost"
                size="sm"
                @click="expandAll = !expandAll"
              >
                {{ expandAll ? 'Collapse' : 'Expand' }}
              </UButton>
            </div>
          </div>
        </template>

        <div v-if="showTreeSkeleton" class="space-y-2">
          <USkeleton class="h-8 w-full" v-for="i in 5" :key="i" />
        </div>

        <template v-else-if="filteredTreeItems.length || displayTreeItems.length">
          <div class="flex gap-6" :class="selectedConceptUri ? 'flex-col lg:flex-row' : ''">
            <!-- Tree panel -->
            <div :class="selectedConceptUri ? 'lg:w-1/2' : 'w-full'" class="max-h-[600px] overflow-auto">
              <ConceptTree
                :items="filteredTreeItems"
                :expand-all="expandAll || !!searchQuery"
                :selected-id="selectedConceptUri"
                @select="selectConcept"
              />
            </div>

            <!-- Concept detail panel -->
            <div v-if="selectedConceptUri" class="lg:w-1/2 lg:border-l lg:border-default lg:pl-6 min-h-[200px]">
              <ConceptPanel
                :uri="selectedConceptUri"
                :scheme-uri="uri"
                @close="clearConceptSelection"
              />
            </div>
          </div>
        </template>

        <UAlert
          v-else-if="searchQuery"
          color="info"
          icon="i-heroicons-information-circle"
          description="No concepts match your search"
        />

        <UAlert
          v-else
          color="info"
          icon="i-heroicons-information-circle"
          description="No concepts found in this scheme"
        />
      </UCard>

      <!-- Metadata - use rich rendering when available -->
      <UCard class="mb-8">
        <template #header>
          <h2 class="font-semibold flex items-center gap-2">
            <UIcon name="i-heroicons-information-circle" />
            Metadata
          </h2>
        </template>

        <!-- Rich metadata from annotated JSON-LD -->
        <RichMetadataTable v-if="richMetadata.length" :properties="richMetadata" />

        <!-- Fallback to simple table -->
        <UTable
          v-else
          :data="metadataRows"
          :columns="[
            { accessorKey: 'property', header: 'Property' },
            { accessorKey: 'value', header: 'Value' }
          ]"
        />
      </UCard>
    </template>

    <div v-else-if="(status === 'idle' || status === 'pending') && !lastValidScheme" class="space-y-4">
      <USkeleton class="h-12 w-1/2" />
      <USkeleton class="h-6 w-3/4" />
      <USkeleton class="h-64 w-full" />
    </div>

    <UAlert v-else-if="status !== 'pending' && status !== 'idle'" color="error" title="Scheme not found" :description="`No scheme found with IRI: ${uri}`" />
  </div>
</template>
