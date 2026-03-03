/**
 * useLayerStatus composable
 *
 * Computes three layers of change visibility for the editing toolbar:
 *   Layer 1 (unsaved) — reactive from editMode.getChangeSummary()
 *   Layer 2 (pending)  — diff: workspace root TTL vs edit branch TTL
 *   Layer 3 (approved)  — diff: main TTL vs workspace root TTL
 *
 * Uses GitHub Contents API to fetch TTL at branch refs, then N3 + buildChangeSummary for diffs.
 */

import { Store, Parser, type Quad } from 'n3'
import { getPredicateLabel } from '~/utils/vocab-labels'
import { buildChangeSummary } from '~/utils/ttl-patch'
import type { ChangeSummary, SubjectChange } from '~/composables/useEditMode'

// ============================================================================
// Types
// ============================================================================

export type LayerName = 'unsaved' | 'pending' | 'approved'

export interface LayerData {
  name: LayerName
  label: string
  color: string
  count: number
  changes: SubjectChange[]
  loading: boolean
  error: string | null
}

// ============================================================================
// Helpers
// ============================================================================

const SKOS_PREF_LABEL = 'http://www.w3.org/2004/02/skos/core#prefLabel'

/** Decode base64-encoded content from GitHub Contents API */
function decodeBase64(encoded: string): string {
  return new TextDecoder().decode(
    Uint8Array.from(atob(encoded.replace(/\n/g, '')), (c) => c.charCodeAt(0)),
  )
}

/** Fetch TTL file content at a specific branch ref via GitHub Contents API */
async function fetchTTLAtRef(
  owner: string,
  repo: string,
  path: string,
  ref: string,
  token: string,
): Promise<string | null> {
  const cleanPath = path.replace(/^\/+/, '')
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${cleanPath}?ref=${encodeURIComponent(ref)}`,
    { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' },
  )

  if (res.status === 404) return null
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`)

  const data = await res.json()
  return decodeBase64(data.content)
}

/** Parse TTL string into an N3 Store */
function parseTTL(ttl: string): Store {
  const store = new Store()
  const parser = new Parser({ format: 'Turtle' })
  store.addQuads(parser.parse(ttl))
  return store
}

/** Build a label resolver from one or two N3 stores */
function makeLabelResolver(...stores: Store[]): (iri: string) => string {
  return (iri: string) => {
    for (const store of stores) {
      const quads = store.getQuads(iri, SKOS_PREF_LABEL, null, null) as Quad[]
      if (quads.length > 0) return quads[0]!.object.value
    }
    const hashIdx = iri.lastIndexOf('#')
    const slashIdx = iri.lastIndexOf('/')
    return iri.substring(Math.max(hashIdx, slashIdx) + 1)
  }
}

/** Diff two TTL strings and return a ChangeSummary */
function diffTTL(baseTTL: string | null, headTTL: string | null): ChangeSummary {
  const baseStore = baseTTL ? parseTTL(baseTTL) : new Store()
  const headStore = headTTL ? parseTTL(headTTL) : new Store()
  const labelResolver = makeLabelResolver(headStore, baseStore)
  return buildChangeSummary(baseStore, headStore, labelResolver, getPredicateLabel)
}

// ============================================================================
// Composable
// ============================================================================

export function useLayerStatus(
  editMode: ReturnType<typeof useEditMode> | null,
  workspace: ReturnType<typeof useWorkspace>,
  vocabFilePath: Ref<string>,
  owner: string,
  repo: string,
) {
  const { token } = useGitHubAuth()

  // Layer 2 (branch) state
  const branchChanges = ref<ChangeSummary>({ subjects: [], totalAdded: 0, totalRemoved: 0, totalModified: 0 })
  const branchLoading = ref(false)
  const branchError = ref<string | null>(null)

  // Layer 3 (staging) state
  const stagingChanges = ref<ChangeSummary>({ subjects: [], totalAdded: 0, totalRemoved: 0, totalModified: 0 })
  const stagingLoading = ref(false)
  const stagingError = ref<string | null>(null)

  // SHA-based cache to avoid redundant fetches
  const diffCache = new Map<string, ChangeSummary>()

  /** Layer 1: unsaved changes from editMode (reactive, no API calls) */
  const unsavedChanges = computed<ChangeSummary>(() => {
    if (!editMode?.isEditMode.value || !editMode.store.value || !editMode.storeVersion.value) {
      return { subjects: [], totalAdded: 0, totalRemoved: 0, totalModified: 0 }
    }
    // Access storeVersion to trigger reactivity
    void editMode.storeVersion.value
    return editMode.getChangeSummary()
  })

  /** Fetch + diff for a layer given base and head branch names */
  async function fetchLayerDiff(
    baseBranch: string,
    headBranch: string,
  ): Promise<ChangeSummary> {
    if (!token.value) return { subjects: [], totalAdded: 0, totalRemoved: 0, totalModified: 0 }

    // Check SHA cache
    const baseSha = workspace.branches.value.find(b => b.name === baseBranch)?.sha
    const headSha = workspace.branches.value.find(b => b.name === headBranch)?.sha
    if (baseSha && headSha) {
      const cacheKey = `${baseSha}:${headSha}`
      const cached = diffCache.get(cacheKey)
      if (cached) return cached
    }

    // Fetch TTL from both branches
    const [baseTTL, headTTL] = await Promise.all([
      fetchTTLAtRef(owner, repo, vocabFilePath.value, baseBranch, token.value),
      fetchTTLAtRef(owner, repo, vocabFilePath.value, headBranch, token.value),
    ])

    // If both are null (file doesn't exist on either), no changes
    if (baseTTL === null && headTTL === null) {
      return { subjects: [], totalAdded: 0, totalRemoved: 0, totalModified: 0 }
    }

    const summary = diffTTL(baseTTL, headTTL)

    // Cache by SHA if we have both
    if (baseSha && headSha) {
      diffCache.set(`${baseSha}:${headSha}`, summary)
    }

    return summary
  }

  /** Refresh Layer 2 (branch vs workspace root) */
  async function refreshBranch() {
    const ws = workspace.activeWorkspace.value
    const branch = workspace.activeBranch.value
    if (!ws || !branch || !token.value) return

    // If edit branch doesn't exist yet, there are no branch-level changes
    if (!workspace.branchExists(branch)) {
      branchChanges.value = { subjects: [], totalAdded: 0, totalRemoved: 0, totalModified: 0 }
      return
    }

    branchLoading.value = true
    branchError.value = null
    try {
      branchChanges.value = await fetchLayerDiff(ws.slug, branch)
    } catch (e) {
      branchError.value = e instanceof Error ? e.message : 'Failed to diff branch'
    } finally {
      branchLoading.value = false
    }
  }

  /** Refresh Layer 3 (workspace root vs main/parent) */
  async function refreshStaging() {
    const ws = workspace.activeWorkspace.value
    if (!ws || !token.value) return

    // If workspace branch doesn't exist yet, there are no staging-level changes
    if (!workspace.branchExists(ws.slug)) {
      stagingChanges.value = { subjects: [], totalAdded: 0, totalRemoved: 0, totalModified: 0 }
      return
    }

    stagingLoading.value = true
    stagingError.value = null
    try {
      stagingChanges.value = await fetchLayerDiff(ws.refreshFrom, ws.slug)
    } catch (e) {
      stagingError.value = e instanceof Error ? e.message : 'Failed to diff staging'
    } finally {
      stagingLoading.value = false
    }
  }

  /** Refresh all remote layers (2 & 3) */
  async function refresh() {
    // Refresh branches first to get latest SHAs
    await workspace.fetchBranches()
    // Clear cache so fresh SHAs are used
    diffCache.clear()
    await Promise.all([refreshBranch(), refreshStaging()])
  }

  // Composite layers array
  const layers = computed<LayerData[]>(() => [
    {
      name: 'unsaved' as LayerName,
      label: 'unsaved',
      color: 'amber',
      count: unsavedChanges.value.subjects.length,
      changes: unsavedChanges.value.subjects,
      loading: false,
      error: null,
    },
    {
      name: 'pending' as LayerName,
      label: 'saved',
      color: 'blue',
      count: branchChanges.value.subjects.length,
      changes: branchChanges.value.subjects,
      loading: branchLoading.value,
      error: branchError.value,
    },
    {
      name: 'approved' as LayerName,
      label: 'in staging',
      color: 'green',
      count: stagingChanges.value.subjects.length,
      changes: stagingChanges.value.subjects,
      loading: stagingLoading.value,
      error: stagingError.value,
    },
  ])

  /** Map of concept IRI → set of layers it appears in */
  const conceptLayers = computed<Map<string, Set<LayerName>>>(() => {
    const map = new Map<string, Set<LayerName>>()
    for (const layer of layers.value) {
      for (const change of layer.changes) {
        let set = map.get(change.subjectIri)
        if (!set) {
          set = new Set()
          map.set(change.subjectIri, set)
        }
        set.add(layer.name)
      }
    }
    return map
  })

  const loading = computed(() => branchLoading.value || stagingLoading.value)

  // --- Triggers ---

  // Refresh when workspace, branch, vocab path, or token changes (no one-shot; keep reacting)
  watch(
    [
      () => workspace.activeWorkspace.value,
      () => workspace.activeBranch.value,
      vocabFilePath,
      token,
    ],
    ([ws, branch, path, tok]) => {
      if (ws && branch && tok && path) {
        diffCache.clear()
        refresh()
      }
    },
    { immediate: true },
  )

  // After save: refetch branches then re-diff
  if (editMode) {
    watch(() => editMode.saveStatus.value, (status) => {
      if (status === 'success') {
        refresh()
      }
    })
  }

  return {
    layers,
    conceptLayers,
    refresh,
    loading,
  }
}
