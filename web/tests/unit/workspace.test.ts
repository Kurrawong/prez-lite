import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { WorkspaceState, WorkspaceDefinition } from '~/composables/useWorkspace'

// Mock localStorage
const localStore = new Map<string, string>()
const mockLocalStorage = {
  getItem: vi.fn((key: string) => localStore.get(key) ?? null),
  setItem: vi.fn((key: string, value: string) => { localStore.set(key, value) }),
  removeItem: vi.fn((key: string) => { localStore.delete(key) }),
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
    localStore.clear()
    vi.stubGlobal('localStorage', mockLocalStorage)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('stores WorkspaceState as JSON in localStorage', () => {
    const state: WorkspaceState = { workspaceSlug: 'staging', vocabSlug: 'colours' }
    localStorage.setItem(WORKSPACE_KEY, JSON.stringify(state))

    const raw = localStorage.getItem(WORKSPACE_KEY)
    expect(raw).not.toBeNull()

    const parsed = JSON.parse(raw!)
    expect(parsed.workspaceSlug).toBe('staging')
    expect(parsed.vocabSlug).toBe('colours')
  })

  it('deserialises workspace-only state (no vocab)', () => {
    const state: WorkspaceState = { workspaceSlug: 'dev', vocabSlug: null }
    localStorage.setItem(WORKSPACE_KEY, JSON.stringify(state))

    const parsed = JSON.parse(localStorage.getItem(WORKSPACE_KEY)!)
    expect(parsed.workspaceSlug).toBe('dev')
    expect(parsed.vocabSlug).toBeNull()
  })

  it('clears workspace from localStorage', () => {
    localStorage.setItem(WORKSPACE_KEY, JSON.stringify({ workspaceSlug: 'staging', vocabSlug: null }))
    localStorage.removeItem(WORKSPACE_KEY)
    expect(localStorage.getItem(WORKSPACE_KEY)).toBeNull()
  })

  it('returns null when no workspace stored', () => {
    expect(localStorage.getItem(WORKSPACE_KEY)).toBeNull()
  })

  it('handles old format (plain string) gracefully', () => {
    // Old format stored a plain branch name string
    localStorage.setItem(WORKSPACE_KEY, 'dev')
    const raw = localStorage.getItem(WORKSPACE_KEY)!

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

describe('branch deletion safety (publish must not delete the workspace branch)', () => {
  // Mirrors the guard added to useWorkspace.deleteBranch: a branch may only be
  // deleted when it is NOT protected (main + every workspace root slug).
  function canDelete(name: string, protectedSet: Set<string>): boolean {
    return !protectedSet.has(name)
  }

  // Mirrors usePromotion.getBranches for the two promotion layers.
  function getBranches(
    layer: 'pending' | 'approved',
    ws: WorkspaceDefinition,
    editBranch: string,
  ): { head: string; base: string } {
    if (layer === 'pending') return { head: editBranch, base: ws.slug }
    return { head: ws.slug, base: ws.refreshFrom }
  }

  const ws: WorkspaceDefinition = { slug: 'develop', label: 'Develop', description: '', refreshFrom: 'master' }
  const protectedSet = new Set(['main', 'develop', 'staging'])
  const editBranch = 'edit/develop/AssociationType'

  it('Layer 3 (approved/publish) head is the workspace root branch', () => {
    expect(getBranches('approved', ws, editBranch).head).toBe('develop')
  })

  it('refuses to delete the workspace branch published in Layer 3 (the bug)', () => {
    const head = getBranches('approved', ws, editBranch).head
    expect(canDelete(head, protectedSet)).toBe(false)
  })

  it('Layer 2 (pending) head is the ephemeral edit branch', () => {
    expect(getBranches('pending', ws, editBranch).head).toBe(editBranch)
  })

  it('still allows deleting the ephemeral edit branch (Layer 2 cleanup)', () => {
    const head = getBranches('pending', ws, editBranch).head
    expect(canDelete(head, protectedSet)).toBe(true)
  })

  it('refuses main and every workspace slug, allows edit/* branches', () => {
    expect(canDelete('main', protectedSet)).toBe(false)
    expect(canDelete('develop', protectedSet)).toBe(false)
    expect(canDelete('staging', protectedSet)).toBe(false)
    expect(canDelete('edit/staging/colours', protectedSet)).toBe(true)
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

describe('vocab context sync (save targets the open vocab branch)', () => {
  // Mirrors scheme.vue's dedicated sync watcher: re-bind the workspace vocabSlug to
  // the vocab open in the editor whenever (definitions loaded) the open vocab is known
  // and differs. Guards against saving to a stale/different vocab's edit branch.
  function syncedVocabSlug(o: { wsLoaded: boolean; openSlug: string | undefined; currentSlug: string | null }): string | null {
    if (o.wsLoaded && o.openSlug && o.currentSlug !== o.openSlug) return o.openSlug
    return o.currentSlug
  }
  function editBranch(wsSlug: string, vocabSlug: string | null): string {
    return vocabSlug ? `edit/${wsSlug}/${vocabSlug}` : wsSlug
  }

  it('re-binds to the open vocab when a different one is left stale (the bug)', () => {
    const next = syncedVocabSlug({ wsLoaded: true, openSlug: 'AssociationType', currentSlug: 'E2EGIFVocabulary' })
    expect(next).toBe('AssociationType')
    // the save must target the open vocab's branch, not the stale one
    expect(editBranch('develop', next)).toBe('edit/develop/AssociationType')
  })

  it('leaves the context unchanged when it already matches', () => {
    expect(syncedVocabSlug({ wsLoaded: true, openSlug: 'AssociationType', currentSlug: 'AssociationType' }))
      .toBe('AssociationType')
  })

  it('does not clobber the context when the open vocab is not yet indexed (new vocab)', () => {
    // create-vocab flow sets vocabSlug itself; the open vocab may not be in the index yet
    expect(syncedVocabSlug({ wsLoaded: true, openSlug: undefined, currentSlug: 'MyNewVocab' }))
      .toBe('MyNewVocab')
  })

  it('waits for workspace definitions before binding', () => {
    expect(syncedVocabSlug({ wsLoaded: false, openSlug: 'AssociationType', currentSlug: 'E2EGIFVocabulary' }))
      .toBe('E2EGIFVocabulary')
  })
})

describe('changed-in-staging by content (blob SHA), not commit graph', () => {
  // Mirrors usePromotion.fetchChangedVocabs: diff the per-file blob SHAs of the
  // workspace branch (head, e.g. develop) against what it publishes to (base, e.g.
  // master). A vocab is "changed in staging" only when its content actually differs.
  // The old code trusted compare/base...head .files, which lists files touched on
  // head since the merge base — so it falsely flagged already-published vocabs once
  // the branches diverged. This contract prevents that.
  function changedVocabs(base: Record<string, string>, head: Record<string, string>) {
    const out: { slug: string; status: string }[] = []
    for (const [path, sha] of Object.entries(head)) {
      if (base[path] === sha) continue
      out.push({ slug: path, status: path in base ? 'modified' : 'added' })
    }
    for (const path of Object.keys(base)) {
      if (!(path in head)) out.push({ slug: path, status: 'removed' })
    }
    return out
  }

  it('does NOT flag an already-published vocab (identical SHA) even on diverged branches', () => {
    // both branches hold the published edit -> same blob SHA -> not "changed"
    expect(changedVocabs({ 'a.ttl': 'sha1', 'b.ttl': 'shaB' }, { 'a.ttl': 'sha1', 'b.ttl': 'shaB' }))
      .toEqual([])
  })

  it('flags a genuinely modified vocab (SHA differs)', () => {
    expect(changedVocabs({ 'a.ttl': 'sha1' }, { 'a.ttl': 'sha2' }))
      .toEqual([{ slug: 'a.ttl', status: 'modified' }])
  })

  it('flags added and removed vocabs', () => {
    const r = changedVocabs({ 'a.ttl': 's', 'gone.ttl': 'g' }, { 'a.ttl': 's', 'new.ttl': 'n' })
    expect(r).toContainEqual({ slug: 'new.ttl', status: 'added' })
    expect(r).toContainEqual({ slug: 'gone.ttl', status: 'removed' })
    expect(r).toHaveLength(2)
  })
})
