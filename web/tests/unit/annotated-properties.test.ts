/**
 * Tests for annotated-properties.ts pure functions.
 *
 * Covers parseAnnotatedJsonLd and extractProperties with
 * inline JSON-LD fixtures.
 */
import { describe, it, expect } from 'vitest'
import {
  parseAnnotatedJsonLd,
  extractProperties,
  type JsonLdNode,
  type ProfileJsonConfig,
} from '~/utils/annotated-properties'

// ============================================================================
// Constants
// ============================================================================

const PREZ = 'https://prez.dev/'
const SKOS = 'http://www.w3.org/2004/02/skos/core#'
const SDO = 'https://schema.org/'
const PROV = 'http://www.w3.org/ns/prov#'

// ============================================================================
// Fixtures
// ============================================================================

/** Minimal scheme with literals, label/description annotations */
function makeSchemeFixture(): JsonLdNode[] {
  return [
    {
      '@id': 'http://example.com/vocab/',
      '@type': ['http://www.w3.org/2004/02/skos/core#ConceptScheme'],
      [`${PREZ}type`]: [{ '@id': `${PREZ}FocusNode` }],
      [`${SKOS}prefLabel`]: [{ '@value': 'Test Vocab', '@language': 'en' }],
      [`${SDO}description`]: [{ '@value': 'A test vocabulary' }],
      [`${SDO}dateCreated`]: [{ '@value': '2024-01-01', '@type': 'http://www.w3.org/2001/XMLSchema#date' }],
    },
    {
      '@id': `${SKOS}prefLabel`,
      [`${PREZ}label`]: [{ '@value': 'Preferred Label' }],
      [`${PREZ}description`]: [{ '@value': 'The preferred lexical label' }],
    },
    {
      '@id': `${SDO}description`,
      [`${PREZ}label`]: [{ '@value': 'Description' }],
    },
    {
      '@id': `${SDO}dateCreated`,
      [`${PREZ}label`]: [{ '@value': 'Date Created' }],
    },
    {
      '@id': 'http://www.w3.org/2001/XMLSchema#date',
      [`${PREZ}label`]: [{ '@value': 'date' }],
    },
  ]
}

/** Concept with IRI objects (skos:broader) */
function makeConceptFixture(): JsonLdNode[] {
  return [
    {
      '@id': 'http://example.com/vocab/alpha',
      '@type': ['http://www.w3.org/2004/02/skos/core#Concept'],
      [`${PREZ}type`]: [{ '@id': `${PREZ}FocusNode` }],
      [`${SKOS}prefLabel`]: [{ '@value': 'Alpha', '@language': 'en' }],
      [`${SKOS}broader`]: [{ '@id': 'http://example.com/vocab/root' }],
      [`${SKOS}definition`]: [{ '@value': 'The first letter' }],
    },
    {
      '@id': 'http://example.com/vocab/root',
      [`${PREZ}label`]: [{ '@value': 'Root Concept' }],
      [`${PREZ}description`]: [{ '@value': 'The root' }],
    },
    {
      '@id': `${SKOS}broader`,
      [`${PREZ}label`]: [{ '@value': 'Broader' }],
    },
    {
      '@id': `${SKOS}definition`,
      [`${PREZ}label`]: [{ '@value': 'Definition' }],
    },
    {
      '@id': `${SKOS}prefLabel`,
      [`${PREZ}label`]: [{ '@value': 'Preferred Label' }],
    },
  ]
}

/** Blank node fixture: prov:qualifiedAttribution → _:b0 */
function makeBlankNodeFixture(): JsonLdNode[] {
  return [
    {
      '@id': 'http://example.com/vocab/',
      '@type': ['http://www.w3.org/2004/02/skos/core#ConceptScheme'],
      [`${PREZ}type`]: [{ '@id': `${PREZ}FocusNode` }],
      [`${SKOS}prefLabel`]: [{ '@value': 'BN Vocab', '@language': 'en' }],
      [`${PROV}qualifiedAttribution`]: [{ '@id': '_:b0' }],
    },
    {
      '@id': '_:b0',
      [`${PROV}agent`]: [{ '@id': 'http://example.com/agent/alice' }],
      [`http://www.w3.org/ns/dcat#hadRole`]: [{ '@id': 'http://example.com/role/author' }],
    },
    {
      '@id': 'http://example.com/agent/alice',
      [`${PREZ}label`]: [{ '@value': 'Alice' }],
    },
    {
      '@id': `${PROV}qualifiedAttribution`,
      [`${PREZ}label`]: [{ '@value': 'Qualified Attribution' }],
    },
    {
      '@id': `${PROV}agent`,
      [`${PREZ}label`]: [{ '@value': 'Agent' }],
    },
    {
      '@id': 'http://www.w3.org/ns/dcat#hadRole',
      [`${PREZ}label`]: [{ '@value': 'Had Role' }],
    },
    {
      '@id': `${SKOS}prefLabel`,
      [`${PREZ}label`]: [{ '@value': 'Preferred Label' }],
    },
  ]
}

// ============================================================================
// Tests: parseAnnotatedJsonLd
// ============================================================================

describe('parseAnnotatedJsonLd', () => {
  it('builds nodeMap keyed by @id', () => {
    const data = makeSchemeFixture()
    const { nodeMap } = parseAnnotatedJsonLd(data)

    expect(nodeMap.size).toBe(data.length)
    expect(nodeMap.has('http://example.com/vocab/')).toBe(true)
    expect(nodeMap.has(`${SKOS}prefLabel`)).toBe(true)
  })

  it('extracts prez:label into labelMap', () => {
    const data = makeSchemeFixture()
    const { labelMap } = parseAnnotatedJsonLd(data)

    expect(labelMap.get(`${SKOS}prefLabel`)).toBe('Preferred Label')
    expect(labelMap.get(`${SDO}description`)).toBe('Description')
    expect(labelMap.get(`${SDO}dateCreated`)).toBe('Date Created')
  })

  it('extracts prez:description into descriptionMap', () => {
    const data = makeSchemeFixture()
    const { descriptionMap } = parseAnnotatedJsonLd(data)

    expect(descriptionMap.get(`${SKOS}prefLabel`)).toBe('The preferred lexical label')
  })

  it('identifies focusNode by prez:FocusNode type', () => {
    const data = makeSchemeFixture()
    const { focusNode } = parseAnnotatedJsonLd(data)

    expect(focusNode).not.toBeNull()
    expect(focusNode!['@id']).toBe('http://example.com/vocab/')
  })

  it('returns null focusNode when none marked', () => {
    const data: JsonLdNode[] = [
      {
        '@id': 'http://example.com/plain',
        '@type': [`${SKOS}Concept`],
      },
    ]
    const { focusNode } = parseAnnotatedJsonLd(data)
    expect(focusNode).toBeNull()
  })

  it('handles empty input array', () => {
    const { nodeMap, labelMap, descriptionMap, focusNode } = parseAnnotatedJsonLd([])
    expect(nodeMap.size).toBe(0)
    expect(labelMap.size).toBe(0)
    expect(descriptionMap.size).toBe(0)
    expect(focusNode).toBeNull()
  })
})

// ============================================================================
// Tests: extractProperties
// ============================================================================

describe('extractProperties', () => {
  describe('value types', () => {
    it('extracts literal @value', () => {
      const data = makeSchemeFixture()
      const { nodeMap, labelMap, descriptionMap, focusNode } = parseAnnotatedJsonLd(data)
      const props = extractProperties(focusNode!, nodeMap, labelMap, descriptionMap)

      const desc = props.find(p => p.predicate === `${SDO}description`)
      expect(desc).toBeDefined()
      expect(desc!.values[0]!.type).toBe('literal')
      expect(desc!.values[0]!.value).toBe('A test vocabulary')
    })

    it('extracts language-tagged literals', () => {
      const data = makeSchemeFixture()
      const { nodeMap, labelMap, descriptionMap, focusNode } = parseAnnotatedJsonLd(data)
      const props = extractProperties(focusNode!, nodeMap, labelMap, descriptionMap)

      // prefLabel is in SKIP_PREDICATES, so use description instead — but let's check dateCreated
      const dateCreated = props.find(p => p.predicate === `${SDO}dateCreated`)
      expect(dateCreated).toBeDefined()
      expect(dateCreated!.values[0]!.datatype).toBe('http://www.w3.org/2001/XMLSchema#date')
    })

    it('extracts datatype-annotated literals', () => {
      const data = makeSchemeFixture()
      const { nodeMap, labelMap, descriptionMap, focusNode } = parseAnnotatedJsonLd(data)
      const props = extractProperties(focusNode!, nodeMap, labelMap, descriptionMap)

      const dateCreated = props.find(p => p.predicate === `${SDO}dateCreated`)
      expect(dateCreated!.values[0]!.value).toBe('2024-01-01')
      expect(dateCreated!.values[0]!.datatypeLabel).toBe('date')
    })

    it('extracts IRI values with labels', () => {
      const data = makeConceptFixture()
      const { nodeMap, labelMap, descriptionMap, focusNode } = parseAnnotatedJsonLd(data)
      const props = extractProperties(focusNode!, nodeMap, labelMap, descriptionMap, undefined, 'concept')

      const broader = props.find(p => p.predicate === `${SKOS}broader`)
      expect(broader).toBeDefined()
      expect(broader!.values[0]!.type).toBe('iri')
      expect(broader!.values[0]!.value).toBe('http://example.com/vocab/root')
      expect(broader!.values[0]!.label).toBe('Root Concept')
    })

    it('falls back to localName for unlabelled IRIs', () => {
      // Create fixture with an IRI that has no label annotation
      const data: JsonLdNode[] = [
        {
          '@id': 'http://example.com/focus',
          [`${PREZ}type`]: [{ '@id': `${PREZ}FocusNode` }],
          [`${SKOS}broader`]: [{ '@id': 'http://example.com/unlabelled-concept' }],
        },
      ]
      const { nodeMap, labelMap, descriptionMap, focusNode } = parseAnnotatedJsonLd(data)
      const props = extractProperties(focusNode!, nodeMap, labelMap, descriptionMap)

      const broader = props.find(p => p.predicate === `${SKOS}broader`)
      expect(broader!.values[0]!.label).toBe('unlabelled-concept')
    })
  })

  describe('filtering', () => {
    it('skips @-prefixed keys', () => {
      const data = makeSchemeFixture()
      const { nodeMap, labelMap, descriptionMap, focusNode } = parseAnnotatedJsonLd(data)
      const props = extractProperties(focusNode!, nodeMap, labelMap, descriptionMap)

      const atKeys = props.filter(p => p.predicate.startsWith('@'))
      expect(atKeys).toHaveLength(0)
    })

    it('skips SKIP_PREDICATES (rdf:type, prez:*)', () => {
      const data = makeSchemeFixture()
      const { nodeMap, labelMap, descriptionMap, focusNode } = parseAnnotatedJsonLd(data)
      const props = extractProperties(focusNode!, nodeMap, labelMap, descriptionMap)

      const rdfType = props.find(p => p.predicate === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type')
      const prezType = props.find(p => p.predicate === `${PREZ}type`)
      const prefLabel = props.find(p => p.predicate === `${SKOS}prefLabel`)
      expect(rdfType).toBeUndefined()
      expect(prezType).toBeUndefined()
      expect(prefLabel).toBeUndefined()
    })
  })

  describe('ordering', () => {
    it('orders by profile order value', () => {
      const data = makeSchemeFixture()
      const { nodeMap, labelMap, descriptionMap, focusNode } = parseAnnotatedJsonLd(data)

      const profile: ProfileJsonConfig = {
        conceptScheme: {
          propertyOrder: [
            { path: `${SDO}dateCreated`, order: 1 },
            { path: `${SDO}description`, order: 2 },
          ],
        },
      }
      const props = extractProperties(focusNode!, nodeMap, labelMap, descriptionMap, profile)

      expect(props[0]!.predicate).toBe(`${SDO}dateCreated`)
      expect(props[0]!.order).toBe(1)
      expect(props[1]!.predicate).toBe(`${SDO}description`)
      expect(props[1]!.order).toBe(2)
    })

    it('ordered before unordered', () => {
      const data = makeSchemeFixture()
      const { nodeMap, labelMap, descriptionMap, focusNode } = parseAnnotatedJsonLd(data)

      const profile: ProfileJsonConfig = {
        conceptScheme: {
          propertyOrder: [
            { path: `${SDO}dateCreated`, order: 5 },
          ],
        },
      }
      const props = extractProperties(focusNode!, nodeMap, labelMap, descriptionMap, profile)

      // dateCreated (order 5) should come before description (order 999)
      const dateIdx = props.findIndex(p => p.predicate === `${SDO}dateCreated`)
      const descIdx = props.findIndex(p => p.predicate === `${SDO}description`)
      expect(dateIdx).toBeLessThan(descIdx)
    })

    it('unordered sorted alphabetically by label', () => {
      const data: JsonLdNode[] = [
        {
          '@id': 'http://example.com/focus',
          [`${PREZ}type`]: [{ '@id': `${PREZ}FocusNode` }],
          'http://example.com/zPred': [{ '@value': 'z' }],
          'http://example.com/aPred': [{ '@value': 'a' }],
          'http://example.com/mPred': [{ '@value': 'm' }],
        },
      ]
      const { nodeMap, labelMap, descriptionMap, focusNode } = parseAnnotatedJsonLd(data)
      const props = extractProperties(focusNode!, nodeMap, labelMap, descriptionMap)

      // All unordered, so alphabetical by localName (aPred, mPred, zPred)
      expect(props[0]!.predicate).toBe('http://example.com/aPred')
      expect(props[1]!.predicate).toBe('http://example.com/mPred')
      expect(props[2]!.predicate).toBe('http://example.com/zPred')
    })

    it('works without profile (all order 999)', () => {
      const data = makeSchemeFixture()
      const { nodeMap, labelMap, descriptionMap, focusNode } = parseAnnotatedJsonLd(data)
      const props = extractProperties(focusNode!, nodeMap, labelMap, descriptionMap)

      for (const prop of props) {
        expect(prop.order).toBe(999)
      }
    })
  })

  describe('blank nodes', () => {
    it('identifies _: prefixed IRI as nested', () => {
      const data = makeBlankNodeFixture()
      const { nodeMap, labelMap, descriptionMap, focusNode } = parseAnnotatedJsonLd(data)
      const props = extractProperties(focusNode!, nodeMap, labelMap, descriptionMap)

      const qa = props.find(p => p.predicate === `${PROV}qualifiedAttribution`)
      expect(qa).toBeDefined()
      expect(qa!.values[0]!.type).toBe('nested')
    })

    it('extracts nestedProperties from nodeMap', () => {
      const data = makeBlankNodeFixture()
      const { nodeMap, labelMap, descriptionMap, focusNode } = parseAnnotatedJsonLd(data)
      const props = extractProperties(focusNode!, nodeMap, labelMap, descriptionMap)

      const qa = props.find(p => p.predicate === `${PROV}qualifiedAttribution`)!
      const nested = qa.values[0]!.nestedProperties!
      expect(nested.length).toBeGreaterThanOrEqual(2)

      const agentProp = nested.find(n => n.predicate === `${PROV}agent`)
      expect(agentProp).toBeDefined()
      expect(agentProp!.values[0]!.type).toBe('iri')
      expect(agentProp!.values[0]!.label).toBe('Alice')
    })

    it('returns type nested', () => {
      const data = makeBlankNodeFixture()
      const { nodeMap, labelMap, descriptionMap, focusNode } = parseAnnotatedJsonLd(data)
      const props = extractProperties(focusNode!, nodeMap, labelMap, descriptionMap)

      const qa = props.find(p => p.predicate === `${PROV}qualifiedAttribution`)!
      expect(qa.values[0]!.type).toBe('nested')
      expect(qa.values[0]!.value).toBe('_:b0')
    })
  })

  describe('edge cases', () => {
    it('empty properties (all skipped)', () => {
      const data: JsonLdNode[] = [
        {
          '@id': 'http://example.com/focus',
          '@type': [`${SKOS}Concept`],
          [`${PREZ}type`]: [{ '@id': `${PREZ}FocusNode` }],
          // Only @-prefixed, rdf:type, and prez:* — all skipped
          'http://www.w3.org/1999/02/22-rdf-syntax-ns#type': [{ '@id': `${SKOS}Concept` }],
          [`${PREZ}label`]: [{ '@value': 'Test' }],
        },
      ]
      const { nodeMap, labelMap, descriptionMap, focusNode } = parseAnnotatedJsonLd(data)
      const props = extractProperties(focusNode!, nodeMap, labelMap, descriptionMap)
      expect(props).toHaveLength(0)
    })

    it('multiple values per predicate', () => {
      const data: JsonLdNode[] = [
        {
          '@id': 'http://example.com/focus',
          [`${PREZ}type`]: [{ '@id': `${PREZ}FocusNode` }],
          [`${SKOS}altLabel`]: [
            { '@value': 'Alt One', '@language': 'en' },
            { '@value': 'Alt Two', '@language': 'fr' },
            { '@value': 'Alt Three', '@language': 'de' },
          ],
        },
      ]
      const { nodeMap, labelMap, descriptionMap, focusNode } = parseAnnotatedJsonLd(data)
      const props = extractProperties(focusNode!, nodeMap, labelMap, descriptionMap)

      const altLabel = props.find(p => p.predicate === `${SKOS}altLabel`)
      expect(altLabel!.values).toHaveLength(3)
      expect(altLabel!.values[0]!.language).toBe('en')
      expect(altLabel!.values[1]!.language).toBe('fr')
      expect(altLabel!.values[2]!.language).toBe('de')
    })

    it('IRI not in nodeMap uses localName', () => {
      const data: JsonLdNode[] = [
        {
          '@id': 'http://example.com/focus',
          [`${PREZ}type`]: [{ '@id': `${PREZ}FocusNode` }],
          [`${SKOS}broader`]: [{ '@id': 'http://example.com/unknown/my-concept' }],
        },
      ]
      const { nodeMap, labelMap, descriptionMap, focusNode } = parseAnnotatedJsonLd(data)
      const props = extractProperties(focusNode!, nodeMap, labelMap, descriptionMap)

      const broader = props.find(p => p.predicate === `${SKOS}broader`)
      expect(broader!.values[0]!.label).toBe('my-concept')
    })
  })
})
