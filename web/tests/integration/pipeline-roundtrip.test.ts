/**
 * Pipeline Roundtrip Integration Tests
 *
 * Tests the full data path: edit TTL → run process-vocab.js → verify JSON output.
 * Uses the real pipeline script (same one CI runs) against edited vocabulary files.
 * Catches bugs where edits produce valid TTL but broken JSON exports.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, rmSync, readdirSync, existsSync } from 'fs'
import { join, resolve } from 'path'
import { execSync } from 'child_process'
import { Store, Parser, DataFactory } from 'n3'

const { namedNode, literal, quad: makeQuad } = DataFactory

const ROOT = resolve(__dirname, '../../../')
const PROFILES = join(ROOT, 'data/config/profiles.ttl')
const COLOURS_TTL = join(ROOT, 'data/vocabs/colours.ttl')
const PROCESS_SCRIPT = join(ROOT, 'packages/data-processing/scripts/process-vocab.js')

// SKOS namespace constants
const SKOS = {
  prefLabel: 'http://www.w3.org/2004/02/skos/core#prefLabel',
  altLabel: 'http://www.w3.org/2004/02/skos/core#altLabel',
  definition: 'http://www.w3.org/2004/02/skos/core#definition',
  broader: 'http://www.w3.org/2004/02/skos/core#broader',
  inScheme: 'http://www.w3.org/2004/02/skos/core#inScheme',
  topConceptOf: 'http://www.w3.org/2004/02/skos/core#topConceptOf',
  hasTopConcept: 'http://www.w3.org/2004/02/skos/core#hasTopConcept',
  Concept: 'http://www.w3.org/2004/02/skos/core#Concept',
} as const

const RDF_TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type'
const RDFS_ISDEFINEDBY = 'http://www.w3.org/2000/01/rdf-schema#isDefinedBy'
const BASE = 'https://example.com/def/colours/'
const SCHEME_IRI = 'https://example.com/def/colours'

// --- Helpers ---

function parseTTL(content: string): Store {
  const store = new Store()
  const parser = new Parser()
  store.addQuads(parser.parse(content))
  return store
}

function cloneStore(src: Store): Store {
  const dst = new Store()
  dst.addQuads(src.getQuads(null, null, null, null))
  return dst
}

/** Serialize an N3 store back to Turtle using prefixes from the original TTL */
function serializeStore(store: Store, originalTTL: string): string {
  // Extract prefixes from original to maintain consistency
  const prefixMap: Record<string, string> = {}
  for (const line of originalTTL.split('\n')) {
    const m = line.match(/^PREFIX\s+(\w*):?\s*<(.+?)>\s*$/i)
      || line.match(/^@prefix\s+(\w*):?\s*<(.+?)>\s*\.\s*$/i)
    if (m) {
      prefixMap[m[1]] = m[2]
    }
  }

  const { Writer } = require('n3')
  const writer = new Writer({ prefixes: prefixMap })
  store.getQuads(null, null, null, null).forEach((q: any) => writer.addQuad(q))

  let result = ''
  writer.end((_err: any, output: string) => { result = output })
  return result
}

interface ProcessResult {
  outDir: string
  concepts: ConceptEntry[]
  findConcept: (iri: string) => ConceptEntry | undefined
  findByLabel: (label: string) => ConceptEntry | undefined
}

interface ConceptEntry {
  iri: string
  prefLabel: string
  altLabels?: string[]
  definition?: string
  broader?: string
  scheme?: string
  notation?: string
}

/**
 * Run process-vocab.js on a TTL string and return parsed JSON concepts.
 */
function processAndRead(ttl: string, tmpDir: string, filename = 'test-vocab.ttl'): ProcessResult {
  const slug = filename.replace('.ttl', '')
  const vocabPath = join(tmpDir, filename)
  const outDir = join(tmpDir, 'output', slug)

  writeFileSync(vocabPath, ttl)

  execSync(
    `node "${PROCESS_SCRIPT}" --profiles "${PROFILES}" --source "${vocabPath}" --outDir "${outDir}" --type vocab`,
    { cwd: ROOT, timeout: 30_000, stdio: 'pipe' },
  )

  // Find the concepts JSON file
  const files = readdirSync(outDir).filter(f => f.endsWith('-concepts.json'))
  if (!files.length) {
    throw new Error(`No concepts JSON found in ${outDir}. Files: ${readdirSync(outDir).join(', ')}`)
  }

  const json = JSON.parse(readFileSync(join(outDir, files[0]), 'utf-8'))
  const concepts: ConceptEntry[] = json['@graph'] || []

  return {
    outDir,
    concepts,
    findConcept: (iri: string) => concepts.find(c => c.iri === iri),
    findByLabel: (label: string) => concepts.find(c => c.prefLabel === label),
  }
}

// --- Shared state ---

let originalTTL: string
let tmpDir: string

const skipIf = !existsSync(COLOURS_TTL) || !existsSync(PROFILES) || !existsSync(PROCESS_SCRIPT)

beforeAll(() => {
  if (skipIf) return
  originalTTL = readFileSync(COLOURS_TTL, 'utf-8')
  // .cache exists on dev machines but not on a fresh CI checkout
  mkdirSync(join(ROOT, '.cache'), { recursive: true })
  tmpDir = mkdtempSync(join(ROOT, '.cache/pipeline-test-'))
})

afterAll(() => {
  if (tmpDir && existsSync(tmpDir)) {
    rmSync(tmpDir, { recursive: true, force: true })
  }
})

// --- Tests ---

describe.skipIf(skipIf)('pipeline roundtrip', () => {
  it('baseline: processes original colours vocab correctly', () => {
    const result = processAndRead(originalTTL, tmpDir, 'colours-baseline.ttl')

    // Should have all 15 concepts
    expect(result.concepts.length).toBe(15)

    // Spot-check key concepts
    const red = result.findConcept(`${BASE}red`)
    expect(red).toBeDefined()
    expect(red!.prefLabel).toBe('Red')
    expect(red!.broader).toBe(`${BASE}primary`)

    const primary = result.findConcept(`${BASE}primary`)
    expect(primary).toBeDefined()
    expect(primary!.prefLabel).toBe('Primary colour')

    // Check a concept with altLabel
    const purple = result.findConcept(`${BASE}purple`)
    expect(purple).toBeDefined()
    expect(purple!.altLabels).toContain('Violet')
  })

  it('rename concept: changing prefLabel appears in JSON', () => {
    const store = parseTTL(originalTTL)

    // Remove old label, add new one
    const redIri = namedNode(`${BASE}red`)
    const oldQuads = store.getQuads(redIri, namedNode(SKOS.prefLabel), null, null)
    expect(oldQuads.length).toBe(1)
    store.removeQuad(oldQuads[0])
    store.addQuad(makeQuad(redIri, namedNode(SKOS.prefLabel), literal('Scarlet')))

    const editedTTL = serializeStore(store, originalTTL)
    const result = processAndRead(editedTTL, tmpDir, 'colours-rename.ttl')

    // "Red" should be gone, "Scarlet" should be present
    expect(result.findByLabel('Red')).toBeUndefined()
    const scarlet = result.findByLabel('Scarlet')
    expect(scarlet).toBeDefined()
    expect(scarlet!.iri).toBe(`${BASE}red`)
    expect(scarlet!.broader).toBe(`${BASE}primary`)
  })

  it('add altLabel: new alternative label appears in JSON', () => {
    const store = parseTTL(originalTTL)

    // Add altLabel "Crimson" to Red
    store.addQuad(makeQuad(
      namedNode(`${BASE}red`),
      namedNode(SKOS.altLabel),
      literal('Crimson'),
    ))

    const editedTTL = serializeStore(store, originalTTL)
    const result = processAndRead(editedTTL, tmpDir, 'colours-altlabel.ttl')

    const red = result.findConcept(`${BASE}red`)
    expect(red).toBeDefined()
    expect(red!.altLabels).toContain('Crimson')
  })

  it('change definition: updated definition appears in JSON', () => {
    const store = parseTTL(originalTTL)

    const redIri = namedNode(`${BASE}red`)
    const oldDefs = store.getQuads(redIri, namedNode(SKOS.definition), null, null)
    expect(oldDefs.length).toBe(1)
    store.removeQuad(oldDefs[0])
    store.addQuad(makeQuad(redIri, namedNode(SKOS.definition), literal('The colour of fire and blood.')))

    const editedTTL = serializeStore(store, originalTTL)
    const result = processAndRead(editedTTL, tmpDir, 'colours-definition.ttl')

    const red = result.findConcept(`${BASE}red`)
    expect(red).toBeDefined()
    expect(red!.definition).toBe('The colour of fire and blood.')
  })

  it('add concept: new concept appears in JSON with correct hierarchy', () => {
    const store = parseTTL(originalTTL)

    const crimsonIri = namedNode(`${BASE}crimson`)
    const schemeNode = namedNode(SCHEME_IRI)

    // Add new concept "Crimson" under tertiary
    store.addQuad(makeQuad(crimsonIri, namedNode(RDF_TYPE), namedNode(SKOS.Concept)))
    store.addQuad(makeQuad(crimsonIri, namedNode(SKOS.prefLabel), literal('Crimson')))
    store.addQuad(makeQuad(crimsonIri, namedNode(SKOS.definition), literal('A deep red colour.')))
    store.addQuad(makeQuad(crimsonIri, namedNode(SKOS.broader), namedNode(`${BASE}tertiary`)))
    store.addQuad(makeQuad(crimsonIri, namedNode(SKOS.inScheme), schemeNode))
    store.addQuad(makeQuad(crimsonIri, namedNode(RDFS_ISDEFINEDBY), schemeNode))

    const editedTTL = serializeStore(store, originalTTL)
    const result = processAndRead(editedTTL, tmpDir, 'colours-add.ttl')

    // Should now have 16 concepts
    expect(result.concepts.length).toBe(16)

    const crimson = result.findByLabel('Crimson')
    expect(crimson).toBeDefined()
    expect(crimson!.iri).toBe(`${BASE}crimson`)
    expect(crimson!.broader).toBe(`${BASE}tertiary`)
    expect(crimson!.definition).toBe('A deep red colour.')
  })

  it('delete concept: removed concept absent from JSON', () => {
    const store = parseTTL(originalTTL)

    // Remove all quads where Amber is subject or object
    const amberIri = namedNode(`${BASE}amber`)
    const asSubject = store.getQuads(amberIri, null, null, null)
    const asObject = store.getQuads(null, null, amberIri, null)
    asSubject.forEach(q => store.removeQuad(q))
    asObject.forEach(q => store.removeQuad(q))

    const editedTTL = serializeStore(store, originalTTL)
    const result = processAndRead(editedTTL, tmpDir, 'colours-delete.ttl')

    // Should have 14 concepts (one removed)
    expect(result.concepts.length).toBe(14)
    expect(result.findConcept(`${BASE}amber`)).toBeUndefined()
    expect(result.findByLabel('Amber')).toBeUndefined()

    // Other concepts unaffected
    expect(result.findByLabel('Red')).toBeDefined()
    expect(result.findByLabel('Vermilion')).toBeDefined()
  })

  it('move concept: changing broader updates hierarchy in JSON', () => {
    const store = parseTTL(originalTTL)

    // Move Amber from tertiary to secondary
    const amberIri = namedNode(`${BASE}amber`)
    const oldBroader = store.getQuads(amberIri, namedNode(SKOS.broader), null, null)
    expect(oldBroader.length).toBe(1)
    expect(oldBroader[0].object.value).toBe(`${BASE}tertiary`)

    store.removeQuad(oldBroader[0])
    store.addQuad(makeQuad(amberIri, namedNode(SKOS.broader), namedNode(`${BASE}secondary`)))

    const editedTTL = serializeStore(store, originalTTL)
    const result = processAndRead(editedTTL, tmpDir, 'colours-move.ttl')

    const amber = result.findConcept(`${BASE}amber`)
    expect(amber).toBeDefined()
    expect(amber!.broader).toBe(`${BASE}secondary`)
  })

  it('edit scheme metadata: changed scheme label appears in JSON', () => {
    const store = parseTTL(originalTTL)

    // Change scheme prefLabel from "Colour" to "Color Palette"
    const schemeNode = namedNode(SCHEME_IRI)
    const oldLabels = store.getQuads(schemeNode, namedNode(SKOS.prefLabel), null, null)
    expect(oldLabels.length).toBe(1)
    store.removeQuad(oldLabels[0])
    store.addQuad(makeQuad(schemeNode, namedNode(SKOS.prefLabel), literal('Color Palette')))

    const editedTTL = serializeStore(store, originalTTL)
    const result = processAndRead(editedTTL, tmpDir, 'colours-scheme.ttl')

    // Every concept's schemeLabel should be updated
    for (const concept of result.concepts) {
      expect(concept.schemeLabel).toBe('Color Palette')
    }
  })

  it('all output formats generated: TTL, JSON-LD, CSV, RDF/XML exist', () => {
    const result = processAndRead(originalTTL, tmpDir, 'colours-formats.ttl')
    const files = readdirSync(result.outDir)

    expect(files.some(f => f.endsWith('-turtle.ttl'))).toBe(true)
    expect(files.some(f => f.endsWith('-concepts.json'))).toBe(true)
    expect(files.some(f => f.endsWith('-json-ld.json'))).toBe(true)
    expect(files.some(f => f.endsWith('-concepts.csv'))).toBe(true)
    expect(files.some(f => f.endsWith('-rdf.xml'))).toBe(true)
    expect(files.some(f => f.endsWith('-page.html'))).toBe(true)
  })

  it('CSV export contains all concepts with labels', () => {
    const result = processAndRead(originalTTL, tmpDir, 'colours-csv.ttl')
    const files = readdirSync(result.outDir)
    const csvFile = files.find(f => f.endsWith('-concepts.csv'))
    expect(csvFile).toBeDefined()

    const csv = readFileSync(join(result.outDir, csvFile!), 'utf-8')
    const lines = csv.trim().split('\n')

    // Header + 15 concept rows
    expect(lines.length).toBeGreaterThanOrEqual(16)
    expect(csv).toContain('Red')
    expect(csv).toContain('Blue')
    expect(csv).toContain('Primary colour')
  })
})
