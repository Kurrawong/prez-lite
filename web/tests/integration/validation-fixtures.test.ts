/**
 * SHACL Validation Fixtures Integration Test
 *
 * Ports the 30 existing test fixtures from data/validators/tests/ into Vitest.
 * Loads shapes from data/validators/vocabs.ttl, validates each fixture,
 * and asserts pass/fail matches the filename pattern (valid/invalid).
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync, readdirSync } from 'fs'
import { join, resolve } from 'path'
import { Parser, Store } from 'n3'
import SHACLValidator from 'rdf-validate-shacl'

const ROOT = resolve(__dirname, '../../../')
const VALIDATORS_DIR = join(ROOT, 'data/validators')
const TESTS_DIR = join(ROOT, 'data/validators/tests')

function parseFile(filepath: string): Store {
  const store = new Store()
  const parser = new Parser()
  const content = readFileSync(filepath, 'utf-8')
  store.addQuads(parser.parse(content))
  return store
}

async function validate(dataStore: Store, shapesStore: Store) {
  const validator = new SHACLValidator(shapesStore)
  const report = await validator.validate(dataStore)

  let violations = 0
  for (const r of report.results) {
    const sev = r.severity?.value || ''
    if (!sev.includes('Warning') && !sev.includes('Info')) {
      violations++
    }
  }

  return { conforms: violations === 0, violations }
}

describe('SHACL validation fixtures', () => {
  let shapesStore: Store

  beforeAll(() => {
    // Load shapes from all TTL files in validators dir (same as run-validation-tests.js)
    shapesStore = new Store()
    const shapeFiles = readdirSync(VALIDATORS_DIR).filter(f => f.endsWith('.ttl'))
    for (const f of shapeFiles) {
      const parser = new Parser()
      const content = readFileSync(join(VALIDATORS_DIR, f), 'utf-8')
      shapesStore.addQuads(parser.parse(content))
    }
  })

  // Discover all test fixture files
  const fixtureFiles = readdirSync(TESTS_DIR)
    .filter(f => f.endsWith('.ttl'))
    .sort()

  // Group by vocab prefix for readability
  const groups = new Map<string, string[]>()
  for (const f of fixtureFiles) {
    // Extract prefix: everything before -valid- or -invalid-
    const match = f.match(/^(.+?)-(valid|invalid)-/)
    const prefix = match ? match[1]! : 'unknown'
    if (!groups.has(prefix)) groups.set(prefix, [])
    groups.get(prefix)!.push(f)
  }

  for (const [prefix, files] of groups) {
    describe(prefix, () => {
      for (const file of files) {
        const expectedConforms = file.includes('-valid-')

        it(`${file} should ${expectedConforms ? 'conform' : 'not conform'}`, async () => {
          const dataStore = parseFile(join(TESTS_DIR, file))
          const result = await validate(dataStore, shapesStore)
          expect(result.conforms).toBe(expectedConforms)
        })
      }
    })
  }
})
