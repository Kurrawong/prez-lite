/**
 * Workspace composable
 *
 * Manages structured workspace state for vocabulary editing.
 * Workspaces (staging, dev, sandbox) are loaded from config.
 * Per-vocab branches follow the pattern `<workspace>/<vocab-slug>`.
 * State is stored in sessionStorage (clears on tab close).
 */

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

  // Reactive workspace state (sessionStorage-backed)
  const state = useState<WorkspaceState | null>('workspace_state', () => {
    if (typeof window !== 'undefined') {
      const raw = sessionStorage.getItem(WORKSPACE_KEY)
      if (raw) {
        try {
          const parsed = JSON.parse(raw)
          if (parsed && typeof parsed.workspaceSlug === 'string') {
            return parsed as WorkspaceState
          }
        } catch {
          // Old format or invalid JSON — start fresh
        }
      }
    }
    return null
  })

  const branches = ref<Array<{ name: string; sha: string }>>([])
  const comparisons = ref<Map<string, BranchComparison>>(new Map())
  const branchesLoading = ref(false)
  const branchesError = ref<string | null>(null)

  // Derived state
  const activeBranch = computed(() => {
    if (!state.value) return null
    const { workspaceSlug, vocabSlug } = state.value
    return vocabSlug ? `${workspaceSlug}/${vocabSlug}` : workspaceSlug
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
    if (typeof window !== 'undefined') {
      if (state.value) {
        sessionStorage.setItem(WORKSPACE_KEY, JSON.stringify(state.value))
      } else {
        sessionStorage.removeItem(WORKSPACE_KEY)
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
    const ws = activeWorkspace.value
    const branchName = `${state.value.workspaceSlug}/${vocabSlug}`

    // Ensure branches are loaded before checking
    if (!branches.value.length && token.value) {
      await fetchBranches()
    }

    // Check if branch already exists in our local list
    const exists = branches.value.some(b => b.name === branchName)
    if (!exists && ws) {
      // Auto-create from refreshFrom
      const created = await createBranch(branchName, ws.refreshFrom)
      if (!created) {
        // Branch creation failed — could be a race (already exists remotely)
        // or a permissions issue. Re-fetch branches and check again.
        await fetchBranches()
        if (!branches.value.some(b => b.name === branchName)) {
          return false
        }
      }
    }

    state.value = { ...state.value, vocabSlug }
    persistState()
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

  async function githubFetch<T>(url: string, options?: RequestInit): Promise<T | null> {
    if (!token.value) return null
    try {
      const res = await fetch(url, {
        ...options,
        headers: {
          Authorization: `Bearer ${token.value}`,
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      })
      if (!res.ok) return null
      if (res.status === 204) return null
      return await res.json()
    } catch {
      return null
    }
  }

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

  return {
    // State
    state: readonly(state),
    activeBranch: readonly(activeBranch),
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
    clearWorkspace,
    openSelector,
    fetchBranches,
    fetchComparison,
    createBranch,
    branchExists,

    // Config
    owner: owner || '',
    repo: repo || '',
  }
}
