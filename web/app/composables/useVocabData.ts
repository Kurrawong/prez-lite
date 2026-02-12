/**
 * Vocabulary data loading utilities
 * Fetches pre-generated JSON from /export/system/
 */

export interface LangMap {
  [lang: string]: string | string[]
}

// New format from system/vocabularies/index.json
export interface ValidationResult {
  severity: 'Violation' | 'Warning' | 'Info'
  message: string
  focusNode?: string
  path?: string
}

export interface ValidationSummary {
  conforms: boolean
  errors: number
  warnings: number
  results?: ValidationResult[]
}

export interface VocabMetadata {
  iri: string
  slug: string
  prefLabel: string
  definition?: string
  conceptCount: number
  topConcepts?: string[]
  modified?: string
  created?: string
  version?: string
  versionIRI?: string
  status?: string
  statusLabel?: string
  publisher?: string[]
  publisherLabels?: string[]
  creator?: string[]
  creatorLabels?: string[]
  themes?: string[]
  themeLabels?: string[]
  formats?: string[]
  validation?: ValidationSummary
}

// Legacy Scheme interface for backwards compatibility
export interface Scheme {
  iri: string
  type: 'ConceptScheme'
  prefLabel: LangMap
  definition?: LangMap
  created?: string
  modified?: string
  creator?: string[]
  publisher?: string[]
  creatorLabels?: (string | null)[]
  publisherLabels?: (string | null)[]
  topConcepts?: string[]
  version?: string
  status?: string
  historyNote?: LangMap
  keywords?: string[]
  conceptCount: number
}

// Concept from per-vocab list.json
export interface ListConcept {
  iri: string
  prefLabel: string
  altLabels?: string[]
  definition?: string
  notation?: string
  broader?: string
  scheme?: string
  schemeLabel?: string
}

// Full concept interface (from annotated JSON-LD parsing)
export interface Concept {
  iri: string
  type: 'Concept'
  prefLabel: LangMap
  altLabel?: LangMap
  definition?: LangMap
  notation?: string
  inScheme: string[]
  topConceptOf?: string[]
  broader?: string[]
  narrower?: string[]
  related?: string[]
  exactMatch?: string[]
  closeMatch?: string[]
  broadMatch?: string[]
  narrowMatch?: string[]
  relatedMatch?: string[]
  historyNote?: LangMap
  scopeNote?: LangMap
  example?: LangMap
  changeNote?: LangMap
  editorialNote?: LangMap
  citation?: string[]
  source?: string[]
  isDefinedBy?: string
}

export interface Collection {
  iri: string
  type: 'Collection'
  prefLabel: LangMap
  definition?: LangMap
  members: string[]
}

export interface SearchEntry {
  iri: string
  prefLabel: string
  altLabels: string[]
  notation: string
  definition?: string
  scheme: string
  schemeLabel: string
  publisher?: string[]
}

export interface LabelsIndex {
  [iri: string]: { [lang: string]: string }
}

export interface SearchFacets {
  schemes: Array<{ iri: string; label: string; count: number }>
  publishers: Array<{ iri: string; label: string; count: number }>
}

// Get best label from language map
export function getLabel(langMap: LangMap | undefined, lang = 'en'): string {
  if (!langMap) return ''
  const keys = Object.keys(langMap)
  const firstKey = keys[0] as string | undefined
  const value = langMap[lang] ?? langMap['none'] ?? (firstKey ? langMap[firstKey] : undefined)
  return Array.isArray(value) ? value[0] : (value ?? '')
}

// Get all labels as array
export function getAllLabels(langMap: LangMap | undefined): { lang: string; value: string }[] {
  if (!langMap) return []
  const result: { lang: string; value: string }[] = []
  for (const [lang, val] of Object.entries(langMap)) {
    const values = Array.isArray(val) ? val : [val]
    for (const v of values) {
      result.push({ lang: lang === 'none' ? '' : lang, value: v })
    }
  }
  return result
}

// Extract local name from IRI
export function getLocalName(iri: string): string {
  const hashIndex = iri.lastIndexOf('#')
  const slashIndex = iri.lastIndexOf('/')
  const index = Math.max(hashIndex, slashIndex)
  return index >= 0 ? iri.substring(index + 1) : iri
}

// Convert vocab metadata to legacy Scheme format for backwards compatibility
function metadataToScheme(meta: VocabMetadata): Scheme {
  return {
    iri: meta.iri,
    type: 'ConceptScheme',
    prefLabel: { en: meta.prefLabel },
    definition: meta.definition ? { en: meta.definition } : undefined,
    created: meta.created,
    modified: meta.modified,
    creator: meta.creator,
    publisher: meta.publisher,
    creatorLabels: meta.creatorLabels,
    publisherLabels: meta.publisherLabels,
    topConcepts: meta.topConcepts,
    version: meta.version,
    status: meta.status,
    conceptCount: meta.conceptCount,
  }
}

// In-memory caches to prevent duplicate HTTP requests across composables
let cachedVocabMetadata: VocabMetadata[] | undefined
let cachedVocabMetadataPromise: Promise<VocabMetadata[]> | undefined
let cachedSchemes: Scheme[] | undefined
let cachedSchemesPromise: Promise<Scheme[]> | undefined
let cachedLabels: LabelsIndex | undefined
let cachedLabelsPromise: Promise<LabelsIndex> | undefined

// Fetch vocabulary metadata (new format) — cached
export async function fetchVocabMetadata(): Promise<VocabMetadata[]> {
  if (cachedVocabMetadata) return cachedVocabMetadata
  if (cachedVocabMetadataPromise) return cachedVocabMetadataPromise

  cachedVocabMetadataPromise = (async () => {
    try {
      const data = await $fetch<{ vocabularies: VocabMetadata[] }>('/export/system/vocabularies/index.json')
      cachedVocabMetadata = Array.isArray(data?.vocabularies) ? data.vocabularies : []
    } catch (err) {
      console.warn('[prez-lite] No vocabulary metadata found at /export/system/vocabularies/index.json')
      cachedVocabMetadata = []
    }
    return cachedVocabMetadata
  })()

  return cachedVocabMetadataPromise
}

// Fetch all schemes (backwards compatible - converts new format to legacy) — cached
export async function fetchSchemes(): Promise<Scheme[]> {
  if (cachedSchemes) return cachedSchemes
  if (cachedSchemesPromise) return cachedSchemesPromise

  cachedSchemesPromise = (async () => {
    const metadata = await fetchVocabMetadata()
    if (metadata.length > 0) {
      cachedSchemes = metadata.map(metadataToScheme)
      return cachedSchemes
    }

    console.warn('[prez-lite] No schemes found.')
    cachedSchemes = []
    return cachedSchemes
  })()

  return cachedSchemesPromise
}

// Per-slug cache for list concepts
const listConceptsCache = new Map<string, ListConcept[]>()
const listConceptsPromiseCache = new Map<string, Promise<ListConcept[]>>()

// Fetch concepts for a scheme from the concepts.json file (minimal list for tree/listing) — cached per slug
export async function fetchListConcepts(slug: string): Promise<ListConcept[]> {
  const cached = listConceptsCache.get(slug)
  if (cached) return cached

  const pending = listConceptsPromiseCache.get(slug)
  if (pending) return pending

  const promise = (async () => {
    let result: ListConcept[]
    try {
      // Try new -concepts.json format first
      const data = await $fetch<{ '@graph': ListConcept[] }>(`/export/vocabs/${slug}/${slug}-concepts.json`)
      result = data?.['@graph'] || []
    } catch {
      // Fall back to legacy -list.json format
      try {
        const data = await $fetch<{ '@graph': ListConcept[] }>(`/export/vocabs/${slug}/${slug}-list.json`)
        result = data?.['@graph'] || []
      } catch {
        result = []
      }
    }
    listConceptsCache.set(slug, result)
    return result
  })()

  listConceptsPromiseCache.set(slug, promise)
  return promise
}

// Fetch concepts for a scheme (backwards compatible)
export async function fetchConcepts(schemeIri: string): Promise<Concept[]> {
  // Try to find the slug from metadata
  const metadata = await fetchVocabMetadata()
  const vocab = metadata.find(v => v.iri === schemeIri)

  if (vocab?.slug) {
    const listConcepts = await fetchListConcepts(vocab.slug)
    // Convert list concepts to full Concept format
    return listConcepts.map(lc => ({
      iri: lc.iri,
      type: 'Concept' as const,
      prefLabel: { en: lc.prefLabel },
      altLabel: lc.altLabels ? { en: lc.altLabels } : undefined,
      definition: lc.definition ? { en: lc.definition } : undefined,
      notation: lc.notation,
      inScheme: lc.scheme ? [lc.scheme] : [schemeIri],
      broader: lc.broader ? [lc.broader] : undefined,
    }))
  }

  return []
}

// Fetch search index (new format from system/search/)
export async function fetchSearchIndex(): Promise<SearchEntry[]> {
  try {
    const data = await $fetch<{ concepts: SearchEntry[] }>('/export/system/search/index.json')
    return data?.concepts || []
  } catch {
    console.warn('[prez-lite] No search index found.')
    return []
  }
}

// Fetch pre-computed search facets
export async function fetchSearchFacets(): Promise<SearchFacets | null> {
  try {
    return await $fetch<SearchFacets>('/export/system/search/facets.json')
  } catch {
    return null
  }
}

// Fetch background labels — cached
export async function fetchLabels(): Promise<LabelsIndex> {
  if (cachedLabels) return cachedLabels
  if (cachedLabelsPromise) return cachedLabelsPromise

  cachedLabelsPromise = (async () => {
    try {
      cachedLabels = await $fetch<LabelsIndex>('/export/system/labels.json')
    } catch {
      cachedLabels = {}
    }
    return cachedLabels
  })()

  return cachedLabelsPromise
}

// Fetch collections
export async function fetchCollections(): Promise<Collection[]> {
  try {
    const data = await $fetch<{ collections: Collection[] }>('/export/system/collections.json')
    return data.collections
  } catch {
    return []
  }
}

// Find a concept by IRI (searches all schemes)
export async function findConcept(iri: string): Promise<Concept | null> {
  const schemes = await fetchSchemes()

  for (const scheme of schemes) {
    try {
      const concepts = await fetchConcepts(scheme.iri)
      const found = concepts.find(c => c.iri === iri)
      if (found) return found
    } catch {
      // Scheme might not have concepts file
    }
  }

  return null
}

// Build concept lookup map
export function buildConceptMap(concepts: Concept[]): Map<string, Concept> {
  return new Map(concepts.map(c => [c.iri, c]))
}

// Get concept label from IRI using map and labels index
export function resolveLabel(
  iri: string,
  conceptMap: Map<string, Concept>,
  labelsIndex: LabelsIndex,
  lang = 'en'
): string {
  // Try concept map first
  const concept = conceptMap.get(iri)
  if (concept) {
    return getLabel(concept.prefLabel, lang)
  }

  // Try labels index
  const labels = labelsIndex[iri]
  if (labels) {
    const labelKeys = Object.keys(labels)
    const firstLabelKey = labelKeys[0] as string | undefined
    return labels[lang] || labels['none'] || (firstLabelKey ? labels[firstLabelKey] : null) || getLocalName(iri)
  }

  // Fallback to local name
  return getLocalName(iri)
}
