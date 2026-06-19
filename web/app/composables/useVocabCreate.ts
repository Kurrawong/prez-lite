/**
 * useVocabCreate composable
 *
 * Creates a brand-new vocabulary (SKOS ConceptScheme) from the UI. The editor
 * itself only edits existing vocabularies, so this scaffolds a minimal
 * ConceptScheme TTL file on the workspace's edit branch and makes it visible to
 * the editor immediately (before CI reprocesses the generated index.json).
 *
 * Flow:
 *   1. selectVocab(slug) + ensureEditBranch()  → edit/<workspace>/<slug>
 *   2. PUT data/vocabs/<slug>.ttl (file creation) to the edit branch
 *   3. injectVocab() + refreshNuxtData() so useScheme / useShare resolve it
 *   4. caller navigates to /scheme?uri=<iri> to add concepts via the normal flow
 */

import { createGithubFetch, type GithubFetchError } from '~/utils/github-fetch'
import { injectVocab, fetchVocabMetadata } from '~/composables/useVocabData'

const SKOS = 'http://www.w3.org/2004/02/skos/core#'

/** Derive a filename-safe slug from a free-text title (preserves casing). */
export function slugify(title: string): string {
  const s = (title || '')
    .trim()
    .replace(/[^A-Za-z0-9 _-]/g, '') // drop characters unsafe in a filename / IRI segment
    .replace(/\s+/g, '') // join words, keeping existing capitalisation
    .slice(0, 80)
  return s || 'vocabulary'
}

/**
 * Derive the IRI base (everything up to and including the final slash) from the
 * existing vocabularies, picking the most common base so a new vocab's IRI
 * matches the site's convention (e.g. https://pid.geoscience.gov.au/def/voc/ga/).
 * Returns '' when there are no existing vocabs to learn from.
 */
export function deriveIriBase(iris: string[]): string {
  const counts = new Map<string, number>()
  for (const iri of iris) {
    const base = iri.replace(/\/+$/, '').replace(/[^/]+$/, '')
    if (base && base !== iri.replace(/\/+$/, '')) {
      counts.set(base, (counts.get(base) ?? 0) + 1)
    }
  }
  let best = ''
  let bestN = 0
  for (const [base, n] of counts) {
    if (n > bestN) {
      best = base
      bestN = n
    }
  }
  return best
}

/** Escape a string for safe inclusion in a TTL double-quoted literal. */
export function escapeTtlLiteral(s: string): string {
  return (s || '')
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\r/g, '')
    .replace(/\n/g, '\\n')
}

/**
 * Build a minimal valid ConceptScheme TTL. `:` is the concept namespace
 * (trailing slash) and `cs:` is the scheme IRI itself, matching the convention
 * the editor and existing vocab files use.
 */
export function scaffoldSchemeTTL(iri: string, title: string, definition: string): string {
  const t = escapeTtlLiteral(title)
  const d = escapeTtlLiteral(definition)
  return `PREFIX : <${iri}/>
PREFIX cs: <${iri}>
PREFIX skos: <${SKOS}>
PREFIX dcterms: <http://purl.org/dc/terms/>
PREFIX schema: <https://schema.org/>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

cs:
    a skos:ConceptScheme ;
    skos:prefLabel "${t}"@en ;
    skos:definition "${d}"@en ;
.
`
}

/** UTF-8 safe base64 (browser btoa mangles multi-byte chars on its own). */
function toBase64(str: string): string {
  if (typeof btoa === 'function') {
    return btoa(unescape(encodeURIComponent(str)))
  }
  // Test / SSR fallback
  return Buffer.from(str, 'utf-8').toString('base64')
}

export interface CreateVocabInput {
  title: string
  definition: string
  slug: string
  iri: string
}

export interface CreateVocabResult {
  ok: boolean
  iri?: string
  slug?: string
  error?: string
}

export function useVocabCreate() {
  const workspace = useWorkspace()
  const { token } = useGitHubAuth()
  const { githubVocabPath } = useRuntimeConfig().public
  const { owner, repo } = workspace

  const lastError = ref<GithubFetchError | null>(null)
  const githubFetch = createGithubFetch(token, 'vocab-create', lastError)

  const creating = ref(false)
  const error = ref<string | null>(null)

  const vocabPath = ((githubVocabPath as string) || 'data/vocabs').replace(/^\/+|\/+$/g, '')

  /** Suggest a default IRI base learned from the existing vocabularies. */
  async function suggestIriBase(): Promise<string> {
    const metadata = await fetchVocabMetadata().catch(() => [])
    return deriveIriBase(metadata.map(v => v.iri))
  }

  async function createVocabulary(input: CreateVocabInput): Promise<CreateVocabResult> {
    error.value = null
    const title = input.title.trim()
    const definition = input.definition.trim()
    const slug = (input.slug || '').trim()
    const iri = (input.iri || '').trim()

    if (!owner || !repo || !token.value) {
      error.value = 'Not authenticated'
      return { ok: false, error: error.value }
    }
    if (!title) { error.value = 'Title is required'; return { ok: false, error: error.value } }
    if (!definition) { error.value = 'Description is required'; return { ok: false, error: error.value } }
    if (!slug) { error.value = 'Identifier is required'; return { ok: false, error: error.value } }
    if (!/^[A-Za-z0-9_-]+$/.test(slug)) {
      error.value = 'Identifier may only contain letters, numbers, hyphens and underscores'
      return { ok: false, error: error.value }
    }
    if (!/^https?:\/\/.+/.test(iri)) { error.value = 'IRI must be an absolute http(s) URL'; return { ok: false, error: error.value } }

    creating.value = true
    try {
      // Collision check against known vocabs (by IRI and slug).
      const existing = await fetchVocabMetadata().catch(() => [])
      if (existing.some(v => v.iri === iri)) {
        error.value = `A vocabulary with IRI ${iri} already exists`
        return { ok: false, error: error.value }
      }
      if (existing.some(v => v.slug === slug)) {
        error.value = `A vocabulary with identifier "${slug}" already exists`
        return { ok: false, error: error.value }
      }

      // 1. Set the workspace vocab context (derives the edit branch name).
      await workspace.selectVocab(slug)
      const branch = workspace.activeBranch.value
      if (!branch) { error.value = 'No active workspace'; return { ok: false, error: error.value } }

      // 2. Ensure the edit branch exists (creates edit/<workspace>/<slug>).
      const branchOk = await workspace.ensureEditBranch()
      if (!branchOk) {
        error.value = lastError.value?.githubMessage ?? 'Failed to create edit branch'
        return { ok: false, error: error.value }
      }

      // 3. Create the scaffold TTL file on the edit branch (no sha = create).
      const ttl = scaffoldSchemeTTL(iri, title, definition)
      const path = `${vocabPath}/${slug}.ttl`
      const res = await githubFetch<{ content: { sha: string } }>(
        `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
        {
          method: 'PUT',
          body: JSON.stringify({
            message: `feat: create vocabulary "${title}"`,
            content: toBase64(ttl),
            branch,
          }),
        },
      )
      if (!res) {
        error.value = lastError.value?.githubMessage ?? lastError.value?.message ?? 'Failed to create vocabulary file'
        return { ok: false, error: error.value }
      }

      // 4. Make the new vocab visible to the editor before CI reprocessing.
      injectVocab({ iri, slug, prefLabel: title, definition, conceptCount: 0 })
      await refreshNuxtData(['schemes', 'vocabMetadata', 'export-vocabs'])

      return { ok: true, iri, slug }
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Something went wrong creating the vocabulary'
      return { ok: false, error: error.value }
    } finally {
      creating.value = false
    }
  }

  return {
    creating: readonly(creating),
    error: readonly(error),
    suggestIriBase,
    createVocabulary,
  }
}
