/**
 * Profile Generator Utility
 *
 * Generates valid Turtle (TTL) content for prez:ObjectProfile definitions
 * from a structured builder state object.
 */

import type { PrezGenerateFlags } from './shacl-profile-parser'

export interface ProfileBuilderState {
  // Profile metadata
  iriBase: string
  identifier: string
  title: string
  description: string

  // Target class
  targetClass: string

  // Source predicates (order matters)
  labelSources: string[]
  descriptionSources: string[]
  provenanceSources: string[]

  // Generation flags
  generate: PrezGenerateFlags

  // Output formats
  defaultFormat: string
  formats: string[]

  // Link templates
  linkTemplate: string
  membersTemplate: string
}

// Common namespace prefixes
const PREFIXES: Record<string, string> = {
  prof: 'http://www.w3.org/ns/dx/prof/',
  sh: 'http://www.w3.org/ns/shacl#',
  dcterms: 'http://purl.org/dc/terms/',
  xsd: 'http://www.w3.org/2001/XMLSchema#',
  skos: 'http://www.w3.org/2004/02/skos/core#',
  prez: 'https://prez.dev/',
  'altr-ext': 'http://www.w3.org/ns/dx/connegp/altr-ext#',
  rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
  schema: 'https://schema.org/',
  prov: 'http://www.w3.org/ns/prov#',
  dc: 'http://purl.org/dc/elements/1.1/',
}

/**
 * Convert a full IRI to prefixed notation if possible
 */
function toPrefixed(iri: string): string {
  for (const [prefix, ns] of Object.entries(PREFIXES)) {
    if (iri.startsWith(ns)) {
      const localName = iri.slice(ns.length)
      return `${prefix}:${localName}`
    }
  }
  return `<${iri}>`
}

/**
 * Escape a string for use in Turtle literals
 */
function escapeTurtleString(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
}

/**
 * Get required prefixes based on IRIs used in the profile
 */
function getRequiredPrefixes(state: ProfileBuilderState): Set<string> {
  const prefixes = new Set<string>()

  // Always include these core prefixes
  prefixes.add('prof')
  prefixes.add('sh')
  prefixes.add('dcterms')
  prefixes.add('xsd')
  prefixes.add('prez')
  prefixes.add('altr-ext')

  // Check target class
  for (const [prefix, ns] of Object.entries(PREFIXES)) {
    if (state.targetClass.startsWith(ns)) {
      prefixes.add(prefix)
    }
  }

  // Check all source predicates
  const allSources = [...state.labelSources, ...state.descriptionSources, ...state.provenanceSources]
  for (const source of allSources) {
    for (const [prefix, ns] of Object.entries(PREFIXES)) {
      if (source.startsWith(ns)) {
        prefixes.add(prefix)
      }
    }
  }

  return prefixes
}

/**
 * Generate TTL content from builder state
 */
export function generateProfileTTL(state: ProfileBuilderState): string {
  const lines: string[] = []

  // Generate prefix declarations
  const requiredPrefixes = getRequiredPrefixes(state)
  for (const prefix of Array.from(requiredPrefixes).sort()) {
    lines.push(`@prefix ${prefix}: <${PREFIXES[prefix]}> .`)
  }
  lines.push('')

  // Profile IRI
  const profileIri = state.iriBase
    ? `<${state.iriBase}${state.identifier || 'my-profile'}>`
    : `prez:${state.identifier || 'MyProfile'}`

  // Profile declaration
  lines.push(`${profileIri} a prof:Profile, sh:NodeShape, prez:ObjectProfile ;`)

  // Identifier
  if (state.identifier) {
    lines.push(`    dcterms:identifier "${escapeTurtleString(state.identifier)}"^^xsd:token ;`)
  }

  // Title
  if (state.title) {
    lines.push(`    dcterms:title "${escapeTurtleString(state.title)}" ;`)
  }

  // Description
  if (state.description) {
    lines.push(`    dcterms:description "${escapeTurtleString(state.description)}" ;`)
  }

  // Target class
  if (state.targetClass) {
    const prefixedClass = toPrefixed(state.targetClass)
    lines.push(`    `)
    lines.push(`    # Target class this profile applies to`)
    lines.push(`    sh:targetClass ${prefixedClass} ;`)
    lines.push(`    altr-ext:constrainsClass ${prefixedClass} ;`)
  }

  // Output formats
  if (state.defaultFormat || state.formats.length > 0) {
    lines.push(`    `)
    lines.push(`    # Supported output formats`)
    if (state.defaultFormat) {
      lines.push(`    altr-ext:hasDefaultResourceFormat "${state.defaultFormat}" ;`)
    }
    for (const format of state.formats) {
      lines.push(`    altr-ext:hasResourceFormat "${format}" ;`)
    }
  }

  // Source predicates
  const hasLabelSources = state.labelSources.length > 0
  const hasDescriptionSources = state.descriptionSources.length > 0
  const hasProvenanceSources = state.provenanceSources.length > 0

  if (hasLabelSources || hasDescriptionSources || hasProvenanceSources) {
    lines.push(`    `)
    lines.push(`    # Source predicates for prez annotations`)

    if (hasLabelSources) {
      const sources = state.labelSources.map(toPrefixed).join(', ')
      lines.push(`    prez:labelSource ${sources} ;`)
    }

    if (hasDescriptionSources) {
      const sources = state.descriptionSources.map(toPrefixed).join(', ')
      lines.push(`    prez:descriptionSource ${sources} ;`)
    }

    if (hasProvenanceSources) {
      const sources = state.provenanceSources.map(toPrefixed).join(', ')
      lines.push(`    prez:provenanceSource ${sources} ;`)
    }
  }

  // Generation flags
  const activeFlags = Object.entries(state.generate).filter(([_, v]) => v)
  if (activeFlags.length > 0) {
    lines.push(`    `)
    lines.push(`    # Prez-specific annotations to generate`)
    for (const [flag, _] of activeFlags) {
      const camelFlag = flag.charAt(0).toUpperCase() + flag.slice(1)
      lines.push(`    prez:generate${camelFlag} true ;`)
    }
  }

  // Link templates
  if (state.linkTemplate || state.membersTemplate) {
    lines.push(`    `)
    lines.push(`    # Link templates`)
    if (state.linkTemplate) {
      lines.push(`    prez:linkTemplate "${escapeTurtleString(state.linkTemplate)}" ;`)
    }
    if (state.membersTemplate) {
      lines.push(`    prez:membersTemplate "${escapeTurtleString(state.membersTemplate)}" ;`)
    }
  }

  // Close the profile - replace last semicolon with period
  const lastLine = lines[lines.length - 1]
  if (lastLine && lastLine.endsWith(' ;')) {
    lines[lines.length - 1] = lastLine.slice(0, -2) + ' .'
  } else {
    lines.push('    .')
  }

  return lines.join('\n')
}

/**
 * Create default/empty builder state
 */
export function createDefaultBuilderState(): ProfileBuilderState {
  return {
    iriBase: '',
    identifier: '',
    title: '',
    description: '',
    targetClass: 'http://www.w3.org/2004/02/skos/core#ConceptScheme',
    labelSources: [],
    descriptionSources: [],
    provenanceSources: [],
    generate: {
      identifier: true,
      link: true,
      members: false,
      label: true,
      description: true,
      provenance: false,
      focusNode: true,
    },
    defaultFormat: 'text/anot-turtle',
    formats: ['text/anot-turtle', 'text/turtle', 'application/ld+json'],
    linkTemplate: '',
    membersTemplate: '',
  }
}

/**
 * Example profile state for demonstration
 */
export function createExampleBuilderState(): ProfileBuilderState {
  return {
    iriBase: 'https://example.org/profiles/',
    identifier: 'my-concept-scheme-profile',
    title: 'My Concept Scheme Profile',
    description: 'A profile for rendering SKOS Concept Schemes',
    targetClass: 'http://www.w3.org/2004/02/skos/core#ConceptScheme',
    labelSources: [
      'http://www.w3.org/2004/02/skos/core#prefLabel',
      'http://purl.org/dc/terms/title',
      'http://www.w3.org/2000/01/rdf-schema#label',
    ],
    descriptionSources: [
      'http://www.w3.org/2004/02/skos/core#definition',
      'http://purl.org/dc/terms/description',
    ],
    provenanceSources: [
      'http://purl.org/dc/terms/provenance',
    ],
    generate: {
      identifier: true,
      link: true,
      members: true,
      label: true,
      description: true,
      provenance: true,
      focusNode: true,
    },
    defaultFormat: 'text/anot-turtle',
    formats: [
      'text/anot-turtle',
      'text/turtle',
      'application/ld+json',
      'application/rdf+xml',
      'text/csv',
    ],
    linkTemplate: '/catalogs/{catalogId}/collections/{schemeId}',
    membersTemplate: '/catalogs/{catalogId}/collections/{schemeId}/items',
  }
}
