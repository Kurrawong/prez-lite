/**
 * Tests for undo/redo system used in useEditMode.
 *
 * Mirrors the composable's recordMutation / undo / redo / revertSubject
 * logic using standalone helpers, same pattern as edit-mutations.test.ts.
 */
import { describe, it, expect } from 'vitest'
import { Store, Parser, DataFactory, type Quad } from 'n3'
import { quadKey, computeQuadDiff } from '~/utils/ttl-patch'

const { namedNode, literal, defaultGraph } = DataFactory

const SKOS = 'http://www.w3.org/2004/02/skos/core#'
const RDF = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#'

// ============================================================================
// Types (mirror composable)
// ============================================================================

interface HistoryEntry {
  label: string
  removed: Quad[]
  added: Quad[]
  timestamp: number
}

interface EditState {
  store: Store
  originalStore: Store
  undoStack: HistoryEntry[]
  redoStack: HistoryEntry[]
}

const MAX_HISTORY = 50

// ============================================================================
// Helpers — mirror composable internals
// ============================================================================

function parseTTL(ttl: string): Store {
  const parser = new Parser({ format: 'Turtle' })
  const store = new Store()
  store.addQuads(parser.parse(ttl))
  return store
}

function cloneStore(src: Store): Store {
  const dst = new Store()
  dst.addQuads(src.getQuads(null, null, null, null))
  return dst
}

function recordMutation(state: EditState, label: string, fn: () => void) {
  const beforeKeys = new Map(
    (state.store.getQuads(null, null, null, null) as Quad[]).map(q => [quadKey(q), q]),
  )
  fn()
  const afterQuads = state.store.getQuads(null, null, null, null) as Quad[]
  const afterKeys = new Set(afterQuads.map(quadKey))

  const removed = [...beforeKeys.entries()].filter(([k]) => !afterKeys.has(k)).map(([, q]) => q)
  const added = afterQuads.filter(q => !beforeKeys.has(quadKey(q)))

  if (removed.length === 0 && added.length === 0) return
  state.undoStack = [...state.undoStack, { label, removed, added, timestamp: Date.now() }].slice(-MAX_HISTORY)
  state.redoStack = []
}

function undo(state: EditState) {
  if (!state.undoStack.length) return
  const entry = state.undoStack[state.undoStack.length - 1]!
  state.undoStack = state.undoStack.slice(0, -1)
  for (const q of entry.added) state.store.removeQuad(q)
  for (const q of entry.removed) state.store.addQuad(q)
  state.redoStack = [...state.redoStack, entry]
}

function redo(state: EditState) {
  if (!state.redoStack.length) return
  const entry = state.redoStack[state.redoStack.length - 1]!
  state.redoStack = state.redoStack.slice(0, -1)
  for (const q of entry.removed) state.store.removeQuad(q)
  for (const q of entry.added) state.store.addQuad(q)
  state.undoStack = [...state.undoStack, entry]
}

function revertSubject(state: EditState, subjectIri: string) {
  recordMutation(state, `Revert "${subjectIri}"`, () => {
    // Remove current quads for subject
    state.store.removeQuads(state.store.getQuads(subjectIri, null, null, null) as Quad[])
    // Restore original quads for subject
    state.store.addQuads(state.originalStore.getQuads(subjectIri, null, null, null) as Quad[])
    // Clean up inverse quads that differ from original
    const origAsObj = new Set(
      (state.originalStore.getQuads(null, null, subjectIri, null) as Quad[]).map(quadKey),
    )
    for (const q of state.store.getQuads(null, null, subjectIri, null) as Quad[]) {
      if (!origAsObj.has(quadKey(q))) state.store.removeQuad(q)
    }
    for (const q of state.originalStore.getQuads(null, null, subjectIri, null) as Quad[]) {
      if (!state.store.getQuads(q.subject, q.predicate, q.object, null).length) {
        state.store.addQuad(q)
      }
    }
  })
}

function recomputeDirty(state: EditState): boolean {
  const { added, removed } = computeQuadDiff(state.originalStore, state.store)
  return added.length > 0 || removed.length > 0
}

function clearHistory(state: EditState) {
  state.undoStack = []
  state.redoStack = []
}

function getQuads(store: Store, s: string | null, p: string | null, o: string | null): Quad[] {
  return store.getQuads(s, p, o, null) as Quad[]
}

function storeSize(store: Store): number {
  return store.getQuads(null, null, null, null).length
}

// ============================================================================
// Fixtures
// ============================================================================

const SCHEME = 'http://example.com/vocab/'
const CONCEPT_A = `${SCHEME}a`
const CONCEPT_B = `${SCHEME}b`

const TEST_TTL = `
@prefix skos: <http://www.w3.org/2004/02/skos/core#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix cs: <http://example.com/vocab/> .

cs: a skos:ConceptScheme ;
    skos:prefLabel "Test Vocab"@en .

cs:a a skos:Concept ;
    skos:prefLabel "Concept A"@en ;
    skos:inScheme cs: ;
    skos:topConceptOf cs: ;
    skos:narrower cs:b .

cs:b a skos:Concept ;
    skos:prefLabel "Concept B"@en ;
    skos:inScheme cs: ;
    skos:broader cs:a .

cs: skos:hasTopConcept cs:a .
`

function makeState(): EditState {
  const store = parseTTL(TEST_TTL)
  return {
    store,
    originalStore: cloneStore(store),
    undoStack: [],
    redoStack: [],
  }
}

// ============================================================================
// Tests
// ============================================================================

describe('recordMutation', () => {
  it('captures added quads', () => {
    const state = makeState()
    const before = storeSize(state.store)
    recordMutation(state, 'add altLabel', () => {
      state.store.addQuad(namedNode(CONCEPT_A), namedNode(`${SKOS}altLabel`), literal('Alt A', 'en'), defaultGraph())
    })

    expect(state.undoStack).toHaveLength(1)
    expect(state.undoStack[0]!.added).toHaveLength(1)
    expect(state.undoStack[0]!.removed).toHaveLength(0)
    expect(storeSize(state.store)).toBe(before + 1)
  })

  it('captures removed quads', () => {
    const state = makeState()
    recordMutation(state, 'remove prefLabel', () => {
      state.store.removeQuad(
        namedNode(CONCEPT_A), namedNode(`${SKOS}prefLabel`), literal('Concept A', 'en'), defaultGraph(),
      )
    })

    expect(state.undoStack).toHaveLength(1)
    expect(state.undoStack[0]!.removed).toHaveLength(1)
    expect(state.undoStack[0]!.added).toHaveLength(0)
  })

  it('captures both added and removed on value modify', () => {
    const state = makeState()
    recordMutation(state, 'update prefLabel', () => {
      state.store.removeQuad(
        namedNode(CONCEPT_A), namedNode(`${SKOS}prefLabel`), literal('Concept A', 'en'), defaultGraph(),
      )
      state.store.addQuad(
        namedNode(CONCEPT_A), namedNode(`${SKOS}prefLabel`), literal('Updated A', 'en'), defaultGraph(),
      )
    })

    expect(state.undoStack).toHaveLength(1)
    expect(state.undoStack[0]!.removed).toHaveLength(1)
    expect(state.undoStack[0]!.added).toHaveLength(1)
  })

  it('clears redoStack on new mutation', () => {
    const state = makeState()
    // First mutation
    recordMutation(state, 'first', () => {
      state.store.addQuad(namedNode(CONCEPT_A), namedNode(`${SKOS}altLabel`), literal('x'), defaultGraph())
    })
    // Undo to populate redo
    undo(state)
    expect(state.redoStack).toHaveLength(1)

    // New mutation should clear redo
    recordMutation(state, 'second', () => {
      state.store.addQuad(namedNode(CONCEPT_A), namedNode(`${SKOS}altLabel`), literal('y'), defaultGraph())
    })
    expect(state.redoStack).toHaveLength(0)
  })

  it('no-ops when mutation changes nothing', () => {
    const state = makeState()
    recordMutation(state, 'noop', () => {
      // do nothing
    })
    expect(state.undoStack).toHaveLength(0)
  })

  it('truncates at MAX_HISTORY', () => {
    const state = makeState()
    for (let i = 0; i < MAX_HISTORY + 10; i++) {
      recordMutation(state, `mutation-${i}`, () => {
        state.store.addQuad(
          namedNode(CONCEPT_A), namedNode(`${SKOS}altLabel`), literal(`val-${i}`), defaultGraph(),
        )
      })
    }
    expect(state.undoStack).toHaveLength(MAX_HISTORY)
    // Earliest mutations are dropped
    expect(state.undoStack[0]!.label).toBe('mutation-10')
  })
})

describe('undo', () => {
  it('reverses an add (removes the added quad)', () => {
    const state = makeState()
    recordMutation(state, 'add', () => {
      state.store.addQuad(namedNode(CONCEPT_A), namedNode(`${SKOS}altLabel`), literal('New'), defaultGraph())
    })
    expect(getQuads(state.store, CONCEPT_A, `${SKOS}altLabel`, null)).toHaveLength(1)

    undo(state)
    expect(getQuads(state.store, CONCEPT_A, `${SKOS}altLabel`, null)).toHaveLength(0)
  })

  it('reverses a remove (re-adds the removed quad)', () => {
    const state = makeState()
    recordMutation(state, 'remove', () => {
      state.store.removeQuad(
        namedNode(CONCEPT_A), namedNode(`${SKOS}prefLabel`), literal('Concept A', 'en'), defaultGraph(),
      )
    })
    expect(getQuads(state.store, CONCEPT_A, `${SKOS}prefLabel`, null)).toHaveLength(0)

    undo(state)
    expect(getQuads(state.store, CONCEPT_A, `${SKOS}prefLabel`, null)).toHaveLength(1)
    expect(getQuads(state.store, CONCEPT_A, `${SKOS}prefLabel`, null)[0]!.object.value).toBe('Concept A')
  })

  it('reverses a value modify', () => {
    const state = makeState()
    recordMutation(state, 'modify', () => {
      state.store.removeQuad(
        namedNode(CONCEPT_A), namedNode(`${SKOS}prefLabel`), literal('Concept A', 'en'), defaultGraph(),
      )
      state.store.addQuad(
        namedNode(CONCEPT_A), namedNode(`${SKOS}prefLabel`), literal('Modified', 'en'), defaultGraph(),
      )
    })

    undo(state)
    const quads = getQuads(state.store, CONCEPT_A, `${SKOS}prefLabel`, null)
    expect(quads).toHaveLength(1)
    expect(quads[0]!.object.value).toBe('Concept A')
  })

  it('moves entry to redoStack', () => {
    const state = makeState()
    recordMutation(state, 'test', () => {
      state.store.addQuad(namedNode(CONCEPT_A), namedNode(`${SKOS}altLabel`), literal('x'), defaultGraph())
    })
    expect(state.undoStack).toHaveLength(1)
    expect(state.redoStack).toHaveLength(0)

    undo(state)
    expect(state.undoStack).toHaveLength(0)
    expect(state.redoStack).toHaveLength(1)
  })

  it('no-ops when stack empty', () => {
    const state = makeState()
    const before = storeSize(state.store)
    undo(state)
    expect(storeSize(state.store)).toBe(before)
    expect(state.redoStack).toHaveLength(0)
  })
})

describe('redo', () => {
  it('re-applies undone add', () => {
    const state = makeState()
    recordMutation(state, 'add', () => {
      state.store.addQuad(namedNode(CONCEPT_A), namedNode(`${SKOS}altLabel`), literal('Redo'), defaultGraph())
    })
    undo(state)
    expect(getQuads(state.store, CONCEPT_A, `${SKOS}altLabel`, null)).toHaveLength(0)

    redo(state)
    expect(getQuads(state.store, CONCEPT_A, `${SKOS}altLabel`, null)).toHaveLength(1)
    expect(getQuads(state.store, CONCEPT_A, `${SKOS}altLabel`, null)[0]!.object.value).toBe('Redo')
  })

  it('re-applies undone remove', () => {
    const state = makeState()
    recordMutation(state, 'remove', () => {
      state.store.removeQuad(
        namedNode(CONCEPT_A), namedNode(`${SKOS}prefLabel`), literal('Concept A', 'en'), defaultGraph(),
      )
    })
    undo(state)
    expect(getQuads(state.store, CONCEPT_A, `${SKOS}prefLabel`, null)).toHaveLength(1)

    redo(state)
    expect(getQuads(state.store, CONCEPT_A, `${SKOS}prefLabel`, null)).toHaveLength(0)
  })

  it('moves entry to undoStack', () => {
    const state = makeState()
    recordMutation(state, 'test', () => {
      state.store.addQuad(namedNode(CONCEPT_A), namedNode(`${SKOS}altLabel`), literal('x'), defaultGraph())
    })
    undo(state)
    expect(state.redoStack).toHaveLength(1)

    redo(state)
    expect(state.undoStack).toHaveLength(1)
    expect(state.redoStack).toHaveLength(0)
  })

  it('no-ops when stack empty', () => {
    const state = makeState()
    const before = storeSize(state.store)
    redo(state)
    expect(storeSize(state.store)).toBe(before)
    expect(state.undoStack).toHaveLength(0)
  })
})

describe('undo/redo round-trip', () => {
  it('undo then redo restores exact state', () => {
    const state = makeState()
    const beforeSize = storeSize(state.store)

    recordMutation(state, 'add', () => {
      state.store.addQuad(namedNode(CONCEPT_A), namedNode(`${SKOS}altLabel`), literal('Round'), defaultGraph())
    })
    expect(storeSize(state.store)).toBe(beforeSize + 1)

    undo(state)
    expect(storeSize(state.store)).toBe(beforeSize)

    redo(state)
    expect(storeSize(state.store)).toBe(beforeSize + 1)
    expect(getQuads(state.store, CONCEPT_A, `${SKOS}altLabel`, null)[0]!.object.value).toBe('Round')
  })

  it('multi-step undo then redo sequence', () => {
    const state = makeState()
    const initialSize = storeSize(state.store)

    // Three mutations
    recordMutation(state, 'add-1', () => {
      state.store.addQuad(namedNode(CONCEPT_A), namedNode(`${SKOS}altLabel`), literal('one'), defaultGraph())
    })
    recordMutation(state, 'add-2', () => {
      state.store.addQuad(namedNode(CONCEPT_A), namedNode(`${SKOS}altLabel`), literal('two'), defaultGraph())
    })
    recordMutation(state, 'add-3', () => {
      state.store.addQuad(namedNode(CONCEPT_A), namedNode(`${SKOS}altLabel`), literal('three'), defaultGraph())
    })
    expect(storeSize(state.store)).toBe(initialSize + 3)

    // Undo all three
    undo(state)
    undo(state)
    undo(state)
    expect(storeSize(state.store)).toBe(initialSize)

    // Redo two
    redo(state)
    redo(state)
    expect(storeSize(state.store)).toBe(initialSize + 2)
    expect(state.undoStack).toHaveLength(2)
    expect(state.redoStack).toHaveLength(1)
  })

  it('new mutation after undo clears redo', () => {
    const state = makeState()

    recordMutation(state, 'first', () => {
      state.store.addQuad(namedNode(CONCEPT_A), namedNode(`${SKOS}altLabel`), literal('first'), defaultGraph())
    })
    recordMutation(state, 'second', () => {
      state.store.addQuad(namedNode(CONCEPT_A), namedNode(`${SKOS}altLabel`), literal('second'), defaultGraph())
    })

    // Undo one
    undo(state)
    expect(state.redoStack).toHaveLength(1)

    // New mutation forks history
    recordMutation(state, 'branch', () => {
      state.store.addQuad(namedNode(CONCEPT_A), namedNode(`${SKOS}altLabel`), literal('branch'), defaultGraph())
    })
    expect(state.redoStack).toHaveLength(0)
    expect(state.undoStack).toHaveLength(2)
  })
})

describe('revertSubject', () => {
  it('restores subject quads to original', () => {
    const state = makeState()
    // Modify concept A's prefLabel
    recordMutation(state, 'modify', () => {
      state.store.removeQuad(
        namedNode(CONCEPT_A), namedNode(`${SKOS}prefLabel`), literal('Concept A', 'en'), defaultGraph(),
      )
      state.store.addQuad(
        namedNode(CONCEPT_A), namedNode(`${SKOS}prefLabel`), literal('Changed', 'en'), defaultGraph(),
      )
    })
    expect(getQuads(state.store, CONCEPT_A, `${SKOS}prefLabel`, null)[0]!.object.value).toBe('Changed')

    revertSubject(state, CONCEPT_A)

    const quads = getQuads(state.store, CONCEPT_A, `${SKOS}prefLabel`, null)
    expect(quads).toHaveLength(1)
    expect(quads[0]!.object.value).toBe('Concept A')
  })

  it('restores inverse quads (object references)', () => {
    const state = makeState()
    // Remove B's broader reference to A
    recordMutation(state, 'remove-broader', () => {
      state.store.removeQuad(
        namedNode(CONCEPT_B), namedNode(`${SKOS}broader`), namedNode(CONCEPT_A), defaultGraph(),
      )
    })
    expect(getQuads(state.store, CONCEPT_B, `${SKOS}broader`, CONCEPT_A)).toHaveLength(0)

    // Revert A should also fix inverse quads pointing to A
    revertSubject(state, CONCEPT_A)

    // The narrower quad from A → B should be restored
    expect(getQuads(state.store, CONCEPT_A, `${SKOS}narrower`, CONCEPT_B)).toHaveLength(1)
  })

  it('is itself undoable', () => {
    const state = makeState()
    recordMutation(state, 'modify', () => {
      state.store.removeQuad(
        namedNode(CONCEPT_A), namedNode(`${SKOS}prefLabel`), literal('Concept A', 'en'), defaultGraph(),
      )
      state.store.addQuad(
        namedNode(CONCEPT_A), namedNode(`${SKOS}prefLabel`), literal('Changed', 'en'), defaultGraph(),
      )
    })

    revertSubject(state, CONCEPT_A)
    expect(getQuads(state.store, CONCEPT_A, `${SKOS}prefLabel`, null)[0]!.object.value).toBe('Concept A')

    // Undo the revert — should restore to "Changed"
    undo(state)
    expect(getQuads(state.store, CONCEPT_A, `${SKOS}prefLabel`, null)[0]!.object.value).toBe('Changed')
  })
})

describe('recomputeDirty', () => {
  it('returns false when store matches original', () => {
    const state = makeState()
    expect(recomputeDirty(state)).toBe(false)
  })

  it('returns true when store has changes', () => {
    const state = makeState()
    recordMutation(state, 'add', () => {
      state.store.addQuad(namedNode(CONCEPT_A), namedNode(`${SKOS}altLabel`), literal('new'), defaultGraph())
    })
    expect(recomputeDirty(state)).toBe(true)
  })

  it('returns false after undo restores to original', () => {
    const state = makeState()
    recordMutation(state, 'add', () => {
      state.store.addQuad(namedNode(CONCEPT_A), namedNode(`${SKOS}altLabel`), literal('temp'), defaultGraph())
    })
    expect(recomputeDirty(state)).toBe(true)

    undo(state)
    expect(recomputeDirty(state)).toBe(false)
  })
})

describe('clearHistory', () => {
  it('empties both stacks', () => {
    const state = makeState()
    recordMutation(state, 'one', () => {
      state.store.addQuad(namedNode(CONCEPT_A), namedNode(`${SKOS}altLabel`), literal('a'), defaultGraph())
    })
    recordMutation(state, 'two', () => {
      state.store.addQuad(namedNode(CONCEPT_A), namedNode(`${SKOS}altLabel`), literal('b'), defaultGraph())
    })
    undo(state)

    expect(state.undoStack.length).toBeGreaterThan(0)
    expect(state.redoStack.length).toBeGreaterThan(0)

    clearHistory(state)
    expect(state.undoStack).toHaveLength(0)
    expect(state.redoStack).toHaveLength(0)
  })
})
