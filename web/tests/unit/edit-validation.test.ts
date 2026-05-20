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
  class?: string
  nodeKind?: string
}

const SH_IRI = 'http://www.w3.org/ns/shacl#IRI'
const BARE_SCHEME_SEEDS = new Set(['https://', 'http://', 'urn:'])

/** Mirrors isIriValued in useEditMode */
function isIriValued(po: { class?: string; nodeKind?: string }): boolean {
  if (po.nodeKind === SH_IRI) return true
  if (po.class) return true
  return false
}

/** Mirrors isValidIri in useEditMode */
function isValidIri(value: string | undefined | null): boolean {
  if (!value) return false
  const v = value.trim()
  if (!v) return false
  if (BARE_SCHEME_SEEDS.has(v)) return false
  return /^[a-zA-Z][a-zA-Z0-9+.\-]*:[^\s]+$/.test(v)
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

    // Check IRI validity (issue #29) — catches empty NamedNodes and bare scheme seeds.
    // N3's namedNode('') normalises to a DefaultGraph-typed term, so we check
    // anything non-literal / non-blank rather than just NamedNode.
    if (isIriValued(po)) {
      for (const q of quads) {
        const obj = q.object
        if (obj.termType === 'Literal' || obj.termType === 'BlankNode') continue
        if (!isValidIri(obj.value)) {
          errors.push({
            subjectIri,
            subjectLabel,
            predicate: po.path,
            predicateLabel: getPredicateLabel(po.path),
            message: obj.value
              ? `"${obj.value}" is not a valid IRI`
              : 'IRI value cannot be empty',
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

  /**
   * IRI value validation — issue #29. The iri-input widget seeds new values
   * with `https://`, so users can produce empty / scheme-only IRIs if they
   * clear the seeded text. Validation must catch these before save.
   */
  describe('IRI validity (issue #29)', () => {
    const iriPathProfile: ProfilePropertyOrder[] = [
      { path: `${SDO}image`, order: 0, nodeKind: SH_IRI },
      { path: `${SDO}creator`, order: 1, class: `${PROV}Agent` },
    ]

    it('accepts well-formed IRIs', () => {
      const store = new Store()
      store.addQuad(namedNode(CONCEPT_IRI), namedNode(`${SDO}image`), namedNode('https://example.com/img.png'), defaultGraph())
      store.addQuad(namedNode(CONCEPT_IRI), namedNode(`${SDO}creator`), namedNode('https://linked.data.gov.au/org/ga'), defaultGraph())
      const errors = validateSubject(store, CONCEPT_IRI, iriPathProfile)
      expect(errors).toHaveLength(0)
    })

    it('rejects empty IRI (NamedNode with empty value)', () => {
      const store = new Store()
      store.addQuad(namedNode(CONCEPT_IRI), namedNode(`${SDO}image`), namedNode(''), defaultGraph())
      const errors = validateSubject(store, CONCEPT_IRI, iriPathProfile)
      expect(errors).toHaveLength(1)
      expect(errors[0].message).toContain('cannot be empty')
    })

    it('rejects bare scheme seeds (the iri-input default before user edits)', () => {
      for (const seed of ['https://', 'http://', 'urn:']) {
        const store = new Store()
        store.addQuad(namedNode(CONCEPT_IRI), namedNode(`${SDO}image`), namedNode(seed), defaultGraph())
        const errors = validateSubject(store, CONCEPT_IRI, iriPathProfile)
        expect(errors, `seed: ${seed}`).toHaveLength(1)
        expect(errors[0].message).toContain('not a valid IRI')
      }
    })

    it('rejects whitespace-only IRI', () => {
      const store = new Store()
      store.addQuad(namedNode(CONCEPT_IRI), namedNode(`${SDO}image`), namedNode('   '), defaultGraph())
      const errors = validateSubject(store, CONCEPT_IRI, iriPathProfile)
      expect(errors.length).toBeGreaterThan(0)
    })

    it('rejects malformed IRI (no scheme)', () => {
      const store = new Store()
      store.addQuad(namedNode(CONCEPT_IRI), namedNode(`${SDO}image`), namedNode('not-an-iri'), defaultGraph())
      const errors = validateSubject(store, CONCEPT_IRI, iriPathProfile)
      expect(errors).toHaveLength(1)
    })

    it('only applies to IRI-valued shapes; literals on non-IRI predicates pass', () => {
      const profile: ProfilePropertyOrder[] = [
        { path: `${SKOS}prefLabel`, order: 0 }, // no nodeKind/class → literal expected
      ]
      const store = new Store()
      store.addQuad(namedNode(CONCEPT_IRI), namedNode(`${SKOS}prefLabel`), literal('Some label', 'en'), defaultGraph())
      const errors = validateSubject(store, CONCEPT_IRI, profile)
      expect(errors).toHaveLength(0)
    })
  })

  /**
   * Pure-function unit tests for the widget helpers added in InlineEditTable.vue
   * (#28 "Add agent" dedup, #29 "Add IRI" with incomplete value).
   */
  describe('widget helpers', () => {
    type AgentEntry = { iri: string; name: string; type: 'Person' | 'Organization' }
    type PropLike = { values: Array<{ value: string }> }

    function nextUnusedAgentIri(prop: PropLike, agents: AgentEntry[]): string | null {
      if (!agents.length) return null
      const used = new Set(prop.values.map(v => v.value))
      return agents.find(a => !used.has(a.iri))?.iri ?? null
    }

    function hasIncompleteIriValue(prop: PropLike): boolean {
      const bareSeeds = new Set(['https://', 'http://', 'urn:', ''])
      return prop.values.some(v => bareSeeds.has((v.value ?? '').trim()))
    }

    const agents: AgentEntry[] = [
      { iri: 'https://example.com/agent/ga', name: 'GA', type: 'Organization' },
      { iri: 'https://example.com/agent/dpi', name: 'DPI', type: 'Organization' },
      { iri: 'https://example.com/agent/csiro', name: 'CSIRO', type: 'Organization' },
    ]

    describe('nextUnusedAgentIri (#28 dedup fix)', () => {
      it('returns the first agent when no values are set', () => {
        const r = nextUnusedAgentIri({ values: [] }, agents)
        expect(r).toBe(agents[0].iri)
      })

      it('skips agents already used as values', () => {
        const r = nextUnusedAgentIri({ values: [{ value: agents[0].iri }] }, agents)
        expect(r).toBe(agents[1].iri)
      })

      it('returns null when all agents are already used (blocks dedup no-op)', () => {
        const r = nextUnusedAgentIri(
          { values: agents.map(a => ({ value: a.iri })) },
          agents,
        )
        expect(r).toBeNull()
      })

      it('returns null when the agents list is empty', () => {
        const r = nextUnusedAgentIri({ values: [] }, [])
        expect(r).toBeNull()
      })
    })

    describe('hasIncompleteIriValue (#29 dedup fix)', () => {
      it('false when all values are valid IRIs', () => {
        expect(hasIncompleteIriValue({ values: [{ value: 'https://example.com/a' }] })).toBe(false)
      })

      it('true when any value is a bare scheme seed', () => {
        for (const seed of ['https://', 'http://', 'urn:', '']) {
          expect(
            hasIncompleteIriValue({ values: [{ value: seed }] }),
            `seed: ${JSON.stringify(seed)}`,
          ).toBe(true)
        }
      })

      it('true even when some values are valid (any incomplete blocks add)', () => {
        expect(hasIncompleteIriValue({
          values: [{ value: 'https://example.com/a' }, { value: 'https://' }],
        })).toBe(true)
      })

      it('trims whitespace before checking', () => {
        expect(hasIncompleteIriValue({ values: [{ value: '  https://  ' }] })).toBe(true)
      })
    })
  })
})
