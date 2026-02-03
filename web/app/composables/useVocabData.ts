/**
 * Vocabulary data loading utilities
 * Fetches pre-generated JSON from /data/
 */

export interface LangMap {
  [lang: string]: string | string[]
}

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
  scheme: string
  schemeLabel: string
}

export interface LabelsIndex {
  [iri: string]: { [lang: string]: string }
}

// Get best label from language map
export function getLabel(langMap: LangMap | undefined, lang = 'en'): string {
  if (!langMap) return ''
  const value = langMap[lang] ?? langMap['none'] ?? langMap[Object.keys(langMap)[0]]
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

// Convert IRI to URL-safe slug
function iriToSlug(iri: string): string {
  return iri
    .replace(/^https?:\/\//, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .substring(0, 100)
}

// Extract local name from IRI
export function getLocalName(iri: string): string {
  const hashIndex = iri.lastIndexOf('#')
  const slashIndex = iri.lastIndexOf('/')
  const index = Math.max(hashIndex, slashIndex)
  return index >= 0 ? iri.substring(index + 1) : iri
}

// Fetch all schemes (falls back to sample data if org data not found)
export async function fetchSchemes(): Promise<Scheme[]> {
  try {
    const data = await $fetch<{ schemes: Scheme[] }>('/data/schemes.json')
    return Array.isArray(data?.schemes) ? data.schemes : []
  } catch {
    // Fall back to sample data for demo purposes
    try {
      console.info('[prez-lite] No org data found, using sample data. Run build:data to generate your own.')
      const data = await $fetch<{ schemes: Scheme[] }>('/data-sample/schemes.json')
      return Array.isArray(data?.schemes) ? data.schemes : []
    } catch {
      console.warn('[prez-lite] No schemes found. Run build:data to generate.')
      return []
    }
  }
}

// Fetch concepts for a scheme
export async function fetchConcepts(schemeIri: string): Promise<Concept[]> {
  const slug = iriToSlug(schemeIri)
  const response = await $fetch<string>(`/data/concepts/${slug}.ndjson`, {
    responseType: 'text'
  })

  return response
    .split('\n')
    .filter(line => line.trim())
    .map(line => JSON.parse(line) as Concept)
}

// Fetch search index (falls back to sample data if org data not found)
export async function fetchSearchIndex(): Promise<SearchEntry[]> {
  // Handle both array format and { concepts: [...] } format
  const extractEntries = (data: unknown): SearchEntry[] => {
    if (Array.isArray(data)) return data
    if (data && typeof data === 'object' && 'concepts' in data && Array.isArray((data as { concepts: unknown }).concepts)) {
      return (data as { concepts: SearchEntry[] }).concepts
    }
    return []
  }

  try {
    const data = await $fetch<SearchEntry[] | { concepts: SearchEntry[] }>('/data/search-index.json')
    return extractEntries(data)
  } catch {
    // Fall back to sample data
    try {
      const data = await $fetch<SearchEntry[] | { concepts: SearchEntry[] }>('/data-sample/search-index.json')
      return extractEntries(data)
    } catch {
      console.warn('[prez-lite] No search index found. Run build:data to generate.')
      return []
    }
  }
}

// Fetch background labels
export async function fetchLabels(): Promise<LabelsIndex> {
  try {
    return await $fetch<LabelsIndex>('/data/labels.json')
  } catch {
    return {}
  }
}

// Fetch collections
export async function fetchCollections(): Promise<Collection[]> {
  try {
    const data = await $fetch<{ collections: Collection[] }>('/data/collections.json')
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
    return labels[lang] || labels['none'] || labels[Object.keys(labels)[0]] || getLocalName(iri)
  }

  // Fallback to local name
  return getLocalName(iri)
}
