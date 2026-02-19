import { create, load, search as oramaSearch, type Orama, type Results, type RawData } from '@orama/orama'
import { useDebounceFn } from '@vueuse/core'
import { fetchSearchIndex, fetchSearchFacets, type SearchEntry, type SearchFacets } from '~/composables/useVocabData'
import { PAGE_SIZE_ALL } from '~/composables/useVocabs'

export interface SearchResult extends SearchEntry {
  type: 'concept'
}

export interface Facet {
  value: string
  label: string
  count: number
}

// Orama database schema
const oramaSchema = {
  iri: 'string',
  prefLabel: 'string',
  altLabels: 'string[]',
  notation: 'string',
  definition: 'string',
  scheme: 'string',
  schemeLabel: 'string',
  publisher: 'string[]',
} as const

type OramaDB = Orama<typeof oramaSchema>

// Singleton for Orama database
let oramaDb: OramaDB | null = null
let oramaLoadPromise: Promise<OramaDB> | null = null

// Try to load pre-built Orama index, fall back to building from search index
async function getOramaDb(): Promise<OramaDB> {
  if (oramaDb) return oramaDb
  if (oramaLoadPromise) return oramaLoadPromise

  oramaLoadPromise = (async () => {
    const db = await create({ schema: oramaSchema })

    // Try to load pre-built index
    try {
      const prebuiltIndex = await $fetch<RawData>('/export/system/search/orama-index.json')
      await load(db, prebuiltIndex)
      console.info('[prez-lite] Loaded pre-built Orama search index')
    } catch {
      // Fall back to building from search index
      console.info('[prez-lite] Building Orama index from search data...')
      const searchIndex = await fetchSearchIndex()
      const { insertMultiple } = await import('@orama/orama')
      await insertMultiple(db, searchIndex.map(entry => ({
        iri: entry.iri,
        prefLabel: entry.prefLabel || '',
        altLabels: entry.altLabels || [],
        notation: entry.notation || '',
        definition: entry.definition || '',
        scheme: entry.scheme || '',
        schemeLabel: entry.schemeLabel || '',
        publisher: entry.publisher || [],
      })))
    }

    oramaDb = db
    return db
  })()

  return oramaLoadPromise
}

function parsePageNumber(value: unknown): number {
  const num = parseInt(value as string, 10)
  return num > 0 ? num : 1
}

function parsePageSize(value: unknown): number {
  if (value === 'all') return PAGE_SIZE_ALL
  const num = parseInt(value as string, 10)
  if ([10, 20, 50].includes(num)) return num
  return 10
}

export function useSearch() {
  const route = useRoute()
  const router = useRouter()

  // State
  const query = ref((route.query.q as string) || '')
  const selectedSchemes = ref<string[]>(
    route.query.vocabs
      ? (Array.isArray(route.query.vocabs) ? route.query.vocabs as string[] : [route.query.vocabs as string])
      : []
  )
  const selectedPublishers = ref<string[]>(
    route.query.publishers
      ? (Array.isArray(route.query.publishers) ? route.query.publishers as string[] : [route.query.publishers as string])
      : []
  )
  const currentPage = ref(parsePageNumber(route.query.page))
  const pageSize = ref(parsePageSize(route.query.numPerPage))

  // Loading state
  const indexStatus = ref<'idle' | 'pending' | 'success' | 'error'>('idle')

  // Pre-computed facets from build
  const precomputedFacets = ref<SearchFacets | null>(null)

  // Search results
  const searchResults = ref<SearchResult[]>([])
  const totalResults = ref(0)

  // Facets from current results
  const vocabFacets = ref<Facet[]>([])
  const publisherFacets = ref<Facet[]>([])

  // Load pre-computed facets on mount
  onMounted(async () => {
    precomputedFacets.value = await fetchSearchFacets()
  })

  // All vocab facets (for initial display before search)
  const allVocabFacets = computed((): Facet[] => {
    if (!precomputedFacets.value?.schemes) return []
    return precomputedFacets.value.schemes.map(s => ({
      value: s.iri,
      label: s.label,
      count: s.count
    })).sort((a, b) => a.label.localeCompare(b.label))
  })

  // All publisher facets (for initial display before search)
  const allPublisherFacets = computed((): Facet[] => {
    if (!precomputedFacets.value?.publishers) return []
    return precomputedFacets.value.publishers.map(p => ({
      value: p.iri,
      label: p.label,
      count: p.count
    })).sort((a, b) => a.label.localeCompare(b.label))
  })

  // Build URL query
  const buildQuery = (): Record<string, string | string[]> => {
    const q: Record<string, string | string[]> = {}
    if (query.value.trim()) q.q = query.value
    if (selectedSchemes.value.length > 0) q.vocabs = selectedSchemes.value
    if (selectedPublishers.value.length > 0) q.publishers = selectedPublishers.value
    if (currentPage.value > 1) q.page = String(currentPage.value)
    if (pageSize.value !== 10) q.numPerPage = pageSize.value === PAGE_SIZE_ALL ? 'all' : String(pageSize.value)
    return q
  }

  // Sync state to URL
  const updateURL = () => {
    const newQuery = buildQuery()
    const current = route.query as Record<string, string | string[]>
    const keysMatch = Object.keys(newQuery).length === Object.keys(current).length &&
      Object.keys(newQuery).every((k) => {
        const a = newQuery[k]
        const b = current[k]
        if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((v, i) => v === b[i])
        return a === b
      })
    if (!keysMatch) {
      router.push({ query: newQuery })
    }
  }

  let syncingFromRoute = false

  // Sync refs from URL when route changes
  watch(
    () => route.query,
    (q) => {
      syncingFromRoute = true
      query.value = (q.q as string) || ''
      selectedSchemes.value = q.vocabs
        ? (Array.isArray(q.vocabs) ? q.vocabs as string[] : [q.vocabs as string])
        : []
      selectedPublishers.value = q.publishers
        ? (Array.isArray(q.publishers) ? q.publishers as string[] : [q.publishers as string])
        : []
      currentPage.value = parsePageNumber(q.page)
      pageSize.value = parsePageSize(q.numPerPage)
      nextTick(() => {
        syncingFromRoute = false
      })
    },
    { deep: true }
  )

  watch(query, updateURL, { flush: 'post' })
  watch(selectedSchemes, updateURL, { flush: 'post', deep: true })
  watch(selectedPublishers, updateURL, { flush: 'post', deep: true })
  watch(currentPage, updateURL, { flush: 'post' })
  watch(pageSize, updateURL, { flush: 'post' })

  // Perform search using Orama
  async function performSearch() {
    indexStatus.value = 'pending'

    try {
      const db = await getOramaDb()

      // Build filter for scheme and publisher
      const where: Record<string, unknown> = {}
      if (selectedSchemes.value.length > 0) {
        where.scheme = selectedSchemes.value
      }
      if (selectedPublishers.value.length > 0) {
        where.publisher = { containsAll: selectedPublishers.value }
      }

      // If no query but has filters, do a browse (empty search with filters)
      const searchTerm = query.value.trim()

      if (!searchTerm && selectedSchemes.value.length === 0 && selectedPublishers.value.length === 0) {
        // No search, no filters - show nothing
        searchResults.value = []
        totalResults.value = 0
        vocabFacets.value = []
        publisherFacets.value = []
        indexStatus.value = 'success'
        return
      }

      const results = await oramaSearch(db, {
        term: searchTerm,
        properties: searchTerm ? ['prefLabel', 'altLabels', 'notation', 'definition'] : '*',
        where: Object.keys(where).length > 0 ? where : undefined,
        limit: PAGE_SIZE_ALL, // Get all results for faceting, paginate client-side
        facets: {
          scheme: {
            limit: 100,
          },
          publisher: {
            limit: 50,
          },
        },
      }) as Results<SearchEntry>

      // Transform results
      const allResults: SearchResult[] = results.hits.map(hit => ({
        ...hit.document,
        type: 'concept' as const,
      }))

      // Sort: exact match > prefix match > alphabetical
      if (searchTerm) {
        const q = searchTerm.toLowerCase()
        allResults.sort((a, b) => {
          const aExact = a.prefLabel.toLowerCase() === q
          const bExact = b.prefLabel.toLowerCase() === q
          if (aExact && !bExact) return -1
          if (!aExact && bExact) return 1
          const aPrefix = a.prefLabel.toLowerCase().startsWith(q)
          const bPrefix = b.prefLabel.toLowerCase().startsWith(q)
          if (aPrefix && !bPrefix) return -1
          if (!aPrefix && bPrefix) return 1
          return a.prefLabel.localeCompare(b.prefLabel)
        })
      }

      searchResults.value = allResults
      totalResults.value = allResults.length

      // Extract facets from Orama results
      if (results.facets?.scheme?.values) {
        vocabFacets.value = Object.entries(results.facets.scheme.values)
          .map(([iri, count]) => {
            // Find label from precomputed or from first result with this scheme
            const precomputed = precomputedFacets.value?.schemes.find(s => s.iri === iri)
            const fromResult = allResults.find(r => r.scheme === iri)
            return {
              value: iri,
              label: precomputed?.label || fromResult?.schemeLabel || iri,
              count: count as number,
            }
          })
          .sort((a, b) => b.count - a.count)
      }

      if (results.facets?.publisher?.values) {
        publisherFacets.value = Object.entries(results.facets.publisher.values)
          .map(([iri, count]) => {
            const precomputed = precomputedFacets.value?.publishers.find(p => p.iri === iri)
            return {
              value: iri,
              label: precomputed?.label || iri,
              count: count as number,
            }
          })
          .sort((a, b) => b.count - a.count)
      }

      indexStatus.value = 'success'
    } catch (err) {
      console.error('[prez-lite] Search error:', err)
      indexStatus.value = 'error'
    }
  }

  // Debounced search
  const debouncedSearch = useDebounceFn(performSearch, 150)

  // Trigger search when query or filters change
  watch([query, selectedSchemes, selectedPublishers], () => {
    debouncedSearch()
  }, { deep: true, immediate: true })

  // Reset page when filters change
  watch([query, selectedSchemes, selectedPublishers, pageSize], () => {
    if (!syncingFromRoute) {
      currentPage.value = 1
    }
  }, { deep: true })

  // Pagination
  const totalPages = computed(() => Math.ceil(totalResults.value / pageSize.value))

  const paginatedResults = computed(() => {
    const start = (currentPage.value - 1) * pageSize.value
    return searchResults.value.slice(start, start + pageSize.value)
  })

  // Toggle scheme selection
  function toggleScheme(schemeIri: string) {
    const idx = selectedSchemes.value.indexOf(schemeIri)
    if (idx >= 0) {
      selectedSchemes.value.splice(idx, 1)
    } else {
      selectedSchemes.value.push(schemeIri)
    }
  }

  // Toggle publisher selection
  function togglePublisher(publisherIri: string) {
    const idx = selectedPublishers.value.indexOf(publisherIri)
    if (idx >= 0) {
      selectedPublishers.value.splice(idx, 1)
    } else {
      selectedPublishers.value.push(publisherIri)
    }
  }

  // Clear all filters
  function clearAllFilters() {
    selectedSchemes.value = []
    selectedPublishers.value = []
  }

  const hasFilters = computed(() =>
    selectedSchemes.value.length > 0 || selectedPublishers.value.length > 0
  )

  // Selected facets (for showing when results are empty)
  const selectedVocabFacets = computed((): Facet[] => {
    if (selectedSchemes.value.length === 0) return []
    return allVocabFacets.value.filter(f => selectedSchemes.value.includes(f.value))
  })

  const selectedPublisherFacets = computed((): Facet[] => {
    if (selectedPublishers.value.length === 0) return []
    return allPublisherFacets.value.filter(f => selectedPublishers.value.includes(f.value))
  })

  return {
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
  }
}
