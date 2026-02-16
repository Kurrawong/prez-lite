/**
 * Tests for the N3.Store mutation patterns used in useEditMode.
 *
 * These test the same quad-level operations the composable performs,
 * without needing Vue reactivity or Nuxt context.
 */
import { describe, it, expect } from 'vitest'
import { Store, Parser, DataFactory, type Quad } from 'n3'

const { namedNode, literal, defaultGraph } = DataFactory

const SKOS = 'http://www.w3.org/2004/02/skos/core#'
const RDF = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#'

// ============================================================================
// Helpers — mirror the composable's internal patterns
// ============================================================================

function parseTTL(ttl: string): Store {
  const parser = new Parser({ format: 'Turtle' })
  const store = new Store()
  store.addQuads(parser.parse(ttl))
  return store
}

function getQuads(store: Store, s: string | null, p: string | null, o: string | null): Quad[] {
  return store.getQuads(s, p, o, null) as Quad[]
}

/** Replicate updateValue: remove old quad, add new with same type/lang/datatype */
function updateValue(
  store: Store,
  subjectIri: string,
  predicateIri: string,
  oldValue: { type: 'literal' | 'iri'; value: string; language?: string; datatype?: string },
  newValue: string,
) {
  const s = namedNode(subjectIri)
  const p = namedNode(predicateIri)
  const oldObj = oldValue.type === 'iri'
    ? namedNode(oldValue.value)
    : oldValue.language
      ? literal(oldValue.value, oldValue.language)
      : oldValue.datatype
        ? literal(oldValue.value, namedNode(oldValue.datatype))
        : literal(oldValue.value)
  store.removeQuad(s, p, oldObj, defaultGraph())
  const newObj = oldValue.type === 'iri'
    ? namedNode(newValue)
    : oldValue.language
      ? literal(newValue, oldValue.language)
      : oldValue.datatype
        ? literal(newValue, namedNode(oldValue.datatype))
        : literal(newValue)
  store.addQuad(s, p, newObj, defaultGraph())
}

function updateValueLanguage(
  store: Store,
  subjectIri: string,
  predicateIri: string,
  oldValue: { value: string; language?: string; datatype?: string },
  newLang: string,
) {
  const s = namedNode(subjectIri)
  const p = namedNode(predicateIri)
  const oldObj = oldValue.language
    ? literal(oldValue.value, oldValue.language)
    : oldValue.datatype
      ? literal(oldValue.value, namedNode(oldValue.datatype))
      : literal(oldValue.value)
  store.removeQuad(s, p, oldObj, defaultGraph())
  const newObj = newLang ? literal(oldValue.value, newLang) : literal(oldValue.value)
  store.addQuad(s, p, newObj, defaultGraph())
}

function syncBroaderNarrower(
  store: Store,
  conceptIri: string,
  schemeIri: string,
  newBroaderIris: string[],
  oldBroaderIris: string[],
) {
  const s = namedNode(conceptIri)
  const schemeNode = namedNode(schemeIri)
  for (const oldB of oldBroaderIris) {
    store.removeQuad(s, namedNode(`${SKOS}broader`), namedNode(oldB), defaultGraph())
    store.removeQuad(namedNode(oldB), namedNode(`${SKOS}narrower`), s, defaultGraph())
  }
  for (const newB of newBroaderIris) {
    store.addQuad(s, namedNode(`${SKOS}broader`), namedNode(newB), defaultGraph())
    store.addQuad(namedNode(newB), namedNode(`${SKOS}narrower`), s, defaultGraph())
  }
  if (newBroaderIris.length === 0) {
    if (!store.getQuads(conceptIri, `${SKOS}topConceptOf`, schemeIri, null).length) {
      store.addQuad(s, namedNode(`${SKOS}topConceptOf`), schemeNode, defaultGraph())
    }
    if (!store.getQuads(schemeIri, `${SKOS}hasTopConcept`, conceptIri, null).length) {
      store.addQuad(schemeNode, namedNode(`${SKOS}hasTopConcept`), s, defaultGraph())
    }
  } else {
    store.removeQuads(store.getQuads(conceptIri, `${SKOS}topConceptOf`, schemeIri, null))
    store.removeQuads(store.getQuads(schemeIri, `${SKOS}hasTopConcept`, conceptIri, null))
  }
}

function syncRelated(
  store: Store,
  conceptIri: string,
  newRelatedIris: string[],
  oldRelatedIris: string[],
) {
  const s = namedNode(conceptIri)
  for (const oldR of oldRelatedIris) {
    store.removeQuad(s, namedNode(`${SKOS}related`), namedNode(oldR), defaultGraph())
    store.removeQuad(namedNode(oldR), namedNode(`${SKOS}related`), s, defaultGraph())
  }
  for (const newR of newRelatedIris) {
    store.addQuad(s, namedNode(`${SKOS}related`), namedNode(newR), defaultGraph())
    store.addQuad(namedNode(newR), namedNode(`${SKOS}related`), s, defaultGraph())
  }
}

function renameSubject(store: Store, oldIri: string, newIri: string) {
  if (oldIri === newIri) return
  const oldNode = namedNode(oldIri)
  const newNode = namedNode(newIri)
  const asSubject = store.getQuads(oldIri, null, null, null) as Quad[]
  for (const q of asSubject) {
    store.removeQuad(q)
    store.addQuad(newNode, q.predicate, q.object, q.graph)
  }
  const asObject = store.getQuads(null, null, oldNode, null) as Quad[]
  for (const q of asObject) {
    store.removeQuad(q)
    store.addQuad(q.subject, q.predicate, newNode, q.graph)
  }
}

function addConcept(
  store: Store,
  schemeIri: string,
  localName: string,
  prefLabel: string,
  broaderIri?: string,
): string {
  const base = schemeIri.endsWith('/') || schemeIri.endsWith('#') ? schemeIri : `${schemeIri}/`
  const conceptIri = `${base}${localName}`
  const s = namedNode(conceptIri)
  const schemeNode = namedNode(schemeIri)
  store.addQuad(s, namedNode(`${RDF}type`), namedNode(`${SKOS}Concept`), defaultGraph())
  store.addQuad(s, namedNode(`${SKOS}prefLabel`), literal(prefLabel, 'en'), defaultGraph())
  store.addQuad(s, namedNode(`${SKOS}inScheme`), schemeNode, defaultGraph())
  if (broaderIri) {
    store.addQuad(s, namedNode(`${SKOS}broader`), namedNode(broaderIri), defaultGraph())
    store.addQuad(namedNode(broaderIri), namedNode(`${SKOS}narrower`), s, defaultGraph())
  } else {
    store.addQuad(s, namedNode(`${SKOS}topConceptOf`), schemeNode, defaultGraph())
    store.addQuad(schemeNode, namedNode(`${SKOS}hasTopConcept`), s, defaultGraph())
  }
  return conceptIri
}

function deleteConcept(store: Store, iri: string, schemeIri: string) {
  const broaderIris = (store.getQuads(iri, `${SKOS}broader`, null, null) as Quad[]).map(q => q.object.value)
  const childIris = (store.getQuads(iri, `${SKOS}narrower`, null, null) as Quad[]).map(q => q.object.value)
  store.removeQuads(store.getQuads(iri, null, null, null))
  store.removeQuads(store.getQuads(null, null, iri, null))
  for (const childIri of childIris) {
    if (broaderIris.length > 0) {
      for (const parentIri of broaderIris) {
        store.addQuad(namedNode(childIri), namedNode(`${SKOS}broader`), namedNode(parentIri), defaultGraph())
        store.addQuad(namedNode(parentIri), namedNode(`${SKOS}narrower`), namedNode(childIri), defaultGraph())
      }
    } else {
      const schemeNode = namedNode(schemeIri)
      store.addQuad(namedNode(childIri), namedNode(`${SKOS}topConceptOf`), schemeNode, defaultGraph())
      store.addQuad(schemeNode, namedNode(`${SKOS}hasTopConcept`), namedNode(childIri), defaultGraph())
    }
  }
}

// ============================================================================
// Tests
// ============================================================================

const SCHEME = 'http://example.com/vocab/'
const CONCEPT_A = `${SCHEME}a`
const CONCEPT_B = `${SCHEME}b`
const CONCEPT_C = `${SCHEME}c`

function makeTestStore(): Store {
  return parseTTL(`
@prefix skos: <http://www.w3.org/2004/02/skos/core#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix cs: <http://example.com/vocab/> .

cs: a skos:ConceptScheme ;
    skos:prefLabel "Test Vocab"@en .

cs:a a skos:Concept ;
    skos:prefLabel "Concept A"@en ;
    skos:altLabel "Alt A"@en ;
    skos:definition "Def A"@en ;
    skos:inScheme cs: ;
    skos:topConceptOf cs: ;
    skos:narrower cs:b .

cs:b a skos:Concept ;
    skos:prefLabel "Concept B"@en ;
    skos:inScheme cs: ;
    skos:broader cs:a .

cs: skos:hasTopConcept cs:a .
`)
}

describe('updateValue', () => {
  it('replaces a literal value preserving language', () => {
    const store = makeTestStore()
    updateValue(store, CONCEPT_A, `${SKOS}prefLabel`, {
      type: 'literal', value: 'Concept A', language: 'en',
    }, 'Concept A Updated')

    const quads = getQuads(store, CONCEPT_A, `${SKOS}prefLabel`, null)
    expect(quads).toHaveLength(1)
    expect(quads[0]!.object.value).toBe('Concept A Updated')
    expect((quads[0]!.object as any).language).toBe('en')
  })

  it('replaces a literal value preserving datatype', () => {
    const store = new Store()
    store.addQuad(
      namedNode(CONCEPT_A),
      namedNode(`${SKOS}notation`),
      literal('42', namedNode('http://www.w3.org/2001/XMLSchema#integer')),
    )

    updateValue(store, CONCEPT_A, `${SKOS}notation`, {
      type: 'literal', value: '42', datatype: 'http://www.w3.org/2001/XMLSchema#integer',
    }, '99')

    const quads = getQuads(store, CONCEPT_A, `${SKOS}notation`, null)
    expect(quads).toHaveLength(1)
    expect(quads[0]!.object.value).toBe('99')
    expect((quads[0]!.object as any).datatype.value).toBe('http://www.w3.org/2001/XMLSchema#integer')
  })

  it('replaces an IRI value', () => {
    const store = makeTestStore()
    const oldBroader = CONCEPT_A
    const newBroader = CONCEPT_C

    // Add a concept C, then update B's broader from A to C
    store.addQuad(namedNode(CONCEPT_C), namedNode(`${RDF}type`), namedNode(`${SKOS}Concept`))
    updateValue(store, CONCEPT_B, `${SKOS}broader`, {
      type: 'iri', value: oldBroader,
    }, newBroader)

    const quads = getQuads(store, CONCEPT_B, `${SKOS}broader`, null)
    expect(quads).toHaveLength(1)
    expect(quads[0]!.object.value).toBe(CONCEPT_C)
  })
})

describe('updateValueLanguage', () => {
  it('changes language tag', () => {
    const store = makeTestStore()
    updateValueLanguage(store, CONCEPT_A, `${SKOS}prefLabel`, {
      value: 'Concept A', language: 'en',
    }, 'fr')

    const quads = getQuads(store, CONCEPT_A, `${SKOS}prefLabel`, null)
    expect(quads).toHaveLength(1)
    expect(quads[0]!.object.value).toBe('Concept A')
    expect((quads[0]!.object as any).language).toBe('fr')
  })

  it('removes language tag', () => {
    const store = makeTestStore()
    updateValueLanguage(store, CONCEPT_A, `${SKOS}prefLabel`, {
      value: 'Concept A', language: 'en',
    }, '')

    const quads = getQuads(store, CONCEPT_A, `${SKOS}prefLabel`, null)
    expect(quads).toHaveLength(1)
    expect((quads[0]!.object as any).language).toBe('')
  })

  it('adds language tag to plain literal', () => {
    const store = new Store()
    store.addQuad(namedNode(CONCEPT_A), namedNode(`${SKOS}prefLabel`), literal('Test'))

    updateValueLanguage(store, CONCEPT_A, `${SKOS}prefLabel`, {
      value: 'Test',
    }, 'de')

    const quads = getQuads(store, CONCEPT_A, `${SKOS}prefLabel`, null)
    expect(quads).toHaveLength(1)
    expect((quads[0]!.object as any).language).toBe('de')
  })
})

describe('addValue / removeValue', () => {
  it('addValue adds empty literal quad', () => {
    const store = makeTestStore()
    const before = getQuads(store, CONCEPT_A, `${SKOS}altLabel`, null).length

    store.addQuad(namedNode(CONCEPT_A), namedNode(`${SKOS}altLabel`), literal(''), defaultGraph())

    const after = getQuads(store, CONCEPT_A, `${SKOS}altLabel`, null)
    expect(after).toHaveLength(before + 1)
    expect(after.some(q => q.object.value === '')).toBe(true)
  })

  it('removeValue removes specific quad', () => {
    const store = makeTestStore()
    // Remove the altLabel "Alt A"@en
    store.removeQuad(
      namedNode(CONCEPT_A),
      namedNode(`${SKOS}altLabel`),
      literal('Alt A', 'en'),
      defaultGraph(),
    )

    const quads = getQuads(store, CONCEPT_A, `${SKOS}altLabel`, null)
    expect(quads).toHaveLength(0)
  })
})

describe('syncBroaderNarrower', () => {
  it('adds broader + inverse narrower', () => {
    const store = makeTestStore()
    // Make B also broader of A (adding a second broader)
    syncBroaderNarrower(store, CONCEPT_A, SCHEME, [CONCEPT_B], [])

    expect(getQuads(store, CONCEPT_A, `${SKOS}broader`, CONCEPT_B)).toHaveLength(1)
    expect(getQuads(store, CONCEPT_B, `${SKOS}narrower`, CONCEPT_A)).toHaveLength(1)
  })

  it('removes old broader and inverse narrower', () => {
    const store = makeTestStore()
    // B currently has broader A. Remove it.
    syncBroaderNarrower(store, CONCEPT_B, SCHEME, [], [CONCEPT_A])

    expect(getQuads(store, CONCEPT_B, `${SKOS}broader`, null)).toHaveLength(0)
    expect(getQuads(store, CONCEPT_A, `${SKOS}narrower`, CONCEPT_B)).toHaveLength(0)
  })

  it('promotes to top concept when broader removed', () => {
    const store = makeTestStore()
    syncBroaderNarrower(store, CONCEPT_B, SCHEME, [], [CONCEPT_A])

    expect(getQuads(store, CONCEPT_B, `${SKOS}topConceptOf`, SCHEME)).toHaveLength(1)
    expect(getQuads(store, SCHEME, `${SKOS}hasTopConcept`, CONCEPT_B)).toHaveLength(1)
  })

  it('removes top concept status when broader added', () => {
    const store = makeTestStore()
    // A is currently a top concept. Give it a broader.
    const parent = 'http://example.com/vocab/parent'
    store.addQuad(namedNode(parent), namedNode(`${RDF}type`), namedNode(`${SKOS}Concept`))
    syncBroaderNarrower(store, CONCEPT_A, SCHEME, [parent], [])

    expect(getQuads(store, CONCEPT_A, `${SKOS}topConceptOf`, null)).toHaveLength(0)
    expect(getQuads(store, SCHEME, `${SKOS}hasTopConcept`, CONCEPT_A)).toHaveLength(0)
  })

  it('swaps broader from one parent to another', () => {
    const store = makeTestStore()
    const parent2 = 'http://example.com/vocab/parent2'
    store.addQuad(namedNode(parent2), namedNode(`${RDF}type`), namedNode(`${SKOS}Concept`))

    syncBroaderNarrower(store, CONCEPT_B, SCHEME, [parent2], [CONCEPT_A])

    expect(getQuads(store, CONCEPT_B, `${SKOS}broader`, CONCEPT_A)).toHaveLength(0)
    expect(getQuads(store, CONCEPT_A, `${SKOS}narrower`, CONCEPT_B)).toHaveLength(0)
    expect(getQuads(store, CONCEPT_B, `${SKOS}broader`, parent2)).toHaveLength(1)
    expect(getQuads(store, parent2, `${SKOS}narrower`, CONCEPT_B)).toHaveLength(1)
  })
})

describe('syncRelated', () => {
  it('adds symmetric related quads', () => {
    const store = makeTestStore()
    syncRelated(store, CONCEPT_A, [CONCEPT_B], [])

    expect(getQuads(store, CONCEPT_A, `${SKOS}related`, CONCEPT_B)).toHaveLength(1)
    expect(getQuads(store, CONCEPT_B, `${SKOS}related`, CONCEPT_A)).toHaveLength(1)
  })

  it('removes symmetric related quads', () => {
    const store = makeTestStore()
    // First add the relationship
    syncRelated(store, CONCEPT_A, [CONCEPT_B], [])
    // Then remove it
    syncRelated(store, CONCEPT_A, [], [CONCEPT_B])

    expect(getQuads(store, CONCEPT_A, `${SKOS}related`, CONCEPT_B)).toHaveLength(0)
    expect(getQuads(store, CONCEPT_B, `${SKOS}related`, CONCEPT_A)).toHaveLength(0)
  })
})

describe('renameSubject', () => {
  it('rewrites quads where IRI is subject', () => {
    const store = makeTestStore()
    const newIri = 'http://example.com/vocab/a-renamed'
    renameSubject(store, CONCEPT_A, newIri)

    expect(getQuads(store, CONCEPT_A, null, null)).toHaveLength(0)
    expect(getQuads(store, newIri, `${SKOS}prefLabel`, null)).toHaveLength(1)
    expect(getQuads(store, newIri, `${RDF}type`, null)).toHaveLength(1)
  })

  it('rewrites quads where IRI is object', () => {
    const store = makeTestStore()
    const newIri = 'http://example.com/vocab/a-renamed'
    renameSubject(store, CONCEPT_A, newIri)

    // B had broader=A, should now point to new IRI
    const broaderQuads = getQuads(store, CONCEPT_B, `${SKOS}broader`, null)
    expect(broaderQuads).toHaveLength(1)
    expect(broaderQuads[0]!.object.value).toBe(newIri)

    // Scheme had hasTopConcept=A
    const topQuads = getQuads(store, SCHEME, `${SKOS}hasTopConcept`, null)
    expect(topQuads).toHaveLength(1)
    expect(topQuads[0]!.object.value).toBe(newIri)
  })

  it('no-ops when old and new IRI are the same', () => {
    const store = makeTestStore()
    const before = store.getQuads(null, null, null, null).length
    renameSubject(store, CONCEPT_A, CONCEPT_A)
    expect(store.getQuads(null, null, null, null).length).toBe(before)
  })
})

describe('addConcept', () => {
  it('creates top concept with correct quads', () => {
    const store = makeTestStore()
    const iri = addConcept(store, SCHEME, 'new-concept', 'New Concept')

    expect(iri).toBe(`${SCHEME}new-concept`)
    expect(getQuads(store, iri, `${RDF}type`, `${SKOS}Concept`)).toHaveLength(1)
    expect(getQuads(store, iri, `${SKOS}prefLabel`, null)[0]!.object.value).toBe('New Concept')
    expect(getQuads(store, iri, `${SKOS}inScheme`, SCHEME)).toHaveLength(1)
    expect(getQuads(store, iri, `${SKOS}topConceptOf`, SCHEME)).toHaveLength(1)
    expect(getQuads(store, SCHEME, `${SKOS}hasTopConcept`, iri)).toHaveLength(1)
  })

  it('creates child concept with broader/narrower', () => {
    const store = makeTestStore()
    const iri = addConcept(store, SCHEME, 'child', 'Child', CONCEPT_A)

    expect(getQuads(store, iri, `${SKOS}broader`, CONCEPT_A)).toHaveLength(1)
    expect(getQuads(store, CONCEPT_A, `${SKOS}narrower`, iri)).toHaveLength(1)
    expect(getQuads(store, iri, `${SKOS}topConceptOf`, null)).toHaveLength(0)
  })

  it('sets prefLabel with en language', () => {
    const store = makeTestStore()
    const iri = addConcept(store, SCHEME, 'labeled', 'My Label')
    const label = getQuads(store, iri, `${SKOS}prefLabel`, null)[0]!
    expect(label.object.value).toBe('My Label')
    expect((label.object as any).language).toBe('en')
  })
})

describe('deleteConcept', () => {
  it('removes all quads for the concept', () => {
    const store = makeTestStore()
    deleteConcept(store, CONCEPT_B, SCHEME)

    expect(getQuads(store, CONCEPT_B, null, null)).toHaveLength(0)
    expect(getQuads(store, null, null, CONCEPT_B)).toHaveLength(0)
  })

  it('reparents children to deleted concept\'s parent', () => {
    const store = makeTestStore()
    // A has narrower B. A is top concept. Delete A => B should become top concept.
    deleteConcept(store, CONCEPT_A, SCHEME)

    expect(getQuads(store, CONCEPT_B, `${SKOS}topConceptOf`, SCHEME)).toHaveLength(1)
    expect(getQuads(store, SCHEME, `${SKOS}hasTopConcept`, CONCEPT_B)).toHaveLength(1)
  })

  it('reparents children to grandparent when mid-hierarchy node deleted', () => {
    const store = makeTestStore()
    // Add grandchild under B
    const grandchild = addConcept(store, SCHEME, 'gc', 'Grandchild', CONCEPT_B)

    // Delete B (which has broader A)
    deleteConcept(store, CONCEPT_B, SCHEME)

    // Grandchild should now have broader A
    expect(getQuads(store, grandchild, `${SKOS}broader`, CONCEPT_A)).toHaveLength(1)
    expect(getQuads(store, CONCEPT_A, `${SKOS}narrower`, grandchild)).toHaveLength(1)
  })
})
