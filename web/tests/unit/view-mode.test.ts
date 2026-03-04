import { describe, it, expect } from 'vitest'
import { filterForSimpleView, LEGACY_SIMPLE_HIDDEN } from '~/utils/view-mode'

describe('filterForSimpleView', () => {
  it('uses profile-driven filtering when simpleView flags exist', () => {
    const properties = [
      { predicate: 'http://www.w3.org/2004/02/skos/core#prefLabel', simpleView: true },
      { predicate: 'http://www.w3.org/2004/02/skos/core#definition', simpleView: true },
      { predicate: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type' },
      { predicate: 'http://www.w3.org/2004/02/skos/core#broader' },
    ]

    const result = filterForSimpleView(properties)
    expect(result).toHaveLength(2)
    expect(result.map(p => p.predicate)).toEqual([
      'http://www.w3.org/2004/02/skos/core#prefLabel',
      'http://www.w3.org/2004/02/skos/core#definition',
    ])
  })

  it('falls back to legacy hidden set when no simpleView flags exist', () => {
    const properties = [
      { predicate: 'http://www.w3.org/2004/02/skos/core#prefLabel' },
      { predicate: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type' },
      { predicate: 'http://www.w3.org/2004/02/skos/core#broader' },
      { predicate: 'http://www.w3.org/2004/02/skos/core#definition' },
    ]

    const result = filterForSimpleView(properties)
    expect(result).toHaveLength(2)
    expect(result.map(p => p.predicate)).toEqual([
      'http://www.w3.org/2004/02/skos/core#prefLabel',
      'http://www.w3.org/2004/02/skos/core#definition',
    ])
  })

  it('returns all properties when all have simpleView true', () => {
    const properties = [
      { predicate: 'http://www.w3.org/2004/02/skos/core#prefLabel', simpleView: true },
      { predicate: 'http://www.w3.org/2004/02/skos/core#definition', simpleView: true },
    ]

    const result = filterForSimpleView(properties)
    expect(result).toHaveLength(2)
  })

  it('returns empty array when no properties match simple view', () => {
    const properties = [
      { predicate: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type', simpleView: false as any },
      { predicate: 'http://www.w3.org/2004/02/skos/core#broader' },
    ]

    // simpleView: false is falsy, not true, so only one has it → uses profile-driven
    // Actually none have simpleView === true, so falls back to legacy
    const result = filterForSimpleView(properties)
    expect(result).toHaveLength(0) // both are in LEGACY_SIMPLE_HIDDEN
  })

  it('handles empty array', () => {
    expect(filterForSimpleView([])).toEqual([])
  })
})

describe('LEGACY_SIMPLE_HIDDEN', () => {
  it('contains the 6 expected predicates', () => {
    expect(LEGACY_SIMPLE_HIDDEN.size).toBe(6)
    expect(LEGACY_SIMPLE_HIDDEN.has('http://www.w3.org/1999/02/22-rdf-syntax-ns#type')).toBe(true)
    expect(LEGACY_SIMPLE_HIDDEN.has('http://www.w3.org/2004/02/skos/core#inScheme')).toBe(true)
    expect(LEGACY_SIMPLE_HIDDEN.has('http://www.w3.org/2004/02/skos/core#topConceptOf')).toBe(true)
    expect(LEGACY_SIMPLE_HIDDEN.has('http://www.w3.org/2004/02/skos/core#hasTopConcept')).toBe(true)
    expect(LEGACY_SIMPLE_HIDDEN.has('http://www.w3.org/2004/02/skos/core#narrower')).toBe(true)
    expect(LEGACY_SIMPLE_HIDDEN.has('http://www.w3.org/2004/02/skos/core#broader')).toBe(true)
  })
})
