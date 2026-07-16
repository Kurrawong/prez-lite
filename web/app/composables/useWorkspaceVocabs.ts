/**
 * useWorkspaceVocabs composable
 *
 * Builds the workspace vocabulary list from what actually exists on the work
 * branches, not just the deployed index. The generated index
 * (/export/system/vocabularies/index.json) is only rebuilt when the deploy
 * branch is reprocessed, so on its own it:
 *   - misses vocabs approved into the workspace branch but not yet published
 *     and deployed (invisible, unclickable "ghosts"), and
 *   - still lists vocabs that were removed on the workspace branch.
 *
 * Sources merged, in order:
 *   1. Generated index — full metadata for published + deployed vocabs.
 *   2. Vocab TTLs on the workspace branch (e.g. develop) — vocabs not in the
 *      index get a stub entry parsed from the TTL; index entries whose TTL is
 *      gone from the branch are dropped (removed in staging).
 *   3. Vocab TTLs on this workspace's edit branches (edit/<ws>/<slug>) —
 *      vocabs created but not yet approved into the workspace branch.
 *
 * Stubs are injected into useVocabData's caches (injectVocab) so /scheme can
 * resolve them when the user clicks through.
 */

import { createGithubFetch, type GithubFetchError } from '~/utils/github-fetch'
import { fetchVocabMetadata, injectVocab, type VocabMetadata } from '~/composables/useVocabData'
import { parseVocabTtlMeta } from '~/utils/vocab-ttl-meta'

export interface WorkspaceVocabList {
  vocabs: VocabMetadata[]
  /** Slugs that exist on work branches but not in the published index */
  unpublished: Set<string>
}

/**
 * Pure merge plan: which index entries survive (their TTL is still on the
 * branch), which branch slugs need stubs (not in the index), and which index
 * entries are dropped (TTL removed on the branch).
 */
export function planVocabMerge(
  index: VocabMetadata[],
  branchSlugs: string[],
): { published: VocabMetadata[]; needStubs: string[]; dropped: string[] } {
  const branchSet = new Set(branchSlugs)
  const indexSlugs = new Set(index.map(v => v.slug))
  return {
    published: index.filter(v => branchSet.has(v.slug)),
    needStubs: branchSlugs.filter(s => !indexSlugs.has(s)),
    dropped: index.filter(v => !branchSet.has(v.slug)).map(v => v.slug),
  }
}

/** UTF-8 safe base64 decode (GitHub contents API wraps base64 with newlines). */
function fromBase64(b64: string): string {
  const clean = b64.replace(/\s/g, '')
  if (typeof atob === 'function') {
    return decodeURIComponent(escape(atob(clean)))
  }
  return Buffer.from(clean, 'base64').toString('utf-8')
}

// Stub cache keyed by git blob SHA — content-addressed, so entries never go
// stale and survive across refetches/watch re-triggers.
const stubCache = new Map<string, VocabMetadata>()

export function useWorkspaceVocabs(workspace: ReturnType<typeof useWorkspace>) {
  const { token } = useGitHubAuth()
  const { githubVocabPath } = useRuntimeConfig().public
  const { owner, repo } = workspace

  const lastError = ref<GithubFetchError | null>(null)
  const githubFetch = createGithubFetch(token, 'workspace-vocabs', lastError)

  const vocabPath = ((githubVocabPath as string) || 'data/vocabs').replace(/^\/+|\/+$/g, '')
  const slugOf = (path: string) => (path.split('/').pop() ?? path).replace(/\.ttl$/, '')

  /** Fetch a TTL blob and parse it into a stub VocabMetadata (cached by blob SHA). */
  async function loadStub(path: string, ref: string, blobSha: string | null): Promise<VocabMetadata | null> {
    if (blobSha) {
      const cached = stubCache.get(blobSha)
      if (cached) return cached
    }
    const file = await githubFetch<{ sha: string; content?: string }>(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${encodeURIComponent(ref)}`,
    )
    if (!file?.content) return null
    const meta = parseVocabTtlMeta(fromBase64(file.content))
    if (!meta?.iri) {
      console.warn(`[workspace-vocabs] Could not parse ConceptScheme from ${path}@${ref}`)
      return null
    }
    const slug = slugOf(path)
    const stub: VocabMetadata = {
      iri: meta.iri,
      slug,
      prefLabel: meta.prefLabel || slug,
      definition: meta.definition,
      conceptCount: meta.conceptCount,
    }
    stubCache.set(file.sha, stub)
    return stub
  }

  /**
   * Build the workspace vocab list. Falls back to the plain index when the
   * workspace/GitHub context is unavailable or a call fails.
   */
  async function fetchWorkspaceVocabs(): Promise<WorkspaceVocabList> {
    const index = await fetchVocabMetadata().catch(() => [] as VocabMetadata[])
    const ws = workspace.activeWorkspace.value
    if (!ws || !owner || !repo || !token.value) {
      return { vocabs: index, unpublished: new Set() }
    }

    try {
      // 2. TTLs on the workspace branch
      const tree = await githubFetch<{ tree?: Array<{ path: string; type: string; sha: string }> }>(
        `https://api.github.com/repos/${owner}/${repo}/git/trees/${encodeURIComponent(ws.slug)}?recursive=1`,
      )
      if (!tree?.tree) return { vocabs: index, unpublished: new Set() }

      const branchBlobs = tree.tree.filter(
        t => t.type === 'blob' && t.path.endsWith('.ttl') && t.path.startsWith(`${vocabPath}/`),
      )
      const { published, needStubs } = planVocabMerge(index, branchBlobs.map(t => slugOf(t.path)))

      const unpublished = new Set<string>()
      const stubs: VocabMetadata[] = []
      for (const t of branchBlobs) {
        const slug = slugOf(t.path)
        if (!needStubs.includes(slug)) continue
        const stub = await loadStub(t.path, ws.slug, t.sha)
        if (stub) {
          stubs.push(stub)
          unpublished.add(slug)
        }
      }

      // 3. Vocabs that exist only on an edit branch (created, not yet approved)
      const editPrefix = `edit/${ws.slug}/`
      const seen = new Set([...published, ...stubs].map(v => v.slug))
      for (const b of workspace.branches.value) {
        if (!b.name.startsWith(editPrefix)) continue
        const slug = b.name.slice(editPrefix.length)
        if (!slug || seen.has(slug)) continue
        const stub = await loadStub(`${vocabPath}/${slug}.ttl`, b.name, null)
        if (stub) {
          stubs.push(stub)
          seen.add(slug)
          unpublished.add(slug)
        }
      }

      // Make stubs resolvable by useScheme/useShare when the user clicks through.
      for (const s of stubs) injectVocab(s)

      return { vocabs: [...published, ...stubs], unpublished }
    } catch {
      return { vocabs: index, unpublished: new Set() }
    }
  }

  return {
    fetchWorkspaceVocabs,
    lastError: readonly(lastError),
  }
}
