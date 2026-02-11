#!/usr/bin/env node

/**
 * Generic RDF Processing Pipeline
 *
 * Processes any RDF file and generates multiple export formats.
 * Unlike process-vocab.js (SKOS-specific), this handles generic RDF content.
 * Uses a generic approach - extracts all properties and renders them dynamically.
 *
 * Outputs:
 * - *-turtle.ttl - Source Turtle
 * - *-anot+turtle.ttl - Annotated Turtle with prez:label/description
 * - *-json+ld.json - JSON-LD
 * - *-anot+json+ld.json - Annotated JSON-LD
 * - *-rdf.xml - RDF/XML
 * - *-page.html - HTML page (dark mode)
 *
 * Usage:
 *   node packages/data-processing/scripts/process-rdf.js [options]
 */

import { readdir, readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname, basename, isAbsolute } from 'path';
import { fileURLToPath } from 'url';
import { Parser, Store, Writer, DataFactory } from 'n3';
import jsonld from 'jsonld';

const { namedNode, literal, quad } = DataFactory;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PACKAGE_DIR = join(__dirname, '..');
const ROOT_DIR = join(__dirname, '../../..');

// Namespace constants
const RDF = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';
const RDFS = 'http://www.w3.org/2000/01/rdf-schema#';
const DCTERMS = 'http://purl.org/dc/terms/';
const PREZ = 'https://prez.dev/';
const XSD = 'http://www.w3.org/2001/XMLSchema#';
const PROF = 'http://www.w3.org/ns/dx/prof/';
const SH = 'http://www.w3.org/ns/shacl#';
const ALTR_EXT = 'http://www.w3.org/ns/dx/connegp/altr-ext#';

// Standard prefixes for output
const PREFIXES = {
  rdf: RDF,
  rdfs: RDFS,
  dcterms: DCTERMS,
  prez: PREZ,
  xsd: XSD,
  prof: PROF,
  sh: SH,
  'altr-ext': ALTR_EXT,
};

// Label predicates to use for prez annotations
const PREZ_LABEL = `${PREZ}label`;
const PREZ_DESCRIPTION = `${PREZ}description`;

// Source predicates that contain label/description info
const LABEL_SOURCES = [
  `${DCTERMS}title`,
  `${RDFS}label`,
];

const DESCRIPTION_SOURCES = [
  `${DCTERMS}description`,
  `${RDFS}comment`,
];

// Default configuration
// Note: backgroundDir uses data/background/ which is populated via prezmanifest (scripts/fetch-labels.sh)
const DEFAULT_CONFIG = {
  source: join(PACKAGE_DIR, 'examples/ga-vocab-ref/ga-vocab-turtle.ttl'),
  outDir: join(PACKAGE_DIR, 'examples/ga-vocab-output'),
  refDir: join(PACKAGE_DIR, 'examples/ga-vocab-ref'),
  backgroundDir: join(ROOT_DIR, 'data/background'),
};

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const config = { ...DEFAULT_CONFIG };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') {
      console.log(`
Generic RDF Processing Pipeline

Usage:
  node packages/data-processing/scripts/process-rdf.js [options]

Options:
  --source <path>        Path to source TTL file
  --outDir <path>        Output directory
  --backgroundDir <path> Path to background labels directory
  --help, -h             Show this help message
`);
      process.exit(0);
    } else if (arg === '--source' && args[i + 1]) {
      const val = args[++i];
      config.source = isAbsolute(val) ? val : join(ROOT_DIR, val);
    } else if (arg === '--outDir' && args[i + 1]) {
      const val = args[++i];
      config.outDir = isAbsolute(val) ? val : join(ROOT_DIR, val);
    } else if (arg === '--backgroundDir' && args[i + 1]) {
      const val = args[++i];
      config.backgroundDir = isAbsolute(val) ? val : join(ROOT_DIR, val);
    }
  }

  return config;
}

/**
 * Parse a TTL file into an N3 Store
 */
async function parseTTLFile(filePath) {
  const content = await readFile(filePath, 'utf-8');
  const parser = new Parser({ format: 'Turtle' });
  const store = new Store();
  const quads = parser.parse(content);
  store.addQuads(quads);
  return store;
}

/**
 * Parse all TTL files in a directory into a single store
 */
async function parseTTLDirectory(dirPath) {
  const store = new Store();
  const parser = new Parser({ format: 'Turtle' });

  try {
    const files = await readdir(dirPath);
    const ttlFiles = files.filter(f => f.endsWith('.ttl'));

    for (const file of ttlFiles) {
      const filePath = join(dirPath, file);
      const content = await readFile(filePath, 'utf-8');
      try {
        const quads = parser.parse(content);
        store.addQuads(quads);
      } catch (err) {
        // Silently skip unparseable files
      }
    }
  } catch (err) {
    if (err.code !== 'ENOENT') {
      throw err;
    }
  }

  return store;
}

/**
 * Collect all IRIs that might need labels/descriptions
 */
function collectIRIs(store) {
  const iris = new Set();

  for (const quad of store.getQuads(null, null, null, null)) {
    if (quad.subject.termType === 'NamedNode') {
      iris.add(quad.subject.value);
    }
    if (quad.predicate.termType === 'NamedNode') {
      iris.add(quad.predicate.value);
    }
    if (quad.object.termType === 'NamedNode') {
      iris.add(quad.object.value);
    }
  }

  return iris;
}

/**
 * Create annotated store with prez:label and prez:description
 */
function createAnnotatedStore(sourceStore, backgroundStore) {
  const annotated = new Store();

  // Copy all source quads
  annotated.addQuads(sourceStore.getQuads());

  // Collect all IRIs from source
  const iris = collectIRIs(sourceStore);

  // Helper to add prez:label from background
  const addPrezLabel = (iri) => {
    const prezLabelQuads = backgroundStore.getQuads(iri, PREZ_LABEL, null, null);
    for (const q of prezLabelQuads) {
      annotated.addQuad(quad(namedNode(iri), namedNode(PREZ_LABEL), q.object));
    }
    return prezLabelQuads.length > 0;
  };

  // Helper to add prez:description from background
  const addPrezDescription = (iri) => {
    const prezDescQuads = backgroundStore.getQuads(iri, PREZ_DESCRIPTION, null, null);
    for (const q of prezDescQuads) {
      annotated.addQuad(quad(namedNode(iri), namedNode(PREZ_DESCRIPTION), q.object));
    }
    return prezDescQuads.length > 0;
  };

  // For each IRI, try to find/create prez:label and prez:description
  for (const iri of iris) {
    const isMainSubject = sourceStore.getQuads(iri, null, null, null).length > 0;

    let hasLabel = false;
    let hasDescription = false;

    if (isMainSubject) {
      // Create prez:label from dcterms:title or rdfs:label
      for (const pred of LABEL_SOURCES) {
        const quads = sourceStore.getQuads(iri, pred, null, null);
        if (quads.length > 0) {
          for (const q of quads) {
            if (q.object.termType === 'Literal') {
              annotated.addQuad(quad(namedNode(iri), namedNode(PREZ_LABEL), q.object));
              hasLabel = true;
            }
          }
        }
      }

      // Create prez:description from dcterms:description or rdfs:comment
      for (const pred of DESCRIPTION_SOURCES) {
        const quads = sourceStore.getQuads(iri, pred, null, null);
        if (quads.length > 0) {
          for (const q of quads) {
            if (q.object.termType === 'Literal') {
              annotated.addQuad(quad(namedNode(iri), namedNode(PREZ_DESCRIPTION), q.object));
              hasDescription = true;
            }
          }
        }
      }
    }

    // Always check background for prez:label and prez:description
    if (!hasLabel) {
      hasLabel = addPrezLabel(iri);
    }
    if (!hasDescription) {
      hasDescription = addPrezDescription(iri);
    }
  }

  return annotated;
}

/**
 * Serialize store to Turtle format
 */
async function storeToTurtle(store, prefixes = PREFIXES) {
  return new Promise((resolve, reject) => {
    const writer = new Writer({ prefixes });
    writer.addQuads(store.getQuads());
    writer.end((error, result) => {
      if (error) reject(error);
      else resolve(result);
    });
  });
}

/**
 * Serialize store to RDF/XML format
 */
function storeToRDFXML(store) {
  const quads = store.getQuads();
  const prefixes = { ...PREFIXES };

  let xml = '<?xml version="1.0" encoding="utf-8"?>\n';
  xml += '<rdf:RDF\n';
  for (const [prefix, ns] of Object.entries(prefixes)) {
    xml += `   xmlns:${prefix}="${ns}"\n`;
  }
  xml += '>\n';

  const bySubject = new Map();
  for (const q of quads) {
    const subj = q.subject.termType === 'BlankNode' ? `_:${q.subject.value}` : q.subject.value;
    if (!bySubject.has(subj)) bySubject.set(subj, []);
    bySubject.get(subj).push(q);
  }

  for (const [subject, subjectQuads] of bySubject) {
    if (subject.startsWith('_:')) {
      xml += `  <rdf:Description rdf:nodeID="${subject.slice(2)}">\n`;
    } else {
      xml += `  <rdf:Description rdf:about="${escapeXml(subject)}">\n`;
    }

    for (const q of subjectQuads) {
      const pred = q.predicate.value;
      const predLocal = localName(pred);
      const predPrefix = getPrefix(pred, prefixes);
      const predQName = predPrefix ? `${predPrefix}:${predLocal}` : pred;

      if (q.object.termType === 'NamedNode') {
        xml += `    <${predQName} rdf:resource="${escapeXml(q.object.value)}"/>\n`;
      } else if (q.object.termType === 'BlankNode') {
        xml += `    <${predQName} rdf:nodeID="${q.object.value}"/>\n`;
      } else if (q.object.termType === 'Literal') {
        const lang = q.object.language ? ` xml:lang="${q.object.language}"` : '';
        const datatype = q.object.datatype &&
          q.object.datatype.value !== `${XSD}string` &&
          q.object.datatype.value !== `${RDF}langString`
          ? ` rdf:datatype="${q.object.datatype.value}"`
          : '';
        xml += `    <${predQName}${lang}${datatype}>${escapeXml(q.object.value)}</${predQName}>\n`;
      }
    }

    xml += '  </rdf:Description>\n';
  }

  xml += '</rdf:RDF>\n';
  return xml;
}

function escapeXml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function localName(iri) {
  const hashIndex = iri.lastIndexOf('#');
  const slashIndex = iri.lastIndexOf('/');
  const index = Math.max(hashIndex, slashIndex);
  return index >= 0 ? iri.substring(index + 1) : iri;
}

function getPrefix(iri, prefixes) {
  for (const [prefix, ns] of Object.entries(prefixes)) {
    if (iri.startsWith(ns)) return prefix;
  }
  return null;
}

/**
 * Convert store to JSON-LD
 */
async function storeToJSONLD(store) {
  const writer = new Writer({ format: 'N-Quads' });
  writer.addQuads(store.getQuads());

  return new Promise((resolve, reject) => {
    writer.end(async (error, nquads) => {
      if (error) {
        reject(error);
        return;
      }

      try {
        const doc = await jsonld.fromRDF(nquads, { format: 'application/n-quads' });
        resolve(doc);
      } catch (err) {
        reject(err);
      }
    });
  });
}

/**
 * Generate HTML page for generic RDF content
 * Fully generic - extracts all properties and renders them dynamically
 */
function generateHTML(store, annotatedStore, title = 'RDF Resource') {
  // Helper to get label/description from annotated store
  const getLabel = (iri) => {
    const labelQuads = annotatedStore.getQuads(iri, PREZ_LABEL, null, null);
    return labelQuads.length > 0 ? labelQuads[0].object.value : localName(iri);
  };

  const getDescription = (iri) => {
    const descQuads = annotatedStore.getQuads(iri, PREZ_DESCRIPTION, null, null);
    return descQuads.length > 0 ? descQuads[0].object.value : '';
  };

  // Find main subjects (things with types)
  const subjects = new Map();

  for (const q of store.getQuads(null, `${RDF}type`, null, null)) {
    if (q.subject.termType === 'NamedNode') {
      const subj = q.subject.value;
      if (!subjects.has(subj)) {
        subjects.set(subj, { types: [], properties: new Map() });
      }
      if (q.object.termType === 'NamedNode') {
        subjects.get(subj).types.push(q.object.value);
      }
    }
  }

  // Collect properties for each subject (generic approach)
  for (const [subj, data] of subjects) {
    for (const q of store.getQuads(subj, null, null, null)) {
      if (q.predicate.value === `${RDF}type`) continue;

      const pred = q.predicate.value;
      if (!data.properties.has(pred)) {
        data.properties.set(pred, []);
      }

      if (q.object.termType === 'Literal') {
        data.properties.get(pred).push({ type: 'literal', value: q.object.value });
      } else if (q.object.termType === 'NamedNode') {
        data.properties.get(pred).push({ type: 'uri', value: q.object.value });
      }
    }
  }

  // Try to get a better title from the content
  for (const [subj, data] of subjects) {
    const titles = data.properties.get(`${DCTERMS}title`) || [];
    if (titles.length > 0) {
      title = titles[0].value;
      break;
    }
  }

  // Build HTML with dark mode
  let html = `<!DOCTYPE html>
<html lang="en" class="has-background-dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bulma@0.9.4/css/bulma.min.css">
  <style>
    html, body { background-color: #1a1a2e; color: #eaeaea; }
    .box { background-color: #16213e; border: 1px solid #0f3460; }
    .table { background-color: #16213e; color: #eaeaea; }
    .table th, .table td { color: #eaeaea; border-color: #0f3460; background-color: #16213e; }
    .table thead th { color: #94a3b8; background-color: #0f3460; }
    .title, .subtitle { color: #eaeaea; }
    a { color: #60a5fa; }
    a:hover { color: #93c5fd; }
    a[title] { text-decoration: underline dotted; }
    .resource-box { margin-bottom: 1.5rem; }
    .prop-table th { width: 200px; vertical-align: top; }
    .iri-link { word-break: break-all; }
  </style>
</head>
<body>
  <section class="section">
    <div class="container">
      <h1 class="title">${escapeHtml(title)}</h1>
`;

  // Render each subject (generic - all properties)
  for (const [subj, data] of subjects) {
    const subjTitle = data.properties.get(`${DCTERMS}title`)?.[0]?.value || localName(subj);

    html += `
      <div class="box resource-box">
        <h2 class="title is-4">${escapeHtml(subjTitle)}</h2>
        <p class="subtitle is-6">
          <a href="${escapeHtml(subj)}" class="iri-link" target="_blank">${escapeHtml(subj)}</a>
        </p>
        <p><strong>Types:</strong> ${data.types.map(t => {
          const typeLabel = getLabel(t);
          const typeDesc = getDescription(t);
          const titleAttr = typeDesc ? ` title="${escapeHtml(typeDesc)}"` : '';
          return `<a href="${escapeHtml(t)}" target="_blank"${titleAttr}>${escapeHtml(typeLabel)}</a>`;
        }).join(', ')}</p>
        <table class="table is-fullwidth prop-table">
          <tbody>
`;

    // Render all properties (generic)
    for (const [pred, values] of data.properties) {
      const predLabel = getLabel(pred);
      const predDesc = getDescription(pred);
      const titleAttr = predDesc ? ` title="${escapeHtml(predDesc)}"` : '';

      html += `            <tr>
              <th><a href="${escapeHtml(pred)}" target="_blank"${titleAttr}>${escapeHtml(predLabel)}</a></th>
              <td>`;

      for (const val of values) {
        if (val.type === 'uri') {
          const valLabel = getLabel(val.value);
          const valDesc = getDescription(val.value);
          const valTitleAttr = valDesc ? ` title="${escapeHtml(valDesc)}"` : '';
          html += `<a href="${escapeHtml(val.value)}" target="_blank"${valTitleAttr}>${escapeHtml(valLabel)}</a> `;
        } else {
          html += `${escapeHtml(val.value)} `;
        }
      }

      html += `</td>
            </tr>
`;
    }

    html += `          </tbody>
        </table>
      </div>
`;
  }

  html += `    </div>
  </section>
</body>
</html>`;

  return html;
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Main processing function
 */
async function processRDF(config) {
  console.log('🚀 Generic RDF Processing Pipeline\n');
  console.log(`Source: ${config.source}`);
  console.log(`Background: ${config.backgroundDir}`);
  console.log(`Output: ${config.outDir}\n`);

  await mkdir(config.outDir, { recursive: true });

  console.log('📖 Parsing source TTL...');
  const sourceStore = await parseTTLFile(config.source);
  console.log(`   Loaded ${sourceStore.size} triples from source\n`);

  console.log('📚 Parsing background labels...');
  const backgroundStore = await parseTTLDirectory(config.backgroundDir);
  console.log(`   Loaded ${backgroundStore.size} triples from background\n`);

  console.log('🔀 Creating annotated store...');
  const annotatedStore = createAnnotatedStore(sourceStore, backgroundStore);
  console.log(`   Annotated store has ${annotatedStore.size} triples\n`);

  const sourceName = basename(config.source, '.ttl').replace('-turtle', '').replace('-source', '');

  console.log('💾 Generating output files...\n');

  console.log('   Writing source turtle...');
  const sourceTtl = await storeToTurtle(sourceStore);
  await writeFile(join(config.outDir, `${sourceName}-turtle.ttl`), sourceTtl, 'utf-8');
  console.log(`   ✓ ${sourceName}-turtle.ttl`);

  console.log('   Writing annotated turtle...');
  const annotatedTtl = await storeToTurtle(annotatedStore);
  await writeFile(join(config.outDir, `${sourceName}-anot+turtle.ttl`), annotatedTtl, 'utf-8');
  console.log(`   ✓ ${sourceName}-anot+turtle.ttl`);

  console.log('   Writing JSON-LD...');
  const jsonldDoc = await storeToJSONLD(sourceStore);
  await writeFile(join(config.outDir, `${sourceName}-json+ld.json`), JSON.stringify(jsonldDoc, null, 4), 'utf-8');
  console.log(`   ✓ ${sourceName}-json+ld.json`);

  console.log('   Writing annotated JSON-LD...');
  const annotatedJsonldDoc = await storeToJSONLD(annotatedStore);
  await writeFile(join(config.outDir, `${sourceName}-anot+json+ld.json`), JSON.stringify(annotatedJsonldDoc, null, 4), 'utf-8');
  console.log(`   ✓ ${sourceName}-anot+json+ld.json`);

  console.log('   Writing RDF/XML...');
  const rdfxml = storeToRDFXML(sourceStore);
  await writeFile(join(config.outDir, `${sourceName}-rdf.xml`), rdfxml, 'utf-8');
  console.log(`   ✓ ${sourceName}-rdf.xml`);

  console.log('   Writing HTML page...');
  const html = generateHTML(sourceStore, annotatedStore, 'RDF Resources');
  await writeFile(join(config.outDir, `${sourceName}-page.html`), html, 'utf-8');
  console.log(`   ✓ ${sourceName}-page.html`);

  console.log('\n✅ Processing complete!\n');
  console.log('Summary:');
  console.log(`  - Source triples: ${sourceStore.size}`);
  console.log(`  - Background triples: ${backgroundStore.size}`);
  console.log(`  - Annotated triples: ${annotatedStore.size}`);
  console.log(`  - Output files: 6`);

  return { sourceStore, annotatedStore, backgroundStore, config };
}

// Main execution
const config = parseArgs();
processRDF(config).catch(err => {
  console.error('❌ Error:', err.message);
  console.error(err.stack);
  process.exit(1);
});

export { processRDF };
