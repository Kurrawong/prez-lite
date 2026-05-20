/**
 * Tests for serializeWithPatch orchestration logic.
 *
 * Standalone function mirroring the composable's serializeWithPatch,
 * using the already-tested ttl-patch utilities.
 */
import { describe, it, expect } from 'vitest'
import { Store, Parser, DataFactory, type Quad } from 'n3'
import {
  extractPrefixes,
  parseSubjectBlocks,
  serializeSubjectBlock,
  patchTTL,
  computeQuadDiff,
  getModifiedSubjects,
  type ParsedTTL,
} from '~/utils/ttl-patch'

const { namedNode, literal, defaultGraph } = DataFactory

const SKOS = 'http://www.w3.org/2004/02/skos/core#'
const RDF = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#'

// ============================================================================
// Helpers
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

/**
 * Standalone serializeWithPatch — mirrors useEditMode.serializeWithPatch
 * including the duplicate-prevention guard: if a modified subject exists in
 * original store but parse found no block, fall back to full serialize.
 */
function serializeWithPatch(
  store: Store,
  originalStore: Store,
  originalParsedTTL: ParsedTTL,
  prefixes: Record<string, string>,
  subjectIri?: string,
): string {
  const { added, removed } = computeQuadDiff(originalStore, store)
  const modifiedSubjects = subjectIri
    ? new Set([subjectIri])
    : getModifiedSubjects(added, removed)

  const patches = new Map<string, string | null>()
  const newBlocks: string[] = []

  const originalSubjectIris = new Set(
    originalParsedTTL.subjectBlocks.map(b => b.subjectIri),
  )

  const originalStoreSubjectIris = new Set<string>()
  for (const q of originalStore.getQuads(null, null, null, null) as Quad[]) {
    if (q.subject.termType !== 'BlankNode') originalStoreSubjectIris.add(q.subject.value)
  }

  let fallbackToFullSerialize = false
  for (const sIri of modifiedSubjects) {
    const hasQuads = store.getQuads(sIri, null, null, null).length > 0

    if (!hasQuads) {
      if (originalSubjectIris.has(sIri)) {
        patches.set(sIri, null)
      }
    } else if (originalSubjectIris.has(sIri)) {
      patches.set(sIri, serializeSubjectBlock(store, sIri, prefixes))
    } else {
      if (originalStoreSubjectIris.has(sIri)) {
        fallbackToFullSerialize = true
        break
      }
      const block = serializeSubjectBlock(store, sIri, prefixes)
      if (block) newBlocks.push(block)
    }
  }

  if (fallbackToFullSerialize) {
    return fullSerializeTTL(store, originalParsedTTL.prefixBlock, prefixes)
  }
  return patchTTL(originalParsedTTL, patches, newBlocks.length ? newBlocks : undefined)
}

/** Full serialize of store to TTL (used when patch would duplicate a subject). */
function fullSerializeTTL(store: Store, prefixBlock: string, prefixes: Record<string, string>): string {
  const subjectIris = new Set<string>()
  for (const q of store.getQuads(null, null, null, null) as Quad[]) {
    if (q.subject.termType !== 'BlankNode') subjectIris.add(q.subject.value)
  }
  const blocks: string[] = []
  for (const iri of subjectIris) {
    const block = serializeSubjectBlock(store, iri, prefixes)
    if (block) blocks.push(block)
  }
  return prefixBlock + blocks.join('\n') + '\n'
}

// ============================================================================
// Fixture
// ============================================================================

const SCHEME = 'http://example.com/vocab/'
const CONCEPT_A = `${SCHEME}a`
const CONCEPT_B = `${SCHEME}b`

const BASE_TTL = `@prefix skos: <http://www.w3.org/2004/02/skos/core#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix cs: <http://example.com/vocab/> .

cs: a skos:ConceptScheme ;
    skos:prefLabel "Test Vocab"@en .

cs:a a skos:Concept ;
    skos:prefLabel "Concept A"@en ;
    skos:inScheme cs: .

cs:b a skos:Concept ;
    skos:prefLabel "Concept B"@en ;
    skos:inScheme cs: ;
    skos:broader cs:a .
`

const PREFIXES = {
  skos: SKOS,
  rdf: RDF,
  cs: SCHEME,
}

interface TestContext {
  store: Store
  originalStore: Store
  parsedTTL: ParsedTTL
}

function makeContext(): TestContext {
  const originalStore = parseTTL(BASE_TTL)
  const store = cloneStore(originalStore)
  const prefixes = extractPrefixes(BASE_TTL)
  const parsedTTL = parseSubjectBlocks(BASE_TTL, originalStore, prefixes)
  return { store, originalStore, parsedTTL }
}

// ============================================================================
// Tests
// ============================================================================

describe('serializeWithPatch', () => {
  describe('modified subjects', () => {
    it('patches only modified block', () => {
      const { store, originalStore, parsedTTL } = makeContext()

      // Modify concept A's prefLabel
      store.removeQuad(namedNode(CONCEPT_A), namedNode(`${SKOS}prefLabel`), literal('Concept A', 'en'), defaultGraph())
      store.addQuad(namedNode(CONCEPT_A), namedNode(`${SKOS}prefLabel`), literal('Updated A', 'en'), defaultGraph())

      const result = serializeWithPatch(store, originalStore, parsedTTL, PREFIXES)

      expect(result).toContain('Updated A')
      expect(result).not.toContain('"Concept A"')
      // Other blocks unchanged
      expect(result).toContain('"Concept B"')
      expect(result).toContain('"Test Vocab"')
    })

    it('leaves other blocks unchanged', () => {
      const { store, originalStore, parsedTTL } = makeContext()

      // Modify only concept B
      store.removeQuad(namedNode(CONCEPT_B), namedNode(`${SKOS}prefLabel`), literal('Concept B', 'en'), defaultGraph())
      store.addQuad(namedNode(CONCEPT_B), namedNode(`${SKOS}prefLabel`), literal('New B', 'en'), defaultGraph())

      const result = serializeWithPatch(store, originalStore, parsedTTL, PREFIXES)

      // Scheme block should be byte-identical to original
      const schemeBlock = parsedTTL.subjectBlocks.find(b => b.subjectIri === SCHEME)!
      expect(result).toContain(schemeBlock.originalText)
      // Concept A block should be byte-identical
      const aBlock = parsedTTL.subjectBlocks.find(b => b.subjectIri === CONCEPT_A)!
      expect(result).toContain(aBlock.originalText)
    })

    it('handles literal update + predicate add/remove', () => {
      const { store, originalStore, parsedTTL } = makeContext()

      // Update prefLabel and add altLabel to concept A
      store.removeQuad(namedNode(CONCEPT_A), namedNode(`${SKOS}prefLabel`), literal('Concept A', 'en'), defaultGraph())
      store.addQuad(namedNode(CONCEPT_A), namedNode(`${SKOS}prefLabel`), literal('Modified A', 'en'), defaultGraph())
      store.addQuad(namedNode(CONCEPT_A), namedNode(`${SKOS}altLabel`), literal('Alt A', 'en'), defaultGraph())

      const result = serializeWithPatch(store, originalStore, parsedTTL, PREFIXES)

      expect(result).toContain('Modified A')
      expect(result).toContain('Alt A')
      expect(result).not.toContain('"Concept A"')
    })
  })

  describe('deleted subjects', () => {
    it('removes block for deleted subject', () => {
      const { store, originalStore, parsedTTL } = makeContext()

      // Delete all quads for concept B
      const bQuads = store.getQuads(CONCEPT_B, null, null, null) as Quad[]
      store.removeQuads(bQuads)
      // Also remove quads where B is the object (broader reference from A)
      const bAsObj = store.getQuads(null, null, CONCEPT_B, null) as Quad[]
      store.removeQuads(bAsObj)

      const result = serializeWithPatch(store, originalStore, parsedTTL, PREFIXES)

      expect(result).not.toContain('Concept B')
      expect(result).toContain('"Concept A"')
      expect(result).toContain('"Test Vocab"')
    })

    it('other blocks intact after deletion', () => {
      const { store, originalStore, parsedTTL } = makeContext()

      // Delete concept A
      store.removeQuads(store.getQuads(CONCEPT_A, null, null, null) as Quad[])
      store.removeQuads(store.getQuads(null, null, CONCEPT_A, null) as Quad[])

      const result = serializeWithPatch(store, originalStore, parsedTTL, PREFIXES)

      expect(result).not.toContain('"Concept A"')
      // Scheme block should remain
      expect(result).toContain('"Test Vocab"')
    })
  })

  describe('new subjects', () => {
    it('appends new block', () => {
      const { store, originalStore, parsedTTL } = makeContext()

      const newIri = `${SCHEME}c`
      store.addQuad(namedNode(newIri), namedNode(`${RDF}type`), namedNode(`${SKOS}Concept`), defaultGraph())
      store.addQuad(namedNode(newIri), namedNode(`${SKOS}prefLabel`), literal('Concept C', 'en'), defaultGraph())
      store.addQuad(namedNode(newIri), namedNode(`${SKOS}inScheme`), namedNode(SCHEME), defaultGraph())

      const result = serializeWithPatch(store, originalStore, parsedTTL, PREFIXES)

      expect(result).toContain('Concept C')
      // Existing blocks intact
      expect(result).toContain('"Concept A"')
      expect(result).toContain('"Concept B"')
    })

    it('serialized with correct prefixes', () => {
      const { store, originalStore, parsedTTL } = makeContext()

      const newIri = `${SCHEME}d`
      store.addQuad(namedNode(newIri), namedNode(`${RDF}type`), namedNode(`${SKOS}Concept`), defaultGraph())
      store.addQuad(namedNode(newIri), namedNode(`${SKOS}prefLabel`), literal('Concept D', 'en'), defaultGraph())

      const result = serializeWithPatch(store, originalStore, parsedTTL, PREFIXES)

      // New block should use prefixed names
      expect(result).toContain('cs:d')
      expect(result).toContain('skos:Concept')
    })
  })

  describe('subjectIri filter', () => {
    it('patches only specified subject', () => {
      const { store, originalStore, parsedTTL } = makeContext()

      // Modify both A and B
      store.removeQuad(namedNode(CONCEPT_A), namedNode(`${SKOS}prefLabel`), literal('Concept A', 'en'), defaultGraph())
      store.addQuad(namedNode(CONCEPT_A), namedNode(`${SKOS}prefLabel`), literal('Changed A', 'en'), defaultGraph())
      store.removeQuad(namedNode(CONCEPT_B), namedNode(`${SKOS}prefLabel`), literal('Concept B', 'en'), defaultGraph())
      store.addQuad(namedNode(CONCEPT_B), namedNode(`${SKOS}prefLabel`), literal('Changed B', 'en'), defaultGraph())

      // Only patch concept A
      const result = serializeWithPatch(store, originalStore, parsedTTL, PREFIXES, CONCEPT_A)

      expect(result).toContain('Changed A')
      // B should NOT be patched — original text preserved
      const bBlock = parsedTTL.subjectBlocks.find(b => b.subjectIri === CONCEPT_B)!
      expect(result).toContain(bBlock.originalText)
    })

    it('ignores other changes when filter set', () => {
      const { store, originalStore, parsedTTL } = makeContext()

      // Add new concept C and modify A
      store.addQuad(namedNode(`${SCHEME}c`), namedNode(`${RDF}type`), namedNode(`${SKOS}Concept`), defaultGraph())
      store.removeQuad(namedNode(CONCEPT_A), namedNode(`${SKOS}prefLabel`), literal('Concept A', 'en'), defaultGraph())
      store.addQuad(namedNode(CONCEPT_A), namedNode(`${SKOS}prefLabel`), literal('Changed A', 'en'), defaultGraph())

      // Filter to A only — new concept C should not appear
      const result = serializeWithPatch(store, originalStore, parsedTTL, PREFIXES, CONCEPT_A)

      expect(result).toContain('Changed A')
      expect(result).not.toContain('cs:c')
    })
  })

  describe('round-trip', () => {
    it('output re-parses to equivalent quads', () => {
      const { store, originalStore, parsedTTL } = makeContext()

      // Make a modification
      store.removeQuad(namedNode(CONCEPT_A), namedNode(`${SKOS}prefLabel`), literal('Concept A', 'en'), defaultGraph())
      store.addQuad(namedNode(CONCEPT_A), namedNode(`${SKOS}prefLabel`), literal('Round Trip A', 'en'), defaultGraph())

      const result = serializeWithPatch(store, originalStore, parsedTTL, PREFIXES)

      // Re-parse the output
      const reparsed = parseTTL(result)
      const prefLabel = reparsed.getQuads(CONCEPT_A, `${SKOS}prefLabel`, null, null)
      expect(prefLabel).toHaveLength(1)
      expect(prefLabel[0]!.object.value).toBe('Round Trip A')

      // Unchanged quads should also survive round-trip
      const bLabel = reparsed.getQuads(CONCEPT_B, `${SKOS}prefLabel`, null, null)
      expect(bLabel).toHaveLength(1)
      expect(bLabel[0]!.object.value).toBe('Concept B')
    })

    it('preserves prefix block', () => {
      const { store, originalStore, parsedTTL } = makeContext()

      store.addQuad(namedNode(CONCEPT_A), namedNode(`${SKOS}altLabel`), literal('Alt'), defaultGraph())

      const result = serializeWithPatch(store, originalStore, parsedTTL, PREFIXES)

      expect(result).toContain('@prefix skos:')
      expect(result).toContain('@prefix cs:')
    })
  })

  describe('edge cases', () => {
    it('no changes returns original TTL', () => {
      const { store, originalStore, parsedTTL } = makeContext()

      const result = serializeWithPatch(store, originalStore, parsedTTL, PREFIXES)
      expect(result).toBe(BASE_TTL)
    })

    it('handles empty originalParsedTTL', () => {
      const { store, originalStore } = makeContext()

      const emptyParsed: ParsedTTL = {
        prefixBlock: '@prefix skos: <http://www.w3.org/2004/02/skos/core#> .\n\n',
        subjectBlocks: [],
        trailingText: '',
      }

      // Add a new subject to current store
      store.addQuad(namedNode(`${SCHEME}new`), namedNode(`${RDF}type`), namedNode(`${SKOS}Concept`), defaultGraph())
      store.addQuad(namedNode(`${SCHEME}new`), namedNode(`${SKOS}prefLabel`), literal('New'), defaultGraph())

      const result = serializeWithPatch(store, originalStore, emptyParsed, PREFIXES)

      // Should contain the prefix block and the new subject
      expect(result).toContain('@prefix skos:')
      expect(result).toContain('New')
    })

    it('does not duplicate subject when parser missed block (fallback to full serialize)', () => {
      const { store, originalStore, parsedTTL } = makeContext()

      // Simulate parser missing CONCEPT_A: parsed TTL has only scheme and B
      const parsedWithoutA: ParsedTTL = {
        ...parsedTTL,
        subjectBlocks: parsedTTL.subjectBlocks.filter(b => b.subjectIri !== CONCEPT_A),
      }
      expect(parsedWithoutA.subjectBlocks.some(b => b.subjectIri === CONCEPT_A)).toBe(false)
      expect(originalStore.getQuads(CONCEPT_A, null, null, null).length).toBeGreaterThan(0)

      // Modify concept A in store
      store.removeQuad(namedNode(CONCEPT_A), namedNode(`${SKOS}prefLabel`), literal('Concept A', 'en'), defaultGraph())
      store.addQuad(namedNode(CONCEPT_A), namedNode(`${SKOS}prefLabel`), literal('Modified A', 'en'), defaultGraph())

      const result = serializeWithPatch(store, originalStore, parsedWithoutA, PREFIXES)

      // Must contain Modified A exactly once (no duplicate from append)
      const count = (result.match(/Modified A/g) || []).length
      expect(count).toBe(1)
      expect(result).toContain('Modified A')
    })
  })

  /**
   * Defensive pruning before serialise (issue #29). Mirrors the
   * pruneInvalidQuads helper in useEditMode — quads whose object is an
   * empty / non-IRI NamedNode (or N3's DefaultGraph-typed empty term)
   * must be stripped before output to avoid emitting broken `<>` syntax.
   */
  describe('pruneInvalidQuads (#29)', () => {
    const BARE_SCHEME_SEEDS = new Set(['https://', 'http://', 'urn:'])
    function isValidIri(value: string | undefined | null): boolean {
      if (!value) return false
      const v = value.trim()
      if (!v) return false
      if (BARE_SCHEME_SEEDS.has(v)) return false
      return /^[a-zA-Z][a-zA-Z0-9+.\-]*:[^\s]+$/.test(v)
    }
    function pruneInvalidQuads(store: Store): number {
      const invalid = (store.getQuads(null, null, null, null) as Quad[])
        .filter(q => {
          const obj = q.object
          if (obj.termType !== 'Literal' && obj.termType !== 'BlankNode' && !obj.value) return true
          if (obj.termType === 'NamedNode' && !isValidIri(obj.value)) return true
          return false
        })
      store.removeQuads(invalid)
      return invalid.length
    }

    const SUBJECT = 'http://example.com/vocab'
    const PRED = 'http://www.w3.org/2002/07/owl#versionIRI'

    it('drops quads whose object is an empty IRI (DefaultGraph-typed in N3)', () => {
      const store = new Store()
      // namedNode('') gets normalised to DefaultGraph by N3
      store.addQuad(namedNode(SUBJECT), namedNode(PRED), namedNode(''), defaultGraph())
      expect(store.size).toBe(1)
      const dropped = pruneInvalidQuads(store)
      expect(dropped).toBe(1)
      expect(store.size).toBe(0)
    })

    it('drops quads with bare scheme seed IRIs', () => {
      const store = new Store()
      store.addQuad(namedNode(SUBJECT), namedNode(PRED), namedNode('https://'), defaultGraph())
      const dropped = pruneInvalidQuads(store)
      expect(dropped).toBe(1)
      expect(store.size).toBe(0)
    })

    it('keeps valid IRI quads', () => {
      const store = new Store()
      store.addQuad(namedNode(SUBJECT), namedNode(PRED), namedNode('https://example.com/v/1'), defaultGraph())
      const dropped = pruneInvalidQuads(store)
      expect(dropped).toBe(0)
      expect(store.size).toBe(1)
    })

    it('keeps literal values even if empty (they are a separate concern)', () => {
      const store = new Store()
      store.addQuad(namedNode(SUBJECT), namedNode(`${SKOS}prefLabel`), literal(''), defaultGraph())
      const dropped = pruneInvalidQuads(store)
      expect(dropped).toBe(0)
      expect(store.size).toBe(1)
    })

    it('strips multiple invalid quads in one pass', () => {
      const store = new Store()
      store.addQuad(namedNode(SUBJECT), namedNode(PRED), namedNode(''), defaultGraph())
      store.addQuad(namedNode(SUBJECT), namedNode(PRED), namedNode('http://'), defaultGraph())
      store.addQuad(namedNode(SUBJECT), namedNode(PRED), namedNode('https://example.com/ok'), defaultGraph())
      const dropped = pruneInvalidQuads(store)
      expect(dropped).toBe(2)
      expect(store.size).toBe(1)
    })
  })
})
