/**
 * Vocabulary data fetching with caching
 * Transforms list.json format to VocabData for web components
 */

export interface VocabConcept {
  iri: string
  label: string
  notation?: string
  description?: string
  altLabels?: string[]
  broader?: string[]
  narrower?: string[]
}

export interface VocabTreeNode {
  iri: string
  label: string
  notation?: string
  description?: string
  children: VocabTreeNode[]
}

export interface VocabData {
  iri: string
  label: string
  description: string
  concepts: VocabConcept[]
  tree: VocabTreeNode[]
}

// Raw list.json format from export pipeline
interface ListJsonConcept {
  iri: string
  prefLabel: string
  altLabels?: string[]
  definition?: string
  notation?: string
  broader?: string
  scheme?: string
  schemeLabel?: string
}

interface ListJson {
  '@context'?: Record<string, string>
  '@graph': ListJsonConcept[]
}

// Simple in-memory cache
const cache = new Map<string, { data: VocabData; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

/**
 * Build tree structure from flat concepts list using broader relationships
 */
function buildTree(concepts: VocabConcept[]): VocabTreeNode[] {
  const conceptMap = new Map<string, VocabConcept>()
  const childrenMap = new Map<string, string[]>()

  // Index concepts
  for (const concept of concepts) {
    conceptMap.set(concept.iri, concept)
    if (concept.broader) {
      for (const broaderIri of concept.broader) {
        const children = childrenMap.get(broaderIri) || []
        children.push(concept.iri)
        childrenMap.set(broaderIri, children)
      }
    }
  }

  // Find top concepts (no broader, or broader not in this vocab)
  const topConcepts = concepts.filter(c =>
    !c.broader || c.broader.length === 0 ||
    c.broader.every(b => !conceptMap.has(b))
  )

  // Build tree recursively
  function buildNode(iri: string): VocabTreeNode | null {
    const concept = conceptMap.get(iri)
    if (!concept) return null

    const childIris = childrenMap.get(iri) || []
    const children = childIris
      .map(cIri => buildNode(cIri))
      .filter((n): n is VocabTreeNode => n !== null)
      .sort((a, b) => a.label.localeCompare(b.label))

    return {
      iri: concept.iri,
      label: concept.label,
      notation: concept.notation,
      description: concept.description,
      children
    }
  }

  return topConcepts
    .map(c => buildNode(c.iri))
    .filter((n): n is VocabTreeNode => n !== null)
    .sort((a, b) => a.label.localeCompare(b.label))
}

/**
 * Transform list.json format to VocabData
 */
function transformListJson(data: ListJson, url: string): VocabData {
  const rawConcepts = data['@graph'] || []

  // Get scheme info from first concept
  const firstConcept = rawConcepts[0]
  const schemeIri = firstConcept?.scheme || url
  const schemeLabel = firstConcept?.schemeLabel || 'Vocabulary'

  // Build narrower map
  const narrowerMap = new Map<string, string[]>()
  for (const rc of rawConcepts) {
    if (rc.broader) {
      const narrower = narrowerMap.get(rc.broader) || []
      narrower.push(rc.iri)
      narrowerMap.set(rc.broader, narrower)
    }
  }

  // Transform concepts
  // Map 'definition' from export to 'description' (profile-driven via prez:descriptionSource)
  const concepts: VocabConcept[] = rawConcepts.map(rc => ({
    iri: rc.iri,
    label: rc.prefLabel,
    notation: rc.notation,
    description: rc.definition, // Will be prez:description when export is updated
    altLabels: rc.altLabels,
    broader: rc.broader ? [rc.broader] : undefined,
    narrower: narrowerMap.get(rc.iri)
  }))

  // Build tree
  const tree = buildTree(concepts)

  return {
    iri: schemeIri,
    label: schemeLabel,
    description: '',
    concepts,
    tree
  }
}

export async function fetchVocab(url: string): Promise<VocabData> {
  // Check cache
  const cached = cache.get(url)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data
  }

  // Fetch
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch vocabulary: ${response.status} ${response.statusText}`)
  }

  const rawData = await response.json()

  // Detect format and transform
  let data: VocabData
  if (rawData['@graph']) {
    // New list.json format
    data = transformListJson(rawData as ListJson, url)
  } else if (rawData.concepts && Array.isArray(rawData.concepts)) {
    // Already in VocabData format
    data = rawData as VocabData
  } else {
    throw new Error('Invalid vocabulary format: unrecognized structure')
  }

  // Cache result
  cache.set(url, { data, timestamp: Date.now() })

  return data
}

export function clearCache(url?: string): void {
  if (url) {
    cache.delete(url)
  } else {
    cache.clear()
  }
}
