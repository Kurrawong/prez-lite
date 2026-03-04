import { describe, it, expect } from 'vitest'
import { Store, DataFactory } from 'n3'
import {
  getPropertiesForSubject,
  getFieldType,
  quadValuesForPredicate,
  type ProfileConfig,
} from '~/data/enrichment/profile-properties'

const { namedNode, literal, defaultGraph } = DataFactory
const SKOS = 'http://www.w3.org/2004/02/skos/core#'
const RDF = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#'
const SDO = 'https://schema.org/'

function makeStore(): Store {
  const store = new Store()
  const s = namedNode('http://ex.org/scheme')
  store.addQuad(s, namedNode(`${RDF}type`), namedNode(`${SKOS}ConceptScheme`), defaultGraph())
  store.addQuad(s, namedNode(`${SKOS}prefLabel`), literal('Test Scheme', 'en'), defaultGraph())
  store.addQuad(s, namedNode(`${SKOS}definition`), literal('A test scheme', 'en'), defaultGraph())
  store.addQuad(s, namedNode(`${SDO}dateModified`), literal('2026-01-01'), defaultGraph())
  return store
}

const testProfile: ProfileConfig = {
  conceptScheme: {
    propertyOrder: [
      { path: `${SKOS}prefLabel`, order: 1 },
      { path: `${SKOS}definition`, order: 2 },
      { path: `${SDO}dateModified`, order: 3 },
      { path: `${SKOS}scopeNote`, order: 4 },
    ],
  },
  concept: {
    propertyOrder: [
      { path: `${SKOS}prefLabel`, order: 1 },
      { path: `${SKOS}broader`, order: 2 },
    ],
  },
}

describe('getFieldType', () => {
  it('returns readonly for rdf:type', () => {
    expect(getFieldType(`${RDF}type`)).toBe('readonly')
  })

  it('returns textarea for skos:definition', () => {
    expect(getFieldType(`${SKOS}definition`)).toBe('textarea')
  })

  it('returns iri-picker for skos:broader', () => {
    expect(getFieldType(`${SKOS}broader`)).toBe('iri-picker')
  })

  it('returns date for sdo:dateModified', () => {
    expect(getFieldType(`${SDO}dateModified`)).toBe('date')
  })

  it('returns text for unknown predicates', () => {
    expect(getFieldType('http://example.org/custom')).toBe('text')
  })
})

describe('quadValuesForPredicate', () => {
  it('extracts literal values', () => {
    const store = makeStore()
    const values = quadValuesForPredicate(store, 'http://ex.org/scheme', `${SKOS}prefLabel`)
    expect(values).toHaveLength(1)
    expect(values[0]!.type).toBe('literal')
    expect(values[0]!.value).toBe('Test Scheme')
    expect(values[0]!.language).toBe('en')
  })

  it('returns empty array when no matching quads', () => {
    const store = makeStore()
    const values = quadValuesForPredicate(store, 'http://ex.org/scheme', `${SKOS}altLabel`)
    expect(values).toHaveLength(0)
  })

  it('extracts IRI values', () => {
    const store = new Store()
    store.addQuad(
      namedNode('http://ex.org/c'),
      namedNode(`${SKOS}broader`),
      namedNode('http://ex.org/parent'),
      defaultGraph(),
    )
    const values = quadValuesForPredicate(store, 'http://ex.org/c', `${SKOS}broader`)
    expect(values).toHaveLength(1)
    expect(values[0]!.type).toBe('iri')
    expect(values[0]!.value).toBe('http://ex.org/parent')
  })
})

describe('getPropertiesForSubject', () => {
  it('returns empty array for null profile and no quads', () => {
    const store = new Store()
    const result = getPropertiesForSubject(store, 'http://ex.org/missing', 'conceptScheme', null)
    expect(result).toEqual([])
  })

  it('returns properties in profile order', () => {
    const store = makeStore()
    const result = getPropertiesForSubject(store, 'http://ex.org/scheme', 'conceptScheme', testProfile)

    // First three should be profile-ordered
    expect(result[0]!.predicate).toBe(`${SKOS}prefLabel`)
    expect(result[0]!.order).toBe(1)
    expect(result[1]!.predicate).toBe(`${SKOS}definition`)
    expect(result[1]!.order).toBe(2)
    expect(result[2]!.predicate).toBe(`${SDO}dateModified`)
    expect(result[2]!.order).toBe(3)
  })

  it('includes profiled properties with no values when not populatedOnly', () => {
    const store = makeStore()
    const result = getPropertiesForSubject(store, 'http://ex.org/scheme', 'conceptScheme', testProfile)
    const scopeNote = result.find(p => p.predicate === `${SKOS}scopeNote`)
    expect(scopeNote).toBeDefined()
    expect(scopeNote!.values).toHaveLength(0)
  })

  it('skips empty properties in populatedOnly mode', () => {
    const store = makeStore()
    const result = getPropertiesForSubject(store, 'http://ex.org/scheme', 'conceptScheme', testProfile, true)
    const scopeNote = result.find(p => p.predicate === `${SKOS}scopeNote`)
    expect(scopeNote).toBeUndefined()
  })

  it('appends unprofiled predicates at end with order >= 1000', () => {
    const store = makeStore()
    const result = getPropertiesForSubject(store, 'http://ex.org/scheme', 'conceptScheme', testProfile)
    const rdfType = result.find(p => p.predicate === `${RDF}type`)
    expect(rdfType).toBeDefined()
    expect(rdfType!.order).toBeGreaterThanOrEqual(1000)
  })

  it('works without profile config (all properties unordered)', () => {
    const store = makeStore()
    const result = getPropertiesForSubject(store, 'http://ex.org/scheme', 'conceptScheme', null)
    // Should have all 4 predicates (rdf:type, prefLabel, definition, dateModified)
    expect(result).toHaveLength(4)
    // All should have order >= 1000
    expect(result.every(p => p.order >= 1000)).toBe(true)
  })

  it('assigns correct field types from profile', () => {
    const store = makeStore()
    const result = getPropertiesForSubject(store, 'http://ex.org/scheme', 'conceptScheme', testProfile)
    expect(result.find(p => p.predicate === `${SKOS}prefLabel`)!.fieldType).toBe('text')
    expect(result.find(p => p.predicate === `${SKOS}definition`)!.fieldType).toBe('textarea')
    expect(result.find(p => p.predicate === `${SDO}dateModified`)!.fieldType).toBe('date')
    expect(result.find(p => p.predicate === `${RDF}type`)!.fieldType).toBe('readonly')
  })

  it('includes minCount/maxCount from profile', () => {
    const profile: ProfileConfig = {
      conceptScheme: {
        propertyOrder: [
          { path: `${SKOS}prefLabel`, order: 1, minCount: 1, maxCount: 1 },
        ],
      },
      concept: { propertyOrder: [] },
    }
    const store = makeStore()
    const result = getPropertiesForSubject(store, 'http://ex.org/scheme', 'conceptScheme', profile)
    const prefLabel = result.find(p => p.predicate === `${SKOS}prefLabel`)!
    expect(prefLabel.minCount).toBe(1)
    expect(prefLabel.maxCount).toBe(1)
  })

  it('handles nested property orders (blank nodes)', () => {
    const store = new Store()
    const subject = namedNode('http://ex.org/s')
    const bnode = DataFactory.blankNode('b1')
    const nestedPred = 'http://ex.org/nested'
    const childPred = 'http://ex.org/childProp'

    store.addQuad(subject, namedNode(nestedPred), bnode, defaultGraph())
    store.addQuad(bnode, namedNode(childPred), literal('nested value'), defaultGraph())

    const profile: ProfileConfig = {
      conceptScheme: {
        propertyOrder: [{
          path: nestedPred,
          order: 1,
          propertyOrder: [{ path: childPred, order: 1 }],
        }],
      },
      concept: { propertyOrder: [] },
    }

    const result = getPropertiesForSubject(store, 'http://ex.org/s', 'conceptScheme', profile)
    expect(result).toHaveLength(1)
    expect(result[0]!.fieldType).toBe('readonly')
    expect(result[0]!.values[0]!.type).toBe('blank-node')
    expect(result[0]!.values[0]!.nestedProperties).toBeDefined()
    expect(result[0]!.values[0]!.nestedProperties![0]!.values[0]!.value).toBe('nested value')
  })
})

describe('simpleView pass-through', () => {
  it('passes simpleView from profile config to editable property', () => {
    const store = makeStore()
    const profile: ProfileConfig = {
      conceptScheme: {
        propertyOrder: [
          { path: `${SKOS}prefLabel`, order: 1, simpleView: true },
          { path: `${SKOS}definition`, order: 2, simpleView: true },
          { path: `${RDF}type`, order: 0 },
        ],
      },
      concept: { propertyOrder: [] },
    }

    const result = getPropertiesForSubject(store, 'http://ex.org/scheme', 'conceptScheme', profile)
    const prefLabel = result.find(p => p.predicate === `${SKOS}prefLabel`)
    const definition = result.find(p => p.predicate === `${SKOS}definition`)
    const rdfType = result.find(p => p.predicate === `${RDF}type`)

    expect(prefLabel?.simpleView).toBe(true)
    expect(definition?.simpleView).toBe(true)
    expect(rdfType?.simpleView).toBeUndefined()
  })

  it('does not set simpleView on unprofiled properties', () => {
    const store = makeStore()
    const profile: ProfileConfig = {
      conceptScheme: {
        propertyOrder: [
          { path: `${SKOS}prefLabel`, order: 1, simpleView: true },
        ],
      },
      concept: { propertyOrder: [] },
    }

    const result = getPropertiesForSubject(store, 'http://ex.org/scheme', 'conceptScheme', profile)
    // dateModified is not in profile, so it gets added as extra
    const dateModified = result.find(p => p.predicate === `${SDO}dateModified`)
    expect(dateModified?.simpleView).toBeUndefined()
  })
})
