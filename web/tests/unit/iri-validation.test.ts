/**
 * Tests the production IRI validation helpers used by useEditMode for
 * widget dispatch, save-time validation and defensive serialisation.
 *
 * Unlike the older edit-validation.test.ts (which mirrors validateSubject
 * logic in the test file), these tests import the actual production code
 * — so they will fail if the source diverges from intent.
 */
import { describe, it, expect } from 'vitest'
import { Store, DataFactory } from 'n3'
import {
  isIriValued,
  isValidIri,
  pruneInvalidIriQuads,
  SH_IRI,
} from '~/utils/iri-validation'

const { namedNode, literal, defaultGraph } = DataFactory

const SDO = 'https://schema.org/'
const OWL = 'http://www.w3.org/2002/07/owl#'
const PROV = 'http://www.w3.org/ns/prov#'
const SKOS = 'http://www.w3.org/2004/02/skos/core#'

const SUBJECT = 'http://example.com/vocab'
const PRED = `${OWL}versionIRI`

// ============================================================================
// isIriValued
// ============================================================================

describe('isIriValued', () => {
  it('true when sh:nodeKind is sh:IRI', () => {
    expect(isIriValued({ nodeKind: SH_IRI })).toBe(true)
  })

  it('true when sh:class is set (typed IRI value)', () => {
    expect(isIriValued({ class: `${PROV}Agent` })).toBe(true)
    expect(isIriValued({ class: `${SKOS}Concept` })).toBe(true)
  })

  it('false when neither hint is set', () => {
    expect(isIriValued({})).toBe(false)
  })

  it('false for unrelated nodeKind values', () => {
    expect(isIriValued({ nodeKind: 'http://www.w3.org/ns/shacl#Literal' })).toBe(false)
  })
})

// ============================================================================
// isValidIri
// ============================================================================

describe('isValidIri', () => {
  describe('accepts', () => {
    it.each([
      ['https://example.com/'],
      ['https://example.com/path/to/thing'],
      ['http://example.com'],
      ['urn:isbn:0451450523'],
      ['urn:uuid:f81d4fae-7dec-11d0-a765-00a0c91e6bf6'],
      ['https://linked.data.gov.au/org/ga'],
      ['mailto:someone@example.com'],
      ['ftp://files.example.com/x'],
    ])('%s', (iri) => {
      expect(isValidIri(iri)).toBe(true)
    })
  })

  describe('rejects', () => {
    it.each([
      ['', 'empty string'],
      ['   ', 'whitespace only'],
      ['https://', 'bare https scheme seed'],
      ['http://', 'bare http scheme seed'],
      ['urn:', 'bare urn scheme seed'],
      ['not-an-iri', 'no scheme'],
      ['just text with no colon', 'no scheme'],
      ['1http://x.com', 'scheme starting with digit'],
      ['http //x.com', 'space in scheme'],
      ['https://example .com', 'whitespace in path'],
    ])('%s (%s)', (iri) => {
      expect(isValidIri(iri)).toBe(false)
    })

    it('null', () => expect(isValidIri(null)).toBe(false))
    it('undefined', () => expect(isValidIri(undefined)).toBe(false))
  })

  it('trims before checking — whitespace-padded valid IRI is accepted', () => {
    expect(isValidIri('  https://example.com/  ')).toBe(true)
  })

  it('trims before checking — whitespace-padded bare seed is still rejected', () => {
    expect(isValidIri('  https://  ')).toBe(false)
  })
})

// ============================================================================
// pruneInvalidIriQuads — direct exercise against a real N3.Store
// ============================================================================

describe('pruneInvalidIriQuads', () => {
  function makeStore(): Store {
    return new Store()
  }

  it('strips a quad whose object is the DefaultGraph-typed empty term (from namedNode(""))', () => {
    const s = makeStore()
    // This is what useEditMode.updateValue produces when the user clears
    // an iri-input field — N3 turns namedNode('') into a DefaultGraph-typed term.
    s.addQuad(namedNode(SUBJECT), namedNode(PRED), namedNode(''), defaultGraph())
    expect(s.size).toBe(1)

    const dropped = pruneInvalidIriQuads(s)

    expect(dropped).toBe(1)
    expect(s.size).toBe(0)
  })

  it('strips bare scheme seeds (incomplete iri-input values)', () => {
    const s = makeStore()
    s.addQuad(namedNode(SUBJECT), namedNode(PRED), namedNode('https://'), defaultGraph())
    s.addQuad(namedNode(SUBJECT), namedNode(PRED), namedNode('urn:'), defaultGraph())
    expect(s.size).toBe(2)

    const dropped = pruneInvalidIriQuads(s)

    expect(dropped).toBe(2)
    expect(s.size).toBe(0)
  })

  it('strips malformed IRIs but keeps the valid ones in the same store', () => {
    const s = makeStore()
    s.addQuad(namedNode(SUBJECT), namedNode(PRED), namedNode('https://example.com/v1'), defaultGraph())
    s.addQuad(namedNode(SUBJECT), namedNode(PRED), namedNode('not-an-iri'), defaultGraph())
    s.addQuad(namedNode(SUBJECT), namedNode(PRED), namedNode(''), defaultGraph())

    const dropped = pruneInvalidIriQuads(s)

    expect(dropped).toBe(2)
    expect(s.size).toBe(1)
    const survivors = s.getQuads(null, null, null, null)
    expect(survivors[0]!.object.value).toBe('https://example.com/v1')
  })

  it('preserves literal objects even when their value is empty (literals are a separate concern)', () => {
    const s = makeStore()
    s.addQuad(namedNode(SUBJECT), namedNode(`${SKOS}prefLabel`), literal('', 'en'), defaultGraph())
    s.addQuad(namedNode(SUBJECT), namedNode(`${SKOS}prefLabel`), literal('Concept'), defaultGraph())

    const dropped = pruneInvalidIriQuads(s)

    expect(dropped).toBe(0)
    expect(s.size).toBe(2)
  })

  it('preserves blank-node objects', () => {
    const s = makeStore()
    const { blankNode } = DataFactory
    s.addQuad(namedNode(SUBJECT), namedNode(`${PROV}qualifiedAttribution`), blankNode('b1'), defaultGraph())

    const dropped = pruneInvalidIriQuads(s)

    expect(dropped).toBe(0)
    expect(s.size).toBe(1)
  })

  it('returns 0 and no-ops when the store has no invalid quads', () => {
    const s = makeStore()
    s.addQuad(namedNode(SUBJECT), namedNode(`${SDO}creator`), namedNode('https://linked.data.gov.au/org/ga'), defaultGraph())

    const dropped = pruneInvalidIriQuads(s)

    expect(dropped).toBe(0)
    expect(s.size).toBe(1)
  })
})

// ============================================================================
// Regression scenarios — these mimic the full bug paths from #29 end-to-end
// using only the actual production primitives that drive serialisation.
// ============================================================================

describe('regression scenarios (issue #29)', () => {
  /**
   * Reproduces the broken-TTL symptom Nick reported: an iri-input row was
   * cleared between addValue and save, and `<>` ended up in the serialised
   * output. With pruneInvalidIriQuads run before serialise, the quad is
   * gone and the writer emits clean TTL.
   */
  it('cleared iri-input value never reaches the Turtle writer', async () => {
    const { Writer } = await import('n3')

    const store = new Store()
    // Simulate useEditMode's flow:
    //   addValue('iri', 'https://') → store has https:// seed
    store.addQuad(namedNode(SUBJECT), namedNode(PRED), namedNode('https://'), defaultGraph())
    //   updateValue('') → store now has namedNode('') (DefaultGraph-typed)
    store.removeQuad(namedNode(SUBJECT), namedNode(PRED), namedNode('https://'), defaultGraph())
    store.addQuad(namedNode(SUBJECT), namedNode(PRED), namedNode(''), defaultGraph())

    // Before prune: writer would emit `<>`
    pruneInvalidIriQuads(store)

    const writer = new Writer({ prefixes: { owl: OWL } })
    for (const q of store.getQuads(null, null, null, null)) writer.addQuad(q)
    let ttl = ''
    writer.end((_err, result) => { ttl = result })

    expect(ttl).not.toMatch(/<>/)
    // The predicate IRI lookup is shorthand `owl:versionIRI` but the empty
    // value would have produced `<>`. Absence of that token proves the fix.
    expect(ttl).not.toMatch(/versionIRI\s*[;.]/)
  })
})
