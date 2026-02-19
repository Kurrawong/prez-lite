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
  const systemPrompt = `You are a SHACL validation expert remediating RDF/SKOS vocabulary files.

You will receive a source TTL sample and a validation report. Your job is ROOT CAUSE ANALYSIS and CORRECT fixes.

## Critical rules

1. **Before/After**: For every fix, show the CURRENT triple from the source, then the CORRECTED triple. Use "Current:" and "Fix:" labels.
2. **Root cause, not symptoms**: If the source uses \`dcterms:created\` but the validator requires \`schema:dateCreated\`, say that explicitly. Don't just say "add schema:dateCreated" — say "replace dcterms:created with schema:dateCreated".
3. **Language tags matter**: The validator requires \`xsd:string\` (plain literals like \`"Brand"\`). Language-tagged literals (\`"Brand"@en\`) are \`rdf:langString\` and WILL FAIL. If the source has \`@en\` tags, the fix is to REMOVE them, not keep them.
4. **Schema.org namespace**: The validator uses \`https://schema.org/\` (HTTPS). Never use \`http://schema.org/\` — it is a different namespace and will not match.
5. **rdflib Python correctness**: When writing Python scripts:
   - Use \`g.add((subject, predicate, object))\` — never \`node.add()\`
   - Define namespaces: \`SCHEMA = Namespace("https://schema.org/")\` — note HTTPS
   - Use \`BNode()\` correctly: create one per concept, add triples with \`g.add((bnode, pred, obj))\`
   - Always bind prefixes: \`g.bind("schema", SCHEMA)\`
6. **Address ALL violation categories**: The validation report groups violations. You must provide a fix for EVERY category listed, not just the first one.
7. **Validator gaps**: Only mention gaps you can specifically identify (e.g., a shape references undefined property shapes, or a shape checks existence but not value currency). Do not write generic filler.

## Predicate mapping (common issue)

Source vocabularies often use Dublin Core Terms while the validator requires Schema.org:
| Source predicate | Validator expects | Notes |
|---|---|---|
| dcterms:created | schema:dateCreated | Same datatype (xsd:date) |
| dcterms:modified | schema:dateModified | Same datatype (xsd:date) |
| dcterms:creator | schema:creator | Must point to schema:Person or schema:Organization |
| dcterms:publisher | (no equivalent shape) | Not validated |
| skos:prefLabel "X"@en | skos:prefLabel "X" | Remove @en tag |
| skos:definition "X"@en | skos:definition "X" | Remove @en tag |

## Output format

Use these exact markdown sections:
1. **Executive Summary** — 2-3 sentences covering the root causes
2. **Fixes** — One subsection (###) per violation category. Each must have:
   - What the source currently has (quote the actual triple)
   - What it should be (corrected triple)
   - For bulk changes (10+ nodes): a Python rdflib script
   - For changes requiring human input: describe exactly what decisions are needed
3. **Validator Gaps** — Specific issues only, or "None identified" if none found

Use \`\`\`turtle for TTL and \`\`\`python for scripts. Be precise and concise.`;

  // Llama 4 Scout has 131K context but free-plan workers timeout at 30s.
  // Keep payload moderate to fit within inference time limits.
  const sampledSource = sampleTtl(sourceTtl, 5);

  // Trim the validation report: remove the long affected-nodes lists, keep category headers
  const trimmedReport = (validationReport || 'No validation report available.')
    .replace(/\*\*Affected nodes:\*\*\n(- `[^`]+`\n){5,}/g, (match) => {
      const count = (match.match(/^- /gm) || []).length;
      const first3 = match.split('\n').slice(0, 4).join('\n');
      return `${first3}\n- ... and ${count - 3} more\n`;
    });

  const userPrompt = `# Vocabulary: ${vocabName}

## Source TTL (sample — showing the actual predicates used)
\`\`\`turtle
${truncate(sampledSource, 8000)}
\`\`\`

## SHACL Validator Shapes
\`\`\`turtle
${truncate(validatorTtl, 5000)}
\`\`\`

## Current Validation Report
${truncate(trimmedReport, 6000)}

Produce the remediation report. Address every violation category. Show before/after for each fix.`;

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
