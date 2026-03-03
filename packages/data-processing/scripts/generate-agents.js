#!/usr/bin/env node

/**
 * Generate Agents JSON
 *
 * Extracts agent entities (schema:Person, schema:Organization) from background
 * TTL files into a simple JSON list for the frontend agent picker.
 *
 * Output format:
 * [
 *   { "iri": "https://example.org/person/alice", "name": "Alice", "type": "Person" },
 *   ...
 * ]
 *
 * Usage:
 *   node generate-agents.js --backgroundDir <background/> --output <agents.json>
 */

import { readdir, readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname, isAbsolute, resolve } from 'path';
import { Parser, Store } from 'n3';

const SCHEMA = 'https://schema.org/';
const RDF = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';

function resolveCliPath(val) {
  if (val.includes('..') || val.includes('~')) {
    throw new Error(`Invalid path: path traversal characters not allowed in "${val}"`);
  }
  const resolvedPath = isAbsolute(val) ? resolve(val) : resolve(process.cwd(), val);
  const basePath = resolve(process.cwd());
  if (!resolvedPath.startsWith(basePath)) {
    throw new Error(`Path outside working directory: "${resolvedPath}" is outside "${basePath}"`);
  }
  return resolvedPath;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const config = { backgroundDir: null, output: null };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--backgroundDir' && args[i + 1]) {
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

async function main() {
  const config = parseArgs();

  const store = new Store();
  let files;
  try {
    files = await readdir(config.backgroundDir);
  } catch {
    // No background dir — write empty agents
    await mkdir(dirname(config.output), { recursive: true });
    await writeFile(config.output, '[]', 'utf-8');
    return;
  }

  for (const file of files) {
    if (file.endsWith('.ttl')) {
      try {
        const content = await readFile(join(config.backgroundDir, file), 'utf-8');
        const parser = new Parser();
        store.addQuads(parser.parse(content));
      } catch { /* skip invalid files */ }
    }
  }

  // Find all schema:Person and schema:Organization subjects
  const agents = [];
  const agentTypes = [`${SCHEMA}Person`, `${SCHEMA}Organization`];

  for (const agentType of agentTypes) {
    const typeQuads = store.getQuads(null, `${RDF}type`, agentType, null);
    for (const q of typeQuads) {
      if (q.subject.termType !== 'NamedNode') continue;
      const iri = q.subject.value;
      const nameQuads = store.getQuads(iri, `${SCHEMA}name`, null, null);
      const name = nameQuads.length > 0 ? nameQuads[0].object.value : iri;
      const type = agentType === `${SCHEMA}Person` ? 'Person' : 'Organization';
      agents.push({ iri, name, type });
    }
  }

  agents.sort((a, b) => a.name.localeCompare(b.name));

  await mkdir(dirname(config.output), { recursive: true });
  await writeFile(config.output, JSON.stringify(agents, null, 2), 'utf-8');
  console.log(`      ✓ agents.json (${agents.length} agents)`);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
