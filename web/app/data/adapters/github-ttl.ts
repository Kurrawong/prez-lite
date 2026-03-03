/**
 * GitHub TTL adapter
 *
 * Fetches TTL files from a GitHub repository via the Contents API,
 * parses them with N3.js, and enriches using profile-driven property extraction.
 * Used when a user is authenticated and has selected a workspace (branch).
 */

import { Store, Parser, type Quad } from 'n3'
import type { VocabSourceAdapter } from '~/data/types'
import type { NormalizedScheme, NormalizedListConcept, NormalizedConcept } from '~/types/vocab-data'
import type { LabelsIndex } from '~/composables/useVocabData'
import { extractConceptSummaries, extractNormalizedConcepts } from '~/data/enrichment/extract-concepts'
import { getPropertiesForSubject, type ProfileConfig } from '~/data/enrichment/profile-properties'

const SKOS = 'http://www.w3.org/2004/02/skos/core#'
const RDF = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#'

export interface GitHubTTLAdapterOptions {
  owner: string
  repo: string
  branch: string
  vocabPath: string
  token: string
  /** Branch to fall back to if primary branch doesn't exist (e.g. 'main') */
  fallbackBranch?: string
}

interface GitHubFileResponse {
  content: string
  sha: string
  name: string
}

function decodeBase64(encoded: string): string {
  return new TextDecoder().decode(
    Uint8Array.from(atob(encoded.replace(/\n/g, '')), c => c.charCodeAt(0)),
  )
}

export function createGitHubTTLAdapter(options: GitHubTTLAdapterOptions): VocabSourceAdapter {
  const { owner, repo, branch, vocabPath, token, fallbackBranch } = options
  const basePath = vocabPath.replace(/^\/+|\/+$/g, '')

  // Cache parsed stores per slug to avoid re-fetching within a session
  const storeCache = new Map<string, { store: Store; sha: string; ttl: string }>()
  let profileConfig: ProfileConfig | null = null

  async function fetchFile(path: string): Promise<GitHubFileResponse | null> {
    try {
      const res = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,
        { headers: { Authorization: `Bearer ${token}` } },
      )
      if (res.ok) return await res.json()

      // If primary branch 404s and we have a fallback, try that
      if (res.status === 404 && fallbackBranch && fallbackBranch !== branch) {
        const fallbackRes = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${fallbackBranch}`,
          { headers: { Authorization: `Bearer ${token}` } },
        )
        if (fallbackRes.ok) return await fallbackRes.json()
      }

      return null
    } catch {
      return null
    }
  }

  async function fetchAndParseVocab(slug: string): Promise<{ store: Store; sha: string; ttl: string } | null> {
    const cached = storeCache.get(slug)
    if (cached) return cached

    const path = basePath ? `${basePath}/${slug}.ttl` : `${slug}.ttl`
    const file = await fetchFile(path)
    if (!file) return null

    const ttl = decodeBase64(file.content)
    const parser = new Parser({ format: 'Turtle' })
    const store = new Store()
    store.addQuads(parser.parse(ttl))

    const entry = { store, sha: file.sha, ttl }
    storeCache.set(slug, entry)
    return entry
  }

  async function loadProfileConfig(): Promise<ProfileConfig | null> {
    if (profileConfig) return profileConfig
    try {
      const resp = await fetch('/export/system/profile.json')
      if (resp.ok) {
        profileConfig = await resp.json()
      }
    } catch {
      // Non-fatal
    }
    return profileConfig
  }

  function extractSchemeIri(store: Store): string | null {
    const quads = store.getQuads(null, `${RDF}type`, `${SKOS}ConceptScheme`, null) as Quad[]
    return quads.length > 0 ? quads[0]!.subject.value : null
  }

  return {
    key: `github:${branch}`,

    async loadScheme(slug: string): Promise<NormalizedScheme | null> {
      const result = await fetchAndParseVocab(slug)
      if (!result) return null

      const schemeIri = extractSchemeIri(result.store)
      if (!schemeIri) return null

      const profile = await loadProfileConfig()
      const properties = getPropertiesForSubject(result.store, schemeIri, 'conceptScheme', profile, true)

      // Extract basic metadata from store
      const labelQuads = result.store.getQuads(schemeIri, `${SKOS}prefLabel`, null, null) as Quad[]
      const prefLabel = labelQuads.length > 0 ? labelQuads[0]!.object.value : slug

      const defQuads = result.store.getQuads(schemeIri, `${SKOS}definition`, null, null) as Quad[]
      const definition = defQuads.length > 0 ? defQuads[0]!.object.value : undefined

      const concepts = extractConceptSummaries(result.store)

      return {
        iri: schemeIri,
        prefLabel,
        definition,
        conceptCount: concepts.length,
        properties: properties.map(p => ({
          predicate: p.predicate,
          predicateLabel: p.label,
          predicateDescription: p.description,
          order: p.order,
          values: p.values.map(v => ({
            type: v.type,
            value: v.value,
            language: v.language,
            datatype: v.datatype,
          })),
        })),
      }
    },

    async loadConceptList(slug: string): Promise<NormalizedListConcept[]> {
      const result = await fetchAndParseVocab(slug)
      if (!result) return []
      return extractNormalizedConcepts(result.store)
    },

    async loadConcept(slug: string, conceptIri: string): Promise<NormalizedConcept | null> {
      const result = await fetchAndParseVocab(slug)
      if (!result) return null

      // Check concept exists
      const typeQuads = result.store.getQuads(conceptIri, `${RDF}type`, `${SKOS}Concept`, null) as Quad[]
      if (typeQuads.length === 0) return null

      const profile = await loadProfileConfig()
      const properties = getPropertiesForSubject(result.store, conceptIri, 'concept', profile, true)

      const labelQuads = result.store.getQuads(conceptIri, `${SKOS}prefLabel`, null, null) as Quad[]
      const prefLabel = labelQuads.length > 0 ? labelQuads[0]!.object.value : conceptIri

      return {
        iri: conceptIri,
        prefLabel,
        properties: properties.map(p => ({
          predicate: p.predicate,
          predicateLabel: p.label,
          predicateDescription: p.description,
          order: p.order,
          values: p.values.map(v => ({
            type: v.type,
            value: v.value,
            language: v.language,
            datatype: v.datatype,
          })),
        })),
      }
    },

    async loadLabels(): Promise<LabelsIndex> {
      // For now, fall back to static labels. In the future, labels could be
      // extracted from background TTL files on the branch.
      try {
        const resp = await fetch('/export/system/labels.json')
        if (resp.ok) return await resp.json()
      } catch {
        // Non-fatal
      }
      return {}
    },

    async checkFreshness(slug: string): Promise<boolean> {
      const cached = storeCache.get(slug)
      if (!cached) return false

      const path = basePath ? `${basePath}/${slug}.ttl` : `${slug}.ttl`
      try {
        const res = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'If-None-Match': `"${cached.sha}"`,
            },
          },
        )
        // 304 = not modified (cache is fresh)
        if (res.status === 304) return true
        // 200 = modified (cache is stale)
        if (res.ok) {
          // Update cache with new content
          const data = await res.json()
          const ttl = decodeBase64(data.content)
          const parser = new Parser({ format: 'Turtle' })
          const store = new Store()
          store.addQuads(parser.parse(ttl))
          storeCache.set(slug, { store, sha: data.sha, ttl })
          return false
        }
        return false
      } catch {
        return false
      }
    },
  }
}

/**
 * Get the raw TTL content for a vocab from the adapter's cache.
 * Used to pass pre-fetched content to enterEditMode().
 */
export function getCachedTTL(adapter: VocabSourceAdapter, slug: string): string | null {
  // Access internal cache — only works with github-ttl adapter
  if ('_getStoreCache' in adapter) {
    return (adapter as any)._getStoreCache(slug)?.ttl ?? null
  }
  return null
}
