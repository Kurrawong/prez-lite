import { describe, it, expect } from 'vitest'
import { Parser, Store } from 'n3'
import { slugify, deriveIriBase, escapeTtlLiteral, scaffoldSchemeTTL } from '~/composables/useVocabCreate'

const RDF_TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type'
const SKOS = 'http://www.w3.org/2004/02/skos/core#'

describe('slugify', () => {
  it('joins words and preserves casing', () => {
    expect(slugify('Rock Classification')).toBe('RockClassification')
  })

  it('strips characters unsafe in a filename / IRI segment', () => {
    expect(slugify('Hazard & Risk (v2)!')).toBe('HazardRiskv2')
  })

  it('keeps hyphens and underscores', () => {
    expect(slugify('borehole_status-codes')).toBe('borehole_status-codes')
  })

  it('falls back to a default for empty/blank input', () => {
    expect(slugify('   ')).toBe('vocabulary')
    expect(slugify('@@@')).toBe('vocabulary')
  })
})

describe('deriveIriBase', () => {
  it('derives the base from a GA-style IRI', () => {
    expect(deriveIriBase(['https://pid.geoscience.gov.au/def/voc/ga/associationtype']))
      .toBe('https://pid.geoscience.gov.au/def/voc/ga/')
  })

  it('picks the most common base across vocabs', () => {
    const base = deriveIriBase([
      'https://pid.geoscience.gov.au/def/voc/ga/a',
      'https://pid.geoscience.gov.au/def/voc/ga/b',
      'https://example.org/odd/one',
    ])
    expect(base).toBe('https://pid.geoscience.gov.au/def/voc/ga/')
  })

  it('returns empty string when there is nothing to learn from', () => {
    expect(deriveIriBase([])).toBe('')
  })
})

describe('escapeTtlLiteral', () => {
  it('escapes quotes, backslashes and newlines', () => {
    expect(escapeTtlLiteral('a "quote" and \\ and\nnewline'))
      .toBe('a \\"quote\\" and \\\\ and\\nnewline')
  })
})

describe('scaffoldSchemeTTL', () => {
  const iri = 'https://pid.geoscience.gov.au/def/voc/ga/RockClassification'

  function parse(ttl: string): Store {
    const store = new Store()
    store.addQuads(new Parser().parse(ttl))
    return store
  }

  it('produces a parseable, well-formed ConceptScheme', () => {
    const ttl = scaffoldSchemeTTL(iri, 'Rock Classification', 'A vocabulary of rock classes.')
    const store = parse(ttl)

    const typeQuads = store.getQuads(iri, RDF_TYPE, `${SKOS}ConceptScheme`, null)
    expect(typeQuads).toHaveLength(1)
  })

  it('sets prefLabel and definition as @en literals', () => {
    const ttl = scaffoldSchemeTTL(iri, 'Rock Classification', 'A vocabulary of rock classes.')
    const store = parse(ttl)

    const labels = store.getQuads(iri, `${SKOS}prefLabel`, null, null)
    expect(labels).toHaveLength(1)
    expect(labels[0]!.object.value).toBe('Rock Classification')
    expect((labels[0]!.object as { language: string }).language).toBe('en')

    const defs = store.getQuads(iri, `${SKOS}definition`, null, null)
    expect(defs).toHaveLength(1)
    expect(defs[0]!.object.value).toBe('A vocabulary of rock classes.')
  })

  it('emits no empty or invalid quads', () => {
    const ttl = scaffoldSchemeTTL(iri, 'X', 'Y')
    const store = parse(ttl)
    for (const q of store.getQuads(null, null, null, null)) {
      expect(q.subject.value).not.toBe('')
      expect(q.predicate.value).not.toBe('')
      expect(q.object.value).not.toBe('')
    }
  })

  it('escapes quotes in the title/definition so the TTL stays valid', () => {
    const ttl = scaffoldSchemeTTL(iri, 'The "Big" Vocab', 'Defines "things" & stuff')
    const store = parse(ttl) // must not throw
    const labels = store.getQuads(iri, `${SKOS}prefLabel`, null, null)
    expect(labels[0]!.object.value).toBe('The "Big" Vocab')
  })
})
