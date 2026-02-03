/**
 * Vocabulary data fetching with caching
 */

export interface VocabConcept {
  iri: string
  label: string
  notation?: string
  definition?: string
  altLabels?: string[]
  broader?: string[]
  narrower?: string[]
}

export interface VocabTreeNode {
  iri: string
  label: string
  notation?: string
  children: VocabTreeNode[]
}

export interface VocabData {
  iri: string
  label: string
  description: string
  concepts: VocabConcept[]
  tree: VocabTreeNode[]
}

// Simple in-memory cache
const cache = new Map<string, { data: VocabData; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

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

  const data = await response.json() as VocabData

  // Validate structure
  if (!data.concepts || !Array.isArray(data.concepts)) {
    throw new Error('Invalid vocabulary format: missing concepts array')
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
