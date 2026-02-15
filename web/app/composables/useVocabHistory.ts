/**
 * Vocab history composable
 *
 * Fetches commit history for a vocab file via the GitHub API,
 * computes diffs between versions, and retrieves historical content.
 */

import { Store, Parser, type Quad } from 'n3'
import { getPredicateLabel } from '~/utils/vocab-labels'
import { buildChangeSummary } from '~/utils/ttl-patch'
import type { ChangeSummary } from '~/composables/useEditMode'

// ============================================================================
// Types
// ============================================================================

export interface HistoryCommit {
  sha: string
  message: string
  author: { login: string; avatar: string }
  date: string
}

export interface HistoryDiff {
  changeSummary: ChangeSummary
  olderTTL: string
  newerTTL: string
}

// ============================================================================
// Composable
// ============================================================================

export function useVocabHistory(
  owner: string,
  repo: string,
  path: Ref<string>,
  branch: string,
) {
  const { token } = useGitHubAuth()

  const commits = ref<HistoryCommit[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  /** Fetch commit history for the vocab file */
  async function fetchCommits(perPage = 20): Promise<void> {
    if (!token.value) {
      error.value = 'Not authenticated'
      return
    }

    loading.value = true
    error.value = null

    try {
      const cleanPath = path.value.replace(/^\/+/, '')
      const res = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/commits?path=${encodeURIComponent(cleanPath)}&sha=${branch}&per_page=${perPage}`,
        { headers: { Authorization: `Bearer ${token.value}` } },
      )

      if (!res.ok) {
        error.value = `Failed to fetch history: ${res.status}`
        return
      }

      const data = await res.json()
      commits.value = data.map((c: any) => ({
        sha: c.sha,
        message: c.commit.message,
        author: {
          login: c.author?.login ?? c.commit.author?.name ?? 'unknown',
          avatar: c.author?.avatar_url ?? '',
        },
        date: c.commit.author?.date ?? '',
      }))
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch history'
    } finally {
      loading.value = false
    }
  }

  /** Fetch file content at a specific SHA */
  async function fetchVersionContent(sha: string): Promise<string> {
    if (!token.value) throw new Error('Not authenticated')

    const cleanPath = path.value.replace(/^\/+/, '')
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${cleanPath}?ref=${sha}`,
      { headers: { Authorization: `Bearer ${token.value}` } },
    )

    if (!res.ok) throw new Error(`Failed to fetch version: ${res.status}`)

    const data = await res.json()
    return decodeBase64(data.content)
  }

  /** Compute diff between two commits */
  async function fetchDiff(olderSha: string, newerSha: string): Promise<HistoryDiff> {
    const [olderTTL, newerTTL] = await Promise.all([
      fetchVersionContent(olderSha),
      fetchVersionContent(newerSha),
    ])

    const parser = new Parser({ format: 'Turtle' })

    const olderStore = new Store()
    olderStore.addQuads(parser.parse(olderTTL))

    const newerParser = new Parser({ format: 'Turtle' })
    const newerStore = new Store()
    newerStore.addQuads(newerParser.parse(newerTTL))

    // Use the newer store's prefLabels for label resolution
    const SKOS_PREF_LABEL = 'http://www.w3.org/2004/02/skos/core#prefLabel'
    const labelResolver = (iri: string): string => {
      const quads = newerStore.getQuads(iri, SKOS_PREF_LABEL, null, null) as Quad[]
      if (quads.length > 0) return quads[0]!.object.value
      // Try older store
      const oldQuads = olderStore.getQuads(iri, SKOS_PREF_LABEL, null, null) as Quad[]
      if (oldQuads.length > 0) return oldQuads[0]!.object.value
      // Fallback: local name
      const hashIdx = iri.lastIndexOf('#')
      const slashIdx = iri.lastIndexOf('/')
      return iri.substring(Math.max(hashIdx, slashIdx) + 1)
    }

    const changeSummary = buildChangeSummary(olderStore, newerStore, labelResolver, getPredicateLabel)

    return { changeSummary, olderTTL, newerTTL }
  }

  return { commits, loading, error, fetchCommits, fetchDiff, fetchVersionContent }
}

/** Decode base64-encoded content (GitHub returns base64 with newlines) */
function decodeBase64(encoded: string): string {
  return new TextDecoder().decode(
    Uint8Array.from(atob(encoded.replace(/\n/g, '')), (c) => c.charCodeAt(0)),
  )
}
