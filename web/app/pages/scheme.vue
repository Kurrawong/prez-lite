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
  breadcrumbs
} = useScheme(uri)

// Share functionality
const { getShareUrl } = useShare()
const shareUrl = computed(() => uri.value ? getShareUrl(uri.value) : undefined)

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

// Filter tree items based on search
const filteredTreeItems = computed(() => {
  if (!searchQuery.value) return treeItems.value

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

  return treeItems.value.map(filterNode).filter(Boolean)
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

watch(() => scheme.value, () => {
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

    <template v-else-if="scheme">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold mb-2">{{ getLabel(scheme.prefLabel) }}</h1>
        <div class="flex items-center gap-2 text-sm text-muted mb-4">
          <a :href="scheme.iri" target="_blank" class="text-primary hover:underline break-all">
            {{ scheme.iri }}
          </a>
          <UButton
            icon="i-heroicons-clipboard"
            color="neutral"
            variant="ghost"
            size="xs"
            @click="copyIriToClipboard(scheme.iri)"
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
        </div>
        <div v-if="scheme.definition">
          <p
            ref="descriptionRef"
            :class="['text-lg text-muted', descriptionExpanded ? '' : 'line-clamp-[8]']"
          >
            {{ getLabel(scheme.definition) }}
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
              <UBadge color="primary" variant="subtle">{{ concepts?.length || 0 }} total</UBadge>
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

        <div v-if="status === 'pending'" class="space-y-2">
          <USkeleton class="h-8 w-full" v-for="i in 5" :key="i" />
        </div>

        <template v-else-if="filteredTreeItems.length">
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

      <!-- Metadata -->
      <UCard class="mb-8">
        <template #header>
          <h2 class="font-semibold flex items-center gap-2">
            <UIcon name="i-heroicons-information-circle" />
            Metadata
          </h2>
        </template>

        <UTable
          :data="metadataRows"
          :columns="[
            { accessorKey: 'property', header: 'Property' },
            { accessorKey: 'value', header: 'Value' }
          ]"
        />
      </UCard>

      <!-- History Note -->
      <UCard v-if="scheme.historyNote">
        <template #header>
          <h2 class="font-semibold flex items-center gap-2">
            <UIcon name="i-heroicons-clock" />
            History
          </h2>
        </template>
        <div class="prose prose-sm max-w-none text-muted">
          {{ getLabel(scheme.historyNote) }}
        </div>
      </UCard>
    </template>

    <div v-else-if="status === 'pending'" class="space-y-4">
      <USkeleton class="h-12 w-1/2" />
      <USkeleton class="h-6 w-3/4" />
      <USkeleton class="h-64 w-full" />
    </div>

    <UAlert v-else color="error" title="Scheme not found" :description="`No scheme found with IRI: ${uri}`" />
  </div>
</template>
