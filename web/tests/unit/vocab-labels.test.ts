import { describe, it, expect } from 'vitest'
import { getLabelStore, getPredicateLabel, getPredicateDescription } from '~/utils/vocab-labels'

describe('getLabelStore', () => {
  it('returns a store with parsed standard labels', () => {
    const store = getLabelStore()
    expect(store.size).toBeGreaterThan(0)
  })

  it('returns the same store instance on repeated calls', () => {
    const a = getLabelStore()
    const b = getLabelStore()
    expect(a).toBe(b)
  })
})

describe('getPredicateLabel', () => {
  it('resolves skos:prefLabel', () => {
    expect(getPredicateLabel('http://www.w3.org/2004/02/skos/core#prefLabel')).toBe('preferred label')
  })

  it('resolves skos:broader', () => {
    expect(getPredicateLabel('http://www.w3.org/2004/02/skos/core#broader')).toBe('has broader')
  })

  it('resolves rdf:type', () => {
    expect(getPredicateLabel('http://www.w3.org/1999/02/22-rdf-syntax-ns#type')).toBe('type')
  })

  it('resolves schema:dateCreated', () => {
    expect(getPredicateLabel('https://schema.org/dateCreated')).toBe('date created')
  })

  it('falls back to local name for unknown IRI with hash', () => {
    expect(getPredicateLabel('http://example.com/ns#unknownProp')).toBe('unknownProp')
  })

  it('falls back to local name for unknown IRI with slash', () => {
    expect(getPredicateLabel('http://example.com/ns/someProp')).toBe('someProp')
  })
})

describe('getPredicateDescription', () => {
  it('resolves skos:prefLabel description', () => {
    const desc = getPredicateDescription('http://www.w3.org/2004/02/skos/core#prefLabel')
    expect(desc).toContain('preferred lexical label')
  })

  it('resolves skos:definition description', () => {
    const desc = getPredicateDescription('http://www.w3.org/2004/02/skos/core#definition')
    expect(desc).toContain('meaning of a concept')
  })

  it('returns undefined for predicate without description', () => {
    expect(getPredicateDescription('http://example.com/ns#unknown')).toBeUndefined()
  })

  it('returns undefined for rdfs:label (no definition in TTL)', () => {
    // rdfs:label only has rdfs:label, no skos:definition
    expect(getPredicateDescription('http://www.w3.org/2000/01/rdf-schema#label')).toBeUndefined()
  })
})
