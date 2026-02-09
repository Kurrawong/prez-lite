#!/usr/bin/env node

/**
 * Generate Search Index
 *
 * Aggregates all vocab list JSON files and generates:
 * 1. A unified search index JSON (for Orama pre-built index)
 * 2. Pre-computed facet counts
 *
 * Output:
 *   _system/search/index.json       - Flat concept array for search
 *   _system/search/orama-index.json - Pre-built Orama index (optional)
 *   _system/search/facets.json      - Pre-computed facet counts
 *
 * Usage:
 *   node generate-search-index.js --exportDir <export/> --output <_system/search/>
 */

import { readdir, readFile, writeFile, mkdir } from 'fs/promises';
import { join, isAbsolute, resolve } from 'path';
import { create, insertMultiple, save } from '@orama/orama';

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
    exportDir: null,
    output: null,
    vocabMetadata: null,
    buildOrama: true,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') {
      console.log(`
Generate Search Index

Usage:
  node generate-search-index.js [options]

Options:
  --exportDir <path>      Export directory containing vocab folders (required)
  --output <path>         Output directory for search files (required)
  --vocabMetadata <path>  Path to vocabularies/index.json for publisher facets
  --no-orama              Skip building pre-built Orama index
  --help, -h              Show this help message

Example:
  node generate-search-index.js \\
    --exportDir web/public/export \\
    --output web/public/export/_system/search \\
    --vocabMetadata web/public/export/_system/vocabularies/index.json
`);
      process.exit(0);
    } else if (arg === '--exportDir' && args[i + 1]) {
      config.exportDir = resolveCliPath(args[++i]);
    } else if (arg === '--output' && args[i + 1]) {
      config.output = resolveCliPath(args[++i]);
    } else if (arg === '--vocabMetadata' && args[i + 1]) {
      config.vocabMetadata = resolveCliPath(args[++i]);
    } else if (arg === '--no-orama') {
      config.buildOrama = false;
    }
  }

  if (!config.exportDir || !config.output) {
    console.error('Error: --exportDir and --output are required');
    process.exit(1);
  }

  return config;
}

async function loadVocabMetadata(metadataPath) {
  if (!metadataPath) return new Map();

  try {
    const content = await readFile(metadataPath, 'utf-8');
    const data = JSON.parse(content);
    const map = new Map();
    for (const vocab of data.vocabularies || []) {
      map.set(vocab.iri, vocab);
    }
    return map;
  } catch (err) {
    console.warn(`  Warning: Could not load vocab metadata: ${err.message}`);
    return new Map();
  }
}

async function findListJsonFiles(exportDir) {
  const files = [];
  const entries = await readdir(exportDir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory() && !entry.name.startsWith('_')) {
      const vocabDir = join(exportDir, entry.name);
      const vocabFiles = await readdir(vocabDir);
      const listFile = vocabFiles.find(f => f.endsWith("-list.json") || f.endsWith("-concepts.json"));
      if (listFile) {
        files.push(join(vocabDir, listFile));
      }
    }
  }

  return files;
}

async function loadConcepts(listFilePath, vocabMetadata) {
  const content = await readFile(listFilePath, 'utf-8');
  const data = JSON.parse(content);
  const concepts = data['@graph'] || [];

  // Enrich with publisher info from vocab metadata if available
  if (concepts.length > 0 && concepts[0].scheme) {
    const vocabInfo = vocabMetadata.get(concepts[0].scheme);
    if (vocabInfo) {
      return concepts.map(c => ({
        ...c,
        publisher: vocabInfo.publisher || [],
        publisherLabels: vocabInfo.publisherLabels || [],
      }));
    }
  }

  return concepts;
}

function computeFacets(concepts, vocabMetadata) {
  const schemeCounts = new Map();
  const publisherCounts = new Map();

  for (const concept of concepts) {
    // Scheme facet
    const schemeIri = concept.scheme;
    if (schemeIri) {
      const current = schemeCounts.get(schemeIri) || { iri: schemeIri, label: concept.schemeLabel || schemeIri, count: 0 };
      current.count++;
      schemeCounts.set(schemeIri, current);
    }

    // Publisher facet
    const publishers = concept.publisher || [];
    const publisherLabels = concept.publisherLabels || [];
    for (let i = 0; i < publishers.length; i++) {
      const pubIri = publishers[i];
      const pubLabel = publisherLabels[i] || pubIri;
      const current = publisherCounts.get(pubIri) || { iri: pubIri, label: pubLabel, count: 0 };
      current.count++;
      publisherCounts.set(pubIri, current);
    }
  }

  return {
    schemes: Array.from(schemeCounts.values()).sort((a, b) => b.count - a.count),
    publishers: Array.from(publisherCounts.values()).sort((a, b) => b.count - a.count),
  };
}

async function buildOramaIndex(concepts) {
  const db = await create({
    schema: {
      iri: 'string',
      prefLabel: 'string',
      altLabels: 'string[]',
      notation: 'string',
      definition: 'string',
      scheme: 'string',
      schemeLabel: 'string',
      publisher: 'string[]',
    },
    components: {
      tokenizer: {
        stemming: true,
        stopWords: false,
      },
    },
  });

  // Transform concepts for Orama
  const documents = concepts.map(c => ({
    iri: c.iri,
    prefLabel: c.prefLabel || '',
    altLabels: c.altLabels || [],
    notation: c.notation || '',
    definition: c.definition || '',
    scheme: c.scheme || '',
    schemeLabel: c.schemeLabel || '',
    publisher: c.publisher || [],
  }));

  await insertMultiple(db, documents);

  return save(db);
}

async function main() {
  const config = parseArgs();

  console.log('🔍 Generate Search Index\n');
  console.log(`Export directory: ${config.exportDir}`);
  console.log(`Output directory: ${config.output}\n`);

  // Load vocab metadata for publisher info
  console.log('Loading vocabulary metadata...');
  const vocabMetadata = await loadVocabMetadata(config.vocabMetadata);
  console.log(`  Loaded metadata for ${vocabMetadata.size} vocabularies\n`);

  // Find all list JSON files
  console.log('Finding vocabulary list files...');
  const listFiles = await findListJsonFiles(config.exportDir);
  console.log(`  Found ${listFiles.length} vocabulary list files\n`);

  // Load and aggregate all concepts
  console.log('Loading concepts...');
  const allConcepts = [];
  for (const listFile of listFiles) {
    const concepts = await loadConcepts(listFile, vocabMetadata);
    allConcepts.push(...concepts);
    console.log(`  ✓ ${concepts.length} concepts from ${listFile.split('/').slice(-2).join('/')}`);
  }
  console.log(`\nTotal concepts: ${allConcepts.length}\n`);

  // Compute facets
  console.log('Computing facets...');
  const facets = computeFacets(allConcepts, vocabMetadata);
  console.log(`  ${facets.schemes.length} scheme facets`);
  console.log(`  ${facets.publishers.length} publisher facets\n`);

  // Create output directory
  await mkdir(config.output, { recursive: true });

  // Write flat index JSON (for fallback / simple search)
  console.log('Writing search index...');
  const indexJson = {
    concepts: allConcepts.map(c => ({
      iri: c.iri,
      prefLabel: c.prefLabel,
      altLabels: c.altLabels || [],
      notation: c.notation || '',
      definition: c.definition || '',
      scheme: c.scheme,
      schemeLabel: c.schemeLabel,
      publisher: c.publisher || [],
    })),
  };
  await writeFile(join(config.output, 'index.json'), JSON.stringify(indexJson), 'utf-8');
  console.log(`  ✓ index.json (${allConcepts.length} concepts)`);

  // Write facets
  await writeFile(join(config.output, 'facets.json'), JSON.stringify(facets, null, 2), 'utf-8');
  console.log(`  ✓ facets.json`);

  // Build and write Orama index
  if (config.buildOrama) {
    console.log('Building Orama index...');
    const oramaIndex = await buildOramaIndex(allConcepts);
    await writeFile(join(config.output, 'orama-index.json'), JSON.stringify(oramaIndex), 'utf-8');
    console.log(`  ✓ orama-index.json`);
  }

  console.log('\n✅ Search index generation complete!');
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
