#!/usr/bin/env node

/**
 * Generate Workspaces JSON
 *
 * Reads workspace definitions from a TTL config file and outputs a JSON file
 * used by the frontend workspace selector.
 *
 * Output format:
 * {
 *   "workspaces": [
 *     { "slug": "staging", "label": "Staging", "description": "...", "icon": "...", "refreshFrom": "main" }
 *   ]
 * }
 *
 * Usage:
 *   node generate-workspaces.js --source <workspaces.ttl> --output <workspaces.json>
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { dirname, isAbsolute, resolve } from 'path';
import { fileURLToPath } from 'url';
import { Parser, Store } from 'n3';

const PREZ = 'https://prez.dev/';

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
  const config = { source: null, output: null };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--source' && args[i + 1]) config.source = resolveCliPath(args[++i]);
    else if (arg === '--output' && args[i + 1]) config.output = resolveCliPath(args[++i]);
  }

  if (!config.source || !config.output) {
    console.error('Usage: node generate-workspaces.js --source <workspaces.ttl> --output <workspaces.json>');
    process.exit(1);
  }
  return config;
}

/**
 * Parse workspace definitions from a TTL file.
 * Returns an array of workspace objects.
 */
export function parseWorkspacesTTL(ttlContent) {
  const parser = new Parser({ format: 'Turtle' });
  const store = new Store();
  store.addQuads(parser.parse(ttlContent));

  const workspaceNodes = store.getQuads(null, `${PREZ}workspace`, null, null);
  const workspaces = [];

  for (const wq of workspaceNodes) {
    const node = wq.object;
    const slug = store.getQuads(node, `${PREZ}slug`, null, null)[0]?.object.value;
    if (!slug) continue;

    const label = store.getQuads(node, `${PREZ}label`, null, null)[0]?.object.value ?? slug;
    const description = store.getQuads(node, `${PREZ}description`, null, null)[0]?.object.value ?? '';
    const icon = store.getQuads(node, `${PREZ}icon`, null, null)[0]?.object.value;
    const refreshFrom = store.getQuads(node, `${PREZ}refreshFrom`, null, null)[0]?.object.value ?? 'main';

    workspaces.push({
      slug,
      label,
      description,
      ...(icon ? { icon } : {}),
      refreshFrom,
    });
  }

  return workspaces;
}

async function main() {
  const config = parseArgs();
  let workspaces = [];

  try {
    const ttl = await readFile(config.source, 'utf-8');
    workspaces = parseWorkspacesTTL(ttl);
    console.log(`Parsed ${workspaces.length} workspace definition(s) from ${config.source}`);
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.log(`No workspaces config found at ${config.source}, writing empty config`);
    } else {
      console.error(`Error reading workspaces config: ${err.message}`);
    }
  }

  await mkdir(dirname(config.output), { recursive: true });
  await writeFile(config.output, JSON.stringify({ workspaces }, null, 2));
  console.log(`Wrote ${config.output}`);
}

// Only run main when executed directly (not when imported for testing)
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
