#!/usr/bin/env node

/**
 * Vocabulary Processing Pipeline
 *
 * Processes a source TTL vocabulary file and generates multiple export formats.
 * Uses a generic approach for property rendering with configurable ordering.
 *
 * Output formats:
 * - Annotated Turtle (source + background labels)
 * - Simplified Turtle (minimal SKOS graph)
 * - RDF/XML
 * - JSON-LD
 * - List JSON and CSV
 * - HTML page (Bulma styled, dark mode)
 *
 * Usage:
 *   node packages/data-processing/scripts/process-vocab.js [options]
 */

import { readdir, readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname, basename, isAbsolute, resolve } from 'path';
import { fileURLToPath } from 'url';
import { Parser, Store, Writer, DataFactory } from 'n3';
import jsonld from 'jsonld';
import { format as csvFormat } from '@fast-csv/format';
import { Writable } from 'stream';
import { parseProfilesFile, toProcessingConfig } from '@prez-lite/web/utils/shacl-profile-parser';

const { namedNode, literal, quad } = DataFactory;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PACKAGE_DIR = join(__dirname, '..');
const ROOT_DIR = join(__dirname, '../../..');

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

// Namespace constants
const RDF = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';
const RDFS = 'http://www.w3.org/2000/01/rdf-schema#';
const SKOS = 'http://www.w3.org/2004/02/skos/core#';
const DCTERMS = 'http://purl.org/dc/terms/';
const SCHEMA = 'https://schema.org/';
const SDO = 'https://schema.org/';
const OWL = 'http://www.w3.org/2002/07/owl#';
const PROV = 'http://www.w3.org/ns/prov#';
const REG = 'http://purl.org/linked-data/registry#';
const XSD = 'http://www.w3.org/2001/XMLSchema#';
const PREZ = 'https://prez.dev/';
const DCAT = 'http://www.w3.org/ns/dcat#';
const SH = 'http://www.w3.org/ns/shacl#';

// Prez annotation predicates
const PREZ_LABEL = `${PREZ}label`;
const PREZ_DESCRIPTION = `${PREZ}description`;
const PREZ_PROVENANCE = `${PREZ}provenance`;
const PREZ_IDENTIFIER = `${PREZ}identifier`;
const PREZ_LINK = `${PREZ}link`;
const PREZ_MEMBERS = `${PREZ}members`;
const PREZ_TYPE = `${PREZ}type`;
const PREZ_FOCUS_NODE = `${PREZ}FocusNode`;
const PREZ_CURRENT_PROFILE = `${PREZ}currentProfile`;

// Source predicates for prez:label (in priority order)
const LABEL_SOURCE_PREDICATES = [
  `${SKOS}prefLabel`,
  `${DCTERMS}title`,
  `${RDFS}label`,
  `${SDO}name`,
];

// Source predicates for prez:description (in priority order)
const DESCRIPTION_SOURCE_PREDICATES = [
  `${SKOS}definition`,
  `${DCTERMS}description`,
  `${SDO}description`,
  `${RDFS}comment`,
];

// Label-ish predicates to extract from background for prez annotations
const LABEL_PREDICATES = [
  `${RDFS}label`,
  `${SKOS}prefLabel`,
  `${SKOS}definition`,
  `${SCHEMA}name`,
  `${SCHEMA}description`,
  `${RDFS}comment`,
  // Also include prez:label and prez:description directly
  PREZ_LABEL,
  PREZ_DESCRIPTION,
];

// Standard prefixes for output
const PREFIXES = {
  rdf: RDF,
  rdfs: RDFS,
  skos: SKOS,
  owl: OWL,
  dcterms: DCTERMS,
  sdo: SDO,
  prov: PROV,
  reg: REG,
  xsd: XSD,
  prez: PREZ,
  dcat: DCAT,
};

// Configuration for HTML property display - ordered list of known properties
// Properties not in this list will still be rendered, just after these
const HTML_PROPERTY_ORDER = [
  { predicate: `${SKOS}definition`, label: 'Definition', type: 'literal' },
  { predicate: `${REG}status`, label: 'Status', type: 'iri' },
  { predicate: `${OWL}versionIRI`, label: 'Version IRI', type: 'iri' },
  { predicate: `${SKOS}historyNote`, label: 'History Note', type: 'literal' },
  { predicate: `${PROV}qualifiedAttribution`, label: 'Qualified Attribution', type: 'attribution' },
  { predicate: `${SCHEMA}creator`, label: 'Creator', type: 'iri' },
  { predicate: `${SCHEMA}dateCreated`, label: 'Date Created', type: 'literal' },
  { predicate: `${SCHEMA}dateModified`, label: 'Date Modified', type: 'literal' },
  { predicate: `${SCHEMA}keywords`, label: 'Keywords', type: 'iri' },
  { predicate: `${SCHEMA}publisher`, label: 'Publisher', type: 'iri' },
  { predicate: `${SCHEMA}version`, label: 'Version', type: 'literal' },
  { predicate: `${DCTERMS}source`, label: 'Source', type: 'iri' },
  { predicate: `${DCTERMS}license`, label: 'License', type: 'iri' },
  { predicate: `${RDFS}seeAlso`, label: 'See Also', type: 'iri' },
];

// Properties to skip in "other properties" output (already handled specially)
const SKIP_PROPERTIES = new Set([
  `${RDF}type`,
  `${SKOS}prefLabel`,
  `${SKOS}hasTopConcept`,
  `${PREZ}childrenCount`,
  ...HTML_PROPERTY_ORDER.map(p => p.predicate),
]);

// Default property order for profile.json when SHACL does not define sh:property (same order as HTML)
const DEFAULT_FIELD_ORDER = {
  conceptScheme: HTML_PROPERTY_ORDER.map((p, i) => ({ path: p.predicate, order: i, type: p.type })),
  concept: [
    { path: `${RDF}type`, order: 0 },
    { path: `${SKOS}definition`, order: 1 },
    { path: `${SKOS}narrower`, order: 2 },
    { path: `${SKOS}broader`, order: 3 },
    { path: `${SKOS}related`, order: 4 },
    { path: `${SKOS}inScheme`, order: 5 },
    { path: `${DCTERMS}identifier`, order: 6 },
    { path: `${SKOS}topConceptOf`, order: 7 },
    { path: `${SKOS}prefLabel`, order: 8 },
    { path: `${SKOS}altLabel`, order: 9 },
    { path: `${SKOS}notation`, order: 10 },
    { path: `${SKOS}scopeNote`, order: 11 },
    { path: `${SKOS}historyNote`, order: 12 },
    { path: `${SKOS}example`, order: 13 },
  ],
  catalog: [],
};

// Nested field order for complex objects (e.g. qualified attribution: agent then role)
const NESTED_FIELD_ORDER = {
  [PROV + 'qualifiedAttribution']: [
    { path: PROV + 'agent', order: 0 },
    { path: PROV + 'hadRole', order: 1 },
  ],
};

// List (concept table on vocab page) column order: prefLabel, iri, broader
const DEFAULT_LIST_ORDER = [
  { path: 'prefLabel', order: 0 },
  { path: 'iri', order: 1 },
  { path: 'broader', order: 2 },
];

// Default configuration
// Note: backgroundDir defaults to examples/background/ for isolated test data
const DEFAULT_CONFIG = {
  source: join(PACKAGE_DIR, 'examples/gswa-vocab-ref/gswa-vocab-source-input.ttl'),
  backgroundDir: join(PACKAGE_DIR, 'examples/background'),
  outDir: join(PACKAGE_DIR, 'examples/gswa-vocab-output'),
  refDir: join(PACKAGE_DIR, 'examples/gswa-vocab-ref'),
  // Processing type: 'vocab' or 'concept'
  type: 'vocab',
  // Prez link configuration
  catalogId: 'catalogue:gswa-vocabs',
  catalogIri: 'https://linked.data.gov.au/catalogue/gswa-vocabs',
  profileIri: `${PREZ}OGCSchemesObjectProfile`,
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
Vocabulary Processing Pipeline

Usage:
  node packages/data-processing/scripts/process-vocab.js [options]

Single File Mode:
  --source <path>        Path to source TTL file
  --profiles <path>      Path to SHACL profiles.ttl file
  --outDir <path>        Output directory
  --type <vocab|concept|catalog> Type of source to process (default: vocab)

Batch Mode:
  --sourceDir <path>     Directory containing source TTL files
  --outputBase <path>    Base output directory (creates subdirs per vocab)
  --profiles <path>      Path to SHACL profiles.ttl file
  --pattern <glob>       File pattern to match (default: *-source-input.ttl)
  --systemDir <path>     System output directory for profile.json (default: outputBase/../system)

Common Options:
  --validators <path>    Path to validators directory (extracts sh:minCount/maxCount for profile.json)
  --backgroundDir <path> Path to background labels directory
  --refDir <path>        Reference directory for comparison
  --schemeIri <iri>      Parent scheme IRI (required for concept type)
  --catalogId <id>       Catalog CURIE ID (e.g., catalogue:ga-vocabs)
  --catalogIri <iri>     Catalog IRI (e.g., http://pid.geoscience.gov.au/catalogue/ga-vocabs)
  --profileIri <iri>     Profile IRI for prez:currentProfile
  --help, -h             Show this help message

Examples:
  # Single file
  node process-vocab.js --profiles profiles.ttl --source vocab-source-input.ttl --outDir ./output

  # Batch mode - process all vocabs in a directory
  node process-vocab.js --profiles profiles.ttl --sourceDir ./vocabs/ --outputBase ./export/vocabs/ --systemDir ./export/system/
`);
      process.exit(0);
    } else if (arg === '--source' && args[i + 1]) {
      config.source = resolveCliPath(args[++i]);
    } else if (arg === '--sourceDir' && args[i + 1]) {
      config.sourceDir = resolveCliPath(args[++i]);
    } else if (arg === '--outputBase' && args[i + 1]) {
      config.outputBase = resolveCliPath(args[++i]);
    } else if (arg === '--pattern' && args[i + 1]) {
      config.pattern = args[++i];
    } else if (arg === '--backgroundDir' && args[i + 1]) {
      config.backgroundDir = resolveCliPath(args[++i]);
    } else if (arg === '--outDir' && args[i + 1]) {
      config.outDir = resolveCliPath(args[++i]);
    } else if (arg === '--refDir' && args[i + 1]) {
      config.refDir = resolveCliPath(args[++i]);
    } else if (arg === '--profiles' && args[i + 1]) {
      config.profilesFile = resolveCliPath(args[++i]);
    } else if (arg === '--type' && args[i + 1]) {
      config.type = args[++i];
    } else if (arg === '--schemeIri' && args[i + 1]) {
      config.schemeIri = args[++i];
    } else if (arg === '--catalogId' && args[i + 1]) {
      config.catalogId = args[++i];
    } else if (arg === '--catalogIri' && args[i + 1]) {
      config.catalogIri = args[++i];
    } else if (arg === '--profileIri' && args[i + 1]) {
      config.profileIri = args[++i];
    } else if (arg === '--systemDir' && args[i + 1]) {
      config.systemDir = resolveCliPath(args[++i]);
    } else if (arg === '--validators' && args[i + 1]) {
      config.validatorsDir = resolveCliPath(args[++i]);
    }
  }

  return config;
}

/**
 * Determine processing type from filename
 * @param {string} filename - The source filename
 * @returns {'vocab' | 'concept' | 'catalog'} The processing type
 */
function inferTypeFromFilename(filename) {
  if (filename.includes('-source-catalog') || filename.includes('-catalog')) {
    return 'catalog';
  }
  if (filename.includes('-concept')) {
    return 'concept';
  }
  return 'vocab';
}

/**
 * Extract vocab name from source filename
 * @param {string} filename - The source filename (e.g., 'ga-vocab-source-input.ttl')
 * @returns {string} The vocab name (e.g., 'ga-vocab')
 */
function extractVocabName(filename) {
  return basename(filename, '.ttl')
    .replace(/-source-input$/, '')
    .replace(/-source-catalog$/, '')
    .replace(/-source$/, '');
}

/**
 * Process a single file using pre-loaded SHACL profile data.
 * Used internally by processBatch to avoid re-parsing and re-exporting profile.json for each file.
 * @param {object} shaclConfig - Parsed SHACL config from parseProfilesFile
 * @param {object} profileConfig - Processing config from toProcessingConfig
 * @param {object} fieldOrderProfile - The profile.json object for HTML ordering
 * @param {string} sourceFile - Path to source TTL file
 * @param {string} type - 'vocab', 'concept', or 'catalog'
 * @param {string} outDir - Output directory for this vocab
 * @param {string} backgroundDir - Background labels directory
 */
async function processFileWithLoadedProfile(shaclConfig, profileConfig, fieldOrderProfile, sourceFile, type, outDir, backgroundDir) {
  // Determine profile key based on type
  const profileKey = type === 'concept' ? 'concept' : type === 'catalog' ? 'catalog' : 'conceptScheme';
  const profile = profileConfig.profiles[profileKey];
  
  if (!profile) {
    throw new Error(`Profile for ${type} not found`);
  }
  
  // Build the processing config
  const config = {
    source: sourceFile,
    outDir: outDir,
    backgroundDir: backgroundDir || join(PACKAGE_DIR, 'examples/background'),
    catalogId: profileConfig.catalog.id,
    catalogIri: profileConfig.catalog.iri,
    profileIri: profile.iri,
    profileConfig: {
      ...profileConfig,
      currentProfile: profile
    },
    labelSources: profile.labelSources,
    descriptionSources: profile.descriptionSources,
    provenanceSources: profile.provenanceSources,
    generate: profile.prezPredicates,
    // Use the pre-built profile for HTML ordering (no export needed)
    profile: fieldOrderProfile,
  };

  // Process based on type
  if (type === 'concept') {
    return processConcept(config);
  } else if (type === 'catalog') {
    return processCatalog(config);
  } else {
    return processVocab(config);
  }
}

/**
 * Process all matching files in a directory (batch mode)
 * @param {string} profilesPath - Path to SHACL profiles.ttl
 * @param {string} sourceDir - Directory containing source files
 * @param {string} outputBase - Base output directory
 * @param {string} pattern - Glob pattern for matching files
 * @param {string} backgroundDir - Background labels directory
 * @param {string} [systemDir] - System output directory for profile.json (default: outputBase/../system)
 */
async function processBatch(profilesPath, sourceDir, outputBase, pattern = '*-source-input.ttl', backgroundDir, systemDir, validatorsDir) {
  console.log('🔄 Batch Processing Mode');
  console.log(`   Source directory: ${sourceDir}`);
  console.log(`   Output base: ${outputBase}`);
  console.log(`   Pattern: ${pattern}`);
  console.log('');

  // Read all files in the source directory
  const files = await readdir(sourceDir);
  
  // Filter files matching the pattern (simple glob matching)
  const patternRegex = new RegExp(
    '^' + pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.') + '$'
  );
  
  const matchingFiles = files.filter(f => f.endsWith('.ttl') && patternRegex.test(f));
  
  if (matchingFiles.length === 0) {
    console.log(`⚠️  No files matching pattern "${pattern}" found in ${sourceDir}`);
    return { processed: 0, errors: [] };
  }
  
  console.log(`📁 Found ${matchingFiles.length} files to process:`);
  for (const file of matchingFiles) {
    console.log(`   - ${file}`);
  }
  console.log('');
  
  // Create output base directory
  await mkdir(outputBase, { recursive: true });
  
  // Load SHACL profiles once for all files
  console.log('🔧 Loading SHACL profiles from:', profilesPath);
  const shaclConfig = await parseProfilesFile(profilesPath);
  
  // Find the umbrella profile
  const umbrellaIri = Object.keys(shaclConfig.umbrellaProfiles)[0];
  if (!umbrellaIri) {
    throw new Error('No umbrella profile found in profiles.ttl');
  }
  
  // Convert to processing config format
  const profileConfig = toProcessingConfig(shaclConfig, umbrellaIri);
  
  console.log('📋 Loaded profiles:');
  for (const [key, profile] of Object.entries(profileConfig.profiles)) {
    console.log(`   - ${key}: ${profile.label}`);
  }
  console.log('');
  
  // Parse validator cardinality if validators directory provided
  let cardinalityMap;
  if (validatorsDir) {
    console.log('📏 Loading validator cardinality from:', validatorsDir);
    cardinalityMap = await parseValidatorCardinality(validatorsDir);
  }

  // Build and export profile.json ONCE to the system directory
  const resolvedSystemDir = systemDir || join(outputBase, '..', 'system');
  await mkdir(resolvedSystemDir, { recursive: true });
  console.log(`📄 Exporting profile.json to ${resolvedSystemDir}/profile.json`);
  const fieldOrderProfile = await exportProfileJson(shaclConfig, resolvedSystemDir, cardinalityMap);
  console.log('');
  
  const results = { processed: 0, errors: [] };
  
  // Process each file using the pre-loaded profile data
  for (const file of matchingFiles) {
    const sourcePath = join(sourceDir, file);
    const vocabName = extractVocabName(file);
    const type = inferTypeFromFilename(file);
    const outDir = join(outputBase, vocabName);
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Processing: ${file}`);
    console.log(`   Type: ${type}`);
    console.log(`   Output: ${outDir}`);
    console.log(`${'='.repeat(60)}`);
    
    try {
      await processFileWithLoadedProfile(shaclConfig, profileConfig, fieldOrderProfile, sourcePath, type, outDir, backgroundDir);
      results.processed++;
    } catch (err) {
      console.error(`❌ Error processing ${file}: ${err.message}`);
      results.errors.push({ file, error: err.message });
    }
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 Batch Processing Summary:');
  console.log(`   Files processed: ${results.processed}/${matchingFiles.length}`);
  if (results.errors.length > 0) {
    console.log(`   Errors: ${results.errors.length}`);
    for (const { file, error } of results.errors) {
      console.log(`     - ${file}: ${error}`);
    }
  }
  console.log(`${'='.repeat(60)}\n`);
  
  return results;
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
        console.warn(`  Warning: Could not parse ${file}: ${err.message}`);
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
 * Generate a CURIE from an IRI using the given prefixes
 */
function iriToCurie(iri, prefixes = PREFIXES) {
  for (const [prefix, ns] of Object.entries(prefixes)) {
    if (iri.startsWith(ns)) {
      return `${prefix}:${iri.substring(ns.length)}`;
    }
  }
  // If no prefix matches, generate one from the namespace
  const hashIndex = iri.lastIndexOf('#');
  const slashIndex = iri.lastIndexOf('/');
  const index = Math.max(hashIndex, slashIndex);
  if (index >= 0) {
    const ns = iri.substring(0, index + 1);
    const local = iri.substring(index + 1);
    // Generate a prefix from the namespace (e.g., ns1, ns2, etc.)
    const nsNum = Object.keys(prefixes).filter(p => p.startsWith('ns')).length + 1;
    return `ns${nsNum}:${local}`;
  }
  return iri;
}

/**
 * Get a label for an IRI from background store (for prez:label)
 */
function getLabelFromBackground(iri, backgroundStore) {
  // Priority order for labels
  for (const pred of LABEL_SOURCE_PREDICATES) {
    const quads = backgroundStore.getQuads(iri, pred, null, null);
    if (quads.length > 0) {
      return quads[0].object;
    }
  }
  // Also check rdfs:label
  const rdfsQuads = backgroundStore.getQuads(iri, `${RDFS}label`, null, null);
  if (rdfsQuads.length > 0) {
    return rdfsQuads[0].object;
  }
  // Check if background already has prez:label
  const prezLabelQuads = backgroundStore.getQuads(iri, PREZ_LABEL, null, null);
  if (prezLabelQuads.length > 0) {
    return prezLabelQuads[0].object;
  }
  return null;
}

/**
 * Get a description for an IRI from background store (for prez:description)
 */
function getDescriptionFromBackground(iri, backgroundStore) {
  // Priority order for descriptions
  for (const pred of DESCRIPTION_SOURCE_PREDICATES) {
    const quads = backgroundStore.getQuads(iri, pred, null, null);
    if (quads.length > 0) {
      // Return all descriptions (may have multiple)
      return quads.map(q => q.object);
    }
  }
  // Check if background already has prez:description
  const prezDescQuads = backgroundStore.getQuads(iri, PREZ_DESCRIPTION, null, null);
  if (prezDescQuads.length > 0) {
    return prezDescQuads.map(q => q.object);
  }
  return [];
}

/**
 * Add prez annotations for an IRI to the annotated store
 */
function addPrezAnnotationsForIri(iri, annotatedStore, backgroundStore) {
  // Add prez:label
  const label = getLabelFromBackground(iri, backgroundStore);
  if (label) {
    annotatedStore.addQuad(quad(namedNode(iri), namedNode(PREZ_LABEL), label));
  }
  
  // Add prez:description
  const descriptions = getDescriptionFromBackground(iri, backgroundStore);
  for (const desc of descriptions) {
    annotatedStore.addQuad(quad(namedNode(iri), namedNode(PREZ_DESCRIPTION), desc));
  }
}

/**
 * Collect all IRIs referenced in the source store that need labels
 */
function collectRequiredIRIs(sourceStore) {
  const iris = new Set();

  for (const quad of sourceStore.getQuads(null, null, null, null)) {
    if (quad.predicate.termType === 'NamedNode') {
      iris.add(quad.predicate.value);
    }
    if (quad.object.termType === 'NamedNode') {
      iris.add(quad.object.value);
    }
  }

  // Also collect IRIs reachable through blank nodes
  const blankNodePredicates = [`${PROV}agent`, `${PROV}hadRole`];
  for (const pred of blankNodePredicates) {
    for (const quad of sourceStore.getQuads(null, pred, null, null)) {
      if (quad.object.termType === 'NamedNode') {
        iris.add(quad.object.value);
      }
    }
  }

  return iris;
}

/**
 * Collect IRIs referenced only by the ConceptScheme
 */
function collectSchemeRequiredIRIs(sourceStore, schemeIri) {
  const iris = new Set();
  const visitedBnodes = new Set();

  const processQuads = (quads) => {
    for (const q of quads) {
      if (q.predicate.termType === 'NamedNode') {
        iris.add(q.predicate.value);
      }
      if (q.object.termType === 'NamedNode') {
        iris.add(q.object.value);
      }
      // Also collect datatype IRIs from literals
      if (q.object.termType === 'Literal' && q.object.datatype) {
        const datatypeIri = q.object.datatype.value;
        // Only collect non-standard datatypes (xsd:string and rdf:langString are implicit)
        if (datatypeIri !== `${XSD}string` && datatypeIri !== `${RDF}langString`) {
          iris.add(datatypeIri);
        }
      }
      if (q.object.termType === 'BlankNode' && !visitedBnodes.has(q.object.value)) {
        visitedBnodes.add(q.object.value);
        processQuads(sourceStore.getQuads(q.object, null, null, null));
      }
    }
  };

  processQuads(sourceStore.getQuads(namedNode(schemeIri), null, null, null));
  iris.add(`${SKOS}ConceptScheme`);

  return iris;
}

/**
 * Create annotated store for ConceptScheme view with full Prez predicates
 * 
 * Prez predicates generated:
 * - prez:label - from skos:prefLabel, dcterms:title, rdfs:label, sdo:name
 * - prez:description - from skos:definition, dcterms:description, sdo:description
 * - prez:provenance - from dcterms:provenance
 * - prez:identifier - CURIE form of IRI
 * - prez:link - internal API link path
 * - prez:members - link to members endpoint (for ConceptScheme)
 * - prez:type prez:FocusNode - marks the main focus node
 * - prez:currentProfile - blank node with current profile
 */
function createAnnotatedSchemeStore(sourceStore, backgroundStore, schemeIri, topConceptCount, config = {}) {
  const annotated = new Store();
  const { catalogId, catalogIri, profileIri } = config;
  
  // Build dynamic prefixes from source data
  const dynamicPrefixes = { ...PREFIXES };
  
  // Extract prefixes from schemeIri namespace
  const schemeNsMatch = schemeIri.match(/^(.*[/#])/);
  if (schemeNsMatch) {
    const schemeNs = schemeNsMatch[1];
    // Check if we already have this namespace
    const existingPrefix = Object.entries(dynamicPrefixes).find(([_, ns]) => ns === schemeNs);
    if (!existingPrefix) {
      // Generate a prefix based on path
      const pathParts = schemeNs.replace(/[/#]$/, '').split('/');
      const lastPart = pathParts[pathParts.length - 1];
      if (lastPart && !dynamicPrefixes[lastPart]) {
        dynamicPrefixes['ns4'] = schemeNs;
      }
    }
  }

  // Add all source quads for the scheme (except hasTopConcept)
  const addSchemeQuads = (subjectTerm) => {
    for (const q of sourceStore.getQuads(subjectTerm, null, null, null)) {
      if (q.predicate.value === `${SKOS}hasTopConcept`) {
        continue;
      }
      annotated.addQuad(q);
      if (q.object.termType === 'BlankNode') {
        addSchemeQuads(q.object);
      }
    }
  };
  addSchemeQuads(namedNode(schemeIri));

  // Generate prez:identifier (CURIE)
  const schemeCurie = iriToCurie(schemeIri, dynamicPrefixes);
  annotated.addQuad(quad(
    namedNode(schemeIri),
    namedNode(PREZ_IDENTIFIER),
    literal(schemeCurie)
  ));

  // Generate prez:link
  if (catalogId) {
    const linkPath = `/catalogs/${catalogId}/collections/${schemeCurie}`;
    annotated.addQuad(quad(
      namedNode(schemeIri),
      namedNode(PREZ_LINK),
      literal(linkPath)
    ));
    
    // Generate prez:members for ConceptScheme
    const membersPath = `${linkPath}/items`;
    annotated.addQuad(quad(
      namedNode(schemeIri),
      namedNode(PREZ_MEMBERS),
      literal(membersPath)
    ));
  }

  // Generate prez:type prez:FocusNode
  annotated.addQuad(quad(
    namedNode(schemeIri),
    namedNode(PREZ_TYPE),
    namedNode(PREZ_FOCUS_NODE)
  ));

  // Generate prez:label from skos:prefLabel or dcterms:title
  for (const pred of LABEL_SOURCE_PREDICATES) {
    const labelQuads = sourceStore.getQuads(schemeIri, pred, null, null);
    if (labelQuads.length > 0) {
      annotated.addQuad(quad(
        namedNode(schemeIri),
        namedNode(PREZ_LABEL),
        labelQuads[0].object
      ));
      break;
    }
  }

  // Generate prez:description from skos:definition or dcterms:description
  for (const pred of DESCRIPTION_SOURCE_PREDICATES) {
    const descQuads = sourceStore.getQuads(schemeIri, pred, null, null);
    if (descQuads.length > 0) {
      annotated.addQuad(quad(
        namedNode(schemeIri),
        namedNode(PREZ_DESCRIPTION),
        descQuads[0].object
      ));
      break;
    }
  }

  // Generate prez:provenance from dcterms:provenance
  const provQuads = sourceStore.getQuads(schemeIri, `${DCTERMS}provenance`, null, null);
  for (const pq of provQuads) {
    annotated.addQuad(quad(
      namedNode(schemeIri),
      namedNode(PREZ_PROVENANCE),
      pq.object
    ));
  }

  // Add catalog annotation if catalogIri is provided
  if (catalogIri && catalogId) {
    // Get catalog label/description from background
    const catalogLabel = getLabelFromBackground(catalogIri, backgroundStore);
    if (catalogLabel) {
      annotated.addQuad(quad(namedNode(catalogIri), namedNode(PREZ_LABEL), catalogLabel));
    }
    const catalogDescs = getDescriptionFromBackground(catalogIri, backgroundStore);
    for (const desc of catalogDescs) {
      annotated.addQuad(quad(namedNode(catalogIri), namedNode(PREZ_DESCRIPTION), desc));
    }
    annotated.addQuad(quad(
      namedNode(catalogIri),
      namedNode(PREZ_IDENTIFIER),
      literal(catalogId)
    ));
  }

  // Add prez:currentProfile as blank node
  if (profileIri) {
    const profileBnode = DataFactory.blankNode();
    annotated.addQuad(quad(
      profileBnode,
      namedNode(PREZ_CURRENT_PROFILE),
      namedNode(profileIri)
    ));
    
    // Add profile label/description from background
    addPrezAnnotationsForIri(profileIri, annotated, backgroundStore);
  }

  // Add prez:link and prez:members annotations
  annotated.addQuad(quad(namedNode(PREZ_LINK), namedNode(PREZ_LABEL), literal('link')));
  annotated.addQuad(quad(namedNode(PREZ_MEMBERS), namedNode(PREZ_LABEL), literal('members')));

  // Collect all IRIs that need prez annotations
  const requiredIRIs = collectSchemeRequiredIRIs(sourceStore, schemeIri);

  // Add prez annotations (prez:label, prez:description) for all referenced IRIs
  for (const iri of requiredIRIs) {
    addPrezAnnotationsForIri(iri, annotated, backgroundStore);
  }

  return annotated;
}

/**
 * Create an annotated store for a SKOS Concept with prez predicates
 * 
 * Generates:
 * - prez:label - from skos:prefLabel, dcterms:title, rdfs:label, sdo:name
 * - prez:description - from skos:definition, dcterms:description, sdo:description
 * - prez:identifier - CURIE form of IRI
 * - prez:link - internal API link path
 * - prez:type prez:FocusNode - marks the main focus node
 * - prez:currentProfile - blank node with current profile
 */
function createAnnotatedConceptStore(sourceStore, backgroundStore, conceptIri, schemeIri, config = {}) {
  const annotated = new Store();
  const { catalogId, catalogIri, profileIri, prefixes: configPrefixes } = config;
  
  // Build dynamic prefixes
  const dynamicPrefixes = configPrefixes ? { ...PREFIXES, ...configPrefixes } : { ...PREFIXES };
  
  // Generate CURIE for the concept
  const conceptCurie = iriToCurie(conceptIri, dynamicPrefixes);
  const schemeCurie = iriToCurie(schemeIri, dynamicPrefixes);
  
  // Copy all source quads for the concept
  for (const sourceQuad of sourceStore.getQuads(conceptIri, null, null, null)) {
    annotated.addQuad(sourceQuad);
  }
  
  // Generate prez:identifier
  annotated.addQuad(quad(
    namedNode(conceptIri),
    namedNode(PREZ_IDENTIFIER),
    literal(conceptCurie)
  ));
  
  // Generate prez:link
  if (catalogId && schemeCurie) {
    const linkPath = `/catalogs/${catalogId}/collections/${schemeCurie}/items/${conceptCurie}`;
    annotated.addQuad(quad(
      namedNode(conceptIri),
      namedNode(PREZ_LINK),
      literal(linkPath)
    ));
  }
  
  // Generate prez:type prez:FocusNode
  annotated.addQuad(quad(
    namedNode(conceptIri),
    namedNode(PREZ_TYPE),
    namedNode(PREZ_FOCUS_NODE)
  ));
  
  // Generate prez:label from source
  for (const pred of LABEL_SOURCE_PREDICATES) {
    const labelQuads = sourceStore.getQuads(conceptIri, pred, null, null);
    if (labelQuads.length > 0) {
      annotated.addQuad(quad(
        namedNode(conceptIri),
        namedNode(PREZ_LABEL),
        labelQuads[0].object
      ));
      break;
    }
  }
  
  // Generate prez:description from source
  for (const pred of DESCRIPTION_SOURCE_PREDICATES) {
    const descQuads = sourceStore.getQuads(conceptIri, pred, null, null);
    if (descQuads.length > 0) {
      annotated.addQuad(quad(
        namedNode(conceptIri),
        namedNode(PREZ_DESCRIPTION),
        descQuads[0].object
      ));
      break;
    }
  }
  
  // Add catalog annotation
  if (catalogIri && catalogId) {
    const catalogLabel = getLabelFromBackground(catalogIri, backgroundStore);
    const catalogDescs = getDescriptionFromBackground(catalogIri, backgroundStore);
    
    if (catalogLabel) {
      // catalogLabel is already an RDF term, use directly
      annotated.addQuad(quad(namedNode(catalogIri), namedNode(PREZ_LABEL), catalogLabel));
    }
    for (const desc of catalogDescs) {
      annotated.addQuad(quad(namedNode(catalogIri), namedNode(PREZ_DESCRIPTION), desc));
    }
    annotated.addQuad(quad(
      namedNode(catalogIri),
      namedNode(PREZ_IDENTIFIER),
      literal(catalogId)
    ));
  }
  
  // Add prez:currentProfile as blank node
  if (profileIri) {
    const profileBnode = DataFactory.blankNode();
    annotated.addQuad(quad(
      profileBnode,
      namedNode(PREZ_CURRENT_PROFILE),
      namedNode(profileIri)
    ));
    addPrezAnnotationsForIri(profileIri, annotated, backgroundStore);
  }
  
  // Add prez:link annotation
  annotated.addQuad(quad(namedNode(PREZ_LINK), namedNode(PREZ_LABEL), literal('link')));
  annotated.addQuad(quad(namedNode(PREZ_MEMBERS), namedNode(PREZ_LABEL), literal('members')));
  
  // Add annotations for the parent scheme
  if (schemeIri) {
    // Try background first (returns RDF term), then source (returns string)
    const schemeLabelTerm = getLabelFromBackground(schemeIri, backgroundStore);
    const schemeDescTerms = getDescriptionFromBackground(schemeIri, backgroundStore);
    const schemeProvenance = getFirstObjectValue(sourceStore, schemeIri, [`${DCTERMS}provenance`]);
    
    if (schemeLabelTerm) {
      annotated.addQuad(quad(namedNode(schemeIri), namedNode(PREZ_LABEL), schemeLabelTerm));
    } else {
      const schemeLabelStr = getFirstObjectValue(sourceStore, schemeIri, LABEL_SOURCE_PREDICATES);
      if (schemeLabelStr) {
        annotated.addQuad(quad(namedNode(schemeIri), namedNode(PREZ_LABEL), literal(schemeLabelStr, 'en')));
      }
    }
    
    if (schemeDescTerms.length > 0) {
      for (const desc of schemeDescTerms) {
        annotated.addQuad(quad(namedNode(schemeIri), namedNode(PREZ_DESCRIPTION), desc));
      }
    } else {
      const schemeDescStr = getFirstObjectValue(sourceStore, schemeIri, DESCRIPTION_SOURCE_PREDICATES);
      if (schemeDescStr) {
        annotated.addQuad(quad(namedNode(schemeIri), namedNode(PREZ_DESCRIPTION), literal(schemeDescStr, 'en')));
      }
    }
    
    if (schemeProvenance) {
      annotated.addQuad(quad(namedNode(schemeIri), namedNode(PREZ_PROVENANCE), literal(schemeProvenance, 'en')));
    }
    annotated.addQuad(quad(namedNode(schemeIri), namedNode(PREZ_IDENTIFIER), literal(schemeCurie)));
    
    // Add scheme link and members
    if (catalogId) {
      const schemeLinkPath = `/catalogs/${catalogId}/collections/${schemeCurie}`;
      annotated.addQuad(quad(namedNode(schemeIri), namedNode(PREZ_LINK), literal(schemeLinkPath)));
      annotated.addQuad(quad(namedNode(schemeIri), namedNode(PREZ_MEMBERS), literal(`${schemeLinkPath}/items`)));
    }
  }
  
  // Add annotations for narrower concepts
  const narrowerQuads = sourceStore.getQuads(conceptIri, `${SKOS}narrower`, null, null);
  for (const nq of narrowerQuads) {
    const narrowerIri = nq.object.value;
    const narrowerCurie = iriToCurie(narrowerIri, dynamicPrefixes);
    
    // Look up label from background (RDF term) or source (string)
    const narrowerLabelTerm = getLabelFromBackground(narrowerIri, backgroundStore);
    const narrowerDescTerms = getDescriptionFromBackground(narrowerIri, backgroundStore);
    
    if (narrowerLabelTerm) {
      annotated.addQuad(quad(namedNode(narrowerIri), namedNode(PREZ_LABEL), narrowerLabelTerm));
    } else {
      const narrowerLabelStr = getFirstObjectValue(sourceStore, narrowerIri, LABEL_SOURCE_PREDICATES);
      if (narrowerLabelStr) {
        annotated.addQuad(quad(namedNode(narrowerIri), namedNode(PREZ_LABEL), literal(narrowerLabelStr, 'en')));
      }
    }
    
    if (narrowerDescTerms.length > 0) {
      for (const desc of narrowerDescTerms) {
        annotated.addQuad(quad(namedNode(narrowerIri), namedNode(PREZ_DESCRIPTION), desc));
      }
    } else {
      const narrowerDescStr = getFirstObjectValue(sourceStore, narrowerIri, DESCRIPTION_SOURCE_PREDICATES);
      if (narrowerDescStr) {
        annotated.addQuad(quad(namedNode(narrowerIri), namedNode(PREZ_DESCRIPTION), literal(narrowerDescStr, 'en')));
      }
    }
    
    annotated.addQuad(quad(namedNode(narrowerIri), namedNode(PREZ_IDENTIFIER), literal(narrowerCurie)));
    
    // Add link for narrower
    if (catalogId && schemeCurie) {
      const narrowerLinkPath = `/catalogs/${catalogId}/collections/${schemeCurie}/items/${narrowerCurie}`;
      annotated.addQuad(quad(namedNode(narrowerIri), namedNode(PREZ_LINK), literal(narrowerLinkPath)));
    }
  }
  
  // Collect and annotate all referenced IRIs
  const requiredIRIs = collectConceptRequiredIRIs(sourceStore, conceptIri);
  for (const iri of requiredIRIs) {
    addPrezAnnotationsForIri(iri, annotated, backgroundStore);
  }
  
  return annotated;
}

/**
 * Helper to get first value from a set of predicates
 */
function getFirstObjectValue(store, subject, predicates) {
  for (const pred of predicates) {
    const quads = store.getQuads(subject, pred, null, null);
    if (quads.length > 0) {
      return quads[0].object.value;
    }
  }
  return null;
}

function getFirstObjectTerm(store, subject, predicates) {
  for (const pred of predicates) {
    const quads = store.getQuads(subject, pred, null, null);
    if (quads.length > 0) {
      return quads[0].object;
    }
  }
  return null;
}

/**
 * Collect IRIs that need prez annotations for a concept
 */
function collectConceptRequiredIRIs(sourceStore, conceptIri) {
  const required = new Set();
  
  for (const q of sourceStore.getQuads(conceptIri, null, null, null)) {
    // Add predicate IRIs
    required.add(q.predicate.value);
    
    // Add IRI objects
    if (q.object.termType === 'NamedNode') {
      required.add(q.object.value);
    }
    
    // Add datatype IRIs
    if (q.object.termType === 'Literal' && q.object.datatype) {
      const dt = q.object.datatype.value;
      if (dt !== `${XSD}string` && dt !== `${RDF}langString`) {
        required.add(dt);
      }
    }
  }
  
  return required;
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
 * Create simplified graph
 */
function createSimplifiedGraph(sourceStore) {
  const simplified = new Store();

  const schemeQuads = sourceStore.getQuads(null, `${RDF}type`, `${SKOS}ConceptScheme`, null);
  const schemeIri = schemeQuads.length > 0 ? schemeQuads[0].subject.value : null;

  if (schemeIri) {
    for (const quad of sourceStore.getQuads(schemeIri, null, null, null)) {
      simplified.addQuad(quad);
      if (quad.object.termType === 'BlankNode') {
        for (const bnQuad of sourceStore.getQuads(quad.object, null, null, null)) {
          simplified.addQuad(bnQuad);
        }
      }
    }
  }

  return simplified;
}

/**
 * Extract concepts with labels from store for list exports
 * @param {Store} sourceStore - The RDF store containing concepts
 * @param {string} [schemeIri] - Optional scheme IRI to include in each concept
 * @param {string} [schemeLabel] - Optional scheme label to include in each concept
 */
function extractConceptsForList(sourceStore, schemeIri = null, schemeLabel = null) {
  const concepts = [];
  const conceptQuads = sourceStore.getQuads(null, `${RDF}type`, `${SKOS}Concept`, null);
  const seenIris = new Set();

  for (const q of conceptQuads) {
    const iri = q.subject.value;
    if (seenIris.has(iri)) continue;
    seenIris.add(iri);

    // prefLabel
    const prefLabelQuads = sourceStore.getQuads(iri, `${SKOS}prefLabel`, null, null);
    let prefLabel = '';
    for (const plq of prefLabelQuads) {
      if (plq.object.termType === 'Literal') {
        prefLabel = plq.object.value;
        break;
      }
    }

    // altLabels (collect all)
    const altLabelQuads = sourceStore.getQuads(iri, `${SKOS}altLabel`, null, null);
    const altLabels = altLabelQuads
      .filter(alq => alq.object.termType === 'Literal')
      .map(alq => alq.object.value);

    // definition
    const defQuads = sourceStore.getQuads(iri, `${SKOS}definition`, null, null);
    let definition = null;
    for (const dq of defQuads) {
      if (dq.object.termType === 'Literal') {
        definition = dq.object.value;
        break;
      }
    }

    // notation
    const notationQuads = sourceStore.getQuads(iri, `${SKOS}notation`, null, null);
    let notation = null;
    for (const nq of notationQuads) {
      if (nq.object.termType === 'Literal') {
        notation = nq.object.value;
        break;
      }
    }

    // broader
    const broaderQuads = sourceStore.getQuads(iri, `${SKOS}broader`, null, null);
    let broader = null;
    for (const bq of broaderQuads) {
      if (bq.object.termType === 'NamedNode') {
        broader = bq.object.value;
        break;
      }
    }

    const concept = { iri, prefLabel, broader };
    if (altLabels.length > 0) concept.altLabels = altLabels;
    if (definition) concept.definition = definition;
    if (notation) concept.notation = notation;
    if (schemeIri) concept.scheme = schemeIri;
    if (schemeLabel) concept.schemeLabel = schemeLabel;

    concepts.push(concept);
  }

  concepts.sort((a, b) => a.prefLabel.localeCompare(b.prefLabel));
  return concepts;
}

/**
 * Generate JSON-LD from store
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

function profileAllowsFormat(config, mediaType) {
  const formats = config?.profileConfig?.currentProfile?.formats;
  if (!Array.isArray(formats) || formats.length === 0) return true;
  return formats.includes(mediaType);
}

/**
 * Generate list JSON with context
 * Includes additional fields for search: altLabels, definition, notation, scheme
 */
function generateListJSON(concepts) {
  return {
    '@context': {
      iri: '@id',
      prefLabel: `${SKOS}prefLabel`,
      altLabels: `${SKOS}altLabel`,
      definition: `${SKOS}definition`,
      notation: `${SKOS}notation`,
      broader: `${SKOS}broader`,
      scheme: `${SKOS}inScheme`,
      schemeLabel: `${PREZ}schemeLabel`,
    },
    '@graph': concepts.map(c => {
      const entry = {
        iri: c.iri,
        prefLabel: c.prefLabel,
      };
      if (c.altLabels?.length > 0) entry.altLabels = c.altLabels;
      if (c.definition) entry.definition = c.definition;
      if (c.notation) entry.notation = c.notation;
      if (c.broader) entry.broader = c.broader;
      if (c.scheme) entry.scheme = c.scheme;
      if (c.schemeLabel) entry.schemeLabel = c.schemeLabel;
      return entry;
    }),
  };
}

function generateCatalogListJSON(items) {
  return {
    '@context': {
      iri: '@id',
      label: `${PREZ}label`,
      link: `${PREZ}link`,
    },
    '@graph': items.map(i => ({
      iri: i.iri,
      label: i.label,
      link: i.link,
    })),
  };
}

/**
 * Generate list CSV
 */
async function generateListCSV(concepts) {
  return new Promise((resolve, reject) => {
    let output = '';
    const writable = new Writable({
      write(chunk, _encoding, callback) {
        output += chunk.toString();
        callback();
      },
    });

    const csvStream = csvFormat({ headers: ['iri', 'broader', 'prefLabel'] });
    csvStream.pipe(writable);

    for (const concept of concepts) {
      csvStream.write({
        iri: concept.iri,
        broader: concept.broader || '',
        prefLabel: concept.prefLabel,
      });
    }

    csvStream.end();
    writable.on('finish', () => resolve(output));
    writable.on('error', reject);
  });
}

async function generateCatalogListCSV(items) {
  return new Promise((resolve, reject) => {
    let output = '';
    const writable = new Writable({
      write(chunk, _encoding, callback) {
        output += chunk.toString();
        callback();
      },
    });

    const csvStream = csvFormat({ headers: ['iri', 'label', 'link'] });
    csvStream.pipe(writable);

    for (const item of items) {
      csvStream.write({
        iri: item.iri,
        label: item.label || '',
        link: item.link || '',
      });
    }

    csvStream.end();
    writable.on('finish', () => resolve(output));
    writable.on('error', reject);
  });
}

/**
 * Get literal value from store
 */
function getLiteral(store, subject, predicate, preferredLang = 'en') {
  const quads = store.getQuads(subject, predicate, null, null);
  const literals = quads.filter(q => q.object.termType === 'Literal');

  const preferred = literals.find(q => q.object.language === preferredLang);
  if (preferred) return preferred.object.value;

  const noLang = literals.find(q => !q.object.language);
  if (noLang) return noLang.object.value;

  return literals[0]?.object.value || null;
}

/**
 * Get all literal values from store for a predicate
 */
function getAllLiterals(store, subject, predicate) {
  const quads = store.getQuads(subject, predicate, null, null);
  return quads
    .filter(q => q.object.termType === 'Literal')
    .map(q => q.object.value);
}

/**
 * Get IRI values from store
 */
function getIRIs(store, subject, predicate) {
  return store.getQuads(subject, predicate, null, null)
    .filter(q => q.object.termType === 'NamedNode')
    .map(q => q.object.value);
}

/**
 * Extract qualified attributions from store (blank node structures)
 */
function extractQualifiedAttributions(store, schemeIri) {
  const attributions = [];
  const attrQuads = store.getQuads(schemeIri, `${PROV}qualifiedAttribution`, null, null);

  for (const attrQuad of attrQuads) {
    if (attrQuad.object.termType === 'BlankNode') {
      const bnode = attrQuad.object;

      const agentQuads = store.getQuads(bnode, `${PROV}agent`, null, null);
      const agentIri = agentQuads.length > 0 && agentQuads[0].object.termType === 'NamedNode'
        ? agentQuads[0].object.value
        : null;

      const roleQuads = store.getQuads(bnode, `${PROV}hadRole`, null, null);
      const roleIri = roleQuads.length > 0 && roleQuads[0].object.termType === 'NamedNode'
        ? roleQuads[0].object.value
        : null;

      if (agentIri) {
        attributions.push({ agentIri, roleIri });
      }
    }
  }

  return attributions;
}

/**
 * Collect all predicates used on a subject
 */
function collectPredicates(store, subject) {
  const predicates = new Set();
  for (const q of store.getQuads(subject, null, null, null)) {
    predicates.add(q.predicate.value);
  }
  return predicates;
}

// List column header labels for concept table (path -> display label)
const LIST_COLUMN_LABELS = { prefLabel: 'Label', iri: 'IRI', broader: 'Broader' };

/**
 * Generate HTML page with generic property handling
 * Renders ordered properties first, then any "leftover" properties.
 * If profile is provided, uses profile.conceptScheme.propertyOrder and profile.list.propertyOrder; else object order.
 */
function generateHTML(annotatedStore, sourceStore, concepts, profile) {
  const schemeQuads = sourceStore.getQuads(null, `${RDF}type`, `${SKOS}ConceptScheme`, null);
  if (schemeQuads.length === 0) {
    throw new Error('No ConceptScheme found in source store');
  }
  const schemeIri = schemeQuads[0].subject.value;

  const title = getLiteral(sourceStore, schemeIri, `${SKOS}prefLabel`) || 'Vocabulary';

  // External link SVG icon
  const externalLinkIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="external-link-icon"><path d="M15 3h6v6"></path><path d="M10 14 21 3"></path><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path></svg>`;

  // Get label for a predicate IRI from the annotated store
  const getPredicateLabel = (predicateIri, fallback) =>
    getLiteral(annotatedStore, predicateIri, PREZ_LABEL) || fallback;

  // Get description for a predicate IRI from the annotated store (for tooltips)
  const getPredicateDescription = (predicateIri) =>
    getLiteral(annotatedStore, predicateIri, PREZ_DESCRIPTION) || '';

  // Resolve label for an object IRI
  const resolveLabel = (iri) =>
    getLiteral(annotatedStore, iri, PREZ_LABEL) ||
    getLiteral(annotatedStore, iri, `${RDFS}label`) ||
    getLiteral(annotatedStore, iri, `${SCHEMA}name`) ||
    getLiteral(annotatedStore, iri, `${SKOS}prefLabel`) ||
    localName(iri);

  // Resolve description for an object IRI (for tooltips)
  const resolveDescription = (iri) =>
    getLiteral(annotatedStore, iri, PREZ_DESCRIPTION) || '';

  // Helper to create a property row header with label, link icon and tooltip
  const createPropertyHeader = (predicateIri, fallbackLabel) => {
    const label = getPredicateLabel(predicateIri, fallbackLabel);
    const desc = getPredicateDescription(predicateIri);
    const titleAttr = desc ? ` title="${escapeHtml(desc)}"` : '';
    return `<span class="property-label">${escapeHtml(label)}</span><a href="${escapeHtml(predicateIri)}"${titleAttr} target="_blank" rel="noopener noreferrer" class="property-link">${externalLinkIcon}</a>`;
  };

  // Helper to create an object link with external icon and tooltip
  const createObjectLink = (iri) => {
    const label = resolveLabel(iri);
    const desc = resolveDescription(iri);
    const titleAttr = desc ? ` title="${escapeHtml(desc)}"` : '';
    return `<span class="object-link"><a href="${escapeHtml(iri)}"${titleAttr} target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a> <a href="${escapeHtml(iri)}"${titleAttr} target="_blank" rel="noopener noreferrer" class="external-icon">${externalLinkIcon}</a></span>`;
  };

  // Collect all predicates used
  const allPredicates = collectPredicates(sourceStore, schemeIri);
  const predicateToConfig = new Map(HTML_PROPERTY_ORDER.map(p => [p.predicate, p]));

  // Order for scheme metadata: profile.conceptScheme.propertyOrder or HTML_PROPERTY_ORDER
  const schemeOrderEntries = profile?.conceptScheme?.propertyOrder?.length
    ? profile.conceptScheme.propertyOrder.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    : HTML_PROPERTY_ORDER.map(p => ({ path: p.predicate, order: 0 }));
  const schemeOrderPaths = schemeOrderEntries.map(p => (typeof p === 'object' ? p.path : p));
  const schemeEntryByPath = new Map(schemeOrderEntries.map(e => [e.path, e]));

  // Build property rows in profile order (or HTML_PROPERTY_ORDER), then leftovers
  const propertyRows = [];
  const orderedRendered = new Set();

  for (const predicate of schemeOrderPaths) {
    if (!allPredicates.has(predicate)) continue;
    const propConfig = predicateToConfig.get(predicate);
    const profileEntry = schemeEntryByPath.get(predicate);
    if (propConfig) {
      if (propConfig.type === 'literal') {
        const value = getLiteral(sourceStore, schemeIri, predicate);
        if (value) {
          propertyRows.push(`<tr><th>${createPropertyHeader(predicate, propConfig.label)}</th><td>${escapeHtml(value)}</td></tr>`);
          orderedRendered.add(predicate);
        }
      } else if (propConfig.type === 'iri') {
        const iris = getIRIs(sourceStore, schemeIri, predicate);
        if (iris.length > 0) {
          const links = iris.map(iri => createObjectLink(iri)).join(', ');
          propertyRows.push(`<tr><th>${createPropertyHeader(predicate, propConfig.label)}</th><td>${links}</td></tr>`);
          orderedRendered.add(predicate);
        }
      } else if (propConfig.type === 'attribution') {
        const attributions = extractQualifiedAttributions(sourceStore, schemeIri);
        if (attributions.length > 0) {
          const nestedOrder = profileEntry?.propertyOrder && Array.isArray(profileEntry.propertyOrder)
            ? profileEntry.propertyOrder.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
            : [{ path: `${PROV}agent`, order: 0 }, { path: `${PROV}hadRole`, order: 1 }];
          const nestedLabels = { [`${PROV}agent`]: 'Agent', [`${PROV}hadRole`]: 'Role' };
          const attrHtml = attributions.map(attr => {
            const rows = nestedOrder.map(({ path }) => {
              const label = nestedLabels[path] ?? getPredicateLabel(path, localName(path));
              const value = path === `${PROV}agent` ? attr.agentIri : path === `${PROV}hadRole` ? attr.roleIri : null;
              if (!value) return '';
              return `<tr><th style="width: 100px;">${escapeHtml(label)}</th><td>${createObjectLink(value)}</td></tr>`;
            }).filter(Boolean).join('\n              ');
            return `
          <div class="box" style="margin-bottom: 0.5rem; padding: 0.75rem;">
            <table class="table is-narrow is-fullwidth" style="margin-bottom: 0;">
              ${rows}
            </table>
          </div>`;
          }).join('');
          propertyRows.push(`<tr><th>${createPropertyHeader(predicate, propConfig.label)}</th><td>${attrHtml}</td></tr>`);
          orderedRendered.add(predicate);
        }
      }
    }
  }

  // Then, render any "leftover" properties not in the ordered list
  for (const predicate of allPredicates) {
    if (SKIP_PROPERTIES.has(predicate) || orderedRendered.has(predicate)) continue;

    const quads = sourceStore.getQuads(schemeIri, predicate, null, null);
    const values = [];

    for (const q of quads) {
      if (q.object.termType === 'Literal') {
        values.push(escapeHtml(q.object.value));
      } else if (q.object.termType === 'NamedNode') {
        values.push(createObjectLink(q.object.value));
      }
    }

    if (values.length > 0) {
      propertyRows.push(`<tr><th>${createPropertyHeader(predicate, localName(predicate))}</th><td>${values.join(', ')}</td></tr>`);
    }
  }

  // Build HTML with dark mode
  const html = `<!DOCTYPE html>
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
    .table th, .table td { color: #eaeaea; border-color: #0f3460; background-color: #16213e; vertical-align: top; }
    .table th { white-space: nowrap; }
    .table thead th { color: #94a3b8; background-color: #0f3460; }
    .table.is-striped tbody tr:nth-child(odd) td { background-color: #16213e; }
    .table.is-striped tbody tr:nth-child(even) td { background-color: #1a1a2e; }
    .table.is-hoverable tbody tr:hover td { background-color: #0f3460 !important; }
    .title, .subtitle { color: #eaeaea; }
    a { color: #60a5fa; }
    a:hover { color: #93c5fd; }
    .concept-table { margin-top: 2rem; }
    .metadata-table th { width: 200px; }
    .iri-link { word-break: break-all; }
    .property-label { margin-right: 0.25rem; }
    .property-link { display: inline-flex; align-items: center; vertical-align: middle; }
    .external-link-icon { width: 14px; height: 14px; vertical-align: middle; }
    .object-link { display: inline-flex; align-items: center; gap: 0.25rem; }
    .external-icon { display: inline-flex; align-items: center; }
  </style>
</head>
<body>
  <section class="section">
    <div class="container">
      <h1 class="title">${escapeHtml(title)}</h1>
      <p class="subtitle">
        <a href="${escapeHtml(schemeIri)}" class="iri-link" target="_blank">${escapeHtml(schemeIri)}</a>
      </p>

      <div class="box">
        <h2 class="title is-4">Metadata</h2>
        <table class="table is-fullwidth metadata-table">
          <tbody>
            ${propertyRows.join('\n            ')}
          </tbody>
        </table>
      </div>

      <div class="box concept-table">
        <h2 class="title is-4">Concepts (${concepts.length})</h2>
        <table class="table is-fullwidth is-striped is-hoverable">
          <thead>
            <tr>
              ${(profile?.list?.propertyOrder ?? DEFAULT_LIST_ORDER).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map(p => `<th>${escapeHtml(LIST_COLUMN_LABELS[p.path] ?? p.path)}</th>`).join('\n              ')}
            </tr>
          </thead>
          <tbody>
            ${concepts.map(c => {
              const conceptDesc = resolveDescription(c.iri);
              const conceptTitleAttr = conceptDesc ? ` title="${escapeHtml(conceptDesc)}"` : '';
              const broaderDesc = c.broader ? resolveDescription(c.broader) : '';
              const broaderTitleAttr = broaderDesc ? ` title="${escapeHtml(broaderDesc)}"` : '';
              const listOrder = (profile?.list?.propertyOrder ?? DEFAULT_LIST_ORDER).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
              const cells = listOrder.map(p => {
                if (p.path === 'prefLabel') return escapeHtml(c.prefLabel);
                if (p.path === 'iri') return `<span class="object-link"><a href="${escapeHtml(c.iri)}" class="iri-link"${conceptTitleAttr} target="_blank">${escapeHtml(localName(c.iri))}</a> <a href="${escapeHtml(c.iri)}"${conceptTitleAttr} target="_blank" rel="noopener noreferrer" class="external-icon">${externalLinkIcon}</a></span>`;
                if (p.path === 'broader') return c.broader ? `<span class="object-link"><a href="${escapeHtml(c.broader)}" class="iri-link"${broaderTitleAttr} target="_blank">${escapeHtml(localName(c.broader))}</a> <a href="${escapeHtml(c.broader)}"${broaderTitleAttr} target="_blank" rel="noopener noreferrer" class="external-icon">${externalLinkIcon}</a></span>` : '-';
                return '-';
              });
              return `<tr>${cells.map(cell => `<td>${cell}</td>`).join('')}</tr>`;
            }).join('\n            ')}
          </tbody>
        </table>
      </div>
    </div>
  </section>
</body>
</html>`;

  return html;
}

function generateCatalogHTML(annotatedStore, sourceStore, items) {
  const catalogQuads = sourceStore.getQuads(null, `${RDF}type`, `${SCHEMA}DataCatalog`, null);
  const catalogIri = catalogQuads.length > 0 ? catalogQuads[0].subject.value : null;
  if (!catalogIri) {
    throw new Error('No schema:DataCatalog found in source store');
  }

  const title =
    getLiteral(sourceStore, catalogIri, `${SCHEMA}name`) ||
    getLiteral(sourceStore, catalogIri, `${DCTERMS}title`) ||
    getLiteral(sourceStore, catalogIri, `${RDFS}label`) ||
    localName(catalogIri) ||
    'Catalog';

  const resolveLabel = (iri) =>
    getLiteral(annotatedStore, iri, PREZ_LABEL) ||
    getLiteral(annotatedStore, iri, `${RDFS}label`) ||
    getLiteral(annotatedStore, iri, `${SCHEMA}name`) ||
    getLiteral(annotatedStore, iri, `${SKOS}prefLabel`) ||
    localName(iri);

  // Collect all predicates used
  const allPredicates = collectPredicates(sourceStore, catalogIri);

  // Build property rows (reuse ordered property config when possible)
  const propertyRows = [];
  for (const propConfig of HTML_PROPERTY_ORDER) {
    if (!allPredicates.has(propConfig.predicate)) continue;

    if (propConfig.type === 'literal') {
      const value = getLiteral(sourceStore, catalogIri, propConfig.predicate);
      if (value) {
        propertyRows.push(`<tr><th>${escapeHtml(propConfig.label)}</th><td>${escapeHtml(value)}</td></tr>`);
      }
    } else if (propConfig.type === 'iri') {
      const iris = getIRIs(sourceStore, catalogIri, propConfig.predicate);
      if (iris.length > 0) {
        const links = iris.map(iri =>
          `<a href="${escapeHtml(iri)}" target="_blank">${escapeHtml(resolveLabel(iri))}</a>`
        ).join(', ');
        propertyRows.push(`<tr><th>${escapeHtml(propConfig.label)}</th><td>${links}</td></tr>`);
      }
    }
  }

  const html = `<!DOCTYPE html>
<html lang="en" class="has-background-dark">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bulma@0.9.4/css/bulma.min.css">
  <style>
    html, body { background-color: #1a1a2e; color: #eaeaea; }
    .box { background-color: #16213e; border: 1px solid #0f3460; }
    .table { background-color: #16213e; color: #eaeaea; }
    .table th, .table td { color: #eaeaea; border-color: #0f3460; background-color: #16213e; }
    .table thead th { color: #94a3b8; background-color: #0f3460; }
    .table.is-striped tbody tr:nth-child(odd) td { background-color: #16213e; }
    .table.is-striped tbody tr:nth-child(even) td { background-color: #1a1a2e; }
    .table.is-hoverable tbody tr:hover td { background-color: #0f3460 !important; }
    .title, .subtitle { color: #eaeaea; }
    a { color: #60a5fa; }
    a:hover { color: #93c5fd; }
    .iri-link { word-break: break-all; }
  </style>
</head>
<body>
  <section class="section">
    <div class="container">
      <h1 class="title">${escapeHtml(title)}</h1>
      <p class="subtitle">
        <a href="${escapeHtml(catalogIri)}" class="iri-link" target="_blank">${escapeHtml(catalogIri)}</a>
      </p>

      ${propertyRows.length > 0 ? `
      <div class="box">
        <h2 class="title is-4">Metadata</h2>
        <table class="table is-fullwidth metadata-table">
          <tbody>
            ${propertyRows.join('\n            ')}
          </tbody>
        </table>
      </div>` : ''}

      <div class="box concept-table">
        <h2 class="title is-4">Vocabularies (${items.length})</h2>
        <table class="table is-fullwidth is-striped is-hoverable">
          <thead>
            <tr>
              <th>Label</th>
              <th>IRI</th>
              <th>API link</th>
            </tr>
          </thead>
          <tbody>
            ${items.map(i => `
            <tr>
              <td>${escapeHtml(i.label || localName(i.iri))}</td>
              <td><a href="${escapeHtml(i.iri)}" class="iri-link" target="_blank">${escapeHtml(i.iri)}</a></td>
              <td>${i.link ? `<code>${escapeHtml(i.link)}</code>` : '-'}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>
  </section>
</body>
</html>`;

  return html;
}

/**
 * Generate concept HTML from a single annotated store (e.g. parsed from anot-turtle).
 * Use this when the only asset available is the anot-ttl (or anot-ld-json) export.
 * @param {Store} store - Annotated store (has focus concept quads + prez:label/prez:description)
 * @param {string} [conceptIri] - Focus concept IRI; if omitted, inferred from prez:FocusNode
 * @param {string} [schemeIri] - Scheme IRI; if omitted, inferred from skos:inScheme or skos:topConceptOf
 * @returns {string} HTML
 */
function generateConceptHTMLFromAnotStore(store, conceptIri, schemeIri, profile) {
  if (!conceptIri) {
    const focusQuads = store.getQuads(null, namedNode(PREZ_TYPE), namedNode(PREZ_FOCUS_NODE), null);
    const conceptQuads = focusQuads.filter(q => {
      const typeQuads = store.getQuads(q.subject, namedNode(`${RDF}type`), namedNode(`${SKOS}Concept`), null);
      return typeQuads.length > 0;
    });
    if (conceptQuads.length === 0) throw new Error('No concept focus node found in store');
    conceptIri = conceptQuads[0].subject.value;
  }
  if (!schemeIri) {
    const inScheme = getIRIs(store, conceptIri, `${SKOS}inScheme`);
    const topOf = getIRIs(store, conceptIri, `${SKOS}topConceptOf`);
    schemeIri = inScheme[0] || topOf[0] || null;
  }
  return generateConceptHTML(store, store, conceptIri, schemeIri, profile);
}

/**
 * Generate vocab (scheme) HTML from a single annotated store (e.g. parsed from anot-turtle).
 * Use this when the only asset available is the anot-ttl export.
 * @param {Store} store - Annotated store (must include scheme quads + concept list + annotations)
 * @param {string} [schemeIri] - Scheme IRI; if omitted, inferred from prez:FocusNode
 * @returns {string} HTML
 */
function generateHTMLFromAnotStore(store, schemeIri, profile) {
  if (!schemeIri) {
    const focusQuads = store.getQuads(null, namedNode(PREZ_TYPE), namedNode(PREZ_FOCUS_NODE), null);
    const schemeQuads = focusQuads.filter(q => {
      const typeQuads = store.getQuads(q.subject, namedNode(`${RDF}type`), namedNode(`${SKOS}ConceptScheme`), null);
      return typeQuads.length > 0;
    });
    if (schemeQuads.length === 0) throw new Error('No concept scheme focus node found in store');
    schemeIri = schemeQuads[0].subject.value;
  }
  const concepts = extractConceptsForList(store);
  return generateHTML(store, store, concepts, profile);
}

/** Sort rows by profile.concept.propertyOrder (path order); if no profile, keep insertion order. */
function sortConceptRowsByProfile(rows, profile) {
  if (!profile?.concept?.propertyOrder?.length) return rows;
  const orderMap = new Map(profile.concept.propertyOrder.map((p, i) => [p.path, p.order ?? i]));
  return rows.slice().sort((a, b) => (orderMap.get(a.path) ?? 999) - (orderMap.get(b.path) ?? 999));
}

function generateConceptHTML(annotatedStore, sourceStore, conceptIri, schemeIri, profile) {
  const title =
    getLiteral(sourceStore, conceptIri, `${SKOS}prefLabel`) ||
    getLiteral(annotatedStore, conceptIri, PREZ_LABEL) ||
    localName(conceptIri) ||
    'Concept';

  // External link SVG icon
  const externalLinkIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="external-link-icon"><path d="M15 3h6v6"></path><path d="M10 14 21 3"></path><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path></svg>`;

  // Get label for a predicate IRI from the annotated store
  const getPredicateLabel = (predicateIri, fallback) =>
    getLiteral(annotatedStore, predicateIri, PREZ_LABEL) || fallback;

  // Get description for a predicate IRI from the annotated store (for tooltips)
  const getPredicateDescription = (predicateIri) =>
    getLiteral(annotatedStore, predicateIri, PREZ_DESCRIPTION) || '';

  // Resolve label for an object IRI
  const resolveLabel = (iri) =>
    getLiteral(annotatedStore, iri, PREZ_LABEL) ||
    getLiteral(annotatedStore, iri, `${RDFS}label`) ||
    getLiteral(annotatedStore, iri, `${SCHEMA}name`) ||
    getLiteral(annotatedStore, iri, `${SKOS}prefLabel`) ||
    localName(iri);

  // Resolve description for an object IRI (for tooltips)
  const resolveDescription = (iri) =>
    getLiteral(annotatedStore, iri, PREZ_DESCRIPTION) || '';

  // Helper to create a property row header with label, link icon and tooltip
  const createPropertyHeader = (predicateIri, fallbackLabel) => {
    const label = getPredicateLabel(predicateIri, fallbackLabel);
    const desc = getPredicateDescription(predicateIri);
    const titleAttr = desc ? ` title="${escapeHtml(desc)}"` : '';
    return `<span class="property-label">${escapeHtml(label)}</span><a href="${escapeHtml(predicateIri)}"${titleAttr} target="_blank" rel="noopener noreferrer" class="property-link">${externalLinkIcon}</a>`;
  };

  // Helper to create an object link with external icon and tooltip
  const createObjectLink = (iri) => {
    const label = resolveLabel(iri);
    const desc = resolveDescription(iri);
    const titleAttr = desc ? ` title="${escapeHtml(desc)}"` : '';
    return `<span class="object-link"><a href="${escapeHtml(iri)}"${titleAttr} target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a> <a href="${escapeHtml(iri)}"${titleAttr} target="_blank" rel="noopener noreferrer" class="external-icon">${externalLinkIcon}</a></span>`;
  };

  // Build primary and further metadata rows as { path, html } for profile ordering
  const primaryRows = [];
  const furtherRows = [];

  // Type
  const typeIri = `${RDF}type`;
  const conceptTypeIri = `${SKOS}Concept`;
  const typeLabel = getPredicateLabel(typeIri, 'type');
  const typeDesc = getPredicateDescription(typeIri);
  const conceptLabel = getLiteral(annotatedStore, conceptTypeIri, PREZ_LABEL) || 'Concept';
  const conceptDesc = getLiteral(annotatedStore, conceptTypeIri, PREZ_DESCRIPTION) || '';
  const typeTitleAttr = typeDesc ? ` title="${escapeHtml(typeDesc)}"` : '';
  const conceptTitleAttr = conceptDesc ? ` title="${escapeHtml(conceptDesc)}"` : '';
  primaryRows.push({ path: typeIri, html: `<tr><th><span class="property-label">${escapeHtml(typeLabel)}</span><a href="${escapeHtml(typeIri)}"${typeTitleAttr} target="_blank" rel="noopener noreferrer" class="property-link">${externalLinkIcon}</a></th><td><span class="object-link">${escapeHtml(conceptLabel)} <a href="${escapeHtml(conceptTypeIri)}"${conceptTitleAttr} target="_blank" rel="noopener noreferrer" class="external-icon">${externalLinkIcon}</a></span></td></tr>` });

  // Definition
  const definitionPred = `${SKOS}definition`;
  const definition = getLiteral(sourceStore, conceptIri, definitionPred);
  if (definition) {
    primaryRows.push({ path: definitionPred, html: `<tr><th>${createPropertyHeader(definitionPred, 'definition')}</th><td>${escapeHtml(definition)}</td></tr>` });
  }

  // Narrower concepts
  const narrowerPred = `${SKOS}narrower`;
  const narrower = getIRIs(sourceStore, conceptIri, narrowerPred);
  if (narrower.length > 0) {
    const links = narrower.map(iri => createObjectLink(iri)).join('<br>');
    primaryRows.push({ path: narrowerPred, html: `<tr><th>${createPropertyHeader(narrowerPred, 'has narrower')}</th><td>${links}</td></tr>` });
  }

  // Broader concepts
  const broaderPred = `${SKOS}broader`;
  const broader = getIRIs(sourceStore, conceptIri, broaderPred);
  if (broader.length > 0) {
    const links = broader.map(iri => createObjectLink(iri)).join('<br>');
    primaryRows.push({ path: broaderPred, html: `<tr><th>${createPropertyHeader(broaderPred, 'has broader')}</th><td>${links}</td></tr>` });
  }

  // Related concepts
  const relatedPred = `${SKOS}related`;
  const related = getIRIs(sourceStore, conceptIri, relatedPred);
  if (related.length > 0) {
    const links = related.map(iri => createObjectLink(iri)).join('<br>');
    primaryRows.push({ path: relatedPred, html: `<tr><th>${createPropertyHeader(relatedPred, 'related')}</th><td>${links}</td></tr>` });
  }

  // In Scheme
  const inSchemePred = `${SKOS}inScheme`;
  const inScheme = getIRIs(sourceStore, conceptIri, inSchemePred);
  if (inScheme.length > 0) {
    const links = inScheme.map(iri => createObjectLink(iri)).join('<br>');
    primaryRows.push({ path: inSchemePred, html: `<tr><th>${createPropertyHeader(inSchemePred, 'is in scheme')}</th><td>${links}</td></tr>` });
  } else if (schemeIri) {
    primaryRows.push({ path: inSchemePred, html: `<tr><th>${createPropertyHeader(inSchemePred, 'is in scheme')}</th><td>${createObjectLink(schemeIri)}</td></tr>` });
  }

  // --- Further Metadata ---

  // Identifier
  const identifierPred = `${DCTERMS}identifier`;
  const identifier = getLiteral(sourceStore, conceptIri, identifierPred);
  if (identifier) {
    furtherRows.push({ path: identifierPred, html: `<tr><th>${createPropertyHeader(identifierPred, 'identifier')}</th><td>${escapeHtml(identifier)}</td></tr>` });
  }

  // Top Concept Of
  const topConceptOfPred = `${SKOS}topConceptOf`;
  const topConceptOf = getIRIs(sourceStore, conceptIri, topConceptOfPred);
  if (topConceptOf.length > 0) {
    const links = topConceptOf.map(iri => createObjectLink(iri)).join('<br>');
    furtherRows.push({ path: topConceptOfPred, html: `<tr><th>${createPropertyHeader(topConceptOfPred, 'is top concept in scheme')}</th><td>${links}</td></tr>` });
  }

  // Preferred Label
  const prefLabelPred = `${SKOS}prefLabel`;
  const prefLabel = getLiteral(sourceStore, conceptIri, prefLabelPred);
  if (prefLabel) {
    furtherRows.push({ path: prefLabelPred, html: `<tr><th>${createPropertyHeader(prefLabelPred, 'preferred label')}</th><td>${escapeHtml(prefLabel)}</td></tr>` });
  }

  // Alt Labels
  const altLabelPred = `${SKOS}altLabel`;
  const altLabels = getAllLiterals(sourceStore, conceptIri, altLabelPred);
  if (altLabels.length > 0) {
    furtherRows.push({ path: altLabelPred, html: `<tr><th>${createPropertyHeader(altLabelPred, 'alternative label')}</th><td>${altLabels.map(l => escapeHtml(l)).join('<br>')}</td></tr>` });
  }

  // Notation
  const notationPred = `${SKOS}notation`;
  const notation = getLiteral(sourceStore, conceptIri, notationPred);
  if (notation) {
    furtherRows.push({ path: notationPred, html: `<tr><th>${createPropertyHeader(notationPred, 'notation')}</th><td>${escapeHtml(notation)}</td></tr>` });
  }

  // Scope Note
  const scopeNotePred = `${SKOS}scopeNote`;
  const scopeNote = getLiteral(sourceStore, conceptIri, scopeNotePred);
  if (scopeNote) {
    furtherRows.push({ path: scopeNotePred, html: `<tr><th>${createPropertyHeader(scopeNotePred, 'scope note')}</th><td>${escapeHtml(scopeNote)}</td></tr>` });
  }

  // History Note
  const historyNotePred = `${SKOS}historyNote`;
  const historyNote = getLiteral(sourceStore, conceptIri, historyNotePred);
  if (historyNote) {
    furtherRows.push({ path: historyNotePred, html: `<tr><th>${createPropertyHeader(historyNotePred, 'history note')}</th><td>${escapeHtml(historyNote)}</td></tr>` });
  }

  // Example
  const examplePred = `${SKOS}example`;
  const example = getLiteral(sourceStore, conceptIri, examplePred);
  if (example) {
    furtherRows.push({ path: examplePred, html: `<tr><th>${createPropertyHeader(examplePred, 'example')}</th><td>${escapeHtml(example)}</td></tr>` });
  }

  const primaryOrdered = sortConceptRowsByProfile(primaryRows, profile);
  const furtherOrdered = sortConceptRowsByProfile(furtherRows, profile);

  // Build further metadata section if we have rows
  const furtherMetadataSection = furtherOrdered.length > 0 ? `
      <div class="box" style="margin-top: 1rem;">
        <h2 class="title is-4">Further Metadata</h2>
        <table class="table is-fullwidth metadata-table">
          <tbody>
            ${furtherOrdered.map(r => r.html).join('\n            ')}
          </tbody>
        </table>
      </div>` : '';

  const html = `<!DOCTYPE html>
<html lang="en" class="has-background-dark">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bulma@0.9.4/css/bulma.min.css">
  <style>
    html, body { background-color: #1a1a2e; color: #eaeaea; }
    .box { background-color: #16213e; border: 1px solid #0f3460; }
    .table { background-color: #16213e; color: #eaeaea; }
    .table th, .table td { color: #eaeaea; border-color: #0f3460; background-color: #16213e; vertical-align: top; }
    .table th { white-space: nowrap; }
    .table thead th { color: #94a3b8; background-color: #0f3460; }
    .title, .subtitle { color: #eaeaea; }
    a { color: #60a5fa; }
    a:hover { color: #93c5fd; }
    .iri-link { word-break: break-all; }
    .property-label { margin-right: 0.25rem; }
    .property-link { display: inline-flex; align-items: center; vertical-align: middle; }
    .external-link-icon { width: 14px; height: 14px; vertical-align: middle; }
    .object-link { display: inline-flex; align-items: center; gap: 0.25rem; }
    .external-icon { display: inline-flex; align-items: center; }
  </style>
</head>
<body>
  <section class="section">
    <div class="container">
      <h1 class="title">${escapeHtml(title)}</h1>
      <p class="subtitle">
        <a href="${escapeHtml(conceptIri)}" class="iri-link" target="_blank">${escapeHtml(conceptIri)}</a>
      </p>

      <div class="box">
        <h2 class="title is-4">Metadata</h2>
        <table class="table is-fullwidth metadata-table">
          <tbody>
            ${primaryOrdered.map(r => r.html).join('\n            ')}
          </tbody>
        </table>
      </div>
${furtherMetadataSection}
    </div>
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
async function processVocab(config) {
  console.log('🚀 Vocabulary Processing Pipeline\n');
  console.log(`Source: ${config.source}`);
  console.log(`Background: ${config.backgroundDir}`);
  console.log(`Output: ${config.outDir}\n`);

  await mkdir(config.outDir, { recursive: true });

  console.log('📖 Parsing source TTL...');
  const sourceStore = await parseTTLFile(config.source);
  console.log(`   Loaded ${sourceStore.size} triples from source\n`);

  console.log('🔗 Collecting required IRIs...');
  const requiredIRIs = collectRequiredIRIs(sourceStore);
  console.log(`   Found ${requiredIRIs.size} IRIs that may need labels\n`);

  console.log('📚 Parsing background labels...');
  const backgroundStore = await parseTTLDirectory(config.backgroundDir);
  console.log(`   Loaded ${backgroundStore.size} triples from background\n`);

  const schemeQuads = sourceStore.getQuads(null, `${RDF}type`, `${SKOS}ConceptScheme`, null);
  if (schemeQuads.length === 0) {
    throw new Error('No ConceptScheme found in source');
  }
  const schemeIri = schemeQuads[0].subject.value;

  // Get scheme label for search index
  const schemeLabelQuads = sourceStore.getQuads(schemeIri, `${SKOS}prefLabel`, null, null);
  const schemeLabel = schemeLabelQuads.length > 0 ? schemeLabelQuads[0].object.value : localName(schemeIri);
  console.log(`📋 Found ConceptScheme: ${schemeLabel} (${schemeIri})\n`);

  const topConceptQuads = sourceStore.getQuads(schemeIri, `${SKOS}hasTopConcept`, null, null);
  const topConceptCount = topConceptQuads.length;

  console.log('🔀 Creating annotated scheme store...');
  const annotatedStore = createAnnotatedSchemeStore(sourceStore, backgroundStore, schemeIri, topConceptCount, {
    catalogId: config.catalogId,
    catalogIri: config.catalogIri,
    profileIri: config.profileIri,
  });
  console.log(`   Annotated store has ${annotatedStore.size} triples\n`);

  console.log('📝 Creating simplified graph...');
  const simplifiedStore = createSimplifiedGraph(sourceStore);
  console.log(`   Simplified store has ${simplifiedStore.size} triples\n`);

  console.log('📋 Extracting concepts for list exports...');
  const concepts = extractConceptsForList(sourceStore, schemeIri, schemeLabel);
  console.log(`   Found ${concepts.length} concepts\n`);

  console.log('💾 Generating output files...\n');
  let outputFileCount = 0;

  // Extract base name, removing common suffixes like -source-input, -source, -turtle
  const sourceName = basename(config.source, '.ttl')
    .replace(/-source-input$/, '')
    .replace(/-source-catalog$/, '')
    .replace(/-source$/, '')
    .replace(/-turtle$/, '');

  if (profileAllowsFormat(config, 'text/anot-turtle')) {
    console.log('   Writing annotated turtle...');
    const annotatedTtl = await storeToTurtle(annotatedStore);
    await writeFile(join(config.outDir, `${sourceName}-anot-turtle.ttl`), annotatedTtl, 'utf-8');
    console.log(`   ✓ ${sourceName}-anot-turtle.ttl`);
    outputFileCount++;
  }

  if (profileAllowsFormat(config, 'text/turtle')) {
    console.log('   Writing simplified turtle...');
    const simplifiedTtl = await storeToTurtle(simplifiedStore);
    await writeFile(join(config.outDir, `${sourceName}-turtle.ttl`), simplifiedTtl, 'utf-8');
    console.log(`   ✓ ${sourceName}-turtle.ttl`);
    outputFileCount++;
  }

  if (profileAllowsFormat(config, 'application/rdf+xml')) {
    console.log('   Writing RDF/XML...');
    const rdfxml = storeToRDFXML(simplifiedStore);
    await writeFile(join(config.outDir, `${sourceName}-rdf.xml`), rdfxml, 'utf-8');
    console.log(`   ✓ ${sourceName}-rdf.xml`);
    outputFileCount++;
  }

  if (profileAllowsFormat(config, 'application/ld+json')) {
    console.log('   Writing JSON-LD...');
    const jsonldDoc = await storeToJSONLD(simplifiedStore);
    await writeFile(join(config.outDir, `${sourceName}-json-ld.json`), JSON.stringify(jsonldDoc, null, 4), 'utf-8');
    console.log(`   ✓ ${sourceName}-json-ld.json`);
    outputFileCount++;
  }

  if (profileAllowsFormat(config, 'application/anot-ld-json')) {
    console.log('   Writing annotated JSON-LD...');
    const annotatedJsonldDoc = await storeToJSONLD(annotatedStore);
    await writeFile(join(config.outDir, `${sourceName}-anot-ld-json.json`), JSON.stringify(annotatedJsonldDoc, null, 2), 'utf-8');
    console.log(`   ✓ ${sourceName}-anot-ld-json.json`);
    outputFileCount++;
  }

  if (profileAllowsFormat(config, 'application/json')) {
    console.log('   Writing concepts JSON...');
    const listJson = generateListJSON(concepts);
    await writeFile(join(config.outDir, `${sourceName}-concepts.json`), JSON.stringify(listJson), 'utf-8');
    console.log(`   ✓ ${sourceName}-concepts.json`);
    outputFileCount++;
  }

  if (profileAllowsFormat(config, 'text/csv')) {
    console.log('   Writing concepts CSV...');
    const listCsv = await generateListCSV(concepts);
    await writeFile(join(config.outDir, `${sourceName}-concepts.csv`), listCsv, 'utf-8');
    console.log(`   ✓ ${sourceName}-concepts.csv`);
    outputFileCount++;
  }

  // Generate per-concept annotated files
  if (profileAllowsFormat(config, 'application/anot-ld-json') && concepts.length > 0) {
    console.log('   Writing per-concept annotated JSON-LD...');
    const conceptsDir = join(config.outDir, 'concepts');

    for (const concept of concepts) {
      const conceptId = localName(concept.iri);
      const prefix = (conceptId.charAt(0) || '_').toLowerCase();
      const prefixDir = join(conceptsDir, prefix);

      // Ensure prefix directory exists
      await mkdir(prefixDir, { recursive: true });

      // Create annotated store for this concept
      const conceptAnnotatedStore = createAnnotatedConceptStore(
        sourceStore,
        backgroundStore,
        concept.iri,
        schemeIri,
        config
      );

      // Add background labels for all IRIs referenced in this concept's store
      const conceptIris = collectRequiredIRIs(conceptAnnotatedStore);
      for (const iri of conceptIris) {
        addPrezAnnotationsForIri(iri, conceptAnnotatedStore, backgroundStore);
      }

      // Write the file
      const conceptJsonld = await storeToJSONLD(conceptAnnotatedStore);
      const conceptFilePath = join(prefixDir, `${conceptId}-anot-ld-json.json`);
      await writeFile(conceptFilePath, JSON.stringify(conceptJsonld, null, 2), 'utf-8');
    }

    console.log(`   ✓ ${concepts.length} concept files in concepts/{prefix}/`);
    outputFileCount += concepts.length;
  }

  if (profileAllowsFormat(config, 'text/html')) {
    console.log('   Writing HTML page...');
    // Create an extended store for HTML that includes concept summaries
    // so the HTML page is self-contained with a concept tree
    const htmlStore = new Store();
    htmlStore.addQuads(annotatedStore.getQuads(null, null, null, null));
    for (const c of concepts) {
      htmlStore.addQuad(quad(namedNode(c.iri), namedNode(`${RDF}type`), namedNode(`${SKOS}Concept`)));
      htmlStore.addQuad(quad(namedNode(c.iri), namedNode(`${SKOS}prefLabel`), literal(c.prefLabel || '', 'en')));
      if (c.broader) {
        htmlStore.addQuad(quad(namedNode(c.iri), namedNode(`${SKOS}broader`), namedNode(c.broader)));
      }
    }
    const html = generateHTMLFromAnotStore(htmlStore, undefined, config.profile);
    await writeFile(join(config.outDir, `${sourceName}-page.html`), html, 'utf-8');
    console.log(`   ✓ ${sourceName}-page.html`);
    outputFileCount++;
  }

  console.log('\n✅ Processing complete!\n');
  console.log('Summary:');
  console.log(`  - Source triples: ${sourceStore.size}`);
  console.log(`  - Background triples available: ${backgroundStore.size}`);
  console.log(`  - Annotated triples: ${annotatedStore.size}`);
  console.log(`  - Simplified triples: ${simplifiedStore.size}`);
  console.log(`  - Concepts: ${concepts.length}`);
  console.log(`  - Top concepts: ${topConceptCount}`);
  console.log(`  - Output files: ${outputFileCount}`);

  return {
    sourceStore,
    annotatedStore,
    simplifiedStore,
    backgroundStore,
    concepts,
    config,
  };
}

/**
 * Process a single concept
 */
async function processConcept(config) {
  console.log('🚀 Concept Processing Pipeline\n');
  console.log(`Source: ${config.source}`);
  console.log(`Background: ${config.backgroundDir}`);
  console.log(`Output: ${config.outDir}`);
  console.log(`Scheme: ${config.schemeIri}\n`);

  await mkdir(config.outDir, { recursive: true });

  console.log('📖 Parsing source TTL...');
  const sourceStore = await parseTTLFile(config.source);
  console.log(`   Loaded ${sourceStore.size} triples from source\n`);

  console.log('📚 Parsing background labels...');
  const backgroundStore = await parseTTLDirectory(config.backgroundDir);
  console.log(`   Loaded ${backgroundStore.size} triples from background\n`);

  // Find the concept IRI (the main subject that's a skos:Concept)
  const conceptQuads = sourceStore.getQuads(null, `${RDF}type`, `${SKOS}Concept`, null);
  if (conceptQuads.length === 0) {
    throw new Error('No skos:Concept found in source');
  }
  const conceptIri = conceptQuads[0].subject.value;
  console.log(`📋 Found Concept: ${conceptIri}\n`);

  // Get scheme IRI from config or from source data
  let schemeIri = config.schemeIri;
  if (!schemeIri) {
    const inSchemeQuads = sourceStore.getQuads(conceptIri, `${SKOS}inScheme`, null, null);
    if (inSchemeQuads.length > 0) {
      schemeIri = inSchemeQuads[0].object.value;
    } else {
      const topConceptOfQuads = sourceStore.getQuads(conceptIri, `${SKOS}topConceptOf`, null, null);
      if (topConceptOfQuads.length > 0) {
        schemeIri = topConceptOfQuads[0].object.value;
      }
    }
  }
  
  if (!schemeIri) {
    throw new Error('Cannot determine scheme IRI. Provide --schemeIri or ensure concept has skos:inScheme');
  }
  console.log(`📋 Using scheme: ${schemeIri}\n`);

  // Load profile config prefixes if available
  let prefixes = {};
  if (config.profileConfig?.prefixes) {
    prefixes = config.profileConfig.prefixes;
  }

  console.log('🔀 Creating annotated concept store...');
  const annotatedStore = createAnnotatedConceptStore(sourceStore, backgroundStore, conceptIri, schemeIri, {
    catalogId: config.catalogId,
    catalogIri: config.catalogIri,
    profileIri: config.profileIri,
    prefixes,
  });
  console.log(`   Annotated store has ${annotatedStore.size} triples\n`);

  console.log('💾 Generating output files...\n');
  let outputFileCount = 0;

  // Extract base name, removing common suffixes like -source-input, -source, -turtle
  const sourceName = basename(config.source, '.ttl')
    .replace(/-source-input$/, '')
    .replace(/-source-catalog$/, '')
    .replace(/-source$/, '')
    .replace(/-turtle$/, '');

  if (profileAllowsFormat(config, 'text/anot-turtle')) {
    console.log('   Writing annotated turtle...');
    const annotatedTtl = await storeToTurtle(annotatedStore);
    await writeFile(join(config.outDir, `${sourceName}-anot-turtle.ttl`), annotatedTtl, 'utf-8');
    console.log(`   ✓ ${sourceName}-anot-turtle.ttl`);
    outputFileCount++;
  }

  if (profileAllowsFormat(config, 'text/turtle')) {
    console.log('   Writing source turtle...');
    const sourceTtl = await storeToTurtle(sourceStore);
    await writeFile(join(config.outDir, `${sourceName}-turtle.ttl`), sourceTtl, 'utf-8');
    console.log(`   ✓ ${sourceName}-turtle.ttl`);
    outputFileCount++;
  }

  if (profileAllowsFormat(config, 'application/rdf+xml')) {
    console.log('   Writing RDF/XML...');
    const rdfxml = storeToRDFXML(sourceStore);
    await writeFile(join(config.outDir, `${sourceName}-rdf.xml`), rdfxml, 'utf-8');
    console.log(`   ✓ ${sourceName}-rdf.xml`);
    outputFileCount++;
  }

  if (profileAllowsFormat(config, 'application/ld+json')) {
    console.log('   Writing JSON-LD...');
    const jsonldDoc = await storeToJSONLD(sourceStore);
    await writeFile(join(config.outDir, `${sourceName}-json-ld.json`), JSON.stringify(jsonldDoc, null, 4), 'utf-8');
    console.log(`   ✓ ${sourceName}-json-ld.json`);
    outputFileCount++;
  }

  if (profileAllowsFormat(config, 'application/anot-ld-json')) {
    console.log('   Writing annotated JSON-LD...');
    const annotatedJsonldDoc = await storeToJSONLD(annotatedStore);
    await writeFile(join(config.outDir, `${sourceName}-anot-ld-json.json`), JSON.stringify(annotatedJsonldDoc, null, 2), 'utf-8');
    console.log(`   ✓ ${sourceName}-anot-ld-json.json`);
    outputFileCount++;
  }

  if (profileAllowsFormat(config, 'text/html')) {
    console.log('   Writing HTML page...');
    const html = generateConceptHTMLFromAnotStore(annotatedStore, conceptIri, schemeIri, config.profile);
    await writeFile(join(config.outDir, `${sourceName}-page.html`), html, 'utf-8');
    console.log(`   ✓ ${sourceName}-page.html`);
    outputFileCount++;
  }

  console.log('\n✅ Processing complete!\n');
  console.log('Summary:');
  console.log(`  - Source triples: ${sourceStore.size}`);
  console.log(`  - Background triples available: ${backgroundStore.size}`);
  console.log(`  - Annotated triples: ${annotatedStore.size}`);
  console.log(`  - Output files: ${outputFileCount}`);

  return {
    sourceStore,
    annotatedStore,
    backgroundStore,
    config,
  };
}

/**
 * Process a schema:DataCatalog vocabulary listing
 */
async function processCatalog(config) {
  console.log('🚀 Catalog Processing Pipeline\n');
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

  const catalogQuads = sourceStore.getQuads(null, `${RDF}type`, `${SCHEMA}DataCatalog`, null);
  if (catalogQuads.length === 0) {
    throw new Error('No schema:DataCatalog found in source');
  }
  const catalogIri = catalogQuads[0].subject.value;
  console.log(`📋 Found Catalog: ${catalogIri}\n`);

  console.log('🔀 Creating annotated catalog store...');
  const annotatedStore = new Store();
  annotatedStore.addQuads(sourceStore.getQuads());

  // Focus node marker
  annotatedStore.addQuad(quad(namedNode(catalogIri), namedNode(PREZ_TYPE), namedNode(PREZ_FOCUS_NODE)));

  // prez:identifier, prez:link, prez:members
  const identifier = config.catalogId || localName(catalogIri);
  annotatedStore.addQuad(quad(namedNode(catalogIri), namedNode(PREZ_IDENTIFIER), literal(identifier)));
  if (config.catalogId) {
    const linkPath = `/catalogs/${config.catalogId}`;
    annotatedStore.addQuad(quad(namedNode(catalogIri), namedNode(PREZ_LINK), literal(linkPath)));
    annotatedStore.addQuad(quad(namedNode(catalogIri), namedNode(PREZ_MEMBERS), literal(`${linkPath}/collections`)));
  }

  // prez:label / prez:description from source (fallback to background)
  const labelTerm = getFirstObjectTerm(sourceStore, catalogIri, [
    `${SCHEMA}name`,
    `${DCTERMS}title`,
    `${RDFS}label`,
  ]) || getLabelFromBackground(catalogIri, backgroundStore);
  if (labelTerm) {
    annotatedStore.addQuad(quad(namedNode(catalogIri), namedNode(PREZ_LABEL), labelTerm));
  }

  const descTerm = getFirstObjectTerm(sourceStore, catalogIri, [
    `${SCHEMA}description`,
    `${DCTERMS}description`,
  ]);
  if (descTerm) {
    annotatedStore.addQuad(quad(namedNode(catalogIri), namedNode(PREZ_DESCRIPTION), descTerm));
  }

  console.log('📋 Extracting catalog items for list exports...');
  const hasPartQuads = sourceStore.getQuads(catalogIri, `${SCHEMA}hasPart`, null, null);
  const schemeIris = hasPartQuads
    .filter(q => q.object.termType === 'NamedNode')
    .map(q => q.object.value);

  // Annotate listed schemes with prez:label/description where available
  for (const iri of schemeIris) {
    addPrezAnnotationsForIri(iri, annotatedStore, backgroundStore);
  }

  const items = schemeIris.map(iri => {
    // Check source store first (for inline labels), then background store
    let labelTerm = getLabelFromBackground(iri, sourceStore);
    if (!labelTerm) {
      labelTerm = getLabelFromBackground(iri, backgroundStore);
    }
    const label = labelTerm ? labelTerm.value : localName(iri);
    const schemeId = localName(iri) || label;
    const link = config.catalogId ? `/catalogs/${config.catalogId}/collections/${schemeId}` : '';
    return { iri, label, link };
  });

  console.log(`   Found ${items.length} items\n`);

  console.log('💾 Generating output files...\n');
  let outputFileCount = 0;
  const sourceName = basename(config.source, '.ttl')
    .replace(/-source-input$/, '')
    .replace(/-source-catalog$/, '')
    .replace(/-source$/, '')
    .replace(/-turtle$/, '');

  if (profileAllowsFormat(config, 'text/anot-turtle')) {
    console.log('   Writing annotated turtle...');
    const annotatedTtl = await storeToTurtle(annotatedStore);
    await writeFile(join(config.outDir, `${sourceName}-anot-turtle.ttl`), annotatedTtl, 'utf-8');
    console.log(`   ✓ ${sourceName}-anot-turtle.ttl`);
    outputFileCount++;
  }

  if (profileAllowsFormat(config, 'text/turtle')) {
    console.log('   Writing source turtle...');
    const sourceTtl = await storeToTurtle(sourceStore);
    await writeFile(join(config.outDir, `${sourceName}-turtle.ttl`), sourceTtl, 'utf-8');
    console.log(`   ✓ ${sourceName}-turtle.ttl`);
    outputFileCount++;
  }

  if (profileAllowsFormat(config, 'application/rdf+xml')) {
    console.log('   Writing RDF/XML...');
    const rdfxml = storeToRDFXML(sourceStore);
    await writeFile(join(config.outDir, `${sourceName}-rdf.xml`), rdfxml, 'utf-8');
    console.log(`   ✓ ${sourceName}-rdf.xml`);
    outputFileCount++;
  }

  if (profileAllowsFormat(config, 'application/ld+json')) {
    console.log('   Writing JSON-LD...');
    const jsonldDoc = await storeToJSONLD(sourceStore);
    await writeFile(join(config.outDir, `${sourceName}-json-ld.json`), JSON.stringify(jsonldDoc, null, 4), 'utf-8');
    console.log(`   ✓ ${sourceName}-json-ld.json`);
    outputFileCount++;
  }

  if (profileAllowsFormat(config, 'application/anot-ld-json')) {
    console.log('   Writing annotated JSON-LD...');
    const annotatedJsonldDoc = await storeToJSONLD(annotatedStore);
    await writeFile(join(config.outDir, `${sourceName}-anot-ld-json.json`), JSON.stringify(annotatedJsonldDoc, null, 2), 'utf-8');
    console.log(`   ✓ ${sourceName}-anot-ld-json.json`);
    outputFileCount++;
  }

  if (profileAllowsFormat(config, 'application/json')) {
    console.log('   Writing list JSON...');
    const listJson = generateCatalogListJSON(items);
    await writeFile(join(config.outDir, `${sourceName}-list.json`), JSON.stringify(listJson), 'utf-8');
    console.log(`   ✓ ${sourceName}-list.json`);
    outputFileCount++;
  }

  if (profileAllowsFormat(config, 'text/csv')) {
    console.log('   Writing list CSV...');
    const listCsv = await generateCatalogListCSV(items);
    await writeFile(join(config.outDir, `${sourceName}-list.csv`), listCsv, 'utf-8');
    console.log(`   ✓ ${sourceName}-list.csv`);
    outputFileCount++;
  }

  if (profileAllowsFormat(config, 'text/html')) {
    console.log('   Writing HTML page...');
    const html = generateCatalogHTML(annotatedStore, sourceStore, items);
    await writeFile(join(config.outDir, `${sourceName}-page.html`), html, 'utf-8');
    console.log(`   ✓ ${sourceName}-page.html`);
    outputFileCount++;
  }

  console.log('\n✅ Processing complete!\n');
  console.log('Summary:');
  console.log(`  - Source triples: ${sourceStore.size}`);
  console.log(`  - Background triples available: ${backgroundStore.size}`);
  console.log(`  - Annotated triples: ${annotatedStore.size}`);
  console.log(`  - Items: ${items.length}`);
  console.log(`  - Output files: ${outputFileCount}`);

  return {
    sourceStore,
    annotatedStore,
    backgroundStore,
    items,
    config,
  };
}

/**
 * Parse SHACL validator files to extract sh:minCount / sh:maxCount cardinality constraints.
 * Returns a map: { targetClass → { path → { minCount?, maxCount? } } }
 * @param {string} validatorsDir - Path to directory containing validator .ttl files
 * @returns {Promise<Map<string, Map<string, { minCount?: number, maxCount?: number }>>>}
 */
async function parseValidatorCardinality(validatorsDir) {
  const cardinality = new Map();
  const files = await readdir(validatorsDir);
  const ttlFiles = files.filter(f => f.endsWith('.ttl'));

  for (const file of ttlFiles) {
    const content = await readFile(join(validatorsDir, file), 'utf-8');
    const store = new Store();
    const parser = new Parser();
    const quads = parser.parse(content);
    store.addQuads(quads);

    // Find all sh:NodeShape subjects with sh:targetClass
    const nodeShapes = store.getQuads(null, namedNode(`${RDF}type`), namedNode(`${SH}NodeShape`), null);

    for (const shapeQuad of nodeShapes) {
      const shape = shapeQuad.subject;

      // Get target classes for this shape
      const targetClasses = store.getQuads(shape, namedNode(`${SH}targetClass`), null, null)
        .map(q => q.object.value);

      if (targetClasses.length === 0) continue;

      // Get property shapes via sh:property
      const propLinks = store.getQuads(shape, namedNode(`${SH}property`), null, null);

      for (const propLink of propLinks) {
        const propNode = propLink.object;

        // Get sh:path — only handle direct IRI paths (skip complex paths like sequences)
        const pathQuads = store.getQuads(propNode, namedNode(`${SH}path`), null, null);
        if (pathQuads.length !== 1) continue;
        const pathObj = pathQuads[0].object;
        if (pathObj.termType !== 'NamedNode') continue;
        const path = pathObj.value;

        // Get sh:minCount and sh:maxCount
        const minQuads = store.getQuads(propNode, namedNode(`${SH}minCount`), null, null);
        const maxQuads = store.getQuads(propNode, namedNode(`${SH}maxCount`), null, null);

        if (minQuads.length === 0 && maxQuads.length === 0) continue;

        const constraint = {};
        if (minQuads.length > 0) constraint.minCount = parseInt(minQuads[0].object.value, 10);
        if (maxQuads.length > 0) constraint.maxCount = parseInt(maxQuads[0].object.value, 10);

        // Apply to each target class
        for (const tc of targetClasses) {
          if (!cardinality.has(tc)) cardinality.set(tc, new Map());
          const classMap = cardinality.get(tc);
          // Merge: keep the tightest constraint if same path appears in multiple shapes
          if (classMap.has(path)) {
            const existing = classMap.get(path);
            if (constraint.minCount != null) {
              existing.minCount = Math.max(existing.minCount ?? 0, constraint.minCount);
            }
            if (constraint.maxCount != null) {
              existing.maxCount = existing.maxCount != null
                ? Math.min(existing.maxCount, constraint.maxCount)
                : constraint.maxCount;
            }
          } else {
            classMap.set(path, { ...constraint });
          }
        }
      }
    }
  }

  return cardinality;
}

/**
 * Build profile.json object (field ordering for front-end) from parsed SHACL config.
 * Order follows sh:property order in SHACL, or DEFAULT_FIELD_ORDER.
 * Optionally merges cardinality constraints (minCount/maxCount) from validator shapes.
 * @param {object} shaclConfig - Result of parseProfilesFile (ProfileConfig)
 * @param {Map} [cardinalityMap] - Optional cardinality constraints from parseValidatorCardinality
 * @returns {object} The profile.json object
 */
function buildProfileJson(shaclConfig, cardinalityMap) {
  const result = {
    conceptScheme: { propertyOrder: [] },
    concept: { propertyOrder: [] },
    catalog: { propertyOrder: [] },
    list: { propertyOrder: [...DEFAULT_LIST_ORDER] },
    nestedOrder: NESTED_FIELD_ORDER,
  };

  for (const profile of Object.values(shaclConfig.profiles || {})) {
    const targetClass = profile.targetClass || '';
    let key;
    if (targetClass === `${SKOS}ConceptScheme`) key = 'conceptScheme';
    else if (targetClass === `${SKOS}Concept`) key = 'concept';
    else if (targetClass === `${SCHEMA}DataCatalog`) key = 'catalog';
    else continue;

    if (profile.properties && profile.properties.length > 0) {
      const sorted = [...profile.properties].sort((a, b) => (a.order || 0) - (b.order || 0));
      result[key].propertyOrder = sorted.map((p) => ({
        path: p.paths && p.paths[0] ? p.paths[0] : '',
        order: p.order ?? 0,
      }));
    } else {
      result[key].propertyOrder = (DEFAULT_FIELD_ORDER[key] || []).map((p) => ({
        path: typeof p === 'object' ? p.path : p,
        order: typeof p === 'object' ? p.order : 0,
      }));
    }
  }

  // Denormalize nested ordering onto the property nodes themselves.
  // Keep result.nestedOrder for backwards compatibility, but also embed:
  // {
  //   path: prov:qualifiedAttribution,
  //   order: 4,
  //   propertyOrder: [{ path: prov:agent, order: 0 }, ...]
  // }
  for (const section of ['conceptScheme', 'concept', 'catalog']) {
    const arr = result[section]?.propertyOrder;
    if (!Array.isArray(arr)) continue;
    result[section].propertyOrder = arr.map((entry) => {
      const nested = entry?.path ? result.nestedOrder?.[entry.path] : undefined;
      return nested ? { ...entry, propertyOrder: nested } : entry;
    });
  }

  // Merge cardinality constraints from validator shapes (minCount/maxCount)
  if (cardinalityMap) {
    const sectionToClass = {
      conceptScheme: `${SKOS}ConceptScheme`,
      concept: `${SKOS}Concept`,
      catalog: `${SCHEMA}DataCatalog`,
    };
    for (const [section, targetClass] of Object.entries(sectionToClass)) {
      const classConstraints = cardinalityMap.get(targetClass);
      if (!classConstraints) continue;
      const arr = result[section]?.propertyOrder;
      if (!Array.isArray(arr)) continue;
      result[section].propertyOrder = arr.map((entry) => {
        const constraint = entry?.path ? classConstraints.get(entry.path) : undefined;
        if (!constraint) return entry;
        const merged = { ...entry };
        if (constraint.minCount != null) merged.minCount = constraint.minCount;
        if (constraint.maxCount != null) merged.maxCount = constraint.maxCount;
        return merged;
      });
    }
  }

  return result;
}

/**
 * Build and write profile.json (field ordering for front-end) from parsed SHACL config.
 * Writes to outDir/profile.json.
 * @param {object} shaclConfig - Result of parseProfilesFile (ProfileConfig)
 * @param {string} outDir - Output directory
 * @param {Map} [cardinalityMap] - Optional cardinality constraints from parseValidatorCardinality
 * @returns {object} The profile.json object
 */
async function exportProfileJson(shaclConfig, outDir, cardinalityMap) {
  const result = buildProfileJson(shaclConfig, cardinalityMap);
  await mkdir(outDir, { recursive: true });
  await writeFile(join(outDir, 'profile.json'), JSON.stringify(result, null, 2), 'utf-8');
  return result;
}

/**
 * Process using a SHACL profiles.ttl file
 * @param {string} profilesPath - Path to profiles.ttl
 * @param {string} sourceFile - Path to source TTL file
 * @param {string} type - 'vocab', 'concept', or 'catalog'
 * @param {string} outDir - Output directory (optional)
 * @param {string} backgroundDir - Background labels directory (optional, defaults to data/background)
 */
async function processWithShaclProfiles(profilesPath, sourceFile, type, outDir, backgroundDir) {
  console.log('🔧 Loading SHACL profiles from:', profilesPath);
  
  // Parse SHACL profiles
  const shaclConfig = await parseProfilesFile(profilesPath);
  
  // Find the umbrella profile to use
  const umbrellaIri = Object.keys(shaclConfig.umbrellaProfiles)[0];
  if (!umbrellaIri) {
    throw new Error('No umbrella profile found in profiles.ttl');
  }
  
  // Convert to processing config format
  const profileConfig = toProcessingConfig(shaclConfig, umbrellaIri);
  
  console.log('📋 Loaded profiles:');
  for (const [key, profile] of Object.entries(profileConfig.profiles)) {
    console.log(`   - ${key}: ${profile.label}`);
  }
  
  // Determine profile key based on type
  const profileKey = type === 'concept' ? 'concept' : type === 'catalog' ? 'catalog' : 'conceptScheme';
  const profile = profileConfig.profiles[profileKey];
  
  if (!profile) {
    throw new Error(`Profile for ${type} not found`);
  }
  
  // Build the processing config
  const config = {
    source: sourceFile,
    outDir: outDir || join(dirname(sourceFile), `${basename(sourceFile, '.ttl')}-output`),
    backgroundDir: backgroundDir || join(PACKAGE_DIR, 'examples/background'),
    catalogId: profileConfig.catalog.id,
    catalogIri: profileConfig.catalog.iri,
    profileIri: profile.iri,
    profileConfig: {
      ...profileConfig,
      // Make profile settings accessible
      currentProfile: profile
    },
    // Pass through SHACL-derived settings
    labelSources: profile.labelSources,
    descriptionSources: profile.descriptionSources,
    provenanceSources: profile.provenanceSources,
    generate: profile.prezPredicates,
  };

  // Export profile.json (field order for front-end) to output dir; use it for HTML ordering
  const fieldOrderProfile = await exportProfileJson(shaclConfig, config.outDir);
  config.profile = fieldOrderProfile;

  // Process based on type
  if (type === 'concept') {
    return processConcept(config);
  } else if (type === 'catalog') {
    return processCatalog(config);
  } else {
    return processVocab(config);
  }
}

// Main execution
const config = parseArgs();

// Check which mode to use
if (config.sourceDir && config.outputBase && config.profilesFile) {
  // Batch mode - process all files in a directory
  processBatch(
    config.profilesFile,
    config.sourceDir,
    config.outputBase,
    config.pattern || '*-source-input.ttl',
    config.backgroundDir,
    config.systemDir,
    config.validatorsDir
  ).then(results => {
    if (results.errors.length > 0) {
      process.exit(1);
    }
  }).catch(err => {
    console.error('❌ Error:', err.message);
    console.error(err.stack);
    process.exit(1);
  });
} else if (config.profilesFile) {
  // Single file mode with SHACL profiles.ttl file
  processWithShaclProfiles(
    config.profilesFile, 
    config.source, 
    config.type || 'vocab',
    config.outDir,
    config.backgroundDir
  ).catch(err => {
    console.error('❌ Error:', err.message);
    console.error(err.stack);
    process.exit(1);
  });
} else if (config.type === 'concept') {
  // Direct concept processing
  processConcept(config).catch(err => {
    console.error('❌ Error:', err.message);
    console.error(err.stack);
    process.exit(1);
  });
} else if (config.type === 'catalog') {
  // Direct catalog processing
  processCatalog(config).catch(err => {
    console.error('❌ Error:', err.message);
    console.error(err.stack);
    process.exit(1);
  });
} else {
  // Default: vocab processing
  processVocab(config).catch(err => {
    console.error('❌ Error:', err.message);
    console.error(err.stack);
    process.exit(1);
  });
}

export { processVocab, processConcept, processCatalog, processWithShaclProfiles, processBatch, parseTTLFile, parseTTLDirectory };
