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

  /** Create a pull request */
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

      if (!res.ok) {
        const errBody = await res.text().catch(() => '')
        let msg = `GitHub API error ${res.status}`
        try {
          const parsed = JSON.parse(errBody)
          if (parsed.message) msg = parsed.message
          if (parsed.errors?.length) msg += ': ' + parsed.errors.map((e: any) => e.message).join(', ')
        } catch { /* use raw status */ }
        error.value = msg
        console.error(`[promotion] createPR failed: ${msg}`)
        return null
      }

      const data: GitHubPR = await res.json()
      const pr = toPRInfo(data)

      // Directly set the appropriate PR ref (don't rely on list API indexing delay)
      const ws = workspace.activeWorkspace.value
      const activeBranch = workspace.activeBranch.value
      if (ws && activeBranch && head === activeBranch && base === ws.slug) {
        branchPR.value = pr
      } else if (ws && head === ws.slug && base === ws.refreshFrom) {
        stagingPR.value = pr
      }

      return pr
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to create PR'
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

  /** Merge a pull request. Tries squash, falls back to regular merge. Retries once on 409. */
  async function mergePR(prNumber: number): Promise<boolean> {
    if (!owner || !repo || !token.value) {
      error.value = 'Not authenticated'
      return false
    }

    error.value = null

    try {
      // Pre-check mergeability
      const prDetail = await githubFetch<{ mergeable: boolean | null; mergeable_state: string }>(
        `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`,
      )
      if (prDetail?.mergeable === false) {
        error.value = 'This review has merge conflicts or failing checks. Resolve on GitHub before approving.'
        return false
      }

      const methods = ['squash', 'merge'] as const
      let lastMsg = ''

      for (const method of methods) {
        let res = await tryMerge(prNumber, method)

        // 409 = merge status not yet computed — wait briefly and retry once
        if (res.status === 409) {
          await new Promise(resolve => setTimeout(resolve, 2000))
          res = await tryMerge(prNumber, method)
        }

        if (res.ok) {
          // Fetch the PR to get its merged state
          const merged = await githubFetch<GitHubPR>(
            `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`,
          )
          if (merged) {
            const info = toPRInfo(merged)
            if (branchPR.value?.number === prNumber) branchPR.value = info
            else if (stagingPR.value?.number === prNumber) stagingPR.value = info
          }
          return true
        }

        const errBody = await res.text().catch(() => '')
        try {
          const parsed = JSON.parse(errBody)
          lastMsg = parsed.message ?? `Merge failed (${res.status})`
        } catch {
          lastMsg = `Merge failed (${res.status})`
        }

        // 405 = merge method not allowed — try next method
        if (res.status === 405 && method !== methods[methods.length - 1]) continue
        break
      }

      error.value = lastMsg
      return false
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to merge PR'
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
        error.value = `Failed to close PR (${res.status})`
        return false
      }

      const data: GitHubPR = await res.json()
      const info = toPRInfo(data)
      if (branchPR.value?.number === prNumber) branchPR.value = info
      else if (stagingPR.value?.number === prNumber) stagingPR.value = info

      return true
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to close PR'
      return false
    }
  }

  /** Fetch list of changed vocab files on the workspace branch (for publish popover) */
  async function fetchChangedVocabs(): Promise<{ slug: string; status: string }[]> {
    const ws = workspace.activeWorkspace.value
    if (!ws || !owner || !repo || !token.value) return []

    try {
      const data = await githubFetch<{ files?: Array<{ filename: string; status: string }> }>(
        `https://api.github.com/repos/${owner}/${repo}/compare/${encodeURIComponent(ws.refreshFrom)}...${encodeURIComponent(ws.slug)}`,
      )
      if (!data?.files) return []

      const { githubVocabPath } = useRuntimeConfig().public
      const vocabPrefix = ((githubVocabPath as string) || '').replace(/^\/+|\/+$/g, '')

      return data.files
        .filter(f => f.filename.endsWith('.ttl') && (!vocabPrefix || f.filename.startsWith(vocabPrefix + '/')))
        .map(f => {
          const name = f.filename.split('/').pop() ?? f.filename
          return { slug: name, status: f.status }
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
