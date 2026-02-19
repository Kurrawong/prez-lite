#!/usr/bin/env node

/**
 * Run SHACL validation on source vocabs and test fixtures.
 *
 * Generates:
 *   - <vocab>-validation-report.md   — current conformance of source TTL
 *   - <vocab>-validation-tests-output.md — test fixture results
 *   - .cache/test-results.json       — machine-readable test results
 *
 * Usage:
 *   node scripts/run-validation-tests.js [--vocabs-dir <path>] [--validators-dir <path>] [--tests-dir <path>] [--reports-dir <path>]
 */

import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'fs';
import { join, basename, resolve } from 'path';
import { Parser, Store, DataFactory } from 'n3';
import SHACLValidator from 'rdf-validate-shacl';

const { namedNode } = DataFactory;

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

function arg(name, fallback) {
  const idx = process.argv.indexOf(`--${name}`);
  return idx !== -1 && process.argv[idx + 1] ? process.argv[idx + 1] : fallback;
}

const VOCABS_DIR = resolve(arg('vocabs-dir', 'data/vocabs'));
const VALIDATORS_DIR = resolve(arg('validators-dir', 'data/validators'));
const TESTS_DIR = resolve(arg('tests-dir', 'data/validators/tests'));
const REPORTS_DIR = resolve(arg('reports-dir', 'data/validators/reports'));
const CACHE_DIR = resolve('.cache');

mkdirSync(REPORTS_DIR, { recursive: true });
mkdirSync(CACHE_DIR, { recursive: true });

// ---------------------------------------------------------------------------
// RDF helpers
// ---------------------------------------------------------------------------

function parseFile(filepath) {
  const store = new Store();
  const parser = new Parser();
  const content = readFileSync(filepath, 'utf-8');
  store.addQuads(parser.parse(content));
  return store;
}

async function validate(dataStore, shapesStore) {
  const validator = new SHACLValidator(shapesStore);
  const report = await validator.validate(dataStore);

  const results = [];
  for (const r of report.results) {
    const sevVal = r.severity?.value || '';
    const severity = sevVal.includes('Warning') ? 'Warning' : sevVal.includes('Info') ? 'Info' : 'Violation';
    results.push({
      severity,
      message: r.message?.[0]?.value || '',
      focusNode: r.focusNode?.value || '',
      path: r.path?.value || '',
      sourceShape: r.sourceShape?.value || '',
    });
  }

  const violations = results.filter(r => r.severity === 'Violation');
  const warnings = results.filter(r => r.severity === 'Warning');

  return {
    conforms: violations.length === 0,
    violations: violations.length,
    warnings: warnings.length,
    results,
  };
}

function shortIri(iri) {
  // Shorten common prefixes for readability
  const prefixes = [
    ['http://www.w3.org/2004/02/skos/core#', 'skos:'],
    ['https://schema.org/', 'schema:'],
    ['http://www.w3.org/2000/01/rdf-schema#', 'rdfs:'],
    ['http://purl.org/dc/terms/', 'dcterms:'],
    ['http://www.w3.org/ns/shacl#', 'sh:'],
  ];
  for (const [ns, prefix] of prefixes) {
    if (iri.startsWith(ns)) return prefix + iri.slice(ns.length);
  }
  return iri;
}

// ---------------------------------------------------------------------------
// Load shapes
// ---------------------------------------------------------------------------

function loadShapes() {
  const shapesFiles = readdirSync(VALIDATORS_DIR).filter(f => f.endsWith('.ttl'));
  const store = new Store();
  for (const f of shapesFiles) {
    const parser = new Parser();
    const content = readFileSync(join(VALIDATORS_DIR, f), 'utf-8');
    store.addQuads(parser.parse(content));
  }
  return store;
}

// ---------------------------------------------------------------------------
// Source vocab report
// ---------------------------------------------------------------------------

function countByType(store, typeIri) {
  return store.getQuads(null, namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'), namedNode(typeIri)).length;
}

async function generateVocabReport(vocabFile, shapesStore) {
  const stem = basename(vocabFile, '.ttl');
  const filepath = join(VOCABS_DIR, vocabFile);
  const store = parseFile(filepath);
  const result = await validate(store, shapesStore);

  const conceptCount = countByType(store, 'http://www.w3.org/2004/02/skos/core#Concept');
  const collectionCount = countByType(store, 'http://www.w3.org/2004/02/skos/core#Collection');

  const date = new Date().toISOString().slice(0, 10);
  const lines = [];
  lines.push(`# Validation Report: ${vocabFile}`);
  lines.push('');
  lines.push(`**Source:** \`data/vocabs/${vocabFile}\``);
  lines.push(`**Validator:** \`data/validators/vocabs.ttl\` (SKOS Vocabulary Validator)`);
  lines.push(`**Date:** ${date}`);
  lines.push(`**Status:** ${result.conforms ? 'Conformant' : 'Non-conformant'}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('|--------|-------|');
  lines.push(`| Conforms | ${result.conforms ? 'Yes' : 'No'} |`);
  lines.push(`| Total violations | ${result.violations} |`);
  lines.push(`| Warnings | ${result.warnings} |`);
  lines.push(`| Concepts in file | ${conceptCount} |`);
  lines.push(`| Collections in file | ${collectionCount} |`);

  if (result.results.length > 0) {
    // Group by message
    const groups = new Map();
    for (const r of result.results) {
      const key = `${r.severity}::${r.message}`;
      if (!groups.has(key)) groups.set(key, { ...r, focusNodes: [] });
      groups.get(key).focusNodes.push(r.focusNode);
    }

    lines.push('');
    lines.push('## Violations by Category');

    let i = 1;
    for (const [, group] of groups) {
      lines.push('');
      lines.push(`### ${i}. ${group.message} (${group.focusNodes.length} ${group.severity.toLowerCase()}${group.focusNodes.length > 1 ? 's' : ''})`);
      lines.push('');
      lines.push(`**Severity:** ${group.severity}`);
      if (group.path) lines.push(`**Path:** \`${shortIri(group.path)}\``);
      if (group.sourceShape) lines.push(`**Shape:** \`${shortIri(group.sourceShape)}\``);
      lines.push('');
      lines.push('**Affected nodes:**');
      for (const node of group.focusNodes) {
        lines.push(`- \`${node}\``);
      }
      i++;
    }

    lines.push('');
    lines.push('## Recommendations');
    lines.push('');
    lines.push('See the corresponding `*-ai-report.md` for detailed remediation guidance, or review the test fixtures in `data/validators/tests/` for examples of valid and invalid patterns.');
  }

  lines.push('');

  const reportPath = join(REPORTS_DIR, `${stem}-validation-report.md`);
  writeFileSync(reportPath, lines.join('\n'), 'utf-8');
  console.log(`  Report: ${reportPath}`);
  return result;
}

// ---------------------------------------------------------------------------
// Test fixtures report
// ---------------------------------------------------------------------------

async function runTestFixtures(vocabPrefix, shapesStore) {
  const allFiles = readdirSync(TESTS_DIR).filter(f => f.endsWith('.ttl') && f.startsWith(vocabPrefix)).sort();
  if (allFiles.length === 0) return null;

  const date = new Date().toISOString().slice(0, 10);
  const results = {};
  const summaryRows = [];
  const detailSections = [];
  let passCount = 0;

  for (const file of allFiles) {
    const isValid = file.includes('-valid-');
    const expectedConforms = isValid;
    const filepath = join(TESTS_DIR, file);

    // Read comment header for description
    const content = readFileSync(filepath, 'utf-8');
    const headerLines = content.split('\n').filter(l => l.startsWith('#')).slice(0, 8);
    const description = headerLines.map(l => l.replace(/^#\s?/, '')).filter(l => l && !l.startsWith('Shape:') && !l.startsWith('Expected:')).join(' ').trim();

    const store = parseFile(filepath);
    const result = await validate(store, shapesStore);

    const actualConforms = result.conforms;
    const pass = actualConforms === expectedConforms;
    if (pass) passCount++;

    results[file] = {
      conforms: actualConforms,
      expected: expectedConforms,
      pass,
      violations: result.violations,
      warnings: result.warnings,
      results: result.results,
    };

    const status = pass ? 'PASS' : 'FAIL';
    summaryRows.push(`| \`${file}\` | ${expectedConforms ? 'Conforms' : 'Non-conformant'} | ${actualConforms ? 'Conforms' : 'Non-conformant'} | ${result.violations} | ${status} |`);

    // Detail section
    const testNum = file.match(/(valid|invalid)-(\d+)/)?.[0] || file;
    const detail = [];
    detail.push(`### ${testNum}: ${description.slice(0, 120)}`);
    detail.push('');
    detail.push(`**File:** \`${file}\``);
    if (description) detail.push(`**Description:** ${description}`);
    detail.push('');
    detail.push(`**Result:** ${actualConforms ? 'Conforms' : 'Non-conformant'} (${result.violations} violation${result.violations !== 1 ? 's' : ''}, ${result.warnings} warning${result.warnings !== 1 ? 's' : ''})`);

    if (result.results.length > 0) {
      detail.push('');
      detail.push('| Severity | Focus Node | Shape | Message |');
      detail.push('|----------|-----------|-------|---------|');
      for (const r of result.results) {
        const focus = r.focusNode ? `\`${shortIri(r.focusNode)}\`` : '';
        const shape = r.sourceShape ? `\`${shortIri(r.sourceShape)}\`` : '';
        detail.push(`| ${r.severity} | ${focus} | ${shape} | ${r.message} |`);
      }
    }

    detailSections.push(detail.join('\n'));
  }

  // Build markdown
  const lines = [];
  lines.push(`# Validation Test Results: ${vocabPrefix.replace(/-$/, '')}`);
  lines.push('');
  lines.push(`**Validator:** \`data/validators/vocabs.ttl\` (SKOS Vocabulary Validator)`);
  lines.push(`**Test directory:** \`data/validators/tests/\``);
  lines.push(`**Date:** ${date}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push('| Test file | Expected | Actual | Violations | Status |');
  lines.push('|-----------|----------|--------|------------|--------|');
  lines.push(summaryRows.join('\n'));
  lines.push('');
  lines.push(`**Result: ${passCount}/${allFiles.length} tests passed**`);
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Test Details');
  lines.push('');
  lines.push(detailSections.join('\n\n---\n\n'));
  lines.push('');

  const reportPath = join(REPORTS_DIR, `${vocabPrefix.replace(/-$/, '')}-validation-tests-output.md`);
  writeFileSync(reportPath, lines.join('\n'), 'utf-8');
  console.log(`  Tests:  ${reportPath} (${passCount}/${allFiles.length} passed)`);

  return { results, passCount, totalCount: allFiles.length };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('Loading SHACL shapes...');
  const shapesStore = loadShapes();

  const vocabFiles = readdirSync(VOCABS_DIR).filter(f => f.endsWith('.ttl')).sort();
  console.log(`Found ${vocabFiles.length} vocabularies in ${VOCABS_DIR}\n`);

  const allTestResults = {};
  let allTestsPassed = true;

  for (const vocabFile of vocabFiles) {
    const stem = basename(vocabFile, '.ttl');
    console.log(`Processing: ${vocabFile}`);

    // Source validation report
    await generateVocabReport(vocabFile, shapesStore);

    // Test fixtures
    const testResult = await runTestFixtures(`${stem}-`, shapesStore);
    if (testResult) {
      Object.assign(allTestResults, testResult.results);
      if (testResult.passCount < testResult.totalCount) allTestsPassed = false;
    }

    console.log('');
  }

  // Also run test fixtures without a matching vocab (in case there are shared prefixes)
  // This catches any test files not matched above

  // Write cache
  writeFileSync(join(CACHE_DIR, 'test-results.json'), JSON.stringify(allTestResults, null, 2), 'utf-8');
  console.log(`Cache: ${join(CACHE_DIR, 'test-results.json')}`);

  if (!allTestsPassed) {
    console.error('\nSome tests FAILED.');
    process.exit(1);
  }

  console.log('\nAll tests passed.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
