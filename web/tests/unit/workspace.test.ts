import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { WorkspaceState, WorkspaceDefinition } from '~/composables/useWorkspace'

// Mock sessionStorage
const sessionStore = new Map<string, string>()
const mockSessionStorage = {
  getItem: vi.fn((key: string) => sessionStore.get(key) ?? null),
  setItem: vi.fn((key: string, value: string) => { sessionStore.set(key, value) }),
  removeItem: vi.fn((key: string) => { sessionStore.delete(key) }),
}

vi.mock('#app', () => ({
  useRuntimeConfig: () => ({
    public: {
      githubRepo: 'testowner/testrepo',
    },
  }),
  useState: vi.fn((_key: string, init?: () => unknown) => {
    const val = ref(init?.() ?? null)
    return val
  }),
  computed: vi.fn((fn: () => unknown) => ({ value: fn() })),
}))

const WORKSPACE_KEY = 'prez_workspace'

describe('workspace state serialisation', () => {
  beforeEach(() => {
    sessionStore.clear()
    vi.stubGlobal('sessionStorage', mockSessionStorage)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('stores WorkspaceState as JSON in sessionStorage', () => {
    const state: WorkspaceState = { workspaceSlug: 'staging', vocabSlug: 'colours' }
    sessionStorage.setItem(WORKSPACE_KEY, JSON.stringify(state))

    const raw = sessionStorage.getItem(WORKSPACE_KEY)
    expect(raw).not.toBeNull()

    const parsed = JSON.parse(raw!)
    expect(parsed.workspaceSlug).toBe('staging')
    expect(parsed.vocabSlug).toBe('colours')
  })

  it('deserialises workspace-only state (no vocab)', () => {
    const state: WorkspaceState = { workspaceSlug: 'dev', vocabSlug: null }
    sessionStorage.setItem(WORKSPACE_KEY, JSON.stringify(state))

    const parsed = JSON.parse(sessionStorage.getItem(WORKSPACE_KEY)!)
    expect(parsed.workspaceSlug).toBe('dev')
    expect(parsed.vocabSlug).toBeNull()
  })

  it('clears workspace from sessionStorage', () => {
    sessionStorage.setItem(WORKSPACE_KEY, JSON.stringify({ workspaceSlug: 'staging', vocabSlug: null }))
    sessionStorage.removeItem(WORKSPACE_KEY)
    expect(sessionStorage.getItem(WORKSPACE_KEY)).toBeNull()
  })

  it('returns null when no workspace stored', () => {
    expect(sessionStorage.getItem(WORKSPACE_KEY)).toBeNull()
  })

  it('handles old format (plain string) gracefully', () => {
    // Old format stored a plain branch name string
    sessionStorage.setItem(WORKSPACE_KEY, 'dev')
    const raw = sessionStorage.getItem(WORKSPACE_KEY)!

    // Attempting to parse as WorkspaceState should fail JSON.parse or fail validation
    let parsed: WorkspaceState | null = null
    try {
      const obj = JSON.parse(raw)
      if (obj && typeof obj.workspaceSlug === 'string') {
        parsed = obj
      }
    } catch {
      parsed = null
    }
    expect(parsed).toBeNull()
  })
})

describe('branch name derivation', () => {
  function deriveBranch(state: WorkspaceState | null): string | null {
    if (!state) return null
    const { workspaceSlug, vocabSlug } = state
    return vocabSlug ? `${workspaceSlug}/${vocabSlug}` : workspaceSlug
  }

  it('derives workspace + vocab branch', () => {
    expect(deriveBranch({ workspaceSlug: 'staging', vocabSlug: 'colours' })).toBe('staging/colours')
  })

  it('derives workspace-only branch', () => {
    expect(deriveBranch({ workspaceSlug: 'staging', vocabSlug: null })).toBe('staging')
  })

  it('returns null when no state', () => {
    expect(deriveBranch(null)).toBeNull()
  })

  it('handles dev workspace correctly', () => {
    expect(deriveBranch({ workspaceSlug: 'dev', vocabSlug: 'australian-states' })).toBe('dev/australian-states')
  })

  it('handles sandbox workspace correctly', () => {
    expect(deriveBranch({ workspaceSlug: 'sandbox', vocabSlug: 'test-vocab' })).toBe('sandbox/test-vocab')
  })
})

describe('protected branches from definitions', () => {
  function deriveProtectedBranches(definitions: WorkspaceDefinition[]): Set<string> {
    const set = new Set(['main'])
    for (const d of definitions) {
      set.add(d.slug)
    }
    return set
  }

  const definitions: WorkspaceDefinition[] = [
    { slug: 'staging', label: 'Staging', description: 'For authors', refreshFrom: 'main' },
    { slug: 'dev', label: 'Development', description: 'For devs', refreshFrom: 'main' },
    { slug: 'sandbox', label: 'Sandbox', description: 'Playground', refreshFrom: 'staging' },
  ]

  it('includes main as protected', () => {
    const protected_ = deriveProtectedBranches(definitions)
    expect(protected_.has('main')).toBe(true)
  })

  it('includes all workspace slugs as protected', () => {
    const protected_ = deriveProtectedBranches(definitions)
    expect(protected_.has('staging')).toBe(true)
    expect(protected_.has('dev')).toBe(true)
    expect(protected_.has('sandbox')).toBe(true)
  })

  it('does not flag per-vocab branches as protected', () => {
    const protected_ = deriveProtectedBranches(definitions)
    expect(protected_.has('staging/colours')).toBe(false)
    expect(protected_.has('dev/australian-states')).toBe(false)
  })

  it('works with empty definitions', () => {
    const protected_ = deriveProtectedBranches([])
    expect(protected_.size).toBe(1)
    expect(protected_.has('main')).toBe(true)
  })
})

describe('workspace label', () => {
  function deriveLabel(
    state: WorkspaceState | null,
    definitions: WorkspaceDefinition[],
  ): string | null {
    if (!state) return null
    const ws = definitions.find(d => d.slug === state.workspaceSlug)
    const wsName = ws?.label ?? state.workspaceSlug
    if (state.vocabSlug) {
      return `${wsName} / ${state.vocabSlug}`
    }
    return wsName
  }

  const definitions: WorkspaceDefinition[] = [
    { slug: 'staging', label: 'Staging', description: '', refreshFrom: 'main' },
    { slug: 'dev', label: 'Development', description: '', refreshFrom: 'main' },
  ]

  it('shows workspace label with vocab slug', () => {
    expect(deriveLabel({ workspaceSlug: 'staging', vocabSlug: 'colours' }, definitions))
      .toBe('Staging / colours')
  })

  it('shows workspace label only when no vocab', () => {
    expect(deriveLabel({ workspaceSlug: 'staging', vocabSlug: null }, definitions))
      .toBe('Staging')
  })

  it('falls back to slug when definition not found', () => {
    expect(deriveLabel({ workspaceSlug: 'custom', vocabSlug: 'test' }, definitions))
      .toBe('custom / test')
  })

  it('returns null when no state', () => {
    expect(deriveLabel(null, definitions)).toBeNull()
  })
})
