#!/usr/bin/env node

/**
 * TTL → JSON Generator (SPARQL-free)
 *
 * Parses RDF vocabularies (Turtle/TTL) and generates normalized JSON resources.
 * Supports VocPub profile and GSWA vocabulary patterns.
 */

import { readdir, readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Parser, Store } from 'n3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '..');

// Namespace constants
const RDF = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';
const RDFS = 'http://www.w3.org/2000/01/rdf-schema#';
const SKOS = 'http://www.w3.org/2004/02/skos/core#';
const DCTERMS = 'http://purl.org/dc/terms/';
const SCHEMA = 'https://schema.org/';
const OWL = 'http://www.w3.org/2002/07/owl#';
const REG = 'http://purl.org/linked-data/registry#';
// PROV namespace reserved for future use

// Configuration
const CONFIG = {
  vocabsDir: join(ROOT_DIR, 'data', 'vocabs'),
  backgroundDir: join(ROOT_DIR, 'data', 'background'),
  manifestPath: join(ROOT_DIR, 'data', 'background', 'manifest.json'),
  outputDir: join(ROOT_DIR, 'public', 'data'),
  conceptsChunkSize: 10000,
  defaultLang: 'en'
};

/**
 * Convert IRI to filesystem-safe slug
 */
function iriToSlug(iri) {
  return iri
    .replace(/^https?:\/\//, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .substring(0, 100);
}

/**
 * Extract language-keyed literals from store
 */
function getLiterals(store, subject, predicate) {
  const result = {};
  const quads = store.getQuads(subject, predicate, null, null);

  for (const quad of quads) {
    if (quad.object.termType === 'Literal') {
      const lang = quad.object.language || 'none';
      if (!result[lang]) {
        result[lang] = [];
      }
      result[lang].push(quad.object.value);
    }
  }

  // Flatten single values
  for (const [lang, values] of Object.entries(result)) {
    if (values.length === 1) {
      result[lang] = values[0];
    }
  }

  return Object.keys(result).length > 0 ? result : null;
}

/**
 * Get single literal value
 */
function getLiteral(store, subject, predicate, preferredLang = CONFIG.defaultLang) {
  const literals = getLiterals(store, subject, predicate);
  if (!literals) return null;

  if (literals[preferredLang]) {
    return Array.isArray(literals[preferredLang])
      ? literals[preferredLang][0]
      : literals[preferredLang];
  }

  const firstLang = Object.keys(literals)[0];
  const value = literals[firstLang];
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Get all literal values (ignoring language)
 */
function getAllLiterals(store, subject, predicate) {
  const quads = store.getQuads(subject, predicate, null, null);
  return quads
    .filter(q => q.object.termType === 'Literal')
    .map(q => q.object.value);
}

/**
 * Get IRIs (for object properties)
 */
function getIRIs(store, subject, predicate) {
  return store.getQuads(subject, predicate, null, null)
    .filter(q => q.object.termType === 'NamedNode')
    .map(q => q.object.value);
}

/**
 * Parse TTL files from a directory
 */
async function parseTTLFiles(inputDir, label = 'files') {
  const store = new Store();
  const parser = new Parser({ format: 'Turtle' });

  console.log(`📖 Reading ${label} from ${inputDir}...`);

  try {
    const files = await readdir(inputDir);
    const ttlFiles = files.filter(f => f.endsWith('.ttl'));

    if (ttlFiles.length === 0) {
      console.log(`   No .ttl files found`);
      return store;
    }

    for (const file of ttlFiles) {
      const filePath = join(inputDir, file);
      console.log(`  - ${file}`);

      const content = await readFile(filePath, 'utf-8');
      const quads = parser.parse(content);
      store.addQuads(quads);
    }

    console.log(`✓ Loaded ${store.size} triples from ${ttlFiles.length} files\n`);
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log(`   Directory not found, skipping\n`);
    } else {
      throw error;
    }
  }

  return store;
}

/**
 * Build labels index from background store
 */
function buildLabelsIndex(backgroundStore) {
  const labels = {};

  // Extract rdfs:label
  for (const quad of backgroundStore.getQuads(null, `${RDFS}label`, null, null)) {
    if (quad.object.termType === 'Literal') {
      const iri = quad.subject.value;
      if (!labels[iri]) labels[iri] = {};
      const lang = quad.object.language || 'none';
      labels[iri][lang] = quad.object.value;
    }
  }

  // Also extract skos:prefLabel
  for (const quad of backgroundStore.getQuads(null, `${SKOS}prefLabel`, null, null)) {
    if (quad.object.termType === 'Literal') {
      const iri = quad.subject.value;
      if (!labels[iri]) labels[iri] = {};
      const lang = quad.object.language || 'none';
      if (!labels[iri][lang]) {
        labels[iri][lang] = quad.object.value;
      }
    }
  }

  return labels;
}

/**
 * Collect all external IRI references from vocab store
 * These are IRIs referenced but not defined as subjects in the store
 */
function collectExternalIris(vocabStore) {
  const definedSubjects = new Set();
  const referencedIris = new Set();

  // Collect all defined subjects (concepts, schemes, etc.)
  for (const quad of vocabStore.getQuads(null, null, null, null)) {
    if (quad.subject.termType === 'NamedNode') {
      definedSubjects.add(quad.subject.value);
    }
  }

  // Properties that reference external IRIs
  const refProperties = [
    `${SKOS}broader`, `${SKOS}narrower`, `${SKOS}related`,
    `${SKOS}exactMatch`, `${SKOS}closeMatch`, `${SKOS}broadMatch`,
    `${SKOS}narrowMatch`, `${SKOS}relatedMatch`,
    `${DCTERMS}creator`, `${DCTERMS}publisher`, `${DCTERMS}contributor`,
    `${SCHEMA}creator`, `${SCHEMA}publisher`,
    `${DCTERMS}source`, `${DCTERMS}references`,
    `${SKOS}inScheme`, `${SKOS}topConceptOf`
  ];

  for (const prop of refProperties) {
    for (const quad of vocabStore.getQuads(null, prop, null, null)) {
      if (quad.object.termType === 'NamedNode') {
        const iri = quad.object.value;
        if (!definedSubjects.has(iri)) {
          referencedIris.add(iri);
        }
      }
    }
  }

  return referencedIris;
}

/**
 * Load manifest and fetch remote TTL sources
 */
async function loadManifestSources(manifestPath) {
  const store = new Store();

  try {
    const manifestContent = await readFile(manifestPath, 'utf-8');
    const manifest = JSON.parse(manifestContent);

    if (manifest.sources && Array.isArray(manifest.sources)) {
      console.log(`📡 Fetching ${manifest.sources.length} remote label sources...`);

      for (const source of manifest.sources) {
        try {
          const url = typeof source === 'string' ? source : source.url;
          console.log(`  - ${url}`);

          const response = await fetch(url);
          if (!response.ok) {
            console.log(`    ⚠️  Failed: ${response.status}`);
            continue;
          }

          const ttl = await response.text();
          const parser = new Parser({ format: 'text/turtle' });
          const quads = parser.parse(ttl);
          store.addQuads(quads);
          console.log(`    ✓ ${quads.length} triples`);
        } catch (err) {
          console.log(`    ⚠️  Error: ${err.message}`);
        }
      }
    }
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.log(`⚠️  Error reading manifest: ${err.message}`);
    }
  }

  return store;
}

/**
 * Report missing labels for external IRIs
 */
function reportMissingLabels(externalIris, labelsIndex, outputDir) {
  const missing = [];

  for (const iri of externalIris) {
    if (!labelsIndex[iri]) {
      missing.push(iri);
    }
  }

  if (missing.length > 0) {
    console.log(`\n⚠️  ${missing.length} external IRIs without labels:`);
    // Group by domain for readability
    const byDomain = {};
    for (const iri of missing) {
      try {
        const domain = new URL(iri).hostname;
        if (!byDomain[domain]) byDomain[domain] = [];
        byDomain[domain].push(iri);
      } catch {
        if (!byDomain['other']) byDomain['other'] = [];
        byDomain['other'].push(iri);
      }
    }

    for (const [domain, iris] of Object.entries(byDomain)) {
      console.log(`  ${domain}: ${iris.length} IRIs`);
    }

    // Write missing IRIs to file for reference
    const missingPath = join(outputDir, 'missing-labels.json');
    writeFile(missingPath, JSON.stringify({ missing: missing.sort(), byDomain }, null, 2), 'utf-8');
    console.log(`  → See ${missingPath} for full list`);
  }

  return missing;
}

/**
 * Extract concept schemes with full VocPub properties
 */
function extractSchemes(store, labelsIndex) {
  const schemes = [];
  const schemeQuads = store.getQuads(null, `${RDF}type`, `${SKOS}ConceptScheme`, null);

  console.log(`📊 Extracting ${schemeQuads.length} concept schemes...`);

  for (const quad of schemeQuads) {
    const iri = quad.subject.value;

    const scheme = {
      iri,
      type: 'ConceptScheme',
      prefLabel: getLiterals(store, iri, `${SKOS}prefLabel`) || {},
      definition: getLiterals(store, iri, `${SKOS}definition`) || {},
      // Dates - try schema: first, then dcterms:
      created: getLiteral(store, iri, `${SCHEMA}dateCreated`) || getLiteral(store, iri, `${DCTERMS}created`),
      modified: getLiteral(store, iri, `${SCHEMA}dateModified`) || getLiteral(store, iri, `${DCTERMS}modified`),
      // Agents - with label resolution
      creator: getIRIs(store, iri, `${SCHEMA}creator`).concat(getIRIs(store, iri, `${DCTERMS}creator`)),
      publisher: getIRIs(store, iri, `${SCHEMA}publisher`).concat(getIRIs(store, iri, `${DCTERMS}publisher`)),
      // SKOS
      topConcepts: getIRIs(store, iri, `${SKOS}hasTopConcept`),
      // Additional metadata
      version: getLiteral(store, iri, `${SCHEMA}version`) || getLiteral(store, iri, `${OWL}versionInfo`),
      status: getIRIs(store, iri, `${REG}status`)[0],
      historyNote: getLiterals(store, iri, `${SKOS}historyNote`),
      keywords: getIRIs(store, iri, `${SCHEMA}keywords`),
      conceptCount: 0
    };

    // Resolve agent labels from background
    scheme.creatorLabels = scheme.creator.map(c => labelsIndex[c]?.en || labelsIndex[c]?.none || null);
    scheme.publisherLabels = scheme.publisher.map(p => labelsIndex[p]?.en || labelsIndex[p]?.none || null);

    schemes.push(scheme);
  }

  return schemes;
}

/**
 * Extract concepts with full properties
 */
function extractConcepts(store, schemes, _labelsIndex) {
  const concepts = [];
  const conceptQuads = store.getQuads(null, `${RDF}type`, `${SKOS}Concept`, null);
  const seenIris = new Set();

  console.log(`📦 Extracting ${conceptQuads.length} concepts...`);

  for (const quad of conceptQuads) {
    const iri = quad.subject.value;

    // Skip duplicates
    if (seenIris.has(iri)) continue;
    seenIris.add(iri);

    const concept = {
      iri,
      type: 'Concept',
      prefLabel: getLiterals(store, iri, `${SKOS}prefLabel`) || {},
      altLabel: getLiterals(store, iri, `${SKOS}altLabel`) || {},
      definition: getLiterals(store, iri, `${SKOS}definition`) || {},
      notation: getLiteral(store, iri, `${SKOS}notation`),
      // Scheme membership
      inScheme: getIRIs(store, iri, `${SKOS}inScheme`),
      topConceptOf: getIRIs(store, iri, `${SKOS}topConceptOf`),
      // Hierarchy
      broader: getIRIs(store, iri, `${SKOS}broader`),
      narrower: getIRIs(store, iri, `${SKOS}narrower`),
      related: getIRIs(store, iri, `${SKOS}related`),
      // Mappings
      exactMatch: getIRIs(store, iri, `${SKOS}exactMatch`),
      closeMatch: getIRIs(store, iri, `${SKOS}closeMatch`),
      broadMatch: getIRIs(store, iri, `${SKOS}broadMatch`),
      narrowMatch: getIRIs(store, iri, `${SKOS}narrowMatch`),
      relatedMatch: getIRIs(store, iri, `${SKOS}relatedMatch`),
      // Additional
      historyNote: getLiterals(store, iri, `${SKOS}historyNote`),
      scopeNote: getLiterals(store, iri, `${SKOS}scopeNote`),
      example: getLiterals(store, iri, `${SKOS}example`),
      changeNote: getLiterals(store, iri, `${SKOS}changeNote`),
      editorialNote: getLiterals(store, iri, `${SKOS}editorialNote`),
      // Citations
      citation: getAllLiterals(store, iri, `${SCHEMA}citation`),
      source: getIRIs(store, iri, `${DCTERMS}source`),
      isDefinedBy: getIRIs(store, iri, `${RDFS}isDefinedBy`)[0]
    };

    concepts.push(concept);
  }

  // Update scheme concept counts (deduplicated)
  for (const scheme of schemes) {
    const schemeConceptIris = new Set();
    for (const c of concepts) {
      if (c.inScheme.includes(scheme.iri) || c.topConceptOf.includes(scheme.iri)) {
        schemeConceptIris.add(c.iri);
      }
    }
    scheme.conceptCount = schemeConceptIris.size;
  }

  return concepts;
}

/**
 * Extract collections
 */
function extractCollections(store) {
  const collections = [];
  const collectionQuads = store.getQuads(null, `${RDF}type`, `${SKOS}Collection`, null);

  console.log(`📚 Extracting ${collectionQuads.length} collections...`);

  for (const quad of collectionQuads) {
    const iri = quad.subject.value;

    collections.push({
      iri,
      type: 'Collection',
      prefLabel: getLiterals(store, iri, `${SKOS}prefLabel`) || {},
      definition: getLiterals(store, iri, `${SKOS}definition`) || {},
      members: getIRIs(store, iri, `${SKOS}member`)
    });
  }

  return collections;
}

/**
 * Build search index
 */
function buildSearchIndex(concepts, schemes, _labelsIndex) {
  console.log(`🔍 Building search index...`);

  const schemeMap = new Map(schemes.map(s => [s.iri, s]));
  const searchConcepts = [];

  for (const concept of concepts) {
    const prefLabel = concept.prefLabel[CONFIG.defaultLang] ||
                     concept.prefLabel[Object.keys(concept.prefLabel)[0]] || '';

    let altLabels = concept.altLabel[CONFIG.defaultLang] ||
                   concept.altLabel[Object.keys(concept.altLabel)[0]] || [];
    if (!Array.isArray(altLabels)) altLabels = [altLabels];

    const schemeIri = concept.inScheme[0] || concept.topConceptOf[0];
    const scheme = schemeMap.get(schemeIri);
    const schemeLabel = scheme ?
      (scheme.prefLabel[CONFIG.defaultLang] ||
       scheme.prefLabel[Object.keys(scheme.prefLabel)[0]] || '') : '';

    searchConcepts.push({
      iri: concept.iri,
      prefLabel: typeof prefLabel === 'string' ? prefLabel : (Array.isArray(prefLabel) ? prefLabel[0] : ''),
      altLabels,
      notation: concept.notation || '',
      scheme: schemeIri || '',
      schemeLabel
    });
  }

  return { concepts: searchConcepts };
}

/**
 * Write JSON output files
 */
async function writeOutputs(outputDir, schemes, concepts, collections, searchIndex, labelsIndex) {
  console.log(`\n💾 Writing output files to ${outputDir}...`);

  await mkdir(outputDir, { recursive: true });
  await mkdir(join(outputDir, 'concepts'), { recursive: true });

  // Write schemes.json
  await writeFile(join(outputDir, 'schemes.json'), JSON.stringify({ schemes }, null, 2), 'utf-8');
  console.log(`  ✓ schemes.json (${schemes.length} schemes)`);

  // Write concepts by scheme (deduplicated)
  const schemeConceptMap = new Map();
  for (const concept of concepts) {
    // Determine primary scheme (prefer inScheme over topConceptOf)
    const schemeIri = concept.inScheme[0] || concept.topConceptOf[0];
    if (schemeIri) {
      if (!schemeConceptMap.has(schemeIri)) {
        schemeConceptMap.set(schemeIri, new Map());
      }
      // Use Map to deduplicate by IRI
      schemeConceptMap.get(schemeIri).set(concept.iri, concept);
    }
  }

  // Handle orphan concepts
  const orphanConcepts = concepts.filter(c =>
    c.inScheme.length === 0 && c.topConceptOf.length === 0
  );
  if (orphanConcepts.length > 0) {
    const orphanMap = new Map(orphanConcepts.map(c => [c.iri, c]));
    schemeConceptMap.set('_orphan', orphanMap);
  }

  for (const [schemeIri, conceptMap] of schemeConceptMap.entries()) {
    const slug = schemeIri === '_orphan' ? 'orphan' : iriToSlug(schemeIri);
    const schemeConcepts = Array.from(conceptMap.values());

    const chunkSize = CONFIG.conceptsChunkSize;
    const numChunks = Math.ceil(schemeConcepts.length / chunkSize);

    for (let i = 0; i < numChunks; i++) {
      const chunk = schemeConcepts.slice(i * chunkSize, (i + 1) * chunkSize);
      const filename = numChunks > 1 ? `${slug}-${i}.ndjson` : `${slug}.ndjson`;

      const ndjson = chunk.map(c => JSON.stringify(c)).join('\n');
      await writeFile(join(outputDir, 'concepts', filename), ndjson, 'utf-8');

      console.log(`  ✓ concepts/${filename} (${chunk.length} concepts)`);
    }
  }

  // Write collections.json
  if (collections.length > 0) {
    await writeFile(join(outputDir, 'collections.json'), JSON.stringify({ collections }, null, 2), 'utf-8');
    console.log(`  ✓ collections.json (${collections.length} collections)`);
  }

  // Write search-index.json
  await writeFile(join(outputDir, 'search-index.json'), JSON.stringify(searchIndex, null, 2), 'utf-8');
  console.log(`  ✓ search-index.json (${searchIndex.concepts.length} concepts)`);

  // Write labels.json (background labels for external IRI resolution)
  if (Object.keys(labelsIndex).length > 0) {
    await writeFile(join(outputDir, 'labels.json'), JSON.stringify(labelsIndex, null, 2), 'utf-8');
    console.log(`  ✓ labels.json (${Object.keys(labelsIndex).length} external labels)`);
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 prez-lite data generator\n');
  console.log('Converting TTL vocabularies to normalized JSON...\n');

  try {
    // Parse vocabulary files
    const vocabStore = await parseTTLFiles(CONFIG.vocabsDir, 'vocabularies');

    if (vocabStore.size === 0) {
      console.log('ℹ️  No data to process. Add .ttl files to data/vocabs/ and run again.\n');
      return;
    }

    // Collect external IRI references
    const externalIris = collectExternalIris(vocabStore);
    console.log(`🔗 Found ${externalIris.size} external IRI references\n`);

    // Parse background labels from local TTL files
    const backgroundStore = await parseTTLFiles(CONFIG.backgroundDir, 'background labels');

    // Load remote sources from manifest
    const manifestStore = await loadManifestSources(CONFIG.manifestPath);

    // Merge all background labels
    const mergedStore = new Store();
    mergedStore.addQuads([...backgroundStore.getQuads(), ...manifestStore.getQuads()]);
    const labelsIndex = buildLabelsIndex(mergedStore);
    console.log(`📝 Built labels index with ${Object.keys(labelsIndex).length} entries\n`);

    // Extract data
    const schemes = extractSchemes(vocabStore, labelsIndex);
    const concepts = extractConcepts(vocabStore, schemes, labelsIndex);
    const collections = extractCollections(vocabStore);
    const searchIndex = buildSearchIndex(concepts, schemes, labelsIndex);

    // Write outputs
    await writeOutputs(CONFIG.outputDir, schemes, concepts, collections, searchIndex, labelsIndex);

    // Report missing labels
    const missingLabels = reportMissingLabels(externalIris, labelsIndex, CONFIG.outputDir);

    console.log('\n✅ Done!\n');
    console.log('Summary:');
    console.log(`  - ${schemes.length} schemes`);
    console.log(`  - ${concepts.length} concepts`);
    console.log(`  - ${collections.length} collections`);
    console.log(`  - ${externalIris.size} external IRI references`);
    console.log(`  - ${Object.keys(labelsIndex).length} background labels (${missingLabels.length} missing)`);
    console.log(`  - Search index with ${searchIndex.concepts.length} entries\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
