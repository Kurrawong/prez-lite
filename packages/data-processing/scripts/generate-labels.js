#!/usr/bin/env node

/**
 * Generate Labels JSON
 *
 * Extracts all labels from background TTL files into a single JSON lookup file.
 * This is used by the frontend to display human-readable labels for external IRIs.
 *
 * Output format:
 * {
 *   "https://example.org/entity": {
 *     "en": "English Label",
 *     "": "Default Label"
 *   }
 * }
 *
 * Usage:
 *   node generate-labels.js --backgroundDir <background/> --output <labels.json>
 */

import { readdir, readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname, isAbsolute, resolve } from 'path';
import { Parser, Store } from 'n3';

const RDFS = 'http://www.w3.org/2000/01/rdf-schema#';
const SKOS = 'http://www.w3.org/2004/02/skos/core#';
const DCTERMS = 'http://purl.org/dc/terms/';
const SCHEMA = 'https://schema.org/';
const PREZ = 'https://prez.dev/';

// Predicates to extract as labels (in priority order)
const LABEL_PREDICATES = [
  `${SKOS}prefLabel`,
  `${RDFS}label`,
  `${SCHEMA}name`,
  `${DCTERMS}title`,
  `${PREZ}label`,
];

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
    backgroundDir: null,
    output: null,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') {
      console.log(`
Generate Labels JSON

Usage:
  node generate-labels.js [options]

Options:
  --backgroundDir <path>   Directory containing background label TTL files (required)
  --output <path>          Output labels.json file path (required)
  --help, -h               Show this help message

Example:
  node generate-labels.js \\
    --backgroundDir data/background \\
    --output web/public/export/system/labels.json
`);
      process.exit(0);
    } else if (arg === '--backgroundDir' && args[i + 1]) {
      config.backgroundDir = resolveCliPath(args[++i]);
    } else if (arg === '--output' && args[i + 1]) {
      config.output = resolveCliPath(args[++i]);
    }
  }

  if (!config.backgroundDir || !config.output) {
    console.error('Error: --backgroundDir and --output are required');
    process.exit(1);
  }

  return config;
}

async function parseTTLDirectory(dirPath) {
  const store = new Store();
  let files;
  try {
    files = await readdir(dirPath);
  } catch {
    console.log(`  Warning: Background directory does not exist: ${dirPath}`);
    return store;
  }

  for (const file of files) {
    if (file.endsWith('.ttl')) {
      try {
        const content = await readFile(join(dirPath, file), 'utf-8');
        const parser = new Parser();
        const quads = parser.parse(content);
        store.addQuads(quads);
        console.log(`  ✓ ${file}`);
      } catch (err) {
        console.warn(`  ✗ ${file}: ${err.message}`);
      }
    }
  }

  return store;
}

function extractLabels(store) {
  const labels = {};

  for (const predicate of LABEL_PREDICATES) {
    const quads = store.getQuads(null, predicate, null, null);

    for (const q of quads) {
      if (q.subject.termType !== 'NamedNode') continue;
      if (q.object.termType !== 'Literal') continue;

      const iri = q.subject.value;
      const lang = q.object.language || '';
      const value = q.object.value;

      if (!labels[iri]) {
        labels[iri] = {};
      }

      // Only set if not already set (priority order)
      if (!labels[iri][lang]) {
        labels[iri][lang] = value;
      }
    }
  }

  return labels;
}

async function main() {
  const config = parseArgs();

  console.log('🏷️  Generate Labels JSON\n');
  console.log(`Background directory: ${config.backgroundDir}`);
  console.log(`Output: ${config.output}\n`);

  console.log('Parsing background TTL files...');
  const store = await parseTTLDirectory(config.backgroundDir);
  console.log(`\nLoaded ${store.size} triples\n`);

  console.log('Extracting labels...');
  const labels = extractLabels(store);
  const iriCount = Object.keys(labels).length;
  console.log(`  Found labels for ${iriCount} IRIs\n`);

  // Write output
  await mkdir(dirname(config.output), { recursive: true });
  await writeFile(config.output, JSON.stringify(labels, null, 2), 'utf-8');
  console.log(`✅ Wrote labels to ${config.output}`);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
