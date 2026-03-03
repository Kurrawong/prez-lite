/**
 * Workspace composable
 *
 * Manages structured workspace state for vocabulary editing.
 * Workspaces (staging, dev, sandbox) are loaded from config.
 * Per-vocab branches follow the pattern `<workspace>/<vocab-slug>`.
 * State is stored in localStorage (persists across login redirects and page refreshes).
 */

import { createGithubFetch } from '~/utils/github-fetch'

export interface WorkspaceDefinition {
  slug: string
  label: string
  description: string
  icon?: string
  refreshFrom: string
}

export interface WorkspaceState {
  workspaceSlug: string
  vocabSlug: string | null
}

export interface BranchComparison {
  ahead: number
  behind: number
}

const WORKSPACE_KEY = 'prez_workspace'

export function useWorkspace() {
  const { githubRepo } = useRuntimeConfig().public
  const { token, user, isAuthenticated } = useGitHubAuth()

  const [owner, repo] = (githubRepo as string || '').split('/')

  // Workspace definitions loaded from config
  const definitions = useState<WorkspaceDefinition[]>('workspace_definitions', () => [])
  const definitionsLoaded = useState<boolean>('workspace_definitions_loaded', () => false)

  // Reactive workspace state (localStorage-backed).
  // useState initializer runs on the server (no localStorage), so we hydrate on the client.
  const state = useState<WorkspaceState | null>('workspace_state', () => null)

  // Hydrate from localStorage on client (runs synchronously during composable setup)
  if (import.meta.client && !state.value) {
    const raw = localStorage.getItem(WORKSPACE_KEY)
    if (raw) {
      try {
        const parsed = JSON.parse(raw)
        if (parsed && typeof parsed.workspaceSlug === 'string') {
          state.value = parsed as WorkspaceState
        }
      } catch {
        // Old format or invalid JSON — start fresh
      }
    }
  }

  const branches = ref<Array<{ name: string; sha: string }>>([])
  const comparisons = ref<Map<string, BranchComparison>>(new Map())
  const branchesLoading = ref(false)
  const branchesError = ref<string | null>(null)

  // Branch prefix — separates work branches from collection branches
  // so `staging` (collection) and `edit/staging/vocab` (work) can coexist
  const BRANCH_PREFIX = 'edit'

  // Derived state
  /** Edit branch name (e.g. edit/staging/brands) — used for saving */
  const activeBranch = computed(() => {
    if (!state.value) return null
    const { workspaceSlug, vocabSlug } = state.value
    return vocabSlug ? `${BRANCH_PREFIX}/${workspaceSlug}/${vocabSlug}` : workspaceSlug
  })

  /** Workspace branch name (e.g. staging) — used for browsing/reading */
  const activeReadBranch = computed(() => {
    if (!state.value) return null
    return state.value.workspaceSlug
  })

  const hasWorkspace = computed(() => !!state.value)
  const isEnabled = computed(() => !!owner && !!repo && isAuthenticated.value)

  const activeWorkspace = computed<WorkspaceDefinition | null>(() => {
    if (!state.value) return null
    return definitions.value.find(d => d.slug === state.value!.workspaceSlug) ?? null
  })

  const activeVocabSlug = computed(() => state.value?.vocabSlug ?? null)

  const workspaceLabel = computed(() => {
    if (!state.value) return null
    const ws = activeWorkspace.value
    const wsName = ws?.label ?? state.value.workspaceSlug
    if (state.value.vocabSlug) {
      return `${wsName} / ${state.value.vocabSlug}`
    }
    return wsName
  })

  // Protected branches: main + all workspace root slugs
  const protectedBranches = computed(() => {
    const set = new Set(['main'])
    for (const d of definitions.value) {
      set.add(d.slug)
    }
    return set
  })

  function persistState() {
    if (import.meta.client) {
      if (state.value) {
        localStorage.setItem(WORKSPACE_KEY, JSON.stringify(state.value))
      } else {
        localStorage.removeItem(WORKSPACE_KEY)
      }
    }
  }

  async function loadDefinitions() {
    if (definitionsLoaded.value) return definitions.value
    try {
      const data = await $fetch<{ workspaces: WorkspaceDefinition[] }>('/export/system/workspaces.json')
      definitions.value = data?.workspaces ?? []
    } catch {
      definitions.value = []
    }
    definitionsLoaded.value = true
    return definitions.value
  }

  function selectWorkspace(slug: string) {
    state.value = { workspaceSlug: slug, vocabSlug: null }
    persistState()
  }

  async function selectVocab(vocabSlug: string): Promise<boolean> {
    if (!state.value) return false
    // Just record the selection — edit branch is created lazily at save time
    state.value = { ...state.value, vocabSlug }
    persistState()
    return true
  }

  /** Ensure the edit branch exists (called before first save) */
  async function ensureEditBranch(): Promise<boolean> {
    if (!state.value?.vocabSlug) return false
    const ws = activeWorkspace.value
    const branchName = activeBranch.value
    if (!branchName || !ws) return false

    // Ensure branches are loaded
    if (!branches.value.length && token.value) {
      await fetchBranches()
    }

    if (branches.value.some(b => b.name === branchName)) return true

    // Create from the workspace branch (e.g. staging)
    const created = await createBranch(branchName, ws.slug)
    if (!created) {
      // Race condition: may already exist remotely
      await fetchBranches()
      return branches.value.some(b => b.name === branchName)
    }
    return true
  }

  function clearWorkspace() {
    state.value = null
    persistState()
  }

  function openSelector() {
    navigateTo('/workspace')
  }

  // ---- GitHub Branch API ----

  const githubFetch = createGithubFetch(token, 'workspace')

  async function fetchBranches() {
    if (!owner || !repo || !token.value) return
    branchesLoading.value = true
    branchesError.value = null

    try {
      const data = await githubFetch<Array<{ name: string; commit: { sha: string } }>>(
        `https://api.github.com/repos/${owner}/${repo}/branches?per_page=100`,
      )
      if (!data) {
        branchesError.value = 'Failed to fetch branches'
        return
      }

      branches.value = data.map(b => ({
        name: b.name,
        sha: b.commit.sha,
      }))
    } catch (e) {
      branchesError.value = e instanceof Error ? e.message : 'Failed to fetch branches'
    } finally {
      branchesLoading.value = false
    }
  }

  async function fetchComparison(branchName: string, baseBranch = 'main'): Promise<BranchComparison | null> {
    if (!owner || !repo || !token.value) return null
    if (branchName === baseBranch) return { ahead: 0, behind: 0 }

    const cached = comparisons.value.get(branchName)
    if (cached) return cached

    const data = await githubFetch<{ ahead_by: number; behind_by: number }>(
      `https://api.github.com/repos/${owner}/${repo}/compare/${baseBranch}...${branchName}`,
    )
    if (!data) return null

    const result = { ahead: data.ahead_by, behind: data.behind_by }
    comparisons.value.set(branchName, result)
    return result
  }

  async function createBranch(name: string, fromBranch = 'main'): Promise<boolean> {
    if (!owner || !repo || !token.value) return false

    // Get the SHA of the source branch — try local cache first, then API
    let sha = branches.value.find(b => b.name === fromBranch)?.sha
    if (!sha) {
      const branchData = await githubFetch<{ commit: { sha: string } }>(
        `https://api.github.com/repos/${owner}/${repo}/branches/${encodeURIComponent(fromBranch)}`,
      )
      sha = branchData?.commit?.sha
    }
    if (!sha) return false

    const data = await githubFetch<{ ref: string }>(
      `https://api.github.com/repos/${owner}/${repo}/git/refs`,
      {
        method: 'POST',
        body: JSON.stringify({
          ref: `refs/heads/${name}`,
          sha,
        }),
      },
    )
    if (!data) return false

    // Refresh branch list
    await fetchBranches()
    return true
  }

  /** Check whether a specific branch exists on the remote */
  function branchExists(name: string): boolean {
    return branches.value.some(b => b.name === name)
  }

  /** Delete a remote branch (e.g. after merge) */
  async function deleteBranch(name: string): Promise<boolean> {
    if (!owner || !repo || !token.value) return false

    try {
      const res = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${encodeURIComponent(name)}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token.value}` },
        },
      )
      if (res.ok || res.status === 204 || res.status === 422) {
        // 422 = ref already deleted (race condition)
        await fetchBranches()
        return true
      }
      console.warn(`[workspace] Failed to delete branch ${name}: ${res.status}`)
      return false
    } catch (e) {
      console.warn(`[workspace] Error deleting branch ${name}:`, e)
      return false
    }
  }

  return {
    // State
    state: readonly(state),
    activeBranch: readonly(activeBranch),
    activeReadBranch: readonly(activeReadBranch),
    hasWorkspace,
    isEnabled,
    activeWorkspace,
    activeVocabSlug,
    workspaceLabel,
    definitions: readonly(definitions),
    definitionsLoaded: readonly(definitionsLoaded),
    protectedBranches,
    branches: readonly(branches),
    comparisons: readonly(comparisons),
    branchesLoading: readonly(branchesLoading),
    branchesError,

    // Actions
    loadDefinitions,
    selectWorkspace,
    selectVocab,
    ensureEditBranch,
    clearWorkspace,
    openSelector,
    fetchBranches,
    fetchComparison,
    createBranch,
    deleteBranch,
    branchExists,

    // Config
    owner: owner || '',
    repo: repo || '',
  }
}
