#!/usr/bin/env node

/**
 * AI Assessment of Vocabulary Conformance
 *
 * For each source vocab, sends the source TTL, validation report, and test
 * results to a Cloudflare Worker AI endpoint. The worker returns a markdown
 * remediation report that is saved as *-ai-report.md.
 *
 * Environment:
 *   AI_WORKER_URL  — URL of the Cloudflare Worker (required)
 *   AI_WORKER_KEY  — Bearer token for the worker (optional)
 *
 * Usage:
 *   node scripts/ai-assess-vocabs.js [--vocabs-dir <path>] [--reports-dir <path>] [--validator <path>]
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';
import { join, basename, resolve } from 'path';

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

function arg(name, fallback) {
  const idx = process.argv.indexOf(`--${name}`);
  return idx !== -1 && process.argv[idx + 1] ? process.argv[idx + 1] : fallback;
}

const VOCABS_DIR = resolve(arg('vocabs-dir', 'data/vocabs'));
const REPORTS_DIR = resolve(arg('reports-dir', 'data/validators/reports'));
const VALIDATOR_PATH = resolve(arg('validator', 'data/validators/vocabs.ttl'));
const WORKER_URL = process.env.AI_WORKER_URL;
const WORKER_KEY = process.env.AI_WORKER_KEY || '';

if (!WORKER_URL) {
  console.error('Error: AI_WORKER_URL environment variable is required.');
  console.error('Set it to the URL of your Cloudflare Worker AI endpoint.');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readIfExists(filepath) {
  return existsSync(filepath) ? readFileSync(filepath, 'utf-8') : null;
}

function truncate(text, maxChars) {
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + `\n\n... [truncated at ${maxChars} chars]`;
}

/**
 * Extract a representative sample from a TTL file:
 * - All prefix declarations
 * - The ConceptScheme block
 * - First few Concept blocks (to show the pattern)
 * - A count of remaining concepts
 */
function sampleTtl(ttl, maxConcepts = 3) {
  const lines = ttl.split('\n');
  const prefixes = lines.filter(l => /^PREFIX\s/i.test(l)).join('\n');

  // Split into blocks by blank-line-separated sections
  const blocks = ttl.split(/\n\n+/);
  const schemeBlock = blocks.find(b => /skos:ConceptScheme/.test(b)) || '';
  const conceptBlocks = blocks.filter(b => /a\s+skos:Concept\b/.test(b));
  const collectionBlocks = blocks.filter(b => /a\s+skos:Collection\b/.test(b));
  const agentBlocks = blocks.filter(b => /a\s+schema:(Organization|Person)\b/.test(b));

  const sample = [prefixes, ''];
  if (agentBlocks.length) sample.push(agentBlocks[0], '');
  sample.push(schemeBlock, '');

  const shown = conceptBlocks.slice(0, maxConcepts);
  for (const b of shown) sample.push(b, '');

  const remaining = conceptBlocks.length - shown.length;
  if (remaining > 0) {
    sample.push(`# ... ${remaining} more Concept blocks follow the same pattern`);
  }
  if (collectionBlocks.length) {
    sample.push('', collectionBlocks[0], '');
    if (collectionBlocks.length > 1) {
      sample.push(`# ... ${collectionBlocks.length - 1} more Collection blocks`);
    }
  }

  return sample.join('\n');
}

async function callWorker(vocabName, sourceTtl, validatorTtl, validationReport, testResults) {
  const systemPrompt = `You are a SHACL validation expert reviewing RDF/SKOS vocabularies.
You will receive a validation report and a sample of the source TTL showing the data patterns.

Your task is to produce a remediation report in markdown format. For each violation category:
- Explain what the violation means in plain English
- Provide the EXACT corrected TTL triples needed to fix it (show one example)
- If the fix requires bulk changes across many nodes (e.g. adding schema:temporalCoverage to hundreds of concepts), provide a Python script using rdflib that can apply the fix programmatically
- If neither raw TTL nor a script can fully resolve the issue (e.g. requires human judgement on dates), describe exactly what is needed

Format your response as a markdown document with these sections:
1. Executive Summary (1-2 sentences)
2. Fixes (one subsection per violation category, with TTL code blocks or Python scripts)
3. Validator Gaps (any issues in the SHACL shapes themselves that could be improved)

Use turtle code blocks (\`\`\`turtle) for TTL and python code blocks (\`\`\`python) for scripts.
Do NOT include the full corrected file — only show the triples that need to change.
Be concise.`;

  const sampledSource = sampleTtl(sourceTtl);

  const userPrompt = `# Vocabulary: ${vocabName}

## Source TTL (sample showing data patterns)
\`\`\`turtle
${truncate(sampledSource, 6000)}
\`\`\`

## Current Validation Report
${truncate(validationReport || 'No validation report available.', 8000)}

Please produce the remediation report.`;

  const headers = { 'Content-Type': 'application/json' };
  if (WORKER_KEY) headers['Authorization'] = `Bearer ${WORKER_KEY}`;

  const response = await fetch(WORKER_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      system: systemPrompt,
      prompt: userPrompt,
      vocab: vocabName,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Worker returned ${response.status}: ${text}`);
  }

  const data = await response.json();
  return data.content || data.result || data.response || JSON.stringify(data);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const validatorTtl = readIfExists(VALIDATOR_PATH) || '';
  const vocabFiles = readdirSync(VOCABS_DIR).filter(f => f.endsWith('.ttl')).sort();

  console.log(`AI Assessment: ${vocabFiles.length} vocabularies`);
  console.log(`Worker: ${WORKER_URL}\n`);

  for (const vocabFile of vocabFiles) {
    const stem = basename(vocabFile, '.ttl');
    console.log(`Processing: ${vocabFile}`);

    const sourceTtl = readFileSync(join(VOCABS_DIR, vocabFile), 'utf-8');
    const validationReport = readIfExists(join(REPORTS_DIR, `${stem}-validation-report.md`));
    const testOutput = readIfExists(join(REPORTS_DIR, `${stem}-validation-tests-output.md`));

    try {
      const report = await callWorker(stem, sourceTtl, validatorTtl, validationReport, testOutput);

      // Wrap response in a header
      const date = new Date().toISOString().slice(0, 10);
      const lines = [
        `# AI Remediation Report: ${vocabFile}`,
        '',
        `**Source:** \`data/vocabs/${vocabFile}\``,
        `**Generated:** ${date}`,
        `**Model:** Cloudflare Workers AI`,
        '',
        '---',
        '',
        report,
        '',
      ];

      const outPath = join(REPORTS_DIR, `${stem}-ai-report.md`);
      writeFileSync(outPath, lines.join('\n'), 'utf-8');
      console.log(`  AI report: ${outPath}`);
    } catch (err) {
      console.error(`  Error: ${err.message}`);
    }

    console.log('');
  }

  console.log('Done.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
