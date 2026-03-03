/**
 * usePromotion composable
 *
 * Manages PR lifecycle for promoting vocabulary changes through the workflow:
 *   Layer 2: vocab branch → workspace root (e.g. edit/staging/brands → staging)
 *   Layer 3: workspace root → main (e.g. staging → main)
 *
 * Provides: PR detection, creation, comment reading/posting.
 */

import { createGithubFetch } from '~/utils/github-fetch'
import { fetchVocabMetadata } from '~/composables/useVocabData'
import type { SubjectChange } from '~/composables/useEditMode'

// ============================================================================
// Types
// ============================================================================

export interface PRInfo {
  number: number
  title: string
  state: 'open' | 'closed'
  merged: boolean
  url: string
  reviewDecision: 'approved' | 'changes_requested' | 'review_required' | null
  createdAt: string
}

export interface PRComment {
  id: number
  body: string
  user: { login: string; avatarUrl: string }
  createdAt: string
}

interface GitHubPR {
  number: number
  title: string
  state: string
  merged_at: string | null
  html_url: string
  created_at: string
}

interface GitHubComment {
  id: number
  body: string
  user: { login: string; avatar_url: string }
  created_at: string
}

// ============================================================================
// Helpers
// ============================================================================

function toPRInfo(raw: GitHubPR): PRInfo {
  return {
    number: raw.number,
    title: raw.title,
    state: raw.state as 'open' | 'closed',
    merged: !!raw.merged_at,
    url: raw.html_url,
    reviewDecision: null,
    createdAt: raw.created_at,
  }
}

function toPRComment(raw: GitHubComment): PRComment {
  return {
    id: raw.id,
    body: raw.body,
    user: { login: raw.user.login, avatarUrl: raw.user.avatar_url },
    createdAt: raw.created_at,
  }
}

/** Build a Markdown change summary table from SubjectChange[] */
export function buildPRBody(changes: SubjectChange[]): string {
  if (!changes.length) return ''

  const lines = [
    '## Changes',
    '',
    '| Concept | Type | Properties changed |',
    '|---------|------|--------------------|',
  ]

  for (const c of changes) {
    const props = c.propertyChanges.map(p => p.predicateLabel).join(', ')
    lines.push(`| ${c.subjectLabel} | ${c.type} | ${props || '-'} |`)
  }

  return lines.join('\n')
}

// ============================================================================
// Composable
// ============================================================================

export function usePromotion(
  workspace: ReturnType<typeof useWorkspace>,
  vocabLabel: Ref<string>,
) {
  const { token } = useGitHubAuth()
  const { owner, repo } = workspace

  const githubFetch = createGithubFetch(token, 'promotion')

  const branchPR = ref<PRInfo | null>(null)
  const stagingPR = ref<PRInfo | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Throttle: avoid repeated lookups within 30s
  let lastLookup = 0
  const LOOKUP_COOLDOWN = 30_000

  /** Find existing open PRs for both promotion layers */
  async function findExistingPRs(force = false) {
    if (!owner || !repo || !token.value) return
    const now = Date.now()
    if (!force && now - lastLookup < LOOKUP_COOLDOWN) return
    lastLookup = now

    loading.value = true
    error.value = null

    try {
      const ws = workspace.activeWorkspace.value
      const branch = workspace.activeBranch.value

      // Layer 2: vocab branch → workspace root
      if (ws && branch && branch !== ws.slug) {
        const data = await githubFetch<GitHubPR[]>(
          `https://api.github.com/repos/${owner}/${repo}/pulls?state=open&head=${owner}:${branch}&base=${ws.slug}`,
        )
        branchPR.value = data?.length ? toPRInfo(data[0]!) : null
      } else {
        branchPR.value = null
      }

      // Layer 3: workspace root → refreshFrom (e.g. staging → main)
      if (ws) {
        const data = await githubFetch<GitHubPR[]>(
          `https://api.github.com/repos/${owner}/${repo}/pulls?state=open&head=${owner}:${ws.slug}&base=${ws.refreshFrom}`,
        )
        stagingPR.value = data?.length ? toPRInfo(data[0]!) : null
      } else {
        stagingPR.value = null
      }
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to check PRs'
    } finally {
      loading.value = false
    }
  }

  /** Find an existing open PR for the given head → base */
  async function findExistingPR(head: string, base: string): Promise<PRInfo | null> {
    const data = await githubFetch<GitHubPR[]>(
      `https://api.github.com/repos/${owner}/${repo}/pulls?state=open&head=${owner}:${head}&base=${base}`,
    )
    return data?.length ? toPRInfo(data[0]!) : null
  }

  /** Update the appropriate PR ref based on head/base */
  function setPRRef(head: string, base: string, pr: PRInfo) {
    const ws = workspace.activeWorkspace.value
    const activeBranch = workspace.activeBranch.value
    if (ws && activeBranch && head === activeBranch && base === ws.slug) {
      branchPR.value = pr
    } else if (ws && head === ws.slug && base === ws.refreshFrom) {
      stagingPR.value = pr
    }
  }

  /**
   * Create a pull request.
   * - If a PR already exists for this head → base, returns the existing one
   * - Handles network errors gracefully
   */
  async function createPR(
    head: string,
    base: string,
    title: string,
    body: string,
  ): Promise<PRInfo | null> {
    if (!owner || !repo || !token.value) {
      error.value = 'Not authenticated'
      return null
    }

    error.value = null

    try {
      const res = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/pulls`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token.value}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ title, body, head, base }),
        },
      )

      if (res.ok) {
        const data: GitHubPR = await res.json()
        const pr = toPRInfo(data)
        setPRRef(head, base, pr)
        return pr
      }

      // Parse error
      const errBody = await res.text().catch(() => '')
      let msg = `Failed to submit (${res.status})`
      try {
        const parsed = JSON.parse(errBody)
        if (parsed.message) msg = parsed.message
        if (parsed.errors?.length) msg += ': ' + parsed.errors.map((e: any) => e.message).join(', ')
      } catch { /* use raw status */ }

      // 422 with "already exists" — find and return the existing PR
      if (res.status === 422 && msg.toLowerCase().includes('already')) {
        const existing = await findExistingPR(head, base)
        if (existing) {
          setPRRef(head, base, existing)
          return existing
        }
      }

      error.value = msg
      console.error(`[promotion] createPR failed: ${msg}`)
      return null
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Something went wrong. Please try again.'
      return null
    }
  }

  /** Get comments on a PR (uses issues API for full comment thread) */
  async function getPRComments(prNumber: number): Promise<PRComment[]> {
    if (!owner || !repo || !token.value) return []

    const data = await githubFetch<GitHubComment[]>(
      `https://api.github.com/repos/${owner}/${repo}/issues/${prNumber}/comments`,
    )

    return data?.map(toPRComment) ?? []
  }

  /** Post a comment on a PR */
  async function addPRComment(prNumber: number, body: string): Promise<boolean> {
    if (!owner || !repo || !token.value || !body.trim()) return false

    const data = await githubFetch<GitHubComment>(
      `https://api.github.com/repos/${owner}/${repo}/issues/${prNumber}/comments`,
      {
        method: 'POST',
        body: JSON.stringify({ body }),
      },
    )

    return data !== null
  }

  /** Attempt a merge API call with a given method. Returns response. */
  async function tryMerge(prNumber: number, method: 'squash' | 'merge'): Promise<Response> {
    return fetch(
      `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/merge`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token.value}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ merge_method: method }),
      },
    )
  }

  /** Update local PR refs after a successful merge */
  function updatePRRef(prNumber: number, info: PRInfo) {
    if (branchPR.value?.number === prNumber) branchPR.value = info
    else if (stagingPR.value?.number === prNumber) stagingPR.value = info
  }

  /** Check if a PR is already merged (handles race conditions) */
  async function checkAlreadyMerged(prNumber: number): Promise<boolean> {
    const detail = await githubFetch<GitHubPR>(
      `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`,
    )
    if (detail?.merged_at) {
      updatePRRef(prNumber, toPRInfo(detail))
      return true
    }
    return false
  }

  /**
   * Merge a pull request.
   * - Pre-checks mergeability and detects already-merged PRs
   * - Tries squash first, falls back to regular merge
   * - Retries 409 (merge in progress) up to 3 times with exponential backoff
   * - Handles network errors gracefully
   */
  async function mergePR(prNumber: number): Promise<boolean> {
    if (!owner || !repo || !token.value) {
      error.value = 'Not authenticated'
      return false
    }

    error.value = null

    try {
      // Pre-check: is it already merged? (race condition with another user/tab)
      const prDetail = await githubFetch<GitHubPR & { mergeable: boolean | null }>(
        `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`,
      )

      if (prDetail?.merged_at) {
        // Already merged — treat as success
        updatePRRef(prNumber, toPRInfo(prDetail))
        return true
      }

      if (prDetail?.mergeable === false) {
        error.value = 'Conflicts need to be resolved before this can be approved.'
        return false
      }

      const methods = ['squash', 'merge'] as const
      const MAX_RETRIES = 3
      let lastMsg = ''

      for (const method of methods) {
        let res: Response | null = null

        // Retry loop for 409 (merge in progress / status not computed)
        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
          try {
            res = await tryMerge(prNumber, method)
          } catch {
            // Network error — retry if we have attempts left
            if (attempt < MAX_RETRIES) {
              await new Promise(resolve => setTimeout(resolve, 2000 * (attempt + 1)))
              continue
            }
            error.value = 'Network error. Please check your connection and try again.'
            return false
          }

          if (res.ok) {
            const merged = await githubFetch<GitHubPR>(
              `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`,
            )
            if (merged) updatePRRef(prNumber, toPRInfo(merged))
            return true
          }

          // 409 = merge status not yet computed or merge in progress
          if (res.status === 409 && attempt < MAX_RETRIES) {
            await new Promise(resolve => setTimeout(resolve, 2000 * (attempt + 1)))
            continue
          }

          break
        }

        if (!res) {
          error.value = 'Failed to connect. Please try again.'
          return false
        }

        // Parse error response
        const errBody = await res.text().catch(() => '')
        try {
          const parsed = JSON.parse(errBody)
          lastMsg = parsed.message ?? `Failed (${res.status})`
        } catch {
          lastMsg = `Failed (${res.status})`
        }

        // 409 after all retries — check if it actually merged
        if (res.status === 409) {
          if (await checkAlreadyMerged(prNumber)) return true
          error.value = 'Merge is taking longer than expected. Please wait a moment and try again.'
          return false
        }

        // 405 = merge method not allowed — try next method
        if (res.status === 405 && method !== methods[methods.length - 1]) continue

        // 422 with "already merged" — success
        if (res.status === 422 && lastMsg.toLowerCase().includes('already')) {
          if (await checkAlreadyMerged(prNumber)) return true
        }

        break
      }

      error.value = lastMsg
      return false
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Something went wrong. Please try again.'
      return false
    }
  }

  /** Close a pull request (for reject). Optionally posts a comment first. */
  async function closePR(prNumber: number, comment?: string): Promise<boolean> {
    if (!owner || !repo || !token.value) {
      error.value = 'Not authenticated'
      return false
    }

    error.value = null

    try {
      if (comment) {
        await addPRComment(prNumber, comment)
      }

      const res = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token.value}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ state: 'closed' }),
        },
      )

      if (!res.ok) {
        error.value = `Failed to reject (${res.status}). Please try again.`
        return false
      }

      const data: GitHubPR = await res.json()
      updatePRRef(prNumber, toPRInfo(data))

      return true
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Something went wrong. Please try again.'
      return false
    }
  }

  /** Fetch list of changed vocab files on the workspace branch (for publish popover) */
  async function fetchChangedVocabs(): Promise<{ slug: string; label: string; status: string }[]> {
    const ws = workspace.activeWorkspace.value
    if (!ws || !owner || !repo || !token.value) return []

    try {
      const [compareData, metadata] = await Promise.all([
        githubFetch<{ files?: Array<{ filename: string; status: string }> }>(
          `https://api.github.com/repos/${owner}/${repo}/compare/${encodeURIComponent(ws.refreshFrom)}...${encodeURIComponent(ws.slug)}`,
        ),
        fetchVocabMetadata().catch(() => []),
      ])
      if (!compareData?.files) return []

      const { githubVocabPath } = useRuntimeConfig().public
      const vocabPrefix = ((githubVocabPath as string) || '').replace(/^\/+|\/+$/g, '')

      // Build slug → label lookup from vocab metadata
      const labelMap = new Map(metadata.map(v => [v.slug, v.prefLabel]))

      return compareData.files
        .filter(f => f.filename.endsWith('.ttl') && (!vocabPrefix || f.filename.startsWith(vocabPrefix + '/')))
        .map(f => {
          const filename = f.filename.split('/').pop() ?? f.filename
          const slug = filename.replace(/\.ttl$/, '')
          return { slug, label: labelMap.get(slug) ?? slug, status: f.status }
        })
    } catch {
      return []
    }
  }

  /** Generate a default review title for a given layer */
  function generateTitle(layer: 'pending' | 'approved'): string {
    const ws = workspace.activeWorkspace.value
    if (!ws) return 'review: changes'

    if (layer === 'pending') {
      return `review: ${vocabLabel.value} — submit for approval`
    }
    return `review: ${ws.slug} — submit for publishing`
  }

  /** Get head and base branch names for a given layer */
  function getBranches(layer: 'pending' | 'approved'): { head: string; base: string } | null {
    const ws = workspace.activeWorkspace.value
    if (!ws) return null

    if (layer === 'pending') {
      const branch = workspace.activeBranch.value
      if (!branch || branch === ws.slug) return null
      return { head: branch, base: ws.slug }
    }
    return { head: ws.slug, base: ws.refreshFrom }
  }

  // Auto-refresh when workspace context changes
  watch(
    [
      () => workspace.activeWorkspace.value,
      () => workspace.activeBranch.value,
      token,
    ],
    ([ws, branch, tok]) => {
      if (ws && tok) {
        findExistingPRs()
      }
    },
    { immediate: true },
  )

  return {
    branchPR: readonly(branchPR),
    stagingPR: readonly(stagingPR),
    loading: readonly(loading),
    error: readonly(error),
    findExistingPRs,
    createPR,
    mergePR,
    closePR,
    getPRComments,
    addPRComment,
    generateTitle,
    getBranches,
    fetchChangedVocabs,
  }
}
