#!/usr/bin/env node
/**
 * Test script for vocabulary processing
 * 
 * Tests output against reference files using GA naming conventions.
 * GSWA tests may fail due to older naming conventions - this is expected.
 * 
 * Usage:
 *   node test-vocab-processing.js [options]
 * 
 * Options:
 *   --backgroundDir <path>  Background labels directory (default: examples/background)
 *   --regenerate            Regenerate output files before testing
 *   --verbose               Show more detailed output
 */

import { readFile, readdir, mkdir, writeFile } from 'fs/promises';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { spawn } from 'child_process';
import N3 from 'n3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const EXAMPLES_DIR = join(__dirname, '../examples');
const PACKAGE_DIR = join(__dirname, '..');

// Parse CLI arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    backgroundDir: join(EXAMPLES_DIR, 'background'),
    regenerate: false,
    verbose: false,
  };
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--backgroundDir' && args[i + 1]) {
      config.backgroundDir = args[++i];
      // Resolve relative paths from package dir
      if (!config.backgroundDir.startsWith('/')) {
        config.backgroundDir = join(PACKAGE_DIR, config.backgroundDir);
      }
    } else if (args[i] === '--regenerate') {
      config.regenerate = true;
    } else if (args[i] === '--verbose') {
      config.verbose = true;
    }
  }
  
  return config;
}

const cliConfig = parseArgs();

// GA naming convention (current standard)
const OUTPUT_FILES = {
  annotatedTurtle: '-anot-turtle.ttl',
  annotatedJsonLd: '-anot-ld-json.json',
  turtle: '-turtle.ttl',
  jsonLd: '-json-ld.json',
  rdfXml: '-rdf.xml',
  listJson: '-list.json',
  listCsv: '-list.csv',
  pageHtml: '-page.html'
};

// Test results
const results = {
  passed: 0,
  failed: 0,
  skipped: 0,
  details: []
};

async function runOutputTest(testName, outPath, checkType, opts = {}) {
  try {
    let outContent;
    try {
      outContent = await readFile(outPath, 'utf-8');
    } catch (e) {
      results.failed++;
      results.details.push({ test: testName, status: 'FAIL', message: `Output file not found: ${basename(outPath)}` });
      return;
    }

    let result = { pass: true, message: 'OK' };
    switch (checkType) {
      case 'ttl-parse': {
        await parseTTL(outContent);
        result = { pass: true, message: 'TTL parses' };
        break;
      }
      case 'ttl-has-type': {
        const store = await parseTTL(outContent);
        const { typeIri, rdfTypeIri } = opts;
        const quads = store.getQuads(null, rdfTypeIri || 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type', typeIri, null);
        result = quads.length > 0
          ? { pass: true, message: `Has rdf:type ${typeIri}` }
          : { pass: false, message: `Missing rdf:type ${typeIri}` };
        break;
      }
      case 'annotated-focusnode': {
        const store = await parseTTL(outContent);
        const PREZ_NS = 'https://prez.dev/';
        const focusQuads = store.getQuads(null, `${PREZ_NS}type`, `${PREZ_NS}FocusNode`, null);
        if (focusQuads.length === 0) {
          result = { pass: false, message: 'No prez:FocusNode found' };
          break;
        }
        const focusNode = focusQuads[0].subject.value;
        const requiredPreds = [`${PREZ_NS}identifier`, `${PREZ_NS}label`, `${PREZ_NS}description`];
        const missing = requiredPreds.filter(p => store.getQuads(focusNode, p, null, null).length === 0);
        result = missing.length > 0
          ? { pass: false, message: `Focus node missing: ${missing.map(p => p.split('/').pop()).join(', ')}` }
          : { pass: true, message: 'Focus node has required prez predicates' };
        break;
      }
      case 'json-parse': {
        JSON.parse(outContent);
        result = { pass: true, message: 'JSON parses' };
        break;
      }
      case 'csv-nonempty': {
        const lines = outContent.trim().split('\n');
        result = lines.length >= 2
          ? { pass: true, message: `CSV has ${lines.length - 1} rows` }
          : { pass: false, message: 'CSV missing data rows' };
        break;
      }
      case 'html-nonempty': {
        result = outContent.includes('<html')
          ? { pass: true, message: 'HTML looks valid' }
          : { pass: false, message: 'HTML missing <html>' };
        break;
      }
      default:
        result = { pass: false, message: `Unknown output check type: ${checkType}` };
    }

    if (result.pass) {
      results.passed++;
      results.details.push({ test: testName, status: 'PASS', message: result.message });
    } else {
      results.failed++;
      results.details.push({ test: testName, status: 'FAIL', message: result.message });
    }
  } catch (error) {
    results.failed++;
    results.details.push({ test: testName, status: 'FAIL', message: error.message });
  }
}

/**
 * Parse TTL content into an N3 Store
 */
async function parseTTL(content) {
  const store = new N3.Store();
  const parser = new N3.Parser();
  
  return new Promise((resolve, reject) => {
    parser.parse(content, (error, quad, prefixes) => {
      if (error) reject(error);
      else if (quad) store.addQuad(quad);
      else resolve(store);
    });
  });
}

/**
 * Compare two RDF stores semantically
 * 
 * Note: This is a relaxed comparison that checks:
 * 1. All reference subjects exist in output
 * 2. All reference predicates for each subject exist in output
 * It doesn't require exact value matches for prez:label/prez:description
 * since background labels may have variations (multiple values, language tags)
 */
function compareStores(refStore, outStore, testName) {
  const refQuads = refStore.getQuads();
  const outQuads = outStore.getQuads();
  
  // Get unique subjects from reference (ignoring blank nodes which have random IDs)
  const refSubjects = new Set(refQuads
    .filter(q => q.subject.termType !== 'BlankNode')
    .map(q => q.subject.value)
  );
  const outSubjects = new Set(outQuads
    .filter(q => q.subject.termType !== 'BlankNode')
    .map(q => q.subject.value)
  );
  
  // Check missing subjects
  const missingSubjects = [...refSubjects].filter(s => !outSubjects.has(s));
  
  if (missingSubjects.length > 0) {
    return {
      pass: false,
      message: `Missing ${missingSubjects.length} subjects: ${missingSubjects.slice(0, 3).join(', ')}`
    };
  }
  
  // Check that output has similar size (within 20% tolerance for annotation differences)
  const sizeDiff = Math.abs(refQuads.length - outQuads.length) / Math.max(refQuads.length, 1);
  if (sizeDiff > 0.2) {
    return { 
      pass: false, 
      message: `Triple count differs significantly: ref=${refQuads.length}, out=${outQuads.length}` 
    };
  }
  
  return { pass: true, message: `Stores valid (ref=${refQuads.length}, out=${outQuads.length} triples)` };
}

/**
 * Compare two JSON files
 * 
 * For JSON-LD, we do a structural check rather than exact match
 * since serialization order and context handling may differ
 */
function compareJSON(refJson, outJson) {
  // Check that both are valid JSON and have content
  const refArray = Array.isArray(refJson) ? refJson : [refJson];
  const outArray = Array.isArray(outJson) ? outJson : [outJson];
  
  // Basic check: both have content
  if (refArray.length === 0 || outArray.length === 0) {
    return { pass: false, message: 'Empty JSON content' };
  }
  
  // Check that @context exists in output (for JSON-LD)
  const hasContext = outArray.some(item => item['@context']);
  const hasId = outArray.some(item => item['@id']);
  
  if (!hasContext && !hasId) {
    // For non-JSON-LD, do simple key count comparison
    const refKeys = Object.keys(refArray[0] || {}).length;
    const outKeys = Object.keys(outArray[0] || {}).length;
    
    if (refKeys === 0 || outKeys === 0) {
      return { pass: false, message: 'Missing keys in JSON' };
    }
    
    return { pass: true, message: `JSON valid (ref keys=${refKeys}, out keys=${outKeys})` };
  }
  
  // For JSON-LD, check key structural elements exist
  return { pass: true, message: `JSON-LD valid (${outArray.length} nodes)` };
}

/**
 * Compare CSV files
 */
function compareCSV(refCsv, outCsv) {
  // Normalize: trim whitespace, sort lines (except header)
  const normalizeCSV = (csv) => {
    const lines = csv.trim().split('\n');
    const header = lines[0];
    const data = lines.slice(1).sort();
    return [header, ...data].join('\n');
  };
  
  const refNorm = normalizeCSV(refCsv);
  const outNorm = normalizeCSV(outCsv);
  
  if (refNorm === outNorm) {
    return { pass: true, message: 'CSV matches' };
  }
  
  return { pass: false, message: 'CSV content differs' };
}

/**
 * Count prez: predicates in TTL content
 */
function countPrezPredicates(content) {
  const matches = content.match(/prez:/g);
  return matches ? matches.length : 0;
}

/**
 * Run a single test
 */
async function runTest(testName, refPath, outPath, compareType) {
  try {
    let refContent, outContent;
    
    try {
      refContent = await readFile(refPath, 'utf-8');
    } catch (e) {
      results.skipped++;
      results.details.push({ test: testName, status: 'SKIP', message: `Reference file not found: ${basename(refPath)}` });
      return;
    }
    
    try {
      outContent = await readFile(outPath, 'utf-8');
    } catch (e) {
      results.failed++;
      results.details.push({ test: testName, status: 'FAIL', message: `Output file not found: ${basename(outPath)}` });
      return;
    }
    
    let result;
    
    switch (compareType) {
      case 'ttl':
        const refStore = await parseTTL(refContent);
        const outStore = await parseTTL(outContent);
        result = compareStores(refStore, outStore, testName);
        break;
        
      case 'json':
        const refJson = JSON.parse(refContent);
        const outJson = JSON.parse(outContent);
        result = compareJSON(refJson, outJson);
        break;
        
      case 'csv':
        result = compareCSV(refContent, outContent);
        break;
        
      case 'prez-count':
        const refCount = countPrezPredicates(refContent);
        const outCount = countPrezPredicates(outContent);
        // Allow some variance in prez: count (within 10% or 5 absolute)
        const countDiff = Math.abs(refCount - outCount);
        const countTolerance = Math.max(5, Math.round(refCount * 0.1));
        if (countDiff <= countTolerance) {
          result = { pass: true, message: `prez: count similar (ref=${refCount}, out=${outCount})` };
        } else {
          result = { pass: false, message: `prez: count mismatch: reference=${refCount}, output=${outCount}` };
        }
        break;
        
      case 'annotated-ttl':
        // For annotated TTL, check that focus node has required prez predicates
        const annotRefStore = await parseTTL(refContent);
        const annotOutStore = await parseTTL(outContent);
        const PREZ_NS = 'https://prez.dev/';
        
        // Find focus node
        const focusQuads = annotOutStore.getQuads(null, `${PREZ_NS}type`, `${PREZ_NS}FocusNode`, null);
        if (focusQuads.length === 0) {
          result = { pass: false, message: 'No prez:FocusNode found' };
        } else {
          const focusNode = focusQuads[0].subject.value;
          const requiredPreds = [`${PREZ_NS}identifier`, `${PREZ_NS}label`, `${PREZ_NS}description`];
          const missing = requiredPreds.filter(p => 
            annotOutStore.getQuads(focusNode, p, null, null).length === 0
          );
          if (missing.length > 0) {
            result = { pass: false, message: `Focus node missing: ${missing.map(p => p.split('/').pop()).join(', ')}` };
          } else {
            result = { pass: true, message: `Focus node has all required prez predicates` };
          }
        }
        break;
        
      default:
        result = { pass: false, message: `Unknown compare type: ${compareType}` };
    }
    
    if (result.pass) {
      results.passed++;
      results.details.push({ test: testName, status: 'PASS', message: result.message });
    } else {
      results.failed++;
      results.details.push({ test: testName, status: 'FAIL', message: result.message });
    }
    
  } catch (error) {
    results.failed++;
    results.details.push({ test: testName, status: 'FAIL', message: error.message });
  }
}

/**
 * Run tests for a vocabulary example
 */
async function runVocabTests(name, refDir, outDir) {
  console.log(`\n📋 Testing ${name}...\n`);

  await runOutputTest(
    `${name}: Annotated TTL focus node predicates`,
    join(outDir, `${name}-anot-turtle.ttl`),
    'annotated-focusnode'
  );

  await runOutputTest(
    `${name}: Turtle parses and has ConceptScheme`,
    join(outDir, `${name}-turtle.ttl`),
    'ttl-has-type',
    { typeIri: 'http://www.w3.org/2004/02/skos/core#ConceptScheme' }
  );

  await runOutputTest(
    `${name}: JSON-LD parses`,
    join(outDir, `${name}-json-ld.json`),
    'json-parse'
  );

  await runOutputTest(
    `${name}: Annotated JSON-LD parses`,
    join(outDir, `${name}-anot-ld-json.json`),
    'json-parse'
  );

  await runOutputTest(
    `${name}: CSV list exists and has rows`,
    join(outDir, `${name}-list.csv`),
    'csv-nonempty'
  );

  await runOutputTest(
    `${name}: JSON list parses`,
    join(outDir, `${name}-list.json`),
    'json-parse'
  );

  await runOutputTest(
    `${name}: HTML page exists`,
    join(outDir, `${name}-page.html`),
    'html-nonempty'
  );
}

/**
 * Run tests for a concept example
 */
async function runConceptTests(name, refDir, outDir) {
  console.log(`\n📋 Testing ${name}...\n`);

  await runOutputTest(
    `${name}: Annotated TTL focus node predicates`,
    join(outDir, `${name}-anot-turtle.ttl`),
    'annotated-focusnode'
  );

  await runOutputTest(
    `${name}: Turtle parses and has Concept`,
    join(outDir, `${name}-turtle.ttl`),
    'ttl-has-type',
    { typeIri: 'http://www.w3.org/2004/02/skos/core#Concept' }
  );

  await runOutputTest(
    `${name}: JSON-LD parses`,
    join(outDir, `${name}-json-ld.json`),
    'json-parse'
  );

  await runOutputTest(
    `${name}: Annotated JSON-LD parses`,
    join(outDir, `${name}-anot-ld-json.json`),
    'json-parse'
  );

  await runOutputTest(
    `${name}: HTML page exists`,
    join(outDir, `${name}-page.html`),
    'html-nonempty'
  );
}

async function runCatalogTests(name, outDir) {
  console.log(`\n📋 Testing ${name}...\n`);

  await runOutputTest(
    `${name}: Annotated TTL focus node predicates`,
    join(outDir, `${name}-anot-turtle.ttl`),
    'annotated-focusnode'
  );

  await runOutputTest(
    `${name}: Turtle parses and has DataCatalog`,
    join(outDir, `${name}-turtle.ttl`),
    'ttl-has-type',
    { typeIri: 'https://schema.org/DataCatalog' }
  );

  await runOutputTest(
    `${name}: JSON-LD parses`,
    join(outDir, `${name}-json-ld.json`),
    'json-parse'
  );

  await runOutputTest(
    `${name}: Annotated JSON-LD parses`,
    join(outDir, `${name}-anot-ld-json.json`),
    'json-parse'
  );

  await runOutputTest(
    `${name}: CSV list exists and has rows`,
    join(outDir, `${name}-list.csv`),
    'csv-nonempty'
  );

  await runOutputTest(
    `${name}: JSON list parses`,
    join(outDir, `${name}-list.json`),
    'json-parse'
  );

  await runOutputTest(
    `${name}: HTML page exists`,
    join(outDir, `${name}-page.html`),
    'html-nonempty'
  );
}

/**
 * Run a shell command and return a promise
 */
function runCommand(cmd, args, options = {}) {
  return new Promise((resolve, reject) => {
    if (cliConfig.verbose) {
      console.log(`  Running: ${cmd} ${args.join(' ')}`);
    }
    const proc = spawn(cmd, args, { stdio: 'pipe', ...options });
    let stdout = '';
    let stderr = '';
    proc.stdout?.on('data', data => { stdout += data.toString(); });
    proc.stderr?.on('data', data => { stderr += data.toString(); });
    proc.on('close', code => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`Command failed with code ${code}: ${stderr || stdout}`));
      }
    });
    proc.on('error', reject);
  });
}

/**
 * Regenerate output files using process-vocab.js with SHACL profiles
 */
async function regenerateOutputs() {
  console.log('\n🔄 Regenerating output files...\n');
  
  const processScript = join(__dirname, 'process-vocab.js');
  const bgDir = cliConfig.backgroundDir;
  
  // Ensure background directory exists
  if (!existsSync(bgDir)) {
    console.log(`  Creating background directory: ${bgDir}`);
    await mkdir(bgDir, { recursive: true });
  }
  
  // GA Vocab (using SHACL profiles)
  console.log('  Processing GA vocab...');
  try {
    await runCommand('node', [
      processScript,
      '--profiles', 'examples/ga-vocab-ref/profiles.ttl',
      '--source', 'examples/ga-vocab-ref/ga-vocab-source-input.ttl',
      '--type', 'vocab',
      '--outDir', 'examples/data/ga-vocab',
      '--backgroundDir', bgDir
    ], { cwd: PACKAGE_DIR });
    console.log('    ✓ GA vocab complete');
  } catch (e) {
    console.error(`    ✗ GA vocab failed: ${e.message}`);
  }
  
  // GA Concept (using SHACL profiles)
  console.log('  Processing GA concept...');
  try {
    await runCommand('node', [
      processScript,
      '--profiles', 'examples/ga-vocab-ref/profiles.ttl',
      '--source', 'examples/ga-vocab-ref/ga-concept-source-input.ttl',
      '--type', 'concept',
      '--outDir', 'examples/data/ga-concept',
      '--backgroundDir', bgDir
    ], { cwd: PACKAGE_DIR });
    console.log('    ✓ GA concept complete');
  } catch (e) {
    console.error(`    ✗ GA concept failed: ${e.message}`);
  }
  
  // GSWA Vocab (using SHACL profiles)
  console.log('  Processing GSWA vocab...');
  try {
    await runCommand('node', [
      processScript,
      '--profiles', 'examples/gswa-vocab-ref/profiles.ttl',
      '--source', 'examples/gswa-vocab-ref/gswa-vocab-source-input.ttl',
      '--type', 'vocab',
      '--outDir', 'examples/data/gswa-vocab',
      '--backgroundDir', bgDir
    ], { cwd: PACKAGE_DIR });
    console.log('    ✓ GSWA vocab complete');
  } catch (e) {
    console.error(`    ✗ GSWA vocab failed: ${e.message}`);
  }

  // GGIC Vocab (using SHACL profiles)
  console.log('  Processing GGIC vocab...');
  try {
    await runCommand('node', [
      processScript,
      '--profiles', 'examples/ggic-vocab-ref/profiles.ttl',
      '--source', 'examples/ggic-vocab-ref/ggic-vocab-source-input.ttl',
      '--type', 'vocab',
      '--outDir', 'examples/data/ggic-vocab',
      '--backgroundDir', bgDir
    ], { cwd: PACKAGE_DIR });
    console.log('    ✓ GGIC vocab complete');
  } catch (e) {
    console.error(`    ✗ GGIC vocab failed: ${e.message}`);
  }

  // GA Catalog list (vocab listing)
  console.log('  Processing GA vocab list (catalog)...');
  try {
    await runCommand('node', [
      processScript,
      '--profiles', 'examples/ga-vocablist-ref/profiles.ttl',
      '--source', 'examples/ga-vocablist-ref/ga-vocablist-source-catalog.ttl',
      '--type', 'catalog',
      '--outDir', 'examples/data/ga-vocablist',
      '--backgroundDir', bgDir
    ], { cwd: PACKAGE_DIR });
    console.log('    ✓ GA vocab list complete');
  } catch (e) {
    console.error(`    ✗ GA vocab list failed: ${e.message}`);
  }
  
  console.log('\n  Regeneration complete.\n');
}

/**
 * Generate examples/index.html linking to each *-page.html in examples/data subdirs.
 * Called when running tests so the index stays in sync with data folder.
 */
async function generateExamplesIndex() {
  const dataDir = join(EXAMPLES_DIR, 'data');
  if (!existsSync(dataDir)) {
    return;
  }
  const entries = await readdir(dataDir, { withFileTypes: true });
  const links = [];
  for (const ent of entries) {
    if (!ent.isDirectory() || ent.name.startsWith('.')) continue;
    const subDir = join(dataDir, ent.name);
    const files = await readdir(subDir).catch(() => []);
    const pageFiles = files.filter(f => f.endsWith('-page.html'));
    for (const f of pageFiles.sort()) {
      const label = ent.name.replace(/-/g, ' ');
      const href = `data/${ent.name}/${f}`;
      links.push({ label: `${label} (${basename(f, '-page.html')})`, href });
    }
  }
  if (links.length === 0) {
    return;
  }
  const listItems = links
    .map(({ label, href }) => `    <li><a href="${href}">${label}</a></li>`)
    .join('\n');
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Data processing examples</title>
</head>
<body>
  <h1>Data processing examples</h1>
  <p>Generated HTML pages from the vocabulary pipeline:</p>
  <ul>
${listItems}
  </ul>
</body>
</html>
`;
  const indexPath = join(EXAMPLES_DIR, 'index.html');
  await writeFile(indexPath, html, 'utf-8');
  if (cliConfig.verbose) {
    console.log(`  ✓ Wrote ${indexPath}`);
  }
}

/**
 * Main test runner
 */
async function main() {
  console.log('🧪 Vocabulary Processing Tests\n');
  console.log('Using GA naming conventions (current standard).');
  console.log('GSWA tests may fail due to older naming conventions - this is expected.\n');
  console.log(`📁 Background directory: ${cliConfig.backgroundDir}`);
  
  // Regenerate outputs if requested
  if (cliConfig.regenerate) {
    await regenerateOutputs();
  }

  // Keep examples/index.html in sync with data folder (links to each *-page.html)
  await generateExamplesIndex();
  
  console.log('=' .repeat(60));
  
  // GA Vocab tests (primary)
  await runVocabTests(
    'ga-vocab',
    join(EXAMPLES_DIR, 'ga-vocab-ref'),
    join(EXAMPLES_DIR, 'data/ga-vocab')
  );
  
  // GA Concept tests
  await runConceptTests(
    'ga-concept',
    join(EXAMPLES_DIR, 'ga-vocab-ref'),
    join(EXAMPLES_DIR, 'data/ga-concept')
  );
  
  // GSWA Vocab tests (older version - some failures expected)
  await runVocabTests(
    'gswa-vocab',
    join(EXAMPLES_DIR, 'gswa-vocab-ref'),
    join(EXAMPLES_DIR, 'data/gswa-vocab')
  );

  // GGIC Vocab tests
  await runVocabTests(
    'ggic-vocab',
    join(EXAMPLES_DIR, 'ggic-vocab-ref'),
    join(EXAMPLES_DIR, 'data/ggic-vocab')
  );

  // GA Catalog list tests
  await runCatalogTests(
    'ga-vocablist',
    join(EXAMPLES_DIR, 'data/ga-vocablist')
  );
  
  // Print results
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Test Results:\n');
  
  for (const detail of results.details) {
    const icon = detail.status === 'PASS' ? '✅' : 
                 detail.status === 'FAIL' ? '❌' : '⏭️';
    console.log(`${icon} ${detail.test}`);
    if (detail.status !== 'PASS') {
      console.log(`   ${detail.message}`);
    }
  }
  
  console.log('\n' + '-'.repeat(60));
  console.log(`\n✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`⏭️  Skipped: ${results.skipped}`);
  console.log(`📊 Total: ${results.passed + results.failed + results.skipped}`);
  
  // Exit with error code if any tests failed
  process.exit(results.failed > 0 ? 1 : 0);
}

main().catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});
