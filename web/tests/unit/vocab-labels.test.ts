import { describe, it, expect, afterEach } from 'vitest'
import {
  getLabelStore,
  getPredicateLabel,
  getPredicateDescription,
  seedRuntimeLabels,
  resolveIriLabel,
} from '~/utils/vocab-labels'

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

  // Issue #23 — predicate labels previously missing from the hardcoded store
  it('resolves rdfs:seeAlso', () => {
    expect(getPredicateLabel('http://www.w3.org/2000/01/rdf-schema#seeAlso')).toBe('see also')
  })

  it('resolves owl:versionInfo', () => {
    expect(getPredicateLabel('http://www.w3.org/2002/07/owl#versionInfo')).toBe('version info')
  })

  it('resolves dcat:contactPoint', () => {
    expect(getPredicateLabel('http://www.w3.org/ns/dcat#contactPoint')).toBe('contact point')
  })
})

describe('seedRuntimeLabels + resolveIriLabel (issues #21, #23)', () => {
  afterEach(() => {
    // Reset between tests — null clears the index.
    seedRuntimeLabels(null)
  })

  it('uses runtime labels as a fallback for unknown predicates', () => {
    seedRuntimeLabels({
      'http://example.com/customPred': { en: 'Custom Predicate' },
    })
    expect(getPredicateLabel('http://example.com/customPred')).toBe('Custom Predicate')
  })

  it('hardcoded labels take precedence over runtime labels', () => {
    seedRuntimeLabels({
      'http://www.w3.org/2004/02/skos/core#prefLabel': { en: 'overridden' },
    })
    expect(getPredicateLabel('http://www.w3.org/2004/02/skos/core#prefLabel'))
      .toBe('preferred label')
  })

  it('resolveIriLabel resolves agents from runtime labels', () => {
    seedRuntimeLabels({
      'https://linked.data.gov.au/org/ga': { en: 'Geoscience Australia' },
    })
    expect(resolveIriLabel('https://linked.data.gov.au/org/ga'))
      .toBe('Geoscience Australia')
  })

  it('resolveIriLabel falls back to default lang then local name', () => {
    seedRuntimeLabels({
      'http://example.com/no-en': { '': 'default lang label' },
    })
    expect(resolveIriLabel('http://example.com/no-en')).toBe('default lang label')
    expect(resolveIriLabel('http://example.com/unknown/thing')).toBe('thing')
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
