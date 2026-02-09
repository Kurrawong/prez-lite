#!/usr/bin/env node

/**
 * Generate Vocablist Source Catalog
 *
 * Scans vocabulary TTL files and generates a schema:DataCatalog source file
 * that lists all ConceptSchemes. This catalog can then be processed by
 * process-vocab.js with type=catalog to produce the vocablist outputs.
 *
 * Usage:
 *   node generate-vocablist.js --sourceDir <vocabs/> --output <catalog.ttl> [options]
 */

import { readdir, readFile, writeFile } from 'fs/promises';
import { join, isAbsolute, basename, resolve } from 'path';
import { Parser, Store, Writer, DataFactory } from 'n3';

const { namedNode, literal, quad } = DataFactory;

const SKOS = 'http://www.w3.org/2004/02/skos/core#';
const SCHEMA = 'https://schema.org/';
const XSD = 'http://www.w3.org/2001/XMLSchema#';

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
    catalogIri: 'https://linked.data.gov.au/catalogue/gswa-vocabs',
    catalogName: 'GSWA Vocabularies',
    catalogDescription: 'Geological Survey of Western Australia\'s vocabularies of controlled terms.',
    pattern: '*.ttl',
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') {
      console.log(`
Generate Vocablist Source Catalog

Usage:
  node generate-vocablist.js [options]

Options:
  --sourceDir <path>        Directory containing vocabulary TTL files (required)
  --output <path>           Output catalog TTL file path (required)
  --catalogIri <iri>        Catalog IRI (default: https://linked.data.gov.au/catalogue/gswa-vocabs)
  --catalogName <name>      Catalog name (default: GSWA Vocabularies)
  --catalogDescription <d>  Catalog description
  --pattern <glob>          File pattern to match (default: *.ttl)
  --help, -h                Show this help message

Example:
  node generate-vocablist.js \\
    --sourceDir web/public/data/vocabs \\
    --output web/public/data/vocablist-source-catalog.ttl
`);
      process.exit(0);
    } else if (arg === '--sourceDir' && args[i + 1]) {
      config.sourceDir = resolveCliPath(args[++i]);
    } else if (arg === '--output' && args[i + 1]) {
      config.output = resolveCliPath(args[++i]);
    } else if (arg === '--catalogIri' && args[i + 1]) {
      config.catalogIri = args[++i];
    } else if (arg === '--catalogName' && args[i + 1]) {
      config.catalogName = args[++i];
    } else if (arg === '--catalogDescription' && args[i + 1]) {
      config.catalogDescription = args[++i];
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

/**
 * Parse a TTL file and extract the ConceptScheme IRI
 */
async function extractSchemeIri(filePath) {
  const content = await readFile(filePath, 'utf-8');
  const parser = new Parser();
  const store = new Store();

  try {
    const quads = parser.parse(content);
    store.addQuads(quads);
  } catch (err) {
    console.warn(`Warning: Failed to parse ${filePath}: ${err.message}`);
    return null;
  }

  // Find subjects that are skos:ConceptScheme
  const schemeQuads = store.getQuads(null, namedNode(`${SKOS}prefLabel`), null, null);

  for (const q of schemeQuads) {
    const subject = q.subject.value;
    // Check if this subject is a ConceptScheme
    const typeQuads = store.getQuads(namedNode(subject), namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'), namedNode(`${SKOS}ConceptScheme`), null);
    if (typeQuads.length > 0) {
      return {
        iri: subject,
        label: q.object.value,
      };
    }
  }

  // Fallback: just find any ConceptScheme
  const conceptSchemeQuads = store.getQuads(null, namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'), namedNode(`${SKOS}ConceptScheme`), null);
  if (conceptSchemeQuads.length > 0) {
    const schemeIri = conceptSchemeQuads[0].subject.value;
    // Try to get label
    const labelQuads = store.getQuads(namedNode(schemeIri), namedNode(`${SKOS}prefLabel`), null, null);
    return {
      iri: schemeIri,
      label: labelQuads.length > 0 ? labelQuads[0].object.value : basename(filePath, '.ttl'),
    };
  }

  console.warn(`Warning: No ConceptScheme found in ${filePath}`);
  return null;
}

/**
 * Match files against a simple glob pattern (supports * only)
 */
function matchPattern(filename, pattern) {
  const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
  return regex.test(filename);
}

async function main() {
  const config = parseArgs();

  console.log(`Scanning ${config.sourceDir} for vocab files...`);

  // Find all matching files
  const files = await readdir(config.sourceDir);
  const ttlFiles = files.filter(f => matchPattern(f, config.pattern));

  console.log(`Found ${ttlFiles.length} files matching pattern "${config.pattern}"`);

  // Extract scheme IRIs from each file
  const schemes = [];
  for (const file of ttlFiles) {
    const filePath = join(config.sourceDir, file);
    const schemeInfo = await extractSchemeIri(filePath);
    if (schemeInfo) {
      schemes.push(schemeInfo);
      console.log(`  Found: ${schemeInfo.label} (${schemeInfo.iri})`);
    }
  }

  console.log(`\nExtracted ${schemes.length} ConceptSchemes`);

  // Sort schemes by label for consistent output
  schemes.sort((a, b) => a.label.localeCompare(b.label));

  // Generate the catalog TTL
  const store = new Store();
  const catalogNode = namedNode(config.catalogIri);

  // Add catalog type and metadata
  store.addQuad(quad(
    catalogNode,
    namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
    namedNode(`${SCHEMA}DataCatalog`)
  ));

  store.addQuad(quad(
    catalogNode,
    namedNode(`${SCHEMA}name`),
    literal(config.catalogName, 'en')
  ));

  store.addQuad(quad(
    catalogNode,
    namedNode(`${SCHEMA}description`),
    literal(config.catalogDescription, 'en')
  ));

  store.addQuad(quad(
    catalogNode,
    namedNode(`${SCHEMA}dateModified`),
    literal(new Date().toISOString().split('T')[0], namedNode(`${XSD}date`))
  ));

  // Add hasPart references to each scheme, including their labels
  for (const scheme of schemes) {
    const schemeNode = namedNode(scheme.iri);

    store.addQuad(quad(
      catalogNode,
      namedNode(`${SCHEMA}hasPart`),
      schemeNode
    ));

    // Add scheme label for prez:label annotation during processing
    store.addQuad(quad(
      schemeNode,
      namedNode(`${SKOS}prefLabel`),
      literal(scheme.label, 'en')
    ));
  }

  // Write the catalog TTL
  const writer = new Writer({
    prefixes: {
      schema: SCHEMA,
      skos: SKOS,
      xsd: XSD,
    }
  });

  for (const q of store.getQuads()) {
    writer.addQuad(q);
  }

  const output = await new Promise((resolve, reject) => {
    writer.end((err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });

  await writeFile(config.output, output, 'utf-8');
  console.log(`\nWrote catalog to ${config.output}`);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
