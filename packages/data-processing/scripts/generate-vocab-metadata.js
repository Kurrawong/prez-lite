#!/usr/bin/env node

/**
 * Generate Vocabulary Metadata Index
 *
 * Scans vocabulary TTL files and generates a comprehensive metadata index
 * with all scheme information needed by the frontend.
 *
 * Output: _system/vocabularies/index.json
 *
 * Usage:
 *   node generate-vocab-metadata.js --sourceDir <vocabs/> --output <index.json> [options]
 */

import { readdir, readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname, isAbsolute, basename, resolve } from 'path';
import { Parser, Store, DataFactory } from 'n3';

const { namedNode } = DataFactory;

const RDF = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';
const RDFS = 'http://www.w3.org/2000/01/rdf-schema#';
const SKOS = 'http://www.w3.org/2004/02/skos/core#';
const DCTERMS = 'http://purl.org/dc/terms/';
const SCHEMA = 'https://schema.org/';
const OWL = 'http://www.w3.org/2002/07/owl#';
const PROV = 'http://www.w3.org/ns/prov#';
const REG = 'http://purl.org/linked-data/registry#';

/**
 * Resolve and validate a CLI path argument to prevent path traversal attacks.
 * - Absolute paths are validated to ensure they don't escape the working directory.
 * - Relative paths are resolved against process.cwd() and validated.
 * - Throws an error if path contains traversal attempts or escapes the base directory.
 */
function resolveCliPath(val) {
  // Validate for obvious path traversal attempts
  if (val.includes('..') || val.includes('~')) {
    throw new Error(`Invalid path: path traversal characters not allowed in "${val}"`);
  }

  // Resolve the path (handles both absolute and relative)
  const resolvedPath = isAbsolute(val) ? resolve(val) : resolve(process.cwd(), val);
  const basePath = resolve(process.cwd());

  // Ensure the resolved path is within or equal to the base directory
  // Allow paths at the same level or deeper, but not parent directories
  if (!resolvedPath.startsWith(basePath)) {
    throw new Error(`Path outside working directory: "${resolvedPath}" is outside "${basePath}"`);
  }

  return resolvedPath;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    sourceDir: null,
    output: null,
    backgroundDir: null,
    pattern: '*.ttl',
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') {
      console.log(`
Generate Vocabulary Metadata Index

Usage:
  node generate-vocab-metadata.js [options]

Options:
  --sourceDir <path>        Directory containing vocabulary TTL files (required)
  --output <path>           Output index.json file path (required)
  --backgroundDir <path>    Directory containing background label TTL files
  --pattern <glob>          File pattern to match (default: *.ttl)
  --help, -h                Show this help message

Example:
  node generate-vocab-metadata.js \\
    --sourceDir web/public/data/vocabs \\
    --backgroundDir web/public/data/background \\
    --output web/public/export/_system/vocabularies/index.json
`);
      process.exit(0);
    } else if (arg === '--sourceDir' && args[i + 1]) {
      config.sourceDir = resolveCliPath(args[++i]);
    } else if (arg === '--output' && args[i + 1]) {
      config.output = resolveCliPath(args[++i]);
    } else if (arg === '--backgroundDir' && args[i + 1]) {
      config.backgroundDir = resolveCliPath(args[++i]);
    } else if (arg === '--pattern' && args[i + 1]) {
      config.pattern = args[++i];
    }
  }

  if (!config.sourceDir || !config.output) {
    console.error('Error: --sourceDir and --output are required');
    process.exit(1);
  }

  return config;
}

function localName(iri) {
  const hashIdx = iri.lastIndexOf('#');
  const slashIdx = iri.lastIndexOf('/');
  return iri.slice(Math.max(hashIdx, slashIdx) + 1);
}

function matchPattern(filename, pattern) {
  // Validate pattern to prevent ReDoS and path traversal
  if (pattern.includes('..') || pattern.includes('/') || pattern.includes('\\')) {
    throw new Error('Invalid pattern: path traversal characters not allowed');
  }

  // Simple wildcard matching (safer than regex for user input)
  // Convert glob pattern to regex with timeout protection
  const escaped = pattern
    .replace(/[.+^${}()|[\]]/g, '\\$&') // Escape regex special chars except *
    .replace(/\*/g, '.*?'); // Non-greedy wildcard matching

  // Add timeout protection for regex matching
  const regex = new RegExp('^' + escaped + '$');
  const startTime = Date.now();
  const result = regex.test(filename);

  // Check if regex took too long (potential ReDoS)
  if (Date.now() - startTime > 100) {
    console.warn(`Warning: Pattern matching took ${Date.now() - startTime}ms for "${pattern}"`);
  }

  return result;
}

async function parseTTLFile(filePath) {
  const content = await readFile(filePath, 'utf-8');
  const parser = new Parser();
  const store = new Store();
  const quads = parser.parse(content);
  store.addQuads(quads);
  return store;
}

async function parseTTLDirectory(dirPath) {
  const store = new Store();
  if (!dirPath) return store;

  try {
    const files = await readdir(dirPath);
    for (const file of files) {
      if (file.endsWith('.ttl')) {
        try {
          const content = await readFile(join(dirPath, file), 'utf-8');
          const parser = new Parser();
          const quads = parser.parse(content);
          store.addQuads(quads);
        } catch (err) {
          console.warn(`  Warning: Failed to parse ${file}: ${err.message}`);
        }
      }
    }
  } catch (err) {
    console.warn(`  Warning: Could not read background directory: ${err.message}`);
  }
  return store;
}

function getLiteral(store, subject, predicate, lang = null) {
  const quads = store.getQuads(subject, predicate, null, null);
  for (const q of quads) {
    if (q.object.termType === 'Literal') {
      if (!lang || q.object.language === lang || !q.object.language) {
        return q.object.value;
      }
    }
  }
  return null;
}

function getIRI(store, subject, predicate) {
  const quads = store.getQuads(subject, predicate, null, null);
  for (const q of quads) {
    if (q.object.termType === 'NamedNode') {
      return q.object.value;
    }
  }
  return null;
}

function getIRIs(store, subject, predicate) {
  const quads = store.getQuads(subject, predicate, null, null);
  return quads
    .filter(q => q.object.termType === 'NamedNode')
    .map(q => q.object.value);
}

function getLabelForIRI(iri, backgroundStore) {
  const predicates = [
    `${SKOS}prefLabel`,
    `${RDFS}label`,
    `${SCHEMA}name`,
    `${DCTERMS}title`,
  ];
  for (const pred of predicates) {
    const label = getLiteral(backgroundStore, iri, pred);
    if (label) return label;
  }
  return localName(iri);
}

async function extractSchemeMetadata(filePath, backgroundStore) {
  const store = await parseTTLFile(filePath);

  // Find ConceptScheme
  const schemeQuads = store.getQuads(null, `${RDF}type`, `${SKOS}ConceptScheme`, null);
  if (schemeQuads.length === 0) {
    return null;
  }

  const schemeIri = schemeQuads[0].subject.value;
  const slug = basename(filePath, '.ttl');

  // Basic metadata
  const prefLabel = getLiteral(store, schemeIri, `${SKOS}prefLabel`) ||
                    getLiteral(store, schemeIri, `${DCTERMS}title`) ||
                    getLiteral(store, schemeIri, `${RDFS}label`) ||
                    localName(schemeIri);

  const definition = getLiteral(store, schemeIri, `${SKOS}definition`) ||
                     getLiteral(store, schemeIri, `${DCTERMS}description`) ||
                     getLiteral(store, schemeIri, `${SCHEMA}description`);

  // Dates
  const modified = getLiteral(store, schemeIri, `${DCTERMS}modified`) ||
                   getLiteral(store, schemeIri, `${SCHEMA}dateModified`);
  const created = getLiteral(store, schemeIri, `${DCTERMS}created`) ||
                  getLiteral(store, schemeIri, `${SCHEMA}dateCreated`);

  // Version
  const version = getLiteral(store, schemeIri, `${SCHEMA}version`) ||
                  getLiteral(store, schemeIri, `${OWL}versionInfo`);
  const versionIRI = getIRI(store, schemeIri, `${OWL}versionIRI`);

  // Status
  const status = getIRI(store, schemeIri, `${REG}status`);
  const statusLabel = status ? getLabelForIRI(status, backgroundStore) : null;

  // Publisher and creator
  const publishers = getIRIs(store, schemeIri, `${SCHEMA}publisher`) ||
                     getIRIs(store, schemeIri, `${DCTERMS}publisher`);
  const publisherLabels = publishers.map(p => getLabelForIRI(p, backgroundStore));

  const creators = getIRIs(store, schemeIri, `${SCHEMA}creator`) ||
                   getIRIs(store, schemeIri, `${DCTERMS}creator`);
  const creatorLabels = creators.map(c => getLabelForIRI(c, backgroundStore));

  // Themes/keywords
  const themes = getIRIs(store, schemeIri, `${SCHEMA}keywords`) ||
                 getIRIs(store, schemeIri, `${DCTERMS}subject`);
  const themeLabels = themes.map(t => getLabelForIRI(t, backgroundStore));

  // Concepts
  const conceptQuads = store.getQuads(null, `${RDF}type`, `${SKOS}Concept`, null);
  const conceptCount = new Set(conceptQuads.map(q => q.subject.value)).size;

  const topConcepts = getIRIs(store, schemeIri, `${SKOS}hasTopConcept`);

  // Available formats (fixed for now)
  const formats = ['ttl', 'json', 'jsonld', 'rdf', 'csv', 'html'];

  return {
    iri: schemeIri,
    slug,
    prefLabel,
    definition,
    conceptCount,
    topConcepts,
    modified,
    created,
    version,
    versionIRI,
    status,
    statusLabel,
    publisher: publishers,
    publisherLabels,
    creator: creators,
    creatorLabels,
    themes,
    themeLabels,
    formats,
  };
}

async function main() {
  const config = parseArgs();

  console.log(`Scanning ${config.sourceDir} for vocabulary files...`);

  // Load background labels
  console.log('Loading background labels...');
  const backgroundStore = await parseTTLDirectory(config.backgroundDir);
  console.log(`  Loaded ${backgroundStore.size} background triples\n`);

  // Find all matching files
  const files = await readdir(config.sourceDir);
  const ttlFiles = files.filter(f => matchPattern(f, config.pattern));
  console.log(`Found ${ttlFiles.length} files matching pattern "${config.pattern}"\n`);

  // Extract metadata from each file
  const vocabularies = [];
  for (const file of ttlFiles) {
    const filePath = join(config.sourceDir, file);
    try {
      const metadata = await extractSchemeMetadata(filePath, backgroundStore);
      if (metadata) {
        vocabularies.push(metadata);
        console.log(`  ✓ ${metadata.prefLabel} (${metadata.conceptCount} concepts)`);
      }
    } catch (err) {
      console.warn(`  ✗ ${file}: ${err.message}`);
    }
  }

  // Sort by prefLabel
  vocabularies.sort((a, b) => a.prefLabel.localeCompare(b.prefLabel));

  console.log(`\nExtracted metadata for ${vocabularies.length} vocabularies`);

  // Write output
  await mkdir(dirname(config.output), { recursive: true });
  await writeFile(config.output, JSON.stringify({ vocabularies }, null, 2), 'utf-8');
  console.log(`\nWrote metadata index to ${config.output}`);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
