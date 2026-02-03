<script setup lang="ts">
import { PAGE_SIZE_ALL } from '~/composables/useVocabs'

const {
  query,
  selectedSchemes,
  selectedPublishers,
  currentPage,
  pageSize,
  totalResults,
  totalPages,
  paginatedResults,
  vocabFacets,
  publisherFacets,
  selectedVocabFacets,
  selectedPublisherFacets,
  allVocabFacets,
  allPublisherFacets,
  indexStatus,
  toggleScheme,
  togglePublisher,
  clearAllFilters,
  hasFilters
} = useSearch()

// Left sidebar: show facets from result set; when no results, show selected facets so user can see/clear
const leftVocabFacets = computed(() => vocabFacets.value.length > 0 ? vocabFacets.value : selectedVocabFacets.value)
const leftPublisherFacets = computed(() => publisherFacets.value.length > 0 ? publisherFacets.value : selectedPublisherFacets.value)

const pageSizeOptions = [
  { label: '10', value: 10 },
  { label: '20', value: 20 },
  { label: '50', value: 50 },
  { label: 'All', value: PAGE_SIZE_ALL }
]

// Focus search input on mount
const searchInput = useTemplateRef<{ $el: HTMLElement }>('searchInput')
onMounted(() => {
  const input = searchInput.value?.$el?.querySelector('input')
  input?.focus()
})

// Collapsible facet sections
const vocabsExpanded = ref(true)
const publishersExpanded = ref(true)

// Has active query
const hasQuery = computed(() => query.value.trim().length > 0)

// Show results layout when user has searched or selected facets (browsing)
const showResultsLayout = computed(() => hasQuery.value || hasFilters.value)
</script>

<template>
  <div class="py-8">
    <div class="text-center mb-8">
      <div class="flex items-center justify-center gap-3 mb-2">
        <UIcon name="i-heroicons-magnifying-glass" class="size-8" />
        <h1 class="text-3xl font-bold">Search Vocabularies</h1>
      </div>
      <p class="text-muted">Search across all concepts, definitions, and labels.</p>
    </div>

    <!-- Search Box -->
    <div class="max-w-3xl mx-auto text-center mb-8">
      <div class="relative">
        <UInput
          ref="searchInput"
          v-model="query"
          icon="i-heroicons-magnifying-glass"
          placeholder="Search for concepts, terms, or definitions..."
          size="xl"
          class="w-full"
          :ui="{ base: 'text-lg' }"
        />
      </div>
    </div>

    <!-- Loading -->
    <div v-if="indexStatus === 'pending' || indexStatus === 'idle'" class="max-w-4xl mx-auto space-y-4">
      <USkeleton class="h-20 w-full" v-for="i in 5" :key="i" />
    </div>

    <!-- Initial state: no query and no filters - centered facets to start browsing -->
    <div v-else-if="!showResultsLayout" class="max-w-4xl mx-auto">
      <div class="text-center mb-8">
        <p class="text-lg text-muted">Enter a search term or click a vocabulary/publisher to browse</p>
      </div>

      <!-- Centered facets for browsing -->
      <div class="grid md:grid-cols-2 gap-8">
        <!-- Vocabularies -->
        <div>
          <button
            class="w-full flex items-center justify-between font-semibold text-sm mb-3 cursor-pointer hover:text-primary"
            @click="vocabsExpanded = !vocabsExpanded"
          >
            <span class="flex items-center gap-2">
              <UIcon name="i-heroicons-book-open" class="size-4" />
              Vocabularies
              <UBadge color="neutral" variant="subtle" size="xs">{{ allVocabFacets.length }}</UBadge>
            </span>
            <UIcon
              :name="vocabsExpanded ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
              class="size-4"
            />
          </button>
          <div v-if="vocabsExpanded" class="space-y-1 max-h-80 overflow-auto">
            <button
              v-for="facet in allVocabFacets"
              :key="facet.value"
              class="w-full flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors cursor-pointer"
              :class="selectedSchemes.includes(facet.value)
                ? 'bg-primary/10 text-primary'
                : 'hover:bg-muted/50'"
              @click="toggleScheme(facet.value)"
            >
              <span class="truncate text-left">{{ facet.label }}</span>
              <UBadge color="neutral" variant="subtle" size="xs">
                {{ facet.count }}
              </UBadge>
            </button>
          </div>
        </div>

        <!-- Publishers -->
        <div v-if="allPublisherFacets.length">
          <button
            class="w-full flex items-center justify-between font-semibold text-sm mb-3 cursor-pointer hover:text-primary"
            @click="publishersExpanded = !publishersExpanded"
          >
            <span class="flex items-center gap-2">
              <UIcon name="i-heroicons-building-office" class="size-4" />
              Publishers
              <UBadge color="neutral" variant="subtle" size="xs">{{ allPublisherFacets.length }}</UBadge>
            </span>
            <UIcon
              :name="publishersExpanded ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
              class="size-4"
            />
          </button>
          <div v-if="publishersExpanded" class="space-y-1 max-h-80 overflow-auto">
            <button
              v-for="facet in allPublisherFacets"
              :key="facet.value"
              class="w-full flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors cursor-pointer"
              :class="selectedPublishers.includes(facet.value)
                ? 'bg-primary/10 text-primary'
                : 'hover:bg-muted/50'"
              @click="togglePublisher(facet.value)"
            >
              <span class="truncate text-left">{{ facet.label }}</span>
              <UBadge color="neutral" variant="subtle" size="xs">
                {{ facet.count }}
              </UBadge>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Results state: sidebar facets + results (search or browse by facet) -->
    <div v-else class="flex gap-8">
      <!-- Left sidebar facets -->
      <aside class="w-64 shrink-0">
        <div class="sticky top-4 space-y-6">
          <!-- Clear filters -->
          <UButton
            v-if="hasFilters"
            color="neutral"
            variant="link"
            size="sm"
            class="mb-2"
            @click="clearAllFilters"
          >
            Clear all filters
          </UButton>

          <!-- Vocabularies facet (from result set, or selected when no results) -->
          <div v-if="leftVocabFacets.length">
            <button
              class="w-full flex items-center justify-between font-semibold text-sm mb-3 cursor-pointer hover:text-primary"
              @click="vocabsExpanded = !vocabsExpanded"
            >
              <span class="flex items-center gap-2">
                <UIcon name="i-heroicons-book-open" class="size-4" />
                Vocabularies
              </span>
              <UIcon
                :name="vocabsExpanded ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
                class="size-4"
              />
            </button>
            <div v-if="vocabsExpanded" class="space-y-1">
              <button
                v-for="facet in leftVocabFacets"
                :key="facet.value"
                class="w-full flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors cursor-pointer"
                :class="selectedSchemes.includes(facet.value)
                  ? 'bg-primary/10 text-primary'
                  : 'hover:bg-muted/50'"
                @click="toggleScheme(facet.value)"
              >
                <span class="truncate text-left">{{ facet.label }}</span>
                <UBadge color="neutral" variant="subtle" size="xs">
                  {{ facet.count }}
                </UBadge>
              </button>
            </div>
          </div>

          <!-- Publishers facet (from result set, or selected when no results) -->
          <div v-if="leftPublisherFacets.length">
            <button
              class="w-full flex items-center justify-between font-semibold text-sm mb-3 cursor-pointer hover:text-primary"
              @click="publishersExpanded = !publishersExpanded"
            >
              <span class="flex items-center gap-2">
                <UIcon name="i-heroicons-building-office" class="size-4" />
                Publishers
              </span>
              <UIcon
                :name="publishersExpanded ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
                class="size-4"
              />
            </button>
            <div v-if="publishersExpanded" class="space-y-1">
              <button
                v-for="facet in leftPublisherFacets"
                :key="facet.value"
                class="w-full flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors cursor-pointer"
                :class="selectedPublishers.includes(facet.value)
                  ? 'bg-primary/10 text-primary'
                  : 'hover:bg-muted/50'"
                @click="togglePublisher(facet.value)"
              >
                <span class="truncate text-left">{{ facet.label }}</span>
                <UBadge color="neutral" variant="subtle" size="xs">
                  {{ facet.count }}
                </UBadge>
              </button>
            </div>
          </div>
        </div>
      </aside>

      <!-- Main results -->
      <div class="flex-1 min-w-0">
        <!-- No results -->
        <div v-if="totalResults === 0" class="text-center py-12">
          <UIcon name="i-heroicons-document-magnifying-glass" class="size-16 text-muted mb-4" />
          <p class="text-lg text-muted mb-2">
            {{ hasQuery ? `No results found for "${query}"` : 'No concepts in selected filters' }}
          </p>
          <p class="text-sm text-muted">Try different keywords or clear filters</p>
        </div>

        <!-- Results list -->
        <template v-else>
          <div class="flex items-center justify-between mb-6">
            <p class="text-sm text-muted">
              Showing {{ (currentPage - 1) * pageSize + 1 }}-{{ Math.min(currentPage * pageSize, totalResults) }} of {{ totalResults }} results
              <span v-if="hasFilters">(filtered)</span>
            </p>
          </div>

          <div class="space-y-4">
            <UCard
              v-for="result in paginatedResults"
              :key="result.iri"
              class="hover:ring-2 hover:ring-primary transition-all"
            >
              <div class="flex items-start gap-4">
                <div class="shrink-0">
                  <div class="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <UIcon name="i-heroicons-tag" class="size-5 text-primary" />
                  </div>
                </div>

                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-1">
                    <NuxtLink
                      :to="{ path: '/concept', query: { uri: result.iri } }"
                      class="text-lg font-semibold text-primary hover:underline"
                    >
                      {{ result.prefLabel }}
                    </NuxtLink>
                    <UBadge v-if="result.notation" color="neutral" variant="subtle" size="xs">
                      {{ result.notation }}
                    </UBadge>
                  </div>

                  <p v-if="result.altLabels?.length" class="text-sm text-muted mb-2">
                    Also known as: {{ result.altLabels.slice(0, 3).join(', ') }}
                    <span v-if="result.altLabels.length > 3">+{{ result.altLabels.length - 3 }} more</span>
                  </p>

                  <div class="flex items-center gap-2 text-sm">
                    <UIcon name="i-heroicons-folder" class="size-4 text-muted" />
                    <NuxtLink
                      :to="{ path: '/scheme', query: { uri: result.scheme } }"
                      class="text-muted hover:text-primary"
                    >
                      {{ result.schemeLabel }}
                    </NuxtLink>
                  </div>
                </div>
              </div>
            </UCard>
          </div>

          <!-- Pagination -->
          <div v-if="totalResults > 0" class="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
            <div class="text-sm text-muted">
              Showing {{ (currentPage - 1) * pageSize + 1 }}-{{ Math.min(currentPage * pageSize, totalResults) }} of {{ totalResults }}
            </div>
            <div class="flex items-center gap-4">
              <div class="flex items-center gap-2">
                <span class="text-sm text-muted">Per page:</span>
                <USelectMenu
                  v-model="pageSize"
                  :items="pageSizeOptions"
                  value-key="value"
                  class="w-20"
                />
              </div>
              <UPagination
                v-if="totalPages > 1"
                v-model:page="currentPage"
                :total="totalResults"
                :items-per-page="pageSize"
              />
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
