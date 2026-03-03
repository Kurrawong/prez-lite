/**
 * Unified vocabulary data source composable.
 *
 * Selects the appropriate adapter based on auth state and workspace:
 * - Logged out → static JSON adapter
 * - Logged in + workspace → GitHub TTL adapter
 *
 * Provides reactive data that updates when the adapter changes.
 */

import type { VocabSourceAdapter } from '~/data/types'
import type { NormalizedScheme, NormalizedListConcept, NormalizedConcept } from '~/types/vocab-data'
import type { LabelsIndex } from '~/composables/useVocabData'
import { createStaticJsonAdapter } from '~/data/adapters/static-json'
import { createGitHubTTLAdapter } from '~/data/adapters/github-ttl'

// Module-scope adapter cache (avoid recreating per-component)
let staticAdapter: VocabSourceAdapter | null = null
const githubAdapters = new Map<string, VocabSourceAdapter>()

function getStaticAdapter(): VocabSourceAdapter {
  if (!staticAdapter) {
    staticAdapter = createStaticJsonAdapter()
  }
  return staticAdapter
}

function getGitHubAdapter(
  owner: string,
  repo: string,
  branch: string,
  vocabPath: string,
  token: string,
  fallbackBranch?: string,
): VocabSourceAdapter {
  const key = `github:${branch}`
  const existing = githubAdapters.get(key)
  if (existing) return existing

  const adapter = createGitHubTTLAdapter({ owner, repo, branch, vocabPath, token, fallbackBranch })
  githubAdapters.set(key, adapter)
  return adapter
}

export function useVocabSource() {
  const { isAuthenticated, token } = useGitHubAuth()
  const workspace = useWorkspace()
  const { githubRepo, githubVocabPath } = useRuntimeConfig().public

  const [owner, repo] = (githubRepo as string || '').split('/')

  // The current adapter, reactive to auth/workspace changes
  const adapter = computed<VocabSourceAdapter>(() => {
    if (
      isAuthenticated.value
      && workspace.hasWorkspace.value
      && workspace.activeReadBranch.value
      && token.value
      && owner
      && repo
    ) {
      return getGitHubAdapter(
        owner,
        repo,
        workspace.activeReadBranch.value,
        (githubVocabPath as string) || '',
        token.value,
        workspace.activeWorkspace.value?.refreshFrom,
      )
    }
    return getStaticAdapter()
  })

  const isGitHubSource = computed(() => adapter.value.key.startsWith('github:'))
  const sourceKey = computed(() => adapter.value.key)

  // Data loading methods that delegate to the current adapter
  async function loadScheme(slug: string): Promise<NormalizedScheme | null> {
    return adapter.value.loadScheme(slug)
  }

  async function loadConceptList(slug: string): Promise<NormalizedListConcept[]> {
    return adapter.value.loadConceptList(slug)
  }

  async function loadConcept(slug: string, conceptIri: string): Promise<NormalizedConcept | null> {
    return adapter.value.loadConcept(slug, conceptIri)
  }

  async function loadLabels(): Promise<LabelsIndex> {
    return adapter.value.loadLabels()
  }

  async function checkFreshness(slug: string): Promise<boolean> {
    if (adapter.value.checkFreshness) {
      return adapter.value.checkFreshness(slug)
    }
    return true
  }

  return {
    adapter: readonly(adapter),
    isGitHubSource,
    sourceKey,
    loadScheme,
    loadConceptList,
    loadConcept,
    loadLabels,
    checkFreshness,
  }
}
