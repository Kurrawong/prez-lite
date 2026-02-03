import { fetchSearchIndex, fetchSchemes, getLabel, type SearchEntry, type Scheme } from '~/composables/useVocabData'
import { PAGE_SIZE_ALL } from '~/composables/useVocabs'

export interface SearchResult extends SearchEntry {
  type: 'concept'
  schemeLabel: string
}

export interface Facet {
  value: string
  label: string
  count: number
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

  const { data: searchIndex, status: indexStatus } = useLazyAsyncData('searchIndex', fetchSearchIndex, { server: false })
  const { data: schemes } = useLazyAsyncData('schemes', fetchSchemes, { server: false })

  // Initialize from URL params
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

  // Build full query object from current state
  const buildQuery = (): Record<string, string | string[]> => {
    const q: Record<string, string | string[]> = {}
    if (query.value.trim()) q.q = query.value
    if (selectedSchemes.value.length > 0) q.vocabs = selectedSchemes.value
    if (selectedPublishers.value.length > 0) q.publishers = selectedPublishers.value
    if (currentPage.value > 1) q.page = String(currentPage.value)
    if (pageSize.value !== 10) q.numPerPage = pageSize.value === PAGE_SIZE_ALL ? 'all' : String(pageSize.value)
    return q
  }

  // Sync state to URL (only push if query actually changed)
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

  // Skip resetting page when we're syncing from route (avoids jumping back to page 1)
  let syncingFromRoute = false

  // Sync refs from URL when route changes (back/forward)
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

  // Build scheme lookup
  const schemeMap = computed(() => {
    if (!schemes.value) return new Map<string, Scheme>()
    return new Map(schemes.value.map(s => [s.iri, s]))
  })

  const schemeOptions = computed(() => {
    if (!schemes.value) return []
    return schemes.value.map(s => ({
      label: getLabel(s.prefLabel),
      value: s.iri
    }))
  })

  // Filter by query only (before scheme filter)
  const queryFilteredResults = computed((): SearchResult[] => {
    if (!searchIndex.value || !Array.isArray(searchIndex.value) || !query.value.trim()) return []

    const q = query.value.toLowerCase().trim()
    const words = q.split(/\s+/)

    return searchIndex.value
      .filter(entry => {
        const searchText = [
          entry.prefLabel,
          ...(entry.altLabels || []),
          entry.notation || ''
        ].join(' ').toLowerCase()
        return words.every(word => searchText.includes(word))
      })
      .map(entry => ({
        ...entry,
        type: 'concept' as const,
        schemeLabel: entry.schemeLabel || getLabel(schemeMap.value.get(entry.scheme)?.prefLabel) || entry.scheme
      }))
  })

  // Browse by facet: all concepts in selected schemes/publishers when no query
  const browseFilteredResults = computed((): SearchResult[] => {
    if (!searchIndex.value || !Array.isArray(searchIndex.value) || query.value.trim()) return []
    if (selectedSchemes.value.length === 0 && selectedPublishers.value.length === 0) return []

    return searchIndex.value
      .filter(entry => {
        if (selectedSchemes.value.length > 0 && !selectedSchemes.value.includes(entry.scheme)) return false
        if (selectedPublishers.value.length > 0) {
          const pub = getSchemePublisher(entry.scheme)
          if (!pub || !selectedPublishers.value.includes(pub.value)) return false
        }
        return true
      })
      .map(entry => ({
        ...entry,
        type: 'concept' as const,
        schemeLabel: entry.schemeLabel || getLabel(schemeMap.value.get(entry.scheme)?.prefLabel) || entry.scheme
      }))
  })

  // Get publisher for a scheme
  function getSchemePublisher(schemeIri: string): { value: string; label: string } | null {
    const scheme = schemeMap.value.get(schemeIri)
    if (!scheme?.publisher?.[0]) return null
    return {
      value: scheme.publisher[0],
      label: scheme.publisherLabels?.[0] || scheme.publisher[0]
    }
  }

  // Base result set: query results or browse-by-facet results
  const baseResults = computed((): SearchResult[] => {
    if (query.value.trim()) return queryFilteredResults.value
    return browseFilteredResults.value
  })

  // All vocabularies with counts (for initial display)
  const allVocabFacets = computed((): Facet[] => {
    if (!schemes.value) return []
    return schemes.value
      .map(s => ({
        value: s.iri,
        label: getLabel(s.prefLabel),
        count: s.conceptCount
      }))
      .sort((a, b) => a.label.localeCompare(b.label))
  })

  // All publishers with concept counts (for initial display)
  const allPublisherFacets = computed((): Facet[] => {
    if (!schemes.value) return []
    const counts = new Map<string, { label: string; count: number }>()
    for (const scheme of schemes.value) {
      if (scheme.publisher?.[0]) {
        const pubIri = scheme.publisher[0]
        const existing = counts.get(pubIri)
        if (existing) {
          existing.count += scheme.conceptCount
        } else {
          counts.set(pubIri, {
            label: scheme.publisherLabels?.[0] || pubIri,
            count: scheme.conceptCount
          })
        }
      }
    }
    return Array.from(counts.entries())
      .map(([value, { label, count }]) => ({ value, label, count }))
      .sort((a, b) => a.label.localeCompare(b.label))
  })

  // Final result set: base filtered by selected schemes/publishers when there is a query
  const searchResults = computed((): SearchResult[] => {
    let results = baseResults.value

    if (query.value.trim()) {
      if (selectedSchemes.value.length > 0) {
        results = results.filter(entry => selectedSchemes.value.includes(entry.scheme))
      }
      if (selectedPublishers.value.length > 0) {
        results = results.filter(entry => {
          const pub = getSchemePublisher(entry.scheme)
          return pub && selectedPublishers.value.includes(pub.value)
        })
      }
    }

    const q = query.value.toLowerCase().trim()
    return results.sort((a, b) => {
      if (q) {
        const aExact = a.prefLabel.toLowerCase() === q
        const bExact = b.prefLabel.toLowerCase() === q
        if (aExact && !bExact) return -1
        if (!aExact && bExact) return 1
        const aPrefix = a.prefLabel.toLowerCase().startsWith(q)
        const bPrefix = b.prefLabel.toLowerCase().startsWith(q)
        if (aPrefix && !bPrefix) return -1
        if (!aPrefix && bPrefix) return 1
      }
      return a.prefLabel.localeCompare(b.prefLabel)
    })
  })

  // Facets from current result set only (left sidebar shows only what's in the results)
  const vocabFacets = computed((): Facet[] => {
    const counts = new Map<string, number>()
    for (const result of searchResults.value) {
      counts.set(result.scheme, (counts.get(result.scheme) || 0) + 1)
    }
    return Array.from(counts.entries())
      .map(([iri, count]) => ({
        value: iri,
        label: getLabel(schemeMap.value.get(iri)?.prefLabel) || iri,
        count
      }))
      .sort((a, b) => b.count - a.count)
  })

  const publisherFacets = computed((): Facet[] => {
    const counts = new Map<string, { label: string; count: number }>()
    for (const result of searchResults.value) {
      const pub = getSchemePublisher(result.scheme)
      if (pub) {
        const existing = counts.get(pub.value)
        if (existing) existing.count++
        else counts.set(pub.value, { label: pub.label, count: 1 })
      }
    }
    return Array.from(counts.entries())
      .map(([value, { label, count }]) => ({ value, label, count }))
      .sort((a, b) => b.count - a.count)
  })

  // Pagination
  const totalResults = computed(() => searchResults.value.length)
  const totalPages = computed(() => Math.ceil(totalResults.value / pageSize.value))

  const paginatedResults = computed(() => {
    const start = (currentPage.value - 1) * pageSize.value
    return searchResults.value.slice(start, start + pageSize.value)
  })

  // Reset page when user changes filters or page size (not when syncing from route)
  watch([query, selectedSchemes, selectedPublishers, pageSize], () => {
    if (!syncingFromRoute) {
      currentPage.value = 1
    }
  }, { deep: true })

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

  // When result set is empty but filters are selected, show selected facets on the left (so user can see/clear them)
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
