/**
 * Tests for edit-time validation against SHACL profile constraints.
 *
 * Mirrors the validateSubject logic in useEditMode without needing Vue/Nuxt context.
 * Tests minCount, maxCount, and allowedValues (sh:in) constraints.
 */
import { describe, it, expect } from 'vitest'
import { Store, Parser, DataFactory, type Quad } from 'n3'
import { getPredicateLabel } from '~/utils/vocab-labels'

const { namedNode, literal, defaultGraph } = DataFactory

const SKOS = 'http://www.w3.org/2004/02/skos/core#'
const RDF = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#'
const REG = 'http://purl.org/linked-data/registry#'
const SDO = 'https://schema.org/'
const PROV = 'http://www.w3.org/ns/prov#'

// ============================================================================
// Types — mirrors useEditMode's ProfilePropertyOrder and ValidationError
// ============================================================================

interface ProfilePropertyOrder {
  path: string
  order: number
  propertyOrder?: ProfilePropertyOrder[]
  minCount?: number
  maxCount?: number
  allowedValues?: string[]
}

interface ValidationError {
  subjectIri: string
  subjectLabel: string
  predicate: string
  predicateLabel: string
  message: string
}

// ============================================================================
// Validation function — mirrors useEditMode.validateSubject
// ============================================================================

function validateSubject(
  store: Store,
  subjectIri: string,
  propertyOrder: ProfilePropertyOrder[],
): ValidationError[] {
  const errors: ValidationError[] = []
  const subjectLabel = resolveLabel(store, subjectIri)

  for (const po of propertyOrder) {
    const quads = store.getQuads(subjectIri, po.path, null, null) as Quad[]
    const count = quads.length

    if (po.minCount != null && count < po.minCount) {
      errors.push({
        subjectIri,
        subjectLabel,
        predicate: po.path,
        predicateLabel: getPredicateLabel(po.path),
        message: `Requires at least ${po.minCount} value${po.minCount !== 1 ? 's' : ''}`,
      })
    }
    if (po.maxCount != null && count > po.maxCount) {
      errors.push({
        subjectIri,
        subjectLabel,
        predicate: po.path,
        predicateLabel: getPredicateLabel(po.path),
        message: `Allows at most ${po.maxCount} value${po.maxCount !== 1 ? 's' : ''}`,
      })
    }

    // Check sh:in constraint
    if (po.allowedValues?.length) {
      const allowed = new Set(po.allowedValues)
      for (const q of quads) {
        if (!allowed.has(q.object.value)) {
          errors.push({
            subjectIri,
            subjectLabel,
            predicate: po.path,
            predicateLabel: getPredicateLabel(po.path),
            message: `"${q.object.value}" is not an allowed value`,
          })
        }
      }
    }

    // Validate nested properties
    if (po.propertyOrder) {
      for (const q of quads) {
        if (q.object.termType !== 'BlankNode') continue
        for (const nested of po.propertyOrder) {
          const nestedQuads = store.getQuads(q.object, nested.path, null, null) as Quad[]
          const nestedCount = nestedQuads.length
          if (nested.minCount != null && nestedCount < nested.minCount) {
            errors.push({
              subjectIri,
              subjectLabel,
              predicate: nested.path,
              predicateLabel: getPredicateLabel(nested.path),
              message: `${getPredicateLabel(po.path)} → requires at least ${nested.minCount} value${nested.minCount !== 1 ? 's' : ''}`,
            })
          }
          if (nested.maxCount != null && nestedCount > nested.maxCount) {
            errors.push({
              subjectIri,
              subjectLabel,
              predicate: nested.path,
              predicateLabel: getPredicateLabel(nested.path),
              message: `${getPredicateLabel(po.path)} → allows at most ${nested.maxCount} value${nested.maxCount !== 1 ? 's' : ''}`,
            })
          }
        }
      }
    }
  }

  return errors
}

function resolveLabel(store: Store, iri: string): string {
  const quads = store.getQuads(iri, `${SKOS}prefLabel`, null, null) as Quad[]
  if (quads.length > 0) return quads[0].object.value
  const hashIdx = iri.lastIndexOf('#')
  const slashIdx = iri.lastIndexOf('/')
  return iri.substring(Math.max(hashIdx, slashIdx) + 1)
}

function parseTTL(ttl: string): Store {
  const parser = new Parser({ format: 'Turtle' })
  const store = new Store()
  store.addQuads(parser.parse(ttl))
  return store
}

// ============================================================================
// Tests
// ============================================================================

describe('edit validation', () => {
  const SCHEME_IRI = 'http://example.com/vocab'
  const CONCEPT_IRI = 'http://example.com/concept/a'

  describe('minCount', () => {
    const profile: ProfilePropertyOrder[] = [
      { path: `${SKOS}prefLabel`, order: 0, minCount: 1 },
      { path: `${SKOS}definition`, order: 1, minCount: 1 },
    ]

    it('returns no errors when minCount is satisfied', () => {
      const store = parseTTL(`
        @prefix skos: <${SKOS}> .
        <${CONCEPT_IRI}> skos:prefLabel "Concept A" ;
                         skos:definition "A definition" .
      `)
      const errors = validateSubject(store, CONCEPT_IRI, profile)
      expect(errors).toHaveLength(0)
    })

    it('returns error when minCount is violated', () => {
      const store = parseTTL(`
        @prefix skos: <${SKOS}> .
        <${CONCEPT_IRI}> skos:prefLabel "Concept A" .
      `)
      const errors = validateSubject(store, CONCEPT_IRI, profile)
      expect(errors).toHaveLength(1)
      expect(errors[0].predicate).toBe(`${SKOS}definition`)
      expect(errors[0].message).toContain('at least 1 value')
      expect(errors[0].subjectIri).toBe(CONCEPT_IRI)
    })

    it('returns multiple errors when multiple minCounts are violated', () => {
      const store = new Store()
      const errors = validateSubject(store, CONCEPT_IRI, profile)
      expect(errors).toHaveLength(2)
    })
  })

  describe('maxCount', () => {
    const profile: ProfilePropertyOrder[] = [
      { path: `${SKOS}prefLabel`, order: 0, maxCount: 1 },
    ]

    it('returns no errors when maxCount is satisfied', () => {
      const store = parseTTL(`
        @prefix skos: <${SKOS}> .
        <${CONCEPT_IRI}> skos:prefLabel "Concept A" .
      `)
      const errors = validateSubject(store, CONCEPT_IRI, profile)
      expect(errors).toHaveLength(0)
    })

    it('returns error when maxCount is exceeded', () => {
      const store = parseTTL(`
        @prefix skos: <${SKOS}> .
        <${CONCEPT_IRI}> skos:prefLabel "Concept A" , "Concept B" .
      `)
      const errors = validateSubject(store, CONCEPT_IRI, profile)
      expect(errors).toHaveLength(1)
      expect(errors[0].message).toContain('at most 1 value')
    })
  })

  describe('allowedValues (sh:in)', () => {
    const profile: ProfilePropertyOrder[] = [
      {
        path: `${REG}status`,
        order: 0,
        minCount: 1,
        maxCount: 1,
        allowedValues: [
          `${REG}statusStable`,
          `${REG}statusExperimental`,
          `${REG}statusRetired`,
        ],
      },
    ]

    it('returns no errors when value is in allowed set', () => {
      const store = new Store()
      store.addQuad(
        namedNode(SCHEME_IRI),
        namedNode(`${REG}status`),
        namedNode(`${REG}statusStable`),
        defaultGraph(),
      )
      const errors = validateSubject(store, SCHEME_IRI, profile)
      expect(errors).toHaveLength(0)
    })

    it('returns error when value is not in allowed set', () => {
      const store = new Store()
      store.addQuad(
        namedNode(SCHEME_IRI),
        namedNode(`${REG}status`),
        namedNode(`${REG}statusInvalid`),
        defaultGraph(),
      )
      const errors = validateSubject(store, SCHEME_IRI, profile)
      expect(errors).toHaveLength(1)
      expect(errors[0].message).toContain('is not an allowed value')
    })

    it('returns minCount error when no value is present', () => {
      const store = new Store()
      const errors = validateSubject(store, SCHEME_IRI, profile)
      expect(errors).toHaveLength(1)
      expect(errors[0].message).toContain('at least 1 value')
    })
  })

  describe('nested property validation', () => {
    const profile: ProfilePropertyOrder[] = [
      {
        path: `${SDO}temporalCoverage`,
        order: 0,
        propertyOrder: [
          { path: `${SDO}startTime`, order: 0, minCount: 1, maxCount: 1 },
          { path: `${SDO}endTime`, order: 1, maxCount: 1 },
        ],
      },
    ]

    it('returns no errors when nested constraints are satisfied', () => {
      const store = parseTTL(`
        @prefix sdo: <${SDO}> .
        <${CONCEPT_IRI}> sdo:temporalCoverage [
          sdo:startTime "2020-01-01" ;
          sdo:endTime "2025-12-31"
        ] .
      `)
      const errors = validateSubject(store, CONCEPT_IRI, profile)
      expect(errors).toHaveLength(0)
    })

    it('returns error when nested minCount is violated', () => {
      const store = parseTTL(`
        @prefix sdo: <${SDO}> .
        <${CONCEPT_IRI}> sdo:temporalCoverage [
          sdo:endTime "2025-12-31"
        ] .
      `)
      const errors = validateSubject(store, CONCEPT_IRI, profile)
      expect(errors).toHaveLength(1)
      expect(errors[0].predicate).toBe(`${SDO}startTime`)
      expect(errors[0].message).toContain('requires at least 1 value')
    })

    it('returns error when nested maxCount is exceeded', () => {
      const store = parseTTL(`
        @prefix sdo: <${SDO}> .
        <${CONCEPT_IRI}> sdo:temporalCoverage [
          sdo:startTime "2020-01-01" ;
          sdo:endTime "2025-12-31" , "2026-06-30"
        ] .
      `)
      const errors = validateSubject(store, CONCEPT_IRI, profile)
      expect(errors).toHaveLength(1)
      expect(errors[0].predicate).toBe(`${SDO}endTime`)
      expect(errors[0].message).toContain('at most 1 value')
    })

    it('skips validation for non-blank-node values', () => {
      // If temporalCoverage points to a named node, nested checks shouldn't apply
      const store = new Store()
      store.addQuad(
        namedNode(CONCEPT_IRI),
        namedNode(`${SDO}temporalCoverage`),
        namedNode('http://example.com/period/2020'),
        defaultGraph(),
      )
      const errors = validateSubject(store, CONCEPT_IRI, profile)
      expect(errors).toHaveLength(0)
    })
  })

  describe('no constraints', () => {
    it('returns no errors when no constraints are defined', () => {
      const profile: ProfilePropertyOrder[] = [
        { path: `${SKOS}prefLabel`, order: 0 },
        { path: `${SKOS}definition`, order: 1 },
      ]
      const store = new Store() // empty store, no properties
      const errors = validateSubject(store, CONCEPT_IRI, profile)
      expect(errors).toHaveLength(0)
    })
  })

  describe('subject label resolution', () => {
    it('uses prefLabel when available', () => {
      const profile: ProfilePropertyOrder[] = [
        { path: `${SKOS}definition`, order: 0, minCount: 1 },
      ]
      const store = parseTTL(`
        @prefix skos: <${SKOS}> .
        <${CONCEPT_IRI}> skos:prefLabel "My Concept" .
      `)
      const errors = validateSubject(store, CONCEPT_IRI, profile)
      expect(errors[0].subjectLabel).toBe('My Concept')
    })

    it('falls back to local name when no prefLabel', () => {
      const profile: ProfilePropertyOrder[] = [
        { path: `${SKOS}definition`, order: 0, minCount: 1 },
      ]
      const store = new Store()
      const errors = validateSubject(store, CONCEPT_IRI, profile)
      expect(errors[0].subjectLabel).toBe('a')
    })
  })
})
