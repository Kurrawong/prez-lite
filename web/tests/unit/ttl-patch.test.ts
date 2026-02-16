import { describe, it, expect } from 'vitest'
import { Store, Parser, DataFactory } from 'n3'
import {
  extractPrefixes,
  parseSubjectBlocks,
  serializeSubjectBlock,
  patchTTL,
  quadKey,
  computeQuadDiff,
  getModifiedSubjects,
  buildChangeSummary,
} from '~/utils/ttl-patch'

const { namedNode, literal, defaultGraph } = DataFactory

// ============================================================================
// Helpers
// ============================================================================

function parseTTL(ttl: string): Store {
  const parser = new Parser({ format: 'Turtle' })
  const store = new Store()
  store.addQuads(parser.parse(ttl))
  return store
}

// ============================================================================
// extractPrefixes
// ============================================================================

describe('extractPrefixes', () => {
  it('extracts @prefix declarations', () => {
    const ttl = `
@prefix skos: <http://www.w3.org/2004/02/skos/core#> .
@prefix cs: <http://example.com/vocab/> .
`
    const prefixes = extractPrefixes(ttl)
    expect(prefixes).toEqual({
      skos: 'http://www.w3.org/2004/02/skos/core#',
      cs: 'http://example.com/vocab/',
    })
  })

  it('extracts PREFIX declarations (case-insensitive)', () => {
    const ttl = `
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
prefix cs: <http://example.com/vocab/>
`
    const prefixes = extractPrefixes(ttl)
    expect(prefixes).toEqual({
      skos: 'http://www.w3.org/2004/02/skos/core#',
      cs: 'http://example.com/vocab/',
    })
  })

  it('handles mixed @prefix and PREFIX', () => {
    const ttl = `
@prefix skos: <http://www.w3.org/2004/02/skos/core#> .
PREFIX cs: <http://example.com/vocab/>
`
    const prefixes = extractPrefixes(ttl)
    expect(prefixes.skos).toBe('http://www.w3.org/2004/02/skos/core#')
    expect(prefixes.cs).toBe('http://example.com/vocab/')
  })

  it('handles default prefix (empty name)', () => {
    const ttl = `@prefix : <http://example.com/> .`
    const prefixes = extractPrefixes(ttl)
    expect(prefixes['']).toBe('http://example.com/')
  })

  it('returns empty object for no prefixes', () => {
    const ttl = `<http://example.com/s> <http://example.com/p> <http://example.com/o> .`
    expect(extractPrefixes(ttl)).toEqual({})
  })
})

// ============================================================================
// parseSubjectBlocks
// ============================================================================

describe('parseSubjectBlocks', () => {
  it('parses full IRI subjects', () => {
    const ttl = `@prefix skos: <http://www.w3.org/2004/02/skos/core#> .

<http://example.com/s1> a skos:Concept ;
    skos:prefLabel "One"@en .

<http://example.com/s2> a skos:Concept ;
    skos:prefLabel "Two"@en .
`
    const store = parseTTL(ttl)
    const parsed = parseSubjectBlocks(ttl, store)

    expect(parsed.subjectBlocks).toHaveLength(2)
    expect(parsed.subjectBlocks[0]!.subjectIri).toBe('http://example.com/s1')
    expect(parsed.subjectBlocks[1]!.subjectIri).toBe('http://example.com/s2')
    expect(parsed.prefixBlock).toContain('@prefix skos:')
  })

  it('parses prefixed name subjects', () => {
    const ttl = `@prefix skos: <http://www.w3.org/2004/02/skos/core#> .
@prefix cs: <http://example.com/vocab/> .

cs: a skos:ConceptScheme ;
    skos:prefLabel "Test"@en .

cs:alpha a skos:Concept ;
    skos:prefLabel "Alpha"@en .
`
    const store = parseTTL(ttl)
    const parsed = parseSubjectBlocks(ttl, store)

    expect(parsed.subjectBlocks).toHaveLength(2)
    expect(parsed.subjectBlocks[0]!.subjectIri).toBe('http://example.com/vocab/')
    expect(parsed.subjectBlocks[1]!.subjectIri).toBe('http://example.com/vocab/alpha')
  })

  it('returns entire file as prefixBlock when no subjects found', () => {
    const ttl = `@prefix skos: <http://www.w3.org/2004/02/skos/core#> .
`
    const store = new Store()
    const parsed = parseSubjectBlocks(ttl, store)

    expect(parsed.subjectBlocks).toHaveLength(0)
    expect(parsed.prefixBlock).toBe(ttl)
    expect(parsed.trailingText).toBe('')
  })

  it('handles blank node subjects', () => {
    const ttl = `@prefix skos: <http://www.w3.org/2004/02/skos/core#> .

_:b0 skos:prefLabel "Blank"@en .
`
    const store = parseTTL(ttl)
    const parsed = parseSubjectBlocks(ttl, store)

    // Blank nodes may or may not be detected depending on N3 parser ID format
    // At minimum, the prefix block should be extracted
    expect(parsed.prefixBlock).toContain('@prefix skos:')
  })

  it('preserves original text of each block', () => {
    const ttl = `@prefix skos: <http://www.w3.org/2004/02/skos/core#> .
@prefix cs: <http://example.com/vocab/> .

cs:a a skos:Concept ;
    skos:prefLabel "A"@en .

cs:b a skos:Concept ;
    skos:prefLabel "B"@en .
`
    const store = parseTTL(ttl)
    const parsed = parseSubjectBlocks(ttl, store)

    expect(parsed.subjectBlocks).toHaveLength(2)
    expect(parsed.subjectBlocks[0]!.originalText).toContain('cs:a a skos:Concept')
    expect(parsed.subjectBlocks[0]!.originalText).toContain('"A"@en')
    expect(parsed.subjectBlocks[1]!.originalText).toContain('cs:b a skos:Concept')
  })
})

// ============================================================================
// serializeSubjectBlock
// ============================================================================

describe('serializeSubjectBlock', () => {
  const prefixes = {
    skos: 'http://www.w3.org/2004/02/skos/core#',
    rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
    cs: 'http://example.com/vocab/',
  }

  it('serializes a simple concept', () => {
    const store = new Store()
    const iri = 'http://example.com/vocab/a'
    store.addQuad(
      namedNode(iri),
      namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
      namedNode('http://www.w3.org/2004/02/skos/core#Concept'),
      defaultGraph(),
    )
    store.addQuad(
      namedNode(iri),
      namedNode('http://www.w3.org/2004/02/skos/core#prefLabel'),
      literal('Alpha', 'en'),
      defaultGraph(),
    )

    const result = serializeSubjectBlock(store, iri, prefixes)
    expect(result).toContain('cs:a')
    expect(result).toContain('skos:Concept')
    expect(result).toContain('"Alpha"@en')
  })

  it('returns empty string for subject with no quads', () => {
    const store = new Store()
    const result = serializeSubjectBlock(store, 'http://example.com/missing', prefixes)
    expect(result).toBe('')
  })

  it('preserves language tags', () => {
    const store = new Store()
    const iri = 'http://example.com/vocab/a'
    store.addQuad(namedNode(iri), namedNode('http://www.w3.org/2004/02/skos/core#prefLabel'), literal('Cat', 'en'))
    store.addQuad(namedNode(iri), namedNode('http://www.w3.org/2004/02/skos/core#prefLabel'), literal('Chat', 'fr'))

    const result = serializeSubjectBlock(store, iri, prefixes)
    expect(result).toContain('"Cat"@en')
    expect(result).toContain('"Chat"@fr')
  })

  it('preserves datatype annotations', () => {
    const store = new Store()
    const iri = 'http://example.com/vocab/a'
    store.addQuad(
      namedNode(iri),
      namedNode('http://www.w3.org/2004/02/skos/core#notation'),
      literal('42', namedNode('http://www.w3.org/2001/XMLSchema#integer')),
    )

    const result = serializeSubjectBlock(store, iri, prefixes)
    expect(result).toContain('42')
  })

  it('handles empty local-name prefixed subjects (cs:)', () => {
    // When namespace ends with / or #, N3 Writer can't produce cs: form.
    // The post-processing only restores prefixed names when the ns does NOT end with / or #.
    // So for http://example.com/vocab/ the subject will be a full IRI.
    const store = new Store()
    const iri = 'http://example.com/vocab/'
    store.addQuad(
      namedNode(iri),
      namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
      namedNode('http://www.w3.org/2004/02/skos/core#ConceptScheme'),
    )
    store.addQuad(
      namedNode(iri),
      namedNode('http://www.w3.org/2004/02/skos/core#prefLabel'),
      literal('Test Vocab', 'en'),
    )

    const result = serializeSubjectBlock(store, iri, prefixes)
    // Full IRI used as subject since ns ends with /
    expect(result).toContain('<http://example.com/vocab/>')
    expect(result).toContain('skos:ConceptScheme')
  })

  it('restores prefixed names when namespace does not end with / or #', () => {
    // e.g. cs: <http://example.com/my-vocab> — the subject is the full ns
    const customPrefixes = {
      ...prefixes,
      myvocab: 'http://example.com/my-vocab',
    }
    const store = new Store()
    const iri = 'http://example.com/my-vocab'
    store.addQuad(
      namedNode(iri),
      namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
      namedNode('http://www.w3.org/2004/02/skos/core#ConceptScheme'),
    )

    const result = serializeSubjectBlock(store, iri, customPrefixes)
    expect(result).toContain('myvocab:')
    expect(result).not.toContain('<http://example.com/my-vocab>')
  })

  it('sorts rdf:type first', () => {
    const store = new Store()
    const iri = 'http://example.com/vocab/a'
    const RDF_TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type'
    const SKOS = 'http://www.w3.org/2004/02/skos/core#'

    // Add prefLabel before type
    store.addQuad(namedNode(iri), namedNode(`${SKOS}prefLabel`), literal('A', 'en'))
    store.addQuad(namedNode(iri), namedNode(RDF_TYPE), namedNode(`${SKOS}Concept`))

    const result = serializeSubjectBlock(store, iri, prefixes)
    const typePos = result.indexOf('Concept')
    const labelPos = result.indexOf('prefLabel')
    expect(typePos).toBeLessThan(labelPos)
  })
})

// ============================================================================
// patchTTL
// ============================================================================

describe('patchTTL', () => {
  it('replaces a single subject block', () => {
    const ttl = `@prefix skos: <http://www.w3.org/2004/02/skos/core#> .
@prefix cs: <http://example.com/vocab/> .

cs:a a skos:Concept ;
    skos:prefLabel "Old"@en .

cs:b a skos:Concept ;
    skos:prefLabel "B"@en .
`
    const store = parseTTL(ttl)
    const parsed = parseSubjectBlocks(ttl, store)

    const patches = new Map<string, string | null>()
    patches.set('http://example.com/vocab/a', 'cs:a a skos:Concept ;\n    skos:prefLabel "New"@en .\n\n')

    const result = patchTTL(parsed, patches)
    expect(result).toContain('"New"@en')
    expect(result).toContain('"B"@en')
    expect(result).not.toContain('"Old"@en')
  })

  it('removes a subject block with null patch', () => {
    const ttl = `@prefix skos: <http://www.w3.org/2004/02/skos/core#> .
@prefix cs: <http://example.com/vocab/> .

cs:a a skos:Concept ;
    skos:prefLabel "A"@en .

cs:b a skos:Concept ;
    skos:prefLabel "B"@en .
`
    const store = parseTTL(ttl)
    const parsed = parseSubjectBlocks(ttl, store)

    const patches = new Map<string, string | null>()
    patches.set('http://example.com/vocab/a', null)

    const result = patchTTL(parsed, patches)
    expect(result).not.toContain('cs:a')
    expect(result).toContain('"B"@en')
  })

  it('appends new subject blocks', () => {
    const ttl = `@prefix skos: <http://www.w3.org/2004/02/skos/core#> .
@prefix cs: <http://example.com/vocab/> .

cs:a a skos:Concept ;
    skos:prefLabel "A"@en .
`
    const store = parseTTL(ttl)
    const parsed = parseSubjectBlocks(ttl, store)

    const patches = new Map<string, string | null>()
    const newBlocks = ['cs:new a skos:Concept ;\n    skos:prefLabel "New"@en .\n']

    const result = patchTTL(parsed, patches, newBlocks)
    expect(result).toContain('"A"@en')
    expect(result).toContain('"New"@en')
  })

  it('preserves unchanged blocks byte-identical', () => {
    const ttl = `@prefix skos: <http://www.w3.org/2004/02/skos/core#> .
@prefix cs: <http://example.com/vocab/> .

cs:a a skos:Concept ;
    skos:prefLabel "A"@en .

cs:b a skos:Concept ;
    skos:prefLabel "B"@en .
`
    const store = parseTTL(ttl)
    const parsed = parseSubjectBlocks(ttl, store)

    // No patches = no change
    const patches = new Map<string, string | null>()
    const result = patchTTL(parsed, patches)
    expect(result).toBe(ttl)
  })

  it('handles replace + remove + append combined', () => {
    const ttl = `@prefix skos: <http://www.w3.org/2004/02/skos/core#> .
@prefix cs: <http://example.com/vocab/> .

cs:a a skos:Concept ;
    skos:prefLabel "A"@en .

cs:b a skos:Concept ;
    skos:prefLabel "B"@en .

cs:c a skos:Concept ;
    skos:prefLabel "C"@en .
`
    const store = parseTTL(ttl)
    const parsed = parseSubjectBlocks(ttl, store)

    const patches = new Map<string, string | null>()
    patches.set('http://example.com/vocab/a', 'cs:a a skos:Concept ;\n    skos:prefLabel "A-Updated"@en .\n\n')
    patches.set('http://example.com/vocab/b', null)
    const newBlocks = ['cs:d a skos:Concept ;\n    skos:prefLabel "D"@en .\n']

    const result = patchTTL(parsed, patches, newBlocks)
    expect(result).toContain('"A-Updated"@en')
    expect(result).not.toContain('"B"@en')
    expect(result).toContain('"C"@en')
    expect(result).toContain('"D"@en')
  })
})

// ============================================================================
// quadKey
// ============================================================================

describe('quadKey', () => {
  it('produces unique keys for different literals', () => {
    const q1 = DataFactory.quad(
      namedNode('http://s'), namedNode('http://p'), literal('hello', 'en'),
    )
    const q2 = DataFactory.quad(
      namedNode('http://s'), namedNode('http://p'), literal('hello', 'fr'),
    )
    expect(quadKey(q1)).not.toBe(quadKey(q2))
  })

  it('distinguishes literals from IRIs', () => {
    const q1 = DataFactory.quad(
      namedNode('http://s'), namedNode('http://p'), literal('http://example.com'),
    )
    const q2 = DataFactory.quad(
      namedNode('http://s'), namedNode('http://p'), namedNode('http://example.com'),
    )
    expect(quadKey(q1)).not.toBe(quadKey(q2))
  })

  it('produces identical keys for identical quads', () => {
    const q1 = DataFactory.quad(
      namedNode('http://s'), namedNode('http://p'), literal('val', 'en'),
    )
    const q2 = DataFactory.quad(
      namedNode('http://s'), namedNode('http://p'), literal('val', 'en'),
    )
    expect(quadKey(q1)).toBe(quadKey(q2))
  })
})

// ============================================================================
// computeQuadDiff
// ============================================================================

describe('computeQuadDiff', () => {
  it('detects added quads', () => {
    const original = new Store()
    const current = new Store()
    current.addQuad(namedNode('http://s'), namedNode('http://p'), literal('new'))

    const { added, removed } = computeQuadDiff(original, current)
    expect(added).toHaveLength(1)
    expect(removed).toHaveLength(0)
    expect(added[0]!.object.value).toBe('new')
  })

  it('detects removed quads', () => {
    const original = new Store()
    original.addQuad(namedNode('http://s'), namedNode('http://p'), literal('old'))
    const current = new Store()

    const { added, removed } = computeQuadDiff(original, current)
    expect(added).toHaveLength(0)
    expect(removed).toHaveLength(1)
    expect(removed[0]!.object.value).toBe('old')
  })

  it('returns empty diff for identical stores', () => {
    const original = new Store()
    original.addQuad(namedNode('http://s'), namedNode('http://p'), literal('same'))
    const current = new Store()
    current.addQuad(namedNode('http://s'), namedNode('http://p'), literal('same'))

    const { added, removed } = computeQuadDiff(original, current)
    expect(added).toHaveLength(0)
    expect(removed).toHaveLength(0)
  })

  it('detects modification as remove+add', () => {
    const original = new Store()
    original.addQuad(namedNode('http://s'), namedNode('http://p'), literal('old'))
    const current = new Store()
    current.addQuad(namedNode('http://s'), namedNode('http://p'), literal('new'))

    const { added, removed } = computeQuadDiff(original, current)
    expect(added).toHaveLength(1)
    expect(removed).toHaveLength(1)
    expect(added[0]!.object.value).toBe('new')
    expect(removed[0]!.object.value).toBe('old')
  })

  it('distinguishes language tags in diff', () => {
    const original = new Store()
    original.addQuad(namedNode('http://s'), namedNode('http://p'), literal('Cat', 'en'))
    const current = new Store()
    current.addQuad(namedNode('http://s'), namedNode('http://p'), literal('Cat', 'en'))
    current.addQuad(namedNode('http://s'), namedNode('http://p'), literal('Chat', 'fr'))

    const { added, removed } = computeQuadDiff(original, current)
    expect(added).toHaveLength(1)
    expect(added[0]!.object.value).toBe('Chat')
    expect(removed).toHaveLength(0)
  })
})

// ============================================================================
// getModifiedSubjects
// ============================================================================

describe('getModifiedSubjects', () => {
  it('collects subjects from added and removed quads', () => {
    const added = [
      DataFactory.quad(namedNode('http://a'), namedNode('http://p'), literal('v')),
      DataFactory.quad(namedNode('http://b'), namedNode('http://p'), literal('v')),
    ]
    const removed = [
      DataFactory.quad(namedNode('http://b'), namedNode('http://p'), literal('old')),
      DataFactory.quad(namedNode('http://c'), namedNode('http://p'), literal('v')),
    ]

    const subjects = getModifiedSubjects(added, removed)
    expect(subjects).toEqual(new Set(['http://a', 'http://b', 'http://c']))
  })

  it('returns empty set for no changes', () => {
    expect(getModifiedSubjects([], [])).toEqual(new Set())
  })
})

// ============================================================================
// buildChangeSummary
// ============================================================================

describe('buildChangeSummary', () => {
  const identityLabel = (iri: string) => iri.split('/').pop() ?? iri
  const identityPredLabel = (iri: string) => iri.split('#').pop() ?? iri

  it('detects added subject', () => {
    const older = new Store()
    const newer = new Store()
    newer.addQuad(namedNode('http://ex/a'), namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'), namedNode('http://www.w3.org/2004/02/skos/core#Concept'))
    newer.addQuad(namedNode('http://ex/a'), namedNode('http://www.w3.org/2004/02/skos/core#prefLabel'), literal('A'))

    const summary = buildChangeSummary(older, newer, identityLabel, identityPredLabel)
    expect(summary.totalAdded).toBe(1)
    expect(summary.totalRemoved).toBe(0)
    expect(summary.totalModified).toBe(0)
    expect(summary.subjects).toHaveLength(1)
    expect(summary.subjects[0]!.type).toBe('added')
  })

  it('detects removed subject', () => {
    const older = new Store()
    older.addQuad(namedNode('http://ex/a'), namedNode('http://www.w3.org/2004/02/skos/core#prefLabel'), literal('A'))
    const newer = new Store()

    const summary = buildChangeSummary(older, newer, identityLabel, identityPredLabel)
    expect(summary.totalRemoved).toBe(1)
    expect(summary.subjects[0]!.type).toBe('removed')
  })

  it('detects modified subject with property-level detail', () => {
    const SKOS_PREF = 'http://www.w3.org/2004/02/skos/core#prefLabel'
    const older = new Store()
    older.addQuad(namedNode('http://ex/a'), namedNode(SKOS_PREF), literal('Old'))
    const newer = new Store()
    newer.addQuad(namedNode('http://ex/a'), namedNode(SKOS_PREF), literal('New'))

    const summary = buildChangeSummary(older, newer, identityLabel, identityPredLabel)
    expect(summary.totalModified).toBe(1)
    expect(summary.subjects[0]!.type).toBe('modified')

    const propChange = summary.subjects[0]!.propertyChanges[0]!
    expect(propChange.type).toBe('modified')
    expect(propChange.oldValues).toEqual(['Old'])
    expect(propChange.newValues).toEqual(['New'])
  })

  it('groups changes by subject', () => {
    const SKOS = 'http://www.w3.org/2004/02/skos/core#'
    const older = new Store()
    older.addQuad(namedNode('http://ex/a'), namedNode(`${SKOS}prefLabel`), literal('A'))
    older.addQuad(namedNode('http://ex/b'), namedNode(`${SKOS}prefLabel`), literal('B'))

    const newer = new Store()
    newer.addQuad(namedNode('http://ex/a'), namedNode(`${SKOS}prefLabel`), literal('A-mod'))
    newer.addQuad(namedNode('http://ex/b'), namedNode(`${SKOS}prefLabel`), literal('B-mod'))

    const summary = buildChangeSummary(older, newer, identityLabel, identityPredLabel)
    expect(summary.subjects).toHaveLength(2)
    expect(summary.totalModified).toBe(2)
  })

  it('classifies property as added when only new values exist', () => {
    const SKOS = 'http://www.w3.org/2004/02/skos/core#'
    const older = new Store()
    older.addQuad(namedNode('http://ex/a'), namedNode(`${SKOS}prefLabel`), literal('A'))
    const newer = new Store()
    newer.addQuad(namedNode('http://ex/a'), namedNode(`${SKOS}prefLabel`), literal('A'))
    newer.addQuad(namedNode('http://ex/a'), namedNode(`${SKOS}altLabel`), literal('Alt'))

    const summary = buildChangeSummary(older, newer, identityLabel, identityPredLabel)
    expect(summary.totalModified).toBe(1)
    const propChange = summary.subjects[0]!.propertyChanges.find(p => p.predicateIri === `${SKOS}altLabel`)
    expect(propChange!.type).toBe('added')
  })
})
