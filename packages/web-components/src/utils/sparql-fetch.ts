/**
 * SPARQL endpoint fetching utilities for prez-list web component.
 * Provides lazy-loading tree queries with profile-driven predicate resolution.
 */

import type { VocabTreeNode } from './fetch-vocab.js'

/** Tree node with lazy-loading metadata for SPARQL mode */
export interface SparqlTreeNode extends VocabTreeNode {
  hasChildren: boolean
  childrenLoaded: boolean
  loading: boolean
}

/** Configuration for SPARQL queries */
export interface SparqlConfig {
  endpoint: string
  schemeIri: string
  namedGraph?: string
  timeout?: number
  /** Ordered predicate IRIs for label resolution (COALESCE fallback chain) */
  labelPredicates?: string[]
  /** Ordered predicate IRIs for description resolution (COALESCE fallback chain) */
  descriptionPredicates?: string[]
}

const DEFAULT_LABEL_PREDICATES = [
  'http://www.w3.org/2004/02/skos/core#prefLabel',
  'http://purl.org/dc/terms/title',
  'http://www.w3.org/2000/01/rdf-schema#label'
]

const DEFAULT_DESCRIPTION_PREDICATES = [
  'http://www.w3.org/2004/02/skos/core#definition',
  'http://purl.org/dc/terms/description'
]

/** Known prefix map for readable SPARQL queries */
const PREFIXES: Record<string, string> = {
  'http://www.w3.org/2004/02/skos/core#': 'skos:',
  'http://purl.org/dc/terms/': 'dcterms:',
  'http://www.w3.org/2000/01/rdf-schema#': 'rdfs:',
  'http://www.w3.org/1999/02/22-rdf-syntax-ns#': 'rdf:'
}

function prefixed(iri: string): string {
  for (const [ns, prefix] of Object.entries(PREFIXES)) {
    if (iri.startsWith(ns)) {
      return prefix + iri.slice(ns.length)
    }
  }
  return `<${iri}>`
}

function prefixDeclarations(predicates: string[]): string {
  const needed = new Set<string>()
  for (const pred of predicates) {
    for (const [ns, prefix] of Object.entries(PREFIXES)) {
      if (pred.startsWith(ns)) {
        needed.add(`PREFIX ${prefix.slice(0, -1)}: <${ns}>`)
      }
    }
  }
  // Always include skos
  needed.add('PREFIX skos: <http://www.w3.org/2004/02/skos/core#>')
  return [...needed].join('\n')
}

/**
 * Build OPTIONAL + BIND(COALESCE(...)) pattern for a list of predicates.
 * Each predicate gets its own OPTIONAL block with language filter,
 * then COALESCE picks the first available value.
 */
function buildPredicateResolution(
  subject: string,
  predicates: string[],
  bindVar: string,
  filterLang: boolean
): string {
  const optionals: string[] = []
  const vars: string[] = []

  predicates.forEach((pred, i) => {
    const tmpVar = `?_${bindVar}${i + 1}`
    vars.push(tmpVar)
    const langFilter = filterLang
      ? ` . FILTER(LANG(${tmpVar}) = "" || LANG(${tmpVar}) = "en")`
      : ''
    optionals.push(`  OPTIONAL { ${subject} ${prefixed(pred)} ${tmpVar}${langFilter} }`)
  })

  const coalesce = `  BIND(COALESCE(${vars.join(', ')}) AS ?${bindVar})`
  return [...optionals, coalesce].join('\n')
}

function wrapGraph(body: string, namedGraph?: string): string {
  if (!namedGraph) return body
  return `  GRAPH <${namedGraph}> {\n${body}\n  }`
}

interface SparqlBinding {
  type: string
  value: string
  datatype?: string
}

interface SparqlResult {
  [key: string]: SparqlBinding
}

interface SparqlResponse {
  results: {
    bindings: SparqlResult[]
  }
}

/** Execute a SPARQL SELECT query via POST, returning parsed JSON results */
async function executeSparql(
  endpoint: string,
  query: string,
  timeout = 10000
): Promise<SparqlResponse> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/sparql-results+json'
      },
      body: `query=${encodeURIComponent(query)}`,
      signal: controller.signal
    })

    if (!response.ok) {
      throw new Error(`SPARQL query failed: ${response.status} ${response.statusText}`)
    }

    return await response.json() as SparqlResponse
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error(`SPARQL query timed out after ${timeout}ms`)
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
}

function getVal(binding: SparqlResult, key: string): string | undefined {
  return binding[key]?.value
}

function getCount(binding: SparqlResult, key: string): number {
  const val = binding[key]?.value
  return val ? parseInt(val, 10) : 0
}

function bindingsToNodes(bindings: SparqlResult[]): SparqlTreeNode[] {
  return bindings.map(b => ({
    iri: getVal(b, 'concept')!,
    label: getVal(b, 'label') || getVal(b, 'concept')!.split(/[#/]/).pop() || '',
    notation: getVal(b, 'notation'),
    description: getVal(b, 'definition'),
    children: [],
    hasChildren: getCount(b, 'childCount') > 0,
    childrenLoaded: false,
    loading: false
  }))
}

function resolvePredicates(config: SparqlConfig) {
  return {
    labels: config.labelPredicates ?? DEFAULT_LABEL_PREDICATES,
    descriptions: config.descriptionPredicates ?? DEFAULT_DESCRIPTION_PREDICATES
  }
}

/** Fetch top concepts of a ConceptScheme with child counts */
export async function fetchTopConcepts(config: SparqlConfig): Promise<SparqlTreeNode[]> {
  const { labels, descriptions } = resolvePredicates(config)
  const allPreds = [...labels, ...descriptions]

  const graphBody = [
    `    ?concept skos:topConceptOf <${config.schemeIri}> .`,
    buildPredicateResolution('?concept', labels, 'label', true),
    '    OPTIONAL { ?concept skos:notation ?notation }',
    buildPredicateResolution('?concept', descriptions, 'definition', false),
    '    OPTIONAL { ?child skos:broader ?concept }'
  ].join('\n')

  const query = `${prefixDeclarations(allPreds)}

SELECT ?concept ?label ?notation ?definition (COUNT(?child) AS ?childCount)
WHERE {
${wrapGraph(graphBody, config.namedGraph)}
}
GROUP BY ?concept ?label ?notation ?definition
ORDER BY ?label`

  const result = await executeSparql(config.endpoint, query, config.timeout)
  return bindingsToNodes(result.results.bindings)
}

/** Fetch narrower concepts of a parent concept with child counts */
export async function fetchNarrowerConcepts(
  config: SparqlConfig,
  parentIri: string
): Promise<SparqlTreeNode[]> {
  const { labels, descriptions } = resolvePredicates(config)
  const allPreds = [...labels, ...descriptions]

  const graphBody = [
    `    ?concept skos:broader <${parentIri}> .`,
    buildPredicateResolution('?concept', labels, 'label', true),
    '    OPTIONAL { ?concept skos:notation ?notation }',
    buildPredicateResolution('?concept', descriptions, 'definition', false),
    '    OPTIONAL { ?child skos:broader ?concept }'
  ].join('\n')

  const query = `${prefixDeclarations(allPreds)}

SELECT ?concept ?label ?notation ?definition (COUNT(?child) AS ?childCount)
WHERE {
${wrapGraph(graphBody, config.namedGraph)}
}
GROUP BY ?concept ?label ?notation ?definition
ORDER BY ?label`

  const result = await executeSparql(config.endpoint, query, config.timeout)
  return bindingsToNodes(result.results.bindings)
}

/** Search concepts by label text match */
export async function fetchSearchConcepts(
  config: SparqlConfig,
  searchTerm: string,
  limit = 50
): Promise<SparqlTreeNode[]> {
  const { labels, descriptions } = resolvePredicates(config)
  const allPreds = [...labels, ...descriptions]

  // Escape special characters for SPARQL string
  const escapedTerm = searchTerm.replace(/\\/g, '\\\\').replace(/"/g, '\\"')

  const graphBody = [
    `    ?concept skos:inScheme <${config.schemeIri}> .`,
    buildPredicateResolution('?concept', labels, 'label', true),
    `    FILTER(CONTAINS(LCASE(?label), LCASE("${escapedTerm}")))`,
    '    OPTIONAL { ?concept skos:notation ?notation }',
    buildPredicateResolution('?concept', descriptions, 'definition', false)
  ].join('\n')

  const query = `${prefixDeclarations(allPreds)}

SELECT ?concept ?label ?notation ?definition
WHERE {
${wrapGraph(graphBody, config.namedGraph)}
}
ORDER BY ?label
LIMIT ${limit}`

  const result = await executeSparql(config.endpoint, query, config.timeout)
  // Search results don't need child count — they're flat
  return result.results.bindings.map(b => ({
    iri: getVal(b, 'concept')!,
    label: getVal(b, 'label') || getVal(b, 'concept')!.split(/[#/]/).pop() || '',
    notation: getVal(b, 'notation'),
    description: getVal(b, 'definition'),
    children: [],
    hasChildren: false,
    childrenLoaded: true,
    loading: false
  }))
}

/** Fetch ConceptScheme metadata (label and description) */
export async function fetchSchemeMetadata(
  config: SparqlConfig
): Promise<{ label: string; description: string }> {
  const { labels, descriptions } = resolvePredicates(config)
  const allPreds = [...labels, ...descriptions]

  const graphBody = [
    `    BIND(<${config.schemeIri}> AS ?scheme)`,
    buildPredicateResolution('?scheme', labels, 'label', true),
    buildPredicateResolution('?scheme', descriptions, 'description', false)
  ].join('\n')

  const query = `${prefixDeclarations(allPreds)}

SELECT ?label ?description
WHERE {
${wrapGraph(graphBody, config.namedGraph)}
}
LIMIT 1`

  const result = await executeSparql(config.endpoint, query, config.timeout)
  const binding = result.results.bindings[0]

  return {
    label: getVal(binding, 'label') || config.schemeIri.split(/[#/]/).pop() || 'Vocabulary',
    description: getVal(binding, 'description') || ''
  }
}
