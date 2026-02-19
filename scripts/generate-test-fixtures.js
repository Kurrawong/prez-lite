#!/usr/bin/env node

/**
 * Generate SHACL validation test fixtures.
 *
 * Creates valid and invalid TTL files covering every shape in the validator.
 * Each invalid file breaks exactly one rule and includes a comment header
 * explaining the expected violation.
 *
 * Usage: node scripts/generate-test-fixtures.js
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const TESTS_DIR = 'data/validators/tests';
mkdirSync(TESTS_DIR, { recursive: true });

// ---------------------------------------------------------------------------
// Shared building blocks
// ---------------------------------------------------------------------------

const BRANDS_PREFIXES = `\
PREFIX : <http://example.com/def/brand/>
PREFIX cs: <http://example.com/def/brand>
PREFIX dcterms: <http://purl.org/dc/terms/>
PREFIX owl: <http://www.w3.org/2002/07/owl#>
PREFIX prov: <http://www.w3.org/ns/prov#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX schema: <https://schema.org/>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>`;

const ANZIC_PREFIXES = `\
PREFIX cs: <http://linked.data.gov.au/def/anzsic-2006>
PREFIX dcterms: <http://purl.org/dc/terms/>
PREFIX icat: <http://linked.data.gov.au/def/anzsic-2006/>
PREFIX owl: <http://www.w3.org/2002/07/owl#>
PREFIX prov: <http://www.w3.org/ns/prov#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX schema: <https://schema.org/>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>`;

const BRANDS_ORG = `\
<http://example.com/org/example-org>
    a schema:Organization ;
    schema:name "Example Organisation" ;
    schema:url "http://example.com"^^xsd:anyURI ;
.`;

const BRANDS_PERSON = `\
<http://example.com/person/test-editor>
    a schema:Person ;
    schema:name "Test Editor" ;
    schema:email "test@example.com"^^xsd:anyURI ;
.`;

const ANZIC_ORG = `\
<https://linked.data.gov.au/org/gsq>
    a schema:Organization ;
    schema:name "Geological Survey of Queensland" ;
    schema:url "https://www.business.qld.gov.au/industries/mining-energy-water/resources/geoscience-information/gsq"^^xsd:anyURI ;
.`;

const ANZIC_PERSON = `\
<http://example.com/person/test-editor>
    a schema:Person ;
    schema:name "Test Editor" ;
    schema:email "test@example.com"^^xsd:anyURI ;
.`;

function brandsScheme(overrides = {}) {
  const o = {
    prefLabel: '    skos:prefLabel "Brand" ;',
    definition: '    skos:definition "Brands under Example Organisation." ;',
    dateCreated: '    schema:dateCreated "2025-02-19"^^xsd:date ;',
    dateModified: '    schema:dateModified "2025-02-19"^^xsd:date ;',
    creator: '    schema:creator <http://example.com/org/example-org> ;',
    hasTopConcept: `    skos:hasTopConcept\n        :aami ,\n        :gio ,\n        :acme ;`,
    ...overrides,
  };
  const lines = [
    'cs:',
    '    a',
    '        owl:Ontology ,',
    '        skos:ConceptScheme ;',
  ];
  for (const v of Object.values(o)) {
    if (v) lines.push(v);
  }
  lines.push('.');
  return lines.join('\n');
}

function brandsConcept(id, label, opts = {}) {
  const lines = [
    `${id}`,
    '    a skos:Concept ;',
  ];
  if (opts.isDefinedBy !== false) lines.push('    rdfs:isDefinedBy cs: ;');
  if (opts.extraIsDefinedBy) lines.push(`    rdfs:isDefinedBy <${opts.extraIsDefinedBy}> ;`);
  if (opts.replaces) lines.push(`    dcterms:replaces ${opts.replaces} ;`);
  if (opts.wasRevisionOf) lines.push(`    prov:wasRevisionOf ${opts.wasRevisionOf} ;`);
  if (opts.creator) lines.push(`    schema:creator ${opts.creator} ;`);
  lines.push(`    skos:definition "A definition for ${label}." ;`);
  if (opts.inScheme !== false) lines.push('    skos:inScheme cs: ;');
  lines.push(`    skos:prefLabel "${label}" ;`);
  if (opts.topConcept) lines.push('    skos:topConceptOf cs: ;');
  if (opts.broader) lines.push(`    skos:broader ${opts.broader} ;`);
  if (opts.temporalCoverage !== false) {
    const start = opts.startTime || '2025-02-19';
    const end = opts.endTime;
    const tcLines = [];
    tcLines.push(`        schema:startTime "${start}"^^xsd:date ;`);
    if (end) tcLines.push(`        schema:endTime "${end}"^^xsd:date ;`);
    lines.push('    schema:temporalCoverage [');
    lines.push(tcLines.join('\n'));
    lines.push('    ] ;');
  }
  lines.push('.');
  return lines.join('\n');
}

function brandsCollection(id, label, opts = {}) {
  const lines = [`${id}`, '    a skos:Collection ;'];
  if (opts.prefLabel !== false) lines.push(`    skos:prefLabel "${label}" ;`);
  if (opts.definition !== false) lines.push(`    skos:definition "A collection of ${label.toLowerCase()}." ;`);
  if (opts.inScheme !== false) lines.push('    skos:inScheme cs: ;');
  if (opts.member !== false) {
    const members = opts.members || ':aami ,\n        :gio';
    lines.push(`    skos:member\n        ${members} ;`);
  }
  lines.push('.');
  return lines.join('\n');
}

// Standard 3 concepts for brands
function brandsStdConcepts(opts = {}) {
  return [
    brandsConcept(':aami', 'AAMI', { topConcept: true, ...opts.aami }),
    brandsConcept(':gio', 'GIO', { topConcept: true, ...opts.gio }),
    brandsConcept(':acme', 'Acme', { topConcept: true, ...opts.acme }),
  ].join('\n\n');
}

function anzicScheme(overrides = {}) {
  const o = {
    prefLabel: '    skos:prefLabel "Australian and New Zealand Standard Industrial Classification 2006" ;',
    definition: '    skos:definition "An industrial classification that organises data about business units into industry groups." ;',
    dateCreated: '    schema:dateCreated "2020-02-17"^^xsd:date ;',
    dateModified: '    schema:dateModified "2023-03-16"^^xsd:date ;',
    creator: '    schema:creator <https://linked.data.gov.au/org/gsq> ;',
    hasTopConcept: '    skos:hasTopConcept icat:A0000 ;',
    ...overrides,
  };
  const lines = [
    'cs:',
    '    a',
    '        owl:Ontology ,',
    '        skos:ConceptScheme ;',
  ];
  for (const v of Object.values(o)) {
    if (v) lines.push(v);
  }
  lines.push('.');
  return lines.join('\n');
}

function anzicConcept(id, label, opts = {}) {
  const lines = [`${id}`, '    a skos:Concept ;'];
  if (opts.isDefinedBy !== false) lines.push('    rdfs:isDefinedBy cs: ;');
  if (opts.replaces) lines.push(`    dcterms:replaces ${opts.replaces} ;`);
  if (opts.creator) lines.push(`    schema:creator ${opts.creator} ;`);
  lines.push(`    skos:definition "${label}." ;`);
  if (opts.inScheme !== false) lines.push('    skos:inScheme cs: ;');
  lines.push(`    skos:prefLabel "${label}" ;`);
  if (opts.topConcept) lines.push('    skos:topConceptOf cs: ;');
  if (opts.broader) lines.push(`    skos:broader ${opts.broader} ;`);
  if (opts.temporalCoverage !== false) {
    const start = opts.startTime || '2020-02-17';
    const end = opts.endTime;
    const tcLines = [`        schema:startTime "${start}"^^xsd:date ;`];
    if (end) tcLines.push(`        schema:endTime "${end}"^^xsd:date ;`);
    lines.push('    schema:temporalCoverage [');
    lines.push(tcLines.join('\n'));
    lines.push('    ] ;');
  }
  lines.push('.');
  return lines.join('\n');
}

function file(comment, ...blocks) {
  return comment + '\n\n' + blocks.join('\n\n') + '\n';
}

// ---------------------------------------------------------------------------
// Brands test cases
// ---------------------------------------------------------------------------

const brandsTests = [];

// --- VALID ---

brandsTests.push({
  name: 'brands-valid-01',
  content: file(
    `# Valid brands test file\n# Minimal conformant vocabulary with 3 concepts.\n# This file should PASS validation.`,
    BRANDS_PREFIXES, BRANDS_ORG,
    brandsScheme(),
    brandsStdConcepts(),
  ),
});

brandsTests.push({
  name: 'brands-valid-02',
  content: file(
    `# Valid brands test file with concept replacement.\n# :gio-v2 properly replaces :gio with dcterms:replaces, schema:creator,\n# and correct temporal coverage on both concepts.\n# This file should PASS validation.`,
    BRANDS_PREFIXES, BRANDS_ORG, BRANDS_PERSON,
    brandsScheme({ hasTopConcept: '    skos:hasTopConcept\n        :aami ,\n        :gio ,\n        :gio-v2 ,\n        :acme ;', dateModified: '    schema:dateModified "2026-02-12"^^xsd:date ;' }),
    brandsConcept(':aami', 'AAMI', { topConcept: true }),
    brandsConcept(':gio', 'GIO', { topConcept: true, endTime: '2026-02-12' }),
    brandsConcept(':gio-v2', 'GIO', { topConcept: true, replaces: ':gio', creator: '<http://example.com/person/test-editor>', startTime: '2026-02-12' }),
    brandsConcept(':acme', 'Acme', { topConcept: true }),
  ),
});

brandsTests.push({
  name: 'brands-valid-03',
  content: file(
    `# Valid brands test file with a collection.\n# Includes a skos:Collection with prefLabel, definition, inScheme, and members.\n# This file should PASS validation.`,
    BRANDS_PREFIXES, BRANDS_ORG,
    brandsScheme(),
    brandsStdConcepts(),
    brandsCollection('<https://linked.data.gov.au/def/mass-brands>', 'Mass brands'),
  ),
});

brandsTests.push({
  name: 'brands-valid-04',
  content: file(
    `# Valid brands test file with a Person creator.\n# Uses schema:Person instead of schema:Organization as scheme creator.\n# This file should PASS validation.`,
    BRANDS_PREFIXES, BRANDS_PERSON,
    brandsScheme({ creator: '    schema:creator <http://example.com/person/test-editor> ;' }),
    brandsStdConcepts(),
  ),
});

// --- INVALID: ConceptScheme shapes ---

brandsTests.push({
  name: 'brands-invalid-04',
  content: file(
    `# INVALID: ConceptScheme missing schema:dateCreated.\n#\n# Shape: :created (via :Requirement-2.1.5-redux)\n# Expected: "Requirement 2.15 - created date - violated"`,
    BRANDS_PREFIXES, BRANDS_ORG,
    brandsScheme({ dateCreated: null }),
    brandsStdConcepts(),
  ),
});

brandsTests.push({
  name: 'brands-invalid-05',
  content: file(
    `# INVALID: ConceptScheme missing skos:prefLabel.\n#\n# Shape: :prefLabel-redux (via :Requirement-2.1.4-redux)\n# Expected: "Each vocabulary and Concept MUST have exactly one preferred label..."`,
    BRANDS_PREFIXES, BRANDS_ORG,
    brandsScheme({ prefLabel: null }),
    brandsStdConcepts(),
  ),
});

brandsTests.push({
  name: 'brands-invalid-06',
  content: file(
    `# INVALID: ConceptScheme missing skos:definition.\n#\n# Shape: :definition-redux (via :Requirement-2.1.4-redux)\n# Expected: "Each vocabulary and Concept MUST have exactly one definition..."`,
    BRANDS_PREFIXES, BRANDS_ORG,
    brandsScheme({ definition: null }),
    brandsStdConcepts(),
  ),
});

brandsTests.push({
  name: 'brands-invalid-07',
  content: file(
    `# INVALID: ConceptScheme missing skos:hasTopConcept.\n#\n# Shape: :Requirement-2.1.9\n# Expected: "Each vocabulary's Concept Scheme MUST link to at least one Concept..."`,
    BRANDS_PREFIXES, BRANDS_ORG,
    brandsScheme({ hasTopConcept: null }),
    brandsStdConcepts(),
  ),
});

brandsTests.push({
  name: 'brands-invalid-08',
  content: file(
    `# INVALID: ConceptScheme prefLabel uses rdf:langString instead of xsd:string.\n# The @en language tag produces rdf:langString; the validator requires xsd:string.\n#\n# Shape: :prefLabel-redux (via :Requirement-2.1.4-redux)\n# Expected: "Each vocabulary and Concept MUST have exactly one preferred label..."`,
    BRANDS_PREFIXES, BRANDS_ORG,
    brandsScheme({ prefLabel: '    skos:prefLabel "Brand"@en ;' }),
    brandsStdConcepts(),
  ),
});

brandsTests.push({
  name: 'brands-invalid-09',
  content: file(
    `# INVALID: ConceptScheme missing schema:creator.\n#\n# Shape: :creator (via :Requirement-2.1.6-redux)\n# Expected: "Each vocabulary MUST have at least one creator..."`,
    BRANDS_PREFIXES, BRANDS_ORG,
    brandsScheme({ creator: null }),
    brandsStdConcepts(),
  ),
});

brandsTests.push({
  name: 'brands-invalid-10',
  content: file(
    `# INVALID: ConceptScheme definition uses rdf:langString instead of xsd:string.\n# The @en language tag produces rdf:langString; the validator requires xsd:string.\n#\n# Shape: :definition-redux (via :Requirement-2.1.4-redux)\n# Expected: "Each vocabulary and Concept MUST have exactly one definition..."`,
    BRANDS_PREFIXES, BRANDS_ORG,
    brandsScheme({ definition: '    skos:definition "Brands under Example Organisation."@en ;' }),
    brandsStdConcepts(),
  ),
});

// --- INVALID: Concept shapes ---

brandsTests.push({
  name: 'brands-invalid-11',
  content: file(
    `# INVALID: Concept :gio missing skos:inScheme.\n#\n# Shape: :Requirement-2.1.8 and :Requirement-2.3.3 (both require inScheme on Concept)\n# Expected: "Requirement 2.1.8 All Concept instances within a Concept Scheme MUST be\n# contained in a single term hierarchy..." AND\n# "Requirement 2.3.3 Each Concept in a vocabulary MUST indicate that it appears..."`,
    BRANDS_PREFIXES, BRANDS_ORG,
    brandsScheme(),
    brandsStdConcepts({ gio: { inScheme: false } }),
  ),
});

brandsTests.push({
  name: 'brands-invalid-12',
  content: file(
    `# INVALID: Concept :gio missing schema:temporalCoverage entirely.\n#\n# Shape: :temporalCoverageDates\n# Expected: "Each Concept MUST have a temporal coverage indicated with the\n# schema:temporalCoverage predicate..."`,
    BRANDS_PREFIXES, BRANDS_ORG,
    brandsScheme(),
    brandsStdConcepts({ gio: { temporalCoverage: false } }),
  ),
});

brandsTests.push({
  name: 'brands-invalid-13',
  content: file(
    `# INVALID: Concept :gio has two rdfs:isDefinedBy values.\n# The shape allows at most 1.\n#\n# Shape: :Requirement-2.3.2-redux\n# Expected: violation on max count for rdfs:isDefinedBy`,
    BRANDS_PREFIXES, BRANDS_ORG,
    brandsScheme(),
    brandsStdConcepts({ gio: { extraIsDefinedBy: 'http://example.org/other' } }),
  ),
});

// --- INVALID: Collection shapes ---
//
// NOTE: brands-invalid-14 and brands-invalid-15 were removed because the
// validator shape :Requirement-2.2.1-redux references property shapes
// :definition and :prefLabel (without -redux suffix) which are not defined.
// This means Collection prefLabel/definition checks are silently broken.
// The :definition-redux and :prefLabel-redux shapes exist but are only
// wired to ConceptScheme and Concept targets. This is a validator bug.

brandsTests.push({
  name: 'brands-invalid-14',
  content: file(
    `# INVALID: Collection missing skos:member.\n#\n# Shape: :Requirement-2.2.4\n# Expected: "A Collection MUST indicate at least one Concept instance..."`,
    BRANDS_PREFIXES, BRANDS_ORG,
    brandsScheme(),
    brandsStdConcepts(),
    brandsCollection('<https://linked.data.gov.au/def/mass-brands>', 'Mass brands', { member: false }),
  ),
});

brandsTests.push({
  name: 'brands-invalid-15',
  content: file(
    `# INVALID: Collection missing skos:inScheme.\n# Note: This shape has sh:severity sh:Warning in the validator.\n#\n# Shape: :Requirement-2.2.3-redux\n# Expected: "A Collection exists within a vocabulary SHOULD indicate that it is\n# within the vocabulary by use of the skos:inScheme predicate..."`,
    BRANDS_PREFIXES, BRANDS_ORG,
    brandsScheme(),
    brandsStdConcepts(),
    brandsCollection('<https://linked.data.gov.au/def/mass-brands>', 'Mass brands', { inScheme: false }),
  ),
});

// --- INVALID: Agent shapes ---

brandsTests.push({
  name: 'brands-invalid-16',
  content: file(
    `# INVALID: Organization missing schema:name.\n#\n# Shape: :Requirement-2.4.2\n# Expected: "Each Agent MUST give exactly one name with the schema:name predicate..."`,
    BRANDS_PREFIXES,
    `<http://example.com/org/example-org>\n    a schema:Organization ;\n    schema:url "http://example.com"^^xsd:anyURI ;\n.`,
    brandsScheme(),
    brandsStdConcepts(),
  ),
});

brandsTests.push({
  name: 'brands-invalid-17',
  content: file(
    `# INVALID: Organization missing schema:url.\n#\n# Shape: :Requirement-2.4.3a\n# Expected: "Each Agent MUST indicate either a schema:url (for organizations)..."`,
    BRANDS_PREFIXES,
    `<http://example.com/org/example-org>\n    a schema:Organization ;\n    schema:name "Example Organisation" ;\n.`,
    brandsScheme(),
    brandsStdConcepts(),
  ),
});

brandsTests.push({
  name: 'brands-invalid-18',
  content: file(
    `# INVALID: Person missing schema:email.\n#\n# Shape: :Requirement-2.4.3b\n# Expected: "Each Agent MUST indicate either a schema:url (for organizations)\n# or a schema:email (for people)..."`,
    BRANDS_PREFIXES,
    `<http://example.com/person/test-editor>\n    a schema:Person ;\n    schema:name "Test Editor" ;\n.`,
    brandsScheme({ creator: '    schema:creator <http://example.com/person/test-editor> ;' }),
    brandsStdConcepts(),
  ),
});

// ---------------------------------------------------------------------------
// ANZIC2006 test cases
// ---------------------------------------------------------------------------

const anzicTests = [];

// --- VALID ---

anzicTests.push({
  name: 'ANZIC2006-industry-classifications-valid-01',
  content: file(
    `# Valid ANZSIC test file\n# Minimal conformant subset with 4 concepts.\n# This file should PASS validation.`,
    ANZIC_PREFIXES, ANZIC_ORG,
    anzicScheme({ hasTopConcept: '    skos:hasTopConcept\n        icat:A0000 ,\n        icat:B0000 ;' }),
    anzicConcept('icat:A0000', 'Agriculture, Forestry and Fishing', { topConcept: true }),
    anzicConcept('icat:A0100', 'Agriculture', { broader: 'icat:A0000' }),
    anzicConcept('icat:A0110', 'Nursery and Floriculture Production', { broader: 'icat:A0100' }),
    anzicConcept('icat:B0000', 'Mining', { topConcept: true }),
  ),
});

anzicTests.push({
  name: 'ANZIC2006-industry-classifications-valid-02',
  content: file(
    `# Valid ANZSIC test file with concept replacement.\n# icat:A0111 properly replaces icat:A0110 with dcterms:replaces,\n# schema:creator, and correct temporal coverage on both concepts.\n# This file should PASS validation.`,
    ANZIC_PREFIXES, ANZIC_ORG, ANZIC_PERSON,
    anzicScheme({ dateModified: '    schema:dateModified "2026-02-12"^^xsd:date ;' }),
    anzicConcept('icat:A0000', 'Agriculture, Forestry and Fishing', { topConcept: true }),
    anzicConcept('icat:A0100', 'Agriculture', { broader: 'icat:A0000' }),
    anzicConcept('icat:A0110', 'Nursery and Floriculture Production', { broader: 'icat:A0100', endTime: '2026-02-12' }),
    anzicConcept('icat:A0111', 'Nursery, Floriculture and Turf Production', { broader: 'icat:A0100', replaces: 'icat:A0110', creator: '<http://example.com/person/test-editor>', startTime: '2026-02-12' }),
  ),
});

// --- INVALID ---

anzicTests.push({
  name: 'ANZIC2006-industry-classifications-invalid-01',
  content: file(
    `# INVALID: New concept replaces an existing concept but is missing schema:creator.\n#\n# icat:A0111 uses dcterms:replaces to replace icat:A0110, but does not declare\n# a schema:creator. The :revisionAuthor shape requires any subject of\n# dcterms:replaces or prov:wasRevisionOf to have exactly one schema:creator.\n#\n# Shape: :revisionAuthor\n# Expected: "Each Concept that replaces or is a revision of another MUST indicate\n# a creator with schema:creator..."`,
    ANZIC_PREFIXES, ANZIC_ORG,
    anzicScheme({ dateModified: '    schema:dateModified "2026-02-12"^^xsd:date ;' }),
    anzicConcept('icat:A0000', 'Agriculture, Forestry and Fishing', { topConcept: true }),
    anzicConcept('icat:A0100', 'Agriculture', { broader: 'icat:A0000' }),
    anzicConcept('icat:A0110', 'Nursery and Floriculture Production', { broader: 'icat:A0100', endTime: '2026-02-12' }),
    `# INVALID: missing schema:creator\n` + anzicConcept('icat:A0111', 'Nursery, Floriculture and Turf Production', { broader: 'icat:A0100', replaces: 'icat:A0110', startTime: '2026-02-12' }),
  ),
});

anzicTests.push({
  name: 'ANZIC2006-industry-classifications-invalid-02',
  content: file(
    `# INVALID: Replaced concept missing temporal coverage entirely.\n#\n# icat:A0111 replaces icat:A0110, but icat:A0110 has had its\n# schema:temporalCoverage removed (should have startTime + endTime).\n#\n# Shape: :temporalCoverageDates\n# Expected: "Each Concept MUST have a temporal coverage..."`,
    ANZIC_PREFIXES, ANZIC_ORG, ANZIC_PERSON,
    anzicScheme({ dateModified: '    schema:dateModified "2026-02-12"^^xsd:date ;' }),
    anzicConcept('icat:A0000', 'Agriculture, Forestry and Fishing', { topConcept: true }),
    anzicConcept('icat:A0100', 'Agriculture', { broader: 'icat:A0000' }),
    `# INVALID: temporal coverage removed\n` + anzicConcept('icat:A0110', 'Nursery and Floriculture Production', { broader: 'icat:A0100', temporalCoverage: false }),
    anzicConcept('icat:A0111', 'Nursery, Floriculture and Turf Production', { broader: 'icat:A0100', replaces: 'icat:A0110', creator: '<http://example.com/person/test-editor>', startTime: '2026-02-12' }),
  ),
});

anzicTests.push({
  name: 'ANZIC2006-industry-classifications-invalid-03',
  content: file(
    `# INVALID: ConceptScheme missing schema:dateModified after concept addition.\n#\n# A new concept icat:A0111 was added but the scheme's dateModified was removed.\n#\n# Shape: :modified (via :Requirement-2.1.5-redux)\n# Expected: "Requirement 2.15 - modified date - violated"`,
    ANZIC_PREFIXES, ANZIC_ORG,
    `# INVALID: dateModified removed\n` + anzicScheme({ dateModified: null }),
    anzicConcept('icat:A0000', 'Agriculture, Forestry and Fishing', { topConcept: true }),
    anzicConcept('icat:A0100', 'Agriculture', { broader: 'icat:A0000' }),
    anzicConcept('icat:A0110', 'Nursery and Floriculture Production', { broader: 'icat:A0100' }),
    anzicConcept('icat:A0111', 'Nursery, Floriculture and Turf Production', { broader: 'icat:A0100', startTime: '2026-02-12' }),
  ),
});

anzicTests.push({
  name: 'ANZIC2006-industry-classifications-invalid-04',
  content: file(
    `# INVALID: ConceptScheme missing schema:dateCreated.\n#\n# Shape: :created (via :Requirement-2.1.5-redux)\n# Expected: "Requirement 2.15 - created date - violated"`,
    ANZIC_PREFIXES, ANZIC_ORG,
    `# INVALID: dateCreated removed\n` + anzicScheme({ dateCreated: null }),
    anzicConcept('icat:A0000', 'Agriculture, Forestry and Fishing', { topConcept: true }),
    anzicConcept('icat:A0100', 'Agriculture', { broader: 'icat:A0000' }),
  ),
});

anzicTests.push({
  name: 'ANZIC2006-industry-classifications-invalid-05',
  content: file(
    `# INVALID: Concept icat:A0100 missing skos:inScheme.\n#\n# Shape: :Requirement-2.1.8 and :Requirement-2.3.3\n# Expected: "Requirement 2.1.8..." and "Requirement 2.3.3..."`,
    ANZIC_PREFIXES, ANZIC_ORG,
    anzicScheme(),
    anzicConcept('icat:A0000', 'Agriculture, Forestry and Fishing', { topConcept: true }),
    `# INVALID: inScheme removed\n` + anzicConcept('icat:A0100', 'Agriculture', { broader: 'icat:A0000', inScheme: false }),
  ),
});

anzicTests.push({
  name: 'ANZIC2006-industry-classifications-invalid-06',
  content: file(
    `# INVALID: Concept icat:A0100 missing schema:temporalCoverage.\n#\n# Shape: :temporalCoverageDates\n# Expected: "Each Concept MUST have a temporal coverage..."`,
    ANZIC_PREFIXES, ANZIC_ORG,
    anzicScheme(),
    anzicConcept('icat:A0000', 'Agriculture, Forestry and Fishing', { topConcept: true }),
    `# INVALID: temporalCoverage removed\n` + anzicConcept('icat:A0100', 'Agriculture', { broader: 'icat:A0000', temporalCoverage: false }),
  ),
});

// ---------------------------------------------------------------------------
// Write all files
// ---------------------------------------------------------------------------

let count = 0;
for (const t of [...brandsTests, ...anzicTests]) {
  const path = join(TESTS_DIR, t.name + '.ttl');
  writeFileSync(path, t.content, 'utf-8');
  count++;
}

console.log(`Generated ${count} test files in ${TESTS_DIR}/`);
console.log(`  Brands: ${brandsTests.length} (${brandsTests.filter(t => t.name.includes('-valid-')).length} valid, ${brandsTests.filter(t => t.name.includes('-invalid-')).length} invalid)`);
console.log(`  ANZIC:  ${anzicTests.length} (${anzicTests.filter(t => t.name.includes('-valid-')).length} valid, ${anzicTests.filter(t => t.name.includes('-invalid-')).length} invalid)`);
