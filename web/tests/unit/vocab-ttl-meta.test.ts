import { describe, it, expect } from 'vitest'
import { parseVocabTtlMeta } from '~/utils/vocab-ttl-meta'
import { scaffoldSchemeTTL } from '~/composables/useVocabCreate'

describe('parseVocabTtlMeta', () => {
  it('parses a freshly scaffolded ConceptScheme (the create-vocab shape)', () => {
    const ttl = scaffoldSchemeTTL(
      'https://pid.geoscience.gov.au/def/voc/ga/TestVocab',
      'Test Vocab',
      'A test vocabulary.',
    )
    const meta = parseVocabTtlMeta(ttl)
    expect(meta).not.toBeNull()
    expect(meta!.iri).toBe('https://pid.geoscience.gov.au/def/voc/ga/TestVocab')
    expect(meta!.prefLabel).toBe('Test Vocab')
    expect(meta!.definition).toBe('A test vocabulary.')
    expect(meta!.conceptCount).toBe(0)
  })

  it('parses a GA-style vocab with concepts and counts them', () => {
    const ttl = `PREFIX : <https://pid.geoscience.gov.au/def/voc/ga/MyVocab/>
PREFIX cs: <https://pid.geoscience.gov.au/def/voc/ga/MyVocab>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>

cs:
    a skos:ConceptScheme ;
    skos:prefLabel "My Vocab"@en ;
    skos:definition "Vocab with concepts."@en ;
    skos:hasTopConcept :first ;
.

:first
    a skos:Concept ;
    skos:prefLabel "First"@en ;
    skos:topConceptOf cs: ;
.

:second
    a skos:Concept ;
    skos:prefLabel "Second"@en ;
    skos:broader :first ;
    skos:inScheme cs: ;
.
`
    const meta = parseVocabTtlMeta(ttl)
    expect(meta).not.toBeNull()
    expect(meta!.iri).toBe('https://pid.geoscience.gov.au/def/voc/ga/MyVocab')
    expect(meta!.prefLabel).toBe('My Vocab')
    expect(meta!.conceptCount).toBe(2)
  })

  it('prefers the @en label when multiple languages exist', () => {
    const ttl = `PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
<http://example.org/v> a skos:ConceptScheme ;
  skos:prefLabel "Vokabular"@de, "Vocabulary"@en .
`
    const meta = parseVocabTtlMeta(ttl)
    expect(meta!.prefLabel).toBe('Vocabulary')
  })

  it('does not double-count a concept typed twice', () => {
    const ttl = `PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
PREFIX owl: <http://www.w3.org/2002/07/owl#>
<http://example.org/v> a skos:ConceptScheme ; skos:prefLabel "V"@en .
<http://example.org/v/a> a skos:Concept ; skos:prefLabel "A"@en .
<http://example.org/v/a> a skos:Concept .
`
    expect(parseVocabTtlMeta(ttl)!.conceptCount).toBe(1)
  })

  it('returns null for TTL without a ConceptScheme', () => {
    const ttl = `PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
<http://example.org/c> a skos:Concept ; skos:prefLabel "Orphan"@en .
`
    expect(parseVocabTtlMeta(ttl)).toBeNull()
  })

  it('returns null for unparseable TTL', () => {
    expect(parseVocabTtlMeta('this is }{ not turtle <<')).toBeNull()
  })

  it('handles a label-less scheme (empty prefLabel, caller falls back to slug)', () => {
    const ttl = `PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
<http://example.org/v> a skos:ConceptScheme .
`
    const meta = parseVocabTtlMeta(ttl)
    expect(meta).not.toBeNull()
    expect(meta!.prefLabel).toBe('')
    expect(meta!.definition).toBeUndefined()
  })
})
