#!/usr/bin/env node
/**
 * Download vocabulary labels from a SPARQL endpoint
 * 
 * Usage:
 *   node download-vocab-labels.js <sparql-endpoint> <vocab-iri> <output-file>
 * 
 * Example:
 *   node download-vocab-labels.js \
 *     https://ga-api.vocabs.ga.gov.au/sparql \
 *     https://pid.geoscience.gov.au/def/voc/ga/BoreholesSamplingMethod \
 *     examples/ga-vocab-ref/supplemental/boreholes-sampling-method.ttl
 */

import { writeFile } from 'fs/promises';
import { join, dirname, isAbsolute } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PACKAGE_DIR = join(__dirname, '..');

/**
 * Execute a SPARQL query against an endpoint
 */
async function sparqlQuery(endpoint, query) {
  const url = new URL(endpoint);
  url.searchParams.set('query', query);
  
  const response = await fetch(url.toString(), {
    headers: {
      'Accept': 'application/sparql-results+json'
    }
  });
  
  if (!response.ok) {
    throw new Error(`SPARQL query failed: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Download all concepts and their labels from a vocabulary
 */
async function downloadVocabLabels(endpoint, vocabIri) {
  console.log(`📥 Downloading labels from ${vocabIri}`);
  console.log(`   Endpoint: ${endpoint}\n`);
  
  // Query for all concepts with their labels and definitions
  const query = `
    PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
    PREFIX dcterms: <http://purl.org/dc/terms/>
    PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
    
    SELECT ?concept ?prefLabel ?definition ?broader ?narrower ?topConceptOf ?identifier
    WHERE {
      ?concept skos:inScheme <${vocabIri}> .
      ?concept skos:prefLabel ?prefLabel .
      OPTIONAL { ?concept skos:definition ?definition }
      OPTIONAL { ?concept skos:broader ?broader }
      OPTIONAL { ?concept skos:narrower ?narrower }
      OPTIONAL { ?concept skos:topConceptOf ?topConceptOf }
      OPTIONAL { ?concept dcterms:identifier ?identifier }
    }
  `;
  
  const result = await sparqlQuery(endpoint, query);
  
  console.log(`   Found ${result.results.bindings.length} concept bindings\n`);
  
  // Also query for the scheme itself
  const schemeQuery = `
    PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
    PREFIX dcterms: <http://purl.org/dc/terms/>
    PREFIX owl: <http://www.w3.org/2002/07/owl#>
    PREFIX dcat: <http://www.w3.org/ns/dcat#>
    PREFIX sdo: <https://schema.org/>
    PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
    
    SELECT ?p ?o
    WHERE {
      <${vocabIri}> ?p ?o .
    }
  `;
  
  const schemeResult = await sparqlQuery(endpoint, schemeQuery);
  
  console.log(`   Found ${schemeResult.results.bindings.length} scheme properties\n`);
  
  return {
    vocabIri,
    conceptBindings: result.results.bindings,
    schemeBindings: schemeResult.results.bindings
  };
}

/**
 * Convert SPARQL results to Turtle format
 */
function toTurtle(data) {
  const { vocabIri, conceptBindings, schemeBindings } = data;
  
  const lines = [];
  
  // Prefixes
  lines.push('@prefix skos: <http://www.w3.org/2004/02/skos/core#> .');
  lines.push('@prefix dcterms: <http://purl.org/dc/terms/> .');
  lines.push('@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .');
  lines.push('@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .');
  lines.push('@prefix owl: <http://www.w3.org/2002/07/owl#> .');
  lines.push('@prefix dcat: <http://www.w3.org/ns/dcat#> .');
  lines.push('@prefix sdo: <https://schema.org/> .');
  lines.push('@prefix prov: <http://www.w3.org/ns/prov#> .');
  lines.push('');
  
  // Collect unique concepts with their properties
  const concepts = new Map();
  
  for (const binding of conceptBindings) {
    const conceptUri = binding.concept.value;
    
    if (!concepts.has(conceptUri)) {
      concepts.set(conceptUri, {
        uri: conceptUri,
        prefLabel: null,
        definition: null,
        broader: new Set(),
        narrower: new Set(),
        topConceptOf: null,
        identifier: null
      });
    }
    
    const concept = concepts.get(conceptUri);
    
    if (binding.prefLabel) {
      concept.prefLabel = binding.prefLabel;
    }
    if (binding.definition) {
      concept.definition = binding.definition;
    }
    if (binding.broader) {
      concept.broader.add(binding.broader.value);
    }
    if (binding.narrower) {
      concept.narrower.add(binding.narrower.value);
    }
    if (binding.topConceptOf) {
      concept.topConceptOf = binding.topConceptOf.value;
    }
    if (binding.identifier) {
      concept.identifier = binding.identifier;
    }
  }
  
  // Output scheme
  lines.push(`# ConceptScheme: ${vocabIri}`);
  lines.push(`<${vocabIri}> a skos:ConceptScheme ;`);
  
  // Add scheme properties from query
  const schemeProps = [];
  for (const binding of schemeBindings) {
    const pred = binding.p.value;
    const obj = binding.o;
    
    // Skip rdf:type since we already declared it
    if (pred === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type') continue;
    
    if (obj.type === 'literal') {
      const lang = obj['xml:lang'] ? `@${obj['xml:lang']}` : '';
      const datatype = obj.datatype ? `^^<${obj.datatype}>` : '';
      const value = obj.value.replace(/"/g, '\\"').replace(/\n/g, '\\n');
      schemeProps.push(`    <${pred}> "${value}"${lang}${datatype}`);
    } else if (obj.type === 'uri') {
      schemeProps.push(`    <${pred}> <${obj.value}>`);
    }
  }
  
  if (schemeProps.length > 0) {
    lines.push(schemeProps.join(' ;\n') + ' .');
  } else {
    // Remove trailing semicolon if no additional props
    lines[lines.length - 1] = lines[lines.length - 1].replace(' ;', ' .');
  }
  
  lines.push('');
  
  // Output each concept
  for (const [uri, concept] of concepts) {
    lines.push(`<${uri}> a skos:Concept ;`);
    lines.push(`    skos:inScheme <${vocabIri}> ;`);
    
    if (concept.prefLabel) {
      const lang = concept.prefLabel['xml:lang'] ? `@${concept.prefLabel['xml:lang']}` : '';
      const value = concept.prefLabel.value.replace(/"/g, '\\"');
      lines.push(`    skos:prefLabel "${value}"${lang} ;`);
    }
    
    if (concept.definition) {
      const lang = concept.definition['xml:lang'] ? `@${concept.definition['xml:lang']}` : '';
      const value = concept.definition.value.replace(/"/g, '\\"').replace(/\n/g, '\\n');
      lines.push(`    skos:definition "${value}"${lang} ;`);
    }
    
    if (concept.identifier) {
      const datatype = concept.identifier.datatype ? `^^<${concept.identifier.datatype}>` : '';
      lines.push(`    dcterms:identifier "${concept.identifier.value}"${datatype} ;`);
    }
    
    if (concept.topConceptOf) {
      lines.push(`    skos:topConceptOf <${concept.topConceptOf}> ;`);
    }
    
    for (const broader of concept.broader) {
      lines.push(`    skos:broader <${broader}> ;`);
    }
    
    for (const narrower of concept.narrower) {
      lines.push(`    skos:narrower <${narrower}> ;`);
    }
    
    // Replace last semicolon with period
    lines[lines.length - 1] = lines[lines.length - 1].replace(/ ;$/, ' .');
    lines.push('');
  }
  
  return lines.join('\n');
}

/**
 * Main entry point
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 3) {
    console.log('Usage: node download-vocab-labels.js <sparql-endpoint> <vocab-iri> <output-file>');
    console.log('');
    console.log('Example:');
    console.log('  node download-vocab-labels.js \\');
    console.log('    https://ga-api.vocabs.ga.gov.au/sparql \\');
    console.log('    https://pid.geoscience.gov.au/def/voc/ga/BoreholesSamplingMethod \\');
    console.log('    examples/ga-vocab-ref/supplemental/boreholes-sampling-method.ttl');
    process.exit(1);
  }
  
  const [endpoint, vocabIri, outputPath] = args;
  const fullOutputPath = isAbsolute(outputPath) ? outputPath : join(PACKAGE_DIR, outputPath);
  
  try {
    const data = await downloadVocabLabels(endpoint, vocabIri);
    const turtle = toTurtle(data);
    
    await writeFile(fullOutputPath, turtle, 'utf-8');
    
    console.log(`✅ Saved to ${fullOutputPath}`);
    console.log(`   Concepts: ${data.conceptBindings.length > 0 ? new Set(data.conceptBindings.map(b => b.concept.value)).size : 0}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
