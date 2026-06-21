import { describe, it, expect } from 'vitest'
import { conceptLocalName } from '~/composables/useVocabCreate'

/** Compose a concept IRI the way CreateConceptModal / scheme.vue do. */
function composeConceptIri(schemeBase: string, localName: string): string {
  const b = schemeBase.trim()
  const base = b.endsWith('/') || b.endsWith('#') ? b : `${b}/`
  return `${base}${localName.trim()}`
}

/** Uniqueness predicate used before calling addConcept. */
function isLocalNameTaken(schemeBase: string, localName: string, existingIris: string[]): boolean {
  const iri = composeConceptIri(schemeBase, localName)
  return existingIris.includes(iri)
}

const LOCAL_NAME_RE = /^[A-Za-z0-9_-]+$/

describe('conceptLocalName', () => {
  it('derives a lowerCamelCase identifier from a multi-word label', () => {
    expect(conceptLocalName('Cross Reference')).toBe('crossReference')
    expect(conceptLocalName('Collective Title')).toBe('collectiveTitle')
    expect(conceptLocalName('Had Derivation')).toBe('hadDerivation')
  })

  it('lower-cases a single word label', () => {
    expect(conceptLocalName('Generated')).toBe('generated')
  })

  it('treats hyphens and underscores as word separators', () => {
    expect(conceptLocalName('borehole_status-codes')).toBe('boreholeStatusCodes')
  })

  it('strips characters unsafe in an IRI segment', () => {
    expect(conceptLocalName('Hazard & Risk (v2)!')).toBe('hazardRiskV2')
  })

  it('falls back to a default for empty/blank input', () => {
    expect(conceptLocalName('   ')).toBe('concept')
    expect(conceptLocalName('@@@')).toBe('concept')
    expect(conceptLocalName('')).toBe('concept')
  })

  it('produces an identifier matching the validation pattern', () => {
    expect(LOCAL_NAME_RE.test(conceptLocalName('Cross Reference'))).toBe(true)
    expect(LOCAL_NAME_RE.test(conceptLocalName('Hazard & Risk!'))).toBe(true)
  })
})

describe('composeConceptIri', () => {
  it('appends to a scheme IRI with a trailing slash', () => {
    expect(composeConceptIri('https://pid.geoscience.gov.au/def/voc/ga/assoctype/', 'crossReference'))
      .toBe('https://pid.geoscience.gov.au/def/voc/ga/assoctype/crossReference')
  })

  it('ensures a trailing slash when the scheme IRI has none', () => {
    expect(composeConceptIri('https://example.org/def/voc/scheme', 'crossReference'))
      .toBe('https://example.org/def/voc/scheme/crossReference')
  })

  it('respects an existing hash separator', () => {
    expect(composeConceptIri('https://example.org/def/voc/scheme#', 'crossReference'))
      .toBe('https://example.org/def/voc/scheme#crossReference')
  })

  it('composes label → identifier → IRI end to end', () => {
    const base = 'https://example.org/def/voc/scheme/'
    const localName = conceptLocalName('Cross Reference')
    expect(composeConceptIri(base, localName))
      .toBe('https://example.org/def/voc/scheme/crossReference')
  })
})

describe('isLocalNameTaken (uniqueness predicate)', () => {
  const base = 'https://example.org/def/voc/scheme/'
  const existing = [
    'https://example.org/def/voc/scheme/crossReference',
    'https://example.org/def/voc/scheme/collectiveTitle',
  ]

  it('flags a clash with an existing concept IRI', () => {
    expect(isLocalNameTaken(base, 'crossReference', existing)).toBe(true)
  })

  it('allows an unused identifier', () => {
    expect(isLocalNameTaken(base, 'hadDerivation', existing)).toBe(false)
  })

  it('treats the base trailing slash consistently', () => {
    // Same logical IRI even though base lacks the trailing slash.
    expect(isLocalNameTaken('https://example.org/def/voc/scheme', 'crossReference', existing)).toBe(true)
  })
})
