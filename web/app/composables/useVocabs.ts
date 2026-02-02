import { fetchSchemes, getLabel, type Scheme } from '~/composables/useVocabData'

export interface VocabTableRow {
  iri: string
  prefLabel: string
  definition: string
  conceptCount: number
  modified?: string
  version?: string
  publisher?: string
}

/** Sentinel value for "show all" in per-page selector */
export const PAGE_SIZE_ALL = 999999

export function useVocabs() {
  const route = useRoute()
  const router = useRouter()
  const { data: schemes, status } = useLazyAsyncData('schemes', fetchSchemes, { server: false })

  // Parse sort field from query
  const parseSortField = (value: unknown): 'name' | 'modified' | 'concepts' => {
    if (value === 'name' || value === 'modified' || value === 'concepts') {
      return value
    }
    return 'name'
  }

  // Parse page size from query (12, 24, 48, or "all") - divisible by 3 for tile layout
  const parsePageSize = (value: unknown): number => {
    if (value === 'all') return PAGE_SIZE_ALL
    const num = parseInt(value as string, 10)
    if ([12, 24, 48].includes(num)) return num
    return 12
  }

  // Parse page number from query
  const parsePageNumber = (value: unknown): number => {
    const num = parseInt(value as string, 10)
    return (num > 0) ? num : 1
  }

  // Parse sort order from query
  const parseSortOrder = (value: unknown): 'asc' | 'desc' => {
    return (value === '1' || value === 'true') ? 'desc' : 'asc'
  }

  // Parse view mode from query
  const parseViewMode = (value: unknown): 'cards' | 'table' => {
    return value === 'table' ? 'table' : 'cards'
  }

  // Initialize refs from URL query params
  const viewMode = ref<'cards' | 'table'>(parseViewMode(route.query.view))
  const searchQuery = ref((route.query.q as string) || '')
  const sortBy = ref<'name' | 'modified' | 'concepts'>(parseSortField(route.query.sort))
  const sortOrder = ref<'asc' | 'desc'>(parseSortOrder(route.query.sortDesc))
  const currentPage = ref(parsePageNumber(route.query.page))
  const pageSize = ref(parsePageSize(route.query.numPerPage))

  // Filter and sort schemes
  const filteredSchemes = computed(() => {
    if (!schemes.value) return []

    let result = [...schemes.value]

    // Filter by search query
    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase()
      result = result.filter(s =>
        getLabel(s.prefLabel).toLowerCase().includes(query) ||
        getLabel(s.definition).toLowerCase().includes(query) ||
        s.iri.toLowerCase().includes(query)
      )
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0
      switch (sortBy.value) {
        case 'name':
          comparison = getLabel(a.prefLabel).localeCompare(getLabel(b.prefLabel))
          break
        case 'modified':
          comparison = (a.modified || '').localeCompare(b.modified || '')
          break
        case 'concepts':
          comparison = a.conceptCount - b.conceptCount
          break
      }
      return sortOrder.value === 'asc' ? comparison : -comparison
    })

    return result
  })

  // Paginate
  const totalPages = computed(() => Math.ceil(filteredSchemes.value.length / pageSize.value))

  const paginatedSchemes = computed(() => {
    const start = (currentPage.value - 1) * pageSize.value
    return filteredSchemes.value.slice(start, start + pageSize.value)
  })

  // Table data format
  const tableData = computed(() =>
    paginatedSchemes.value.map(s => ({
      iri: s.iri,
      prefLabel: getLabel(s.prefLabel),
      definition: getLabel(s.definition),
      conceptCount: s.conceptCount,
      modified: s.modified,
      version: s.version,
      publisher: s.publisherLabels?.[0] || s.publisher?.[0]
    }))
  )

  const tableColumns = [
    { accessorKey: 'prefLabel', header: 'Name', sortField: 'name' as const },
    { accessorKey: 'conceptCount', header: 'Concepts', sortField: 'concepts' as const },
    { accessorKey: 'modified', header: 'Modified', sortField: 'modified' as const },
    { accessorKey: 'version', header: 'Version' },
    { accessorKey: 'publisher', header: 'Publisher' }
  ]

  // Build query object from current state (omit defaults)
  const buildQuery = (): Record<string, string> => {
    const query: Record<string, string> = {}
    if (searchQuery.value.trim()) query.q = searchQuery.value
    if (currentPage.value > 1) query.page = String(currentPage.value)
    if (pageSize.value !== 12) query.numPerPage = pageSize.value === PAGE_SIZE_ALL ? 'all' : String(pageSize.value)
    if (sortBy.value !== 'name') query.sort = sortBy.value
    if (sortOrder.value === 'desc') query.sortDesc = '1'
    if (viewMode.value !== 'cards') query.view = viewMode.value
    return query
  }

  // Sync state to URL (only push if query actually changed, to avoid duplicate history when syncing from route)
  const updateURL = () => {
    const query = buildQuery()
    const current = route.query as Record<string, string>
    const same =
      Object.keys(query).length === Object.keys(current).length &&
      Object.keys(query).every((k) => current[k] === query[k])
    if (!same) {
      router.push({ query })
    }
  }

  // Sync refs from URL when route changes (back/forward)
  watch(
    () => route.query,
    (query) => {
      viewMode.value = parseViewMode(query.view)
      searchQuery.value = (query.q as string) || ''
      sortBy.value = parseSortField(query.sort)
      sortOrder.value = parseSortOrder(query.sortDesc)
      currentPage.value = parsePageNumber(query.page)
      pageSize.value = parsePageSize(query.numPerPage)
    },
    { deep: true }
  )

  watch(viewMode, updateURL, { flush: 'post' })
  watch(searchQuery, updateURL, { flush: 'post' })
  watch(sortBy, updateURL, { flush: 'post' })
  watch(sortOrder, updateURL, { flush: 'post' })
  watch(currentPage, updateURL, { flush: 'post' })
  watch(pageSize, updateURL, { flush: 'post' })

  // Reset page when filters change
  watch([searchQuery, sortBy, sortOrder, pageSize], () => {
    currentPage.value = 1
  })

  function toggleSort(field: typeof sortBy.value) {
    if (sortBy.value === field) {
      sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
    } else {
      sortBy.value = field
      sortOrder.value = 'asc'
    }
  }

  return {
    schemes,
    status,
    viewMode,
    searchQuery,
    sortBy,
    sortOrder,
    currentPage,
    pageSize,
    totalPages,
    filteredSchemes,
    paginatedSchemes,
    tableData,
    tableColumns,
    toggleSort
  }
}
