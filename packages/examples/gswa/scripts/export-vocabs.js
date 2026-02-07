#!/usr/bin/env node

/**
 * Vocabulary Export Generator
 *
 * Generates multiple export formats for each vocabulary:
 * - TTL (original Turtle)
 * - JSON (simplified format for web components)
 * - JSON-LD (with @context)
 * - RDF/XML
 * - CSV (flattened)
 */

import { readdir, readFile, writeFile, mkdir, copyFile } from 'fs/promises';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';
import { Parser, Store, Writer } from 'n3';
import jsonld from 'jsonld';
import { format as csvFormat } from '@fast-csv/format';
import { Writable } from 'stream';

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

// Configuration
const CONFIG = {
  vocabsDir: join(ROOT_DIR, 'data', 'vocabs'),
  outputDir: join(ROOT_DIR, 'web', 'public', 'export', 'vocabs'),
  defaultLang: 'en'
};

// JSON-LD context for vocabulary exports
const JSONLD_CONTEXT = {
  '@vocab': 'http://www.w3.org/2004/02/skos/core#',
  'skos': 'http://www.w3.org/2004/02/skos/core#',
  'rdf': 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
  'rdfs': 'http://www.w3.org/2000/01/rdf-schema#',
  'dcterms': 'http://purl.org/dc/terms/',
  'schema': 'https://schema.org/',
  'prefLabel': { '@id': 'skos:prefLabel', '@language': 'en' },
  'altLabel': { '@id': 'skos:altLabel', '@language': 'en' },
  'definition': { '@id': 'skos:definition', '@language': 'en' },
  'notation': 'skos:notation',
  'broader': { '@id': 'skos:broader', '@type': '@id' },
  'narrower': { '@id': 'skos:narrower', '@type': '@id' },
  'related': { '@id': 'skos:related', '@type': '@id' },
  'inScheme': { '@id': 'skos:inScheme', '@type': '@id' },
  'topConceptOf': { '@id': 'skos:topConceptOf', '@type': '@id' },
  'hasTopConcept': { '@id': 'skos:hasTopConcept', '@type': '@id' }
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
 * Get literal value from store
 */
function getLiteral(store, subject, predicate, preferredLang = CONFIG.defaultLang) {
  const quads = store.getQuads(subject, predicate, null, null);
  const literals = quads.filter(q => q.object.termType === 'Literal');

  // Prefer specified language
  const preferred = literals.find(q => q.object.language === preferredLang);
  if (preferred) return preferred.object.value;

  // Fall back to any language or no language
  const noLang = literals.find(q => !q.object.language);
  if (noLang) return noLang.object.value;

  return literals[0]?.object.value || null;
}

/**
 * Get all literal values
 */
function getAllLiterals(store, subject, predicate) {
  return store.getQuads(subject, predicate, null, null)
    .filter(q => q.object.termType === 'Literal')
    .map(q => q.object.value);
}

/**
 * Get IRIs from store
 */
function getIRIs(store, subject, predicate) {
  return store.getQuads(subject, predicate, null, null)
    .filter(q => q.object.termType === 'NamedNode')
    .map(q => q.object.value);
}

/**
 * Parse a single TTL file
 */
async function parseTTLFile(filePath) {
  const store = new Store();
  const parser = new Parser({ format: 'Turtle' });
  const content = await readFile(filePath, 'utf-8');
  const quads = parser.parse(content);
  store.addQuads(quads);
  return { store, ttlContent: content };
}

/**
 * Extract scheme from store
 */
function extractScheme(store) {
  const schemeQuads = store.getQuads(null, `${RDF}type`, `${SKOS}ConceptScheme`, null);
  if (schemeQuads.length === 0) return null;

  const iri = schemeQuads[0].subject.value;
  return {
    iri,
    label: getLiteral(store, iri, `${SKOS}prefLabel`) || '',
    description: getLiteral(store, iri, `${SKOS}definition`) || '',
    created: getLiteral(store, iri, `${SCHEMA}dateCreated`) || getLiteral(store, iri, `${DCTERMS}created`),
    modified: getLiteral(store, iri, `${SCHEMA}dateModified`) || getLiteral(store, iri, `${DCTERMS}modified`),
    version: getLiteral(store, iri, `${SCHEMA}version`) || getLiteral(store, iri, `${OWL}versionInfo`),
    topConcepts: getIRIs(store, iri, `${SKOS}hasTopConcept`)
  };
}

/**
 * Extract concepts from store
 */
function extractConcepts(store) {
  const concepts = [];
  const conceptQuads = store.getQuads(null, `${RDF}type`, `${SKOS}Concept`, null);

  for (const quad of conceptQuads) {
    const iri = quad.subject.value;
    concepts.push({
      iri,
      label: getLiteral(store, iri, `${SKOS}prefLabel`) || '',
      notation: getLiteral(store, iri, `${SKOS}notation`),
      definition: getLiteral(store, iri, `${SKOS}definition`),
      altLabels: getAllLiterals(store, iri, `${SKOS}altLabel`),
      broader: getIRIs(store, iri, `${SKOS}broader`),
      narrower: getIRIs(store, iri, `${SKOS}narrower`),
      related: getIRIs(store, iri, `${SKOS}related`),
      inScheme: getIRIs(store, iri, `${SKOS}inScheme`),
      topConceptOf: getIRIs(store, iri, `${SKOS}topConceptOf`)
    });
  }

  return concepts;
}

/**
 * Build hierarchical tree from concepts
 */
function buildTree(concepts, scheme) {
  const conceptMap = new Map(concepts.map(c => [c.iri, c]));

  // Find top concepts
  const topConceptIris = new Set([
    ...scheme.topConcepts,
    ...concepts.filter(c => c.topConceptOf.length > 0).map(c => c.iri),
    ...concepts.filter(c => c.broader.length === 0).map(c => c.iri)
  ]);

  function buildNode(iri, visited = new Set()) {
    if (visited.has(iri)) return null; // Prevent cycles
    visited.add(iri);

    const concept = conceptMap.get(iri);
    if (!concept) return null;

    const children = concept.narrower
      .map(childIri => buildNode(childIri, new Set(visited)))
      .filter(Boolean)
      .sort((a, b) => a.label.localeCompare(b.label));

    return {
      iri: concept.iri,
      label: concept.label,
      notation: concept.notation,
      children
    };
  }

  return Array.from(topConceptIris)
    .map(iri => buildNode(iri))
    .filter(Boolean)
    .sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * Generate Web Component JSON format
 */
function generateWebComponentJSON(scheme, concepts, tree) {
  return {
    iri: scheme.iri,
    label: scheme.label,
    description: scheme.description,
    concepts: concepts.map(c => ({
      iri: c.iri,
      label: c.label,
      notation: c.notation || undefined,
      definition: c.definition || undefined,
      altLabels: c.altLabels.length > 0 ? c.altLabels : undefined,
      broader: c.broader.length > 0 ? c.broader : undefined,
      narrower: c.narrower.length > 0 ? c.narrower : undefined
    })),
    tree
  };
}

/**
 * Generate JSON-LD format
 */
async function generateJSONLD(store, scheme) {
  // Convert N3 store to N-Quads
  const writer = new Writer({ format: 'N-Quads' });
  const quads = store.getQuads();
  writer.addQuads(quads);

  return new Promise((resolve, reject) => {
    writer.end(async (error, nquads) => {
      if (error) {
        reject(error);
        return;
      }

      try {
        // Parse N-Quads to JSON-LD
        const doc = await jsonld.fromRDF(nquads, { format: 'application/n-quads' });

        // Compact with context
        const compacted = await jsonld.compact(doc, JSONLD_CONTEXT);
        resolve(compacted);
      } catch (err) {
        reject(err);
      }
    });
  });
}

/**
 * Generate RDF/XML format
 */
function generateRDFXML(store, scheme) {
  const quads = store.getQuads();

  // Collect all prefixes
  const prefixes = {
    'rdf': RDF,
    'rdfs': RDFS,
    'skos': SKOS,
    'dcterms': DCTERMS,
    'schema': SCHEMA,
    'owl': OWL
  };

  // Build XML
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<rdf:RDF\n';
  for (const [prefix, ns] of Object.entries(prefixes)) {
    xml += `  xmlns:${prefix}="${ns}"\n`;
  }
  xml += '>\n\n';

  // Group quads by subject
  const bySubject = new Map();
  for (const quad of quads) {
    const subj = quad.subject.value;
    if (!bySubject.has(subj)) bySubject.set(subj, []);
    bySubject.get(subj).push(quad);
  }

  // Emit descriptions
  for (const [subject, subjectQuads] of bySubject) {
    xml += `  <rdf:Description rdf:about="${escapeXml(subject)}">\n`;

    for (const quad of subjectQuads) {
      const pred = quad.predicate.value;
      const predLocal = localName(pred);
      const predPrefix = getPrefix(pred, prefixes);
      const predQName = predPrefix ? `${predPrefix}:${predLocal}` : pred;

      if (quad.object.termType === 'NamedNode') {
        xml += `    <${predQName} rdf:resource="${escapeXml(quad.object.value)}"/>\n`;
      } else if (quad.object.termType === 'Literal') {
        const lang = quad.object.language ? ` xml:lang="${quad.object.language}"` : '';
        const datatype = quad.object.datatype && quad.object.datatype.value !== 'http://www.w3.org/2001/XMLSchema#string'
          ? ` rdf:datatype="${quad.object.datatype.value}"`
          : '';
        xml += `    <${predQName}${lang}${datatype}>${escapeXml(quad.object.value)}</${predQName}>\n`;
      }
    }

    xml += '  </rdf:Description>\n\n';
  }

  xml += '</rdf:RDF>\n';
  return xml;
}

function escapeXml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function localName(iri) {
  const hashIndex = iri.lastIndexOf('#');
  const slashIndex = iri.lastIndexOf('/');
  const index = Math.max(hashIndex, slashIndex);
  return index >= 0 ? iri.substring(index + 1) : iri;
}

function getPrefix(iri, prefixes) {
  for (const [prefix, ns] of Object.entries(prefixes)) {
    if (iri.startsWith(ns)) return prefix;
  }
  return null;
}

/**
 * Generate CSV format
 */
async function generateCSV(concepts, scheme) {
  return new Promise((resolve, reject) => {
    let output = '';
    const writable = new Writable({
      write(chunk, encoding, callback) {
        output += chunk.toString();
        callback();
      }
    });

    const csvStream = csvFormat({ headers: true });
    csvStream.pipe(writable);

    for (const concept of concepts) {
      csvStream.write({
        iri: concept.iri,
        label: concept.label,
        notation: concept.notation || '',
        definition: concept.definition || '',
        altLabels: concept.altLabels.join('|'),
        broader: concept.broader.join('|'),
        narrower: concept.narrower.join('|'),
        related: concept.related.join('|'),
        scheme: scheme.iri
      });
    }

    csvStream.end();
    writable.on('finish', () => resolve(output));
    writable.on('error', reject);
  });
}

/**
 * Process a single vocabulary file
 */
async function processVocab(filePath, outputDir) {
  const filename = basename(filePath, '.ttl');
  console.log(`  Processing ${filename}...`);

  try {
    const { store, ttlContent } = await parseTTLFile(filePath);
    const scheme = extractScheme(store);

    if (!scheme) {
      console.log(`    Skipping: No ConceptScheme found`);
      return null;
    }

    const concepts = extractConcepts(store);
    const slug = iriToSlug(scheme.iri);
    const vocabOutputDir = join(outputDir, slug);

    await mkdir(vocabOutputDir, { recursive: true });

    // Generate all formats
    const tree = buildTree(concepts, scheme);
    const webComponentJSON = generateWebComponentJSON(scheme, concepts, tree);

    // Write TTL (copy original)
    await writeFile(join(vocabOutputDir, `${slug}.ttl`), ttlContent, 'utf-8');
    console.log(`    ✓ ${slug}.ttl`);

    // Write JSON (web component format)
    await writeFile(
      join(vocabOutputDir, `${slug}.json`),
      JSON.stringify(webComponentJSON, null, 2),
      'utf-8'
    );
    console.log(`    ✓ ${slug}.json`);

    // Write JSON-LD
    try {
      const jsonldDoc = await generateJSONLD(store, scheme);
      await writeFile(
        join(vocabOutputDir, `${slug}.jsonld`),
        JSON.stringify(jsonldDoc, null, 2),
        'utf-8'
      );
      console.log(`    ✓ ${slug}.jsonld`);
    } catch (err) {
      console.log(`    ⚠️ JSON-LD generation failed: ${err.message}`);
    }

    // Write RDF/XML
    const rdfxml = generateRDFXML(store, scheme);
    await writeFile(join(vocabOutputDir, `${slug}.rdf`), rdfxml, 'utf-8');
    console.log(`    ✓ ${slug}.rdf`);

    // Write CSV
    const csv = await generateCSV(concepts, scheme);
    await writeFile(join(vocabOutputDir, `${slug}.csv`), csv, 'utf-8');
    console.log(`    ✓ ${slug}.csv`);

    return {
      slug,
      iri: scheme.iri,
      label: scheme.label,
      description: scheme.description,
      conceptCount: concepts.length,
      modified: scheme.modified,
      version: scheme.version,
      formats: ['ttl', 'json', 'jsonld', 'rdf', 'csv']
    };

  } catch (error) {
    console.error(`    ❌ Error: ${error.message}`);
    return null;
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 prez-lite vocabulary exporter\n');
  console.log('Generating multi-format exports...\n');

  try {
    // Read all TTL files
    const files = await readdir(CONFIG.vocabsDir);
    const ttlFiles = files.filter(f => f.endsWith('.ttl')).sort();

    if (ttlFiles.length === 0) {
      console.log('ℹ️  No TTL files found in data/vocabs/\n');
      return;
    }

    console.log(`📖 Found ${ttlFiles.length} vocabulary files\n`);

    // Create output directory
    await mkdir(CONFIG.outputDir, { recursive: true });

    // Process each vocabulary
    const manifest = [];
    for (const file of ttlFiles) {
      const result = await processVocab(join(CONFIG.vocabsDir, file), CONFIG.outputDir);
      if (result) {
        manifest.push(result);
      }
    }

    // Write manifest
    const manifestData = {
      generated: new Date().toISOString(),
      count: manifest.length,
      vocabs: manifest.sort((a, b) => a.label.localeCompare(b.label))
    };

    await writeFile(
      join(CONFIG.outputDir, 'index.json'),
      JSON.stringify(manifestData, null, 2),
      'utf-8'
    );
    console.log(`\n✓ index.json (manifest)`);

    console.log('\n✅ Done!\n');
    console.log('Summary:');
    console.log(`  - ${manifest.length} vocabularies exported`);
    console.log(`  - Output: ${CONFIG.outputDir}\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
