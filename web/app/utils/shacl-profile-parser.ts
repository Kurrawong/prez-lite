/**
 * SHACL Profile Parser
 *
 * Parses SHACL/prof:Profile definitions from TTL content and extracts
 * configuration for vocabulary processing.
 *
 * Supports the same SHACL constructs as Prez:
 * - prof:Profile for profile definitions
 * - sh:NodeShape with sh:targetClass for target class binding
 * - sh:property for property paths
 * - altr-ext:* for content negotiation extensions
 * - prez:* for Prez-specific annotations
 *
 * This module works in both Node.js and browser environments.
 */

import { Parser, Store, type Quad, type Term } from 'n3'

// ============================================================================
// Namespace Constants
// ============================================================================

const PROF = 'http://www.w3.org/ns/dx/prof/'
const SH = 'http://www.w3.org/ns/shacl#'
const DCTERMS = 'http://purl.org/dc/terms/'
const SKOS = 'http://www.w3.org/2004/02/skos/core#'
const PREZ = 'https://prez.dev/'
const ALTR_EXT = 'http://www.w3.org/ns/dx/connegp/altr-ext#'
const RDF = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#'
const SCHEMA = 'https://schema.org/'

// ============================================================================
// Type Definitions
// ============================================================================

/** Prez generation flags for annotations */
export interface PrezGenerateFlags {
  identifier: boolean
  link: boolean
  members: boolean
  label: boolean
  description: boolean
  provenance: boolean
  focusNode: boolean
}

/** Property shape configuration */
export interface PropertyShape {
  name: string | null
  description: string | null
  order: number
  paths: string[]
}

/** Parsed profile from SHACL */
export interface ParsedProfile {
  iri: string
  identifier: string | null
  title: string | null
  description: string | null
  targetClass: string | null
  defaultFormat: string | null
  formats: string[]
  linkTemplate: string | null
  membersTemplate: string | null
  generate: PrezGenerateFlags
  labelSources: string[]
  descriptionSources: string[]
  provenanceSources: string[]
  properties: PropertyShape[]
}

/** Catalog definition */
export interface ParsedCatalog {
  iri: string
  identifier: string | null
  title: string | null
  description: string | null
}

/** Node shape mapping in umbrella profile */
export interface NodeShapeMapping {
  targetClasses: string[]
  defaultProfile: string
}

/** Umbrella profile with node shape mappings */
export interface UmbrellaProfile {
  iri: string
  identifier: string | null
  title: string | null
  description: string | null
  catalog: string | null
  defaultFormat: string | null
  nodeShapes: NodeShapeMapping[]
}

/** Complete parsed profile configuration */
export interface ProfileConfig {
  profiles: Record<string, ParsedProfile>
  catalogs: Record<string, ParsedCatalog>
  umbrellaProfiles: Record<string, UmbrellaProfile>
  store: Store
}

/** Processing config profile format */
export interface ProcessingProfile {
  iri: string
  label: string | null
  description: string | null
  constrainsClass: string | null
  defaultFormat: string | null
  formats: string[]
  prezPredicates: PrezGenerateFlags
  linkTemplate: string | null
  membersTemplate: string | null
  labelSources: string[]
  descriptionSources: string[]
  provenanceSources: string[]
}

/** Processing config catalog format */
export interface ProcessingCatalog {
  id: string | null
  iri: string
  label: string | null
  description: string | null
}

/** Processing configuration format (for process-vocab.js compatibility) */
export interface ProcessingConfig {
  catalog: ProcessingCatalog
  profiles: Record<string, ProcessingProfile>
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Parse TTL content into an N3 Store
 */
export function parseTTL(content: string): Store {
  const parser = new Parser({ format: 'Turtle' })
  const store = new Store()
  const quads = parser.parse(content)
  store.addQuads(quads)
  return store
}

/**
 * Get literal value from a term
 */
function getLiteralValue(obj: Term | null): string | null {
  if (!obj) return null
  return obj.value
}

/**
 * Get all values for a predicate
 */
function getValues(store: Store, subject: string | Term, predicate: string): string[] {
  return store.getQuads(subject, predicate, null, null)
    .map((q: Quad) => getLiteralValue(q.object))
    .filter((v): v is string => v !== null)
}

/**
 * Get first value for a predicate
 */
function getFirstValue(store: Store, subject: string | Term, predicate: string): string | null {
  const quads = store.getQuads(subject, predicate, null, null)
  return quads.length > 0 ? getLiteralValue(quads[0].object) : null
}

/**
 * Get boolean value for a predicate
 */
function getBooleanValue(store: Store, subject: string | Term, predicate: string): boolean {
  const value = getFirstValue(store, subject, predicate)
  return value === 'true'
}

/**
 * Get IRI value for a predicate
 */
function getIriValue(store: Store, subject: string | Term, predicate: string): string | null {
  const quads = store.getQuads(subject, predicate, null, null)
  if (quads.length > 0 && quads[0].object.termType === 'NamedNode') {
    return quads[0].object.value
  }
  return null
}

/**
 * Get all IRI values for a predicate
 */
function getIriValues(store: Store, subject: string | Term, predicate: string): string[] {
  return store.getQuads(subject, predicate, null, null)
    .filter((q: Quad) => q.object.termType === 'NamedNode')
    .map((q: Quad) => q.object.value)
}

/**
 * Parse an RDF list (rdf:first/rdf:rest chain)
 */
function parseRdfList(store: Store, listNode: Term): string[] {
  const items: string[] = []
  let current: Term | null = listNode

  while (current && current.value !== `${RDF}nil`) {
    // Get first element
    const firstQuads = store.getQuads(current, `${RDF}first`, null, null)
    if (firstQuads.length > 0) {
      const firstObj = firstQuads[0].object
      if (firstObj.termType === 'NamedNode') {
        items.push(firstObj.value)
      } else if (firstObj.termType === 'BlankNode') {
        // Nested blank node - might be another union or path expression
        const nestedUnion = store.getQuads(firstObj, `${SH}union`, null, null)
        if (nestedUnion.length > 0) {
          items.push(...parseRdfList(store, nestedUnion[0].object))
        }
      }
    }

    // Move to rest
    const restQuads = store.getQuads(current, `${RDF}rest`, null, null)
    if (restQuads.length > 0) {
      current = restQuads[0].object
    } else {
      break
    }
  }

  return items
}

/**
 * Parse a sh:property shape to extract property configuration
 */
function parsePropertyShape(store: Store, shapeNode: Term): PropertyShape {
  const shape: PropertyShape = {
    name: getFirstValue(store, shapeNode, `${SH}name`),
    description: getFirstValue(store, shapeNode, `${SH}description`),
    order: parseInt(getFirstValue(store, shapeNode, `${SH}order`) || '0', 10),
    paths: []
  }

  // Get the path - can be direct or a complex path expression
  const pathQuads = store.getQuads(shapeNode, `${SH}path`, null, null)
  for (const pathQuad of pathQuads) {
    if (pathQuad.object.termType === 'NamedNode') {
      // Direct path
      shape.paths.push(pathQuad.object.value)
    } else if (pathQuad.object.termType === 'BlankNode') {
      // Complex path - check for sh:union
      const unionQuads = store.getQuads(pathQuad.object, `${SH}union`, null, null)
      if (unionQuads.length > 0) {
        // Parse the union list
        shape.paths = parseRdfList(store, unionQuads[0].object)
      }
    }
  }

  return shape
}

// ============================================================================
// Profile Parsing Functions
// ============================================================================

/**
 * Parse a profile definition from the store
 */
function parseProfile(store: Store, profileIri: string): ParsedProfile {
  const profile: ParsedProfile = {
    iri: profileIri,
    identifier: getFirstValue(store, profileIri, `${DCTERMS}identifier`),
    title: getFirstValue(store, profileIri, `${DCTERMS}title`),
    description: getFirstValue(store, profileIri, `${DCTERMS}description`),
    targetClass: getIriValue(store, profileIri, `${SH}targetClass`) ||
                 getIriValue(store, profileIri, `${ALTR_EXT}constrainsClass`),
    defaultFormat: getFirstValue(store, profileIri, `${ALTR_EXT}hasDefaultResourceFormat`),
    formats: getValues(store, profileIri, `${ALTR_EXT}hasResourceFormat`),
    linkTemplate: getFirstValue(store, profileIri, `${PREZ}linkTemplate`),
    membersTemplate: getFirstValue(store, profileIri, `${PREZ}membersTemplate`),

    // Prez generation flags
    generate: {
      identifier: getBooleanValue(store, profileIri, `${PREZ}generateIdentifier`),
      link: getBooleanValue(store, profileIri, `${PREZ}generateLink`),
      members: getBooleanValue(store, profileIri, `${PREZ}generateMembers`),
      label: getBooleanValue(store, profileIri, `${PREZ}generateLabel`),
      description: getBooleanValue(store, profileIri, `${PREZ}generateDescription`),
      provenance: getBooleanValue(store, profileIri, `${PREZ}generateProvenance`),
      focusNode: getBooleanValue(store, profileIri, `${PREZ}generateFocusNode`),
    },

    // Source predicates for prez annotations
    labelSources: getIriValues(store, profileIri, `${PREZ}labelSource`),
    descriptionSources: getIriValues(store, profileIri, `${PREZ}descriptionSource`),
    provenanceSources: getIriValues(store, profileIri, `${PREZ}provenanceSource`),

    // Property shapes (for advanced SHACL-based configuration)
    properties: []
  }

  // Parse property shapes if present
  const propertyQuads = store.getQuads(profileIri, `${SH}property`, null, null)
  for (const pq of propertyQuads) {
    if (pq.object.termType === 'BlankNode') {
      profile.properties.push(parsePropertyShape(store, pq.object))
    }
  }

  // Sort properties by order
  profile.properties.sort((a, b) => a.order - b.order)

  return profile
}

/**
 * Parse catalog configuration
 */
function parseCatalog(store: Store, catalogIri: string): ParsedCatalog {
  return {
    iri: catalogIri,
    identifier: getFirstValue(store, catalogIri, `${DCTERMS}identifier`),
    title: getFirstValue(store, catalogIri, `${DCTERMS}title`),
    description: getFirstValue(store, catalogIri, `${DCTERMS}description`),
  }
}

/**
 * Parse an umbrella profile with hasNodeShape definitions
 */
function parseUmbrellaProfile(store: Store, profileIri: string): UmbrellaProfile {
  const umbrella: UmbrellaProfile = {
    iri: profileIri,
    identifier: getFirstValue(store, profileIri, `${DCTERMS}identifier`),
    title: getFirstValue(store, profileIri, `${DCTERMS}title`),
    description: getFirstValue(store, profileIri, `${DCTERMS}description`),
    catalog: getIriValue(store, profileIri, `${PREZ}catalog`),
    defaultFormat: getFirstValue(store, profileIri, `${ALTR_EXT}hasDefaultResourceFormat`),
    nodeShapes: []
  }

  // Parse hasNodeShape entries
  const nodeShapeQuads = store.getQuads(profileIri, `${ALTR_EXT}hasNodeShape`, null, null)
  for (const nsq of nodeShapeQuads) {
    if (nsq.object.termType === 'BlankNode') {
      const targetClasses = getIriValues(store, nsq.object, `${SH}targetClass`)
      const defaultProfile = getIriValue(store, nsq.object, `${ALTR_EXT}hasDefaultProfile`)

      if (targetClasses.length > 0 && defaultProfile) {
        umbrella.nodeShapes.push({
          targetClasses,
          defaultProfile
        })
      }
    }
  }

  return umbrella
}

// ============================================================================
// Main Export Functions
// ============================================================================

/**
 * Parse all profiles from TTL content
 */
export function parseProfilesContent(content: string): ProfileConfig {
  const store = parseTTL(content)

  const result: ProfileConfig = {
    profiles: {},
    catalogs: {},
    umbrellaProfiles: {},
    store
  }

  // Find all profiles (prof:Profile types)
  const profileQuads = store.getQuads(null, `${RDF}type`, `${PROF}Profile`, null)

  for (const pq of profileQuads) {
    const profileIri = pq.subject.value

    // Check if this is an umbrella profile (has hasNodeShape)
    const hasNodeShapes = store.getQuads(profileIri, `${ALTR_EXT}hasNodeShape`, null, null)

    if (hasNodeShapes.length > 0) {
      result.umbrellaProfiles[profileIri] = parseUmbrellaProfile(store, profileIri)
    } else {
      result.profiles[profileIri] = parseProfile(store, profileIri)
    }
  }

  // Find all catalogs (prez:Catalog types)
  const catalogQuads = store.getQuads(null, `${RDF}type`, `${PREZ}Catalog`, null)
  for (const cq of catalogQuads) {
    result.catalogs[cq.subject.value] = parseCatalog(store, cq.subject.value)
  }

  return result
}

/**
 * Parse all profiles from a TTL file (Node.js only)
 * This function dynamically imports fs/promises for Node.js compatibility
 */
export async function parseProfilesFile(filePath: string): Promise<ProfileConfig> {
  // Dynamic import for Node.js file system
  const { readFile } = await import('fs/promises')
  const content = await readFile(filePath, 'utf-8')
  return parseProfilesContent(content)
}

/**
 * Get the profile for a specific target class
 */
export function getProfileForClass(profileConfig: ProfileConfig, targetClass: string): ParsedProfile | null {
  for (const profile of Object.values(profileConfig.profiles)) {
    if (profile.targetClass === targetClass) {
      return profile
    }
  }
  return null
}

/**
 * Get the default profile for a class from an umbrella profile
 */
export function getDefaultProfileForClass(
  profileConfig: ProfileConfig,
  umbrellaIri: string,
  targetClass: string
): ParsedProfile | null {
  const umbrella = profileConfig.umbrellaProfiles[umbrellaIri]
  if (!umbrella) return null

  for (const ns of umbrella.nodeShapes) {
    if (ns.targetClasses.includes(targetClass)) {
      return profileConfig.profiles[ns.defaultProfile] || null
    }
  }
  return null
}

/**
 * Convert parsed profile config to a format compatible with existing processing
 */
export function toProcessingConfig(profileConfig: ProfileConfig, umbrellaIri: string): ProcessingConfig {
  const umbrella = profileConfig.umbrellaProfiles[umbrellaIri]
  if (!umbrella) {
    throw new Error(`Umbrella profile not found: ${umbrellaIri}`)
  }

  const catalog = umbrella.catalog ? profileConfig.catalogs[umbrella.catalog] : null
  if (!catalog) {
    throw new Error(`Catalog not found: ${umbrella.catalog}`)
  }

  const profiles: Record<string, ProcessingProfile> = {}

  for (const [_iri, profile] of Object.entries(profileConfig.profiles)) {
    // Determine key based on target class
    let key: string
    if (profile.targetClass === `${SKOS}ConceptScheme`) {
      key = 'conceptScheme'
    } else if (profile.targetClass === `${SKOS}Concept`) {
      key = 'concept'
    } else if (profile.targetClass === `${SCHEMA}DataCatalog`) {
      key = 'catalog'
    } else {
      key = profile.identifier || profile.iri
    }

    profiles[key] = {
      iri: profile.iri,
      label: profile.title,
      description: profile.description,
      constrainsClass: profile.targetClass,
      defaultFormat: profile.defaultFormat,
      formats: profile.formats,
      prezPredicates: profile.generate,
      linkTemplate: profile.linkTemplate,
      membersTemplate: profile.membersTemplate,
      // Use direct source predicates or fall back to property shape paths
      labelSources: profile.labelSources.length > 0
        ? profile.labelSources
        : profile.properties.find(p => p.name === 'label')?.paths || [],
      descriptionSources: profile.descriptionSources.length > 0
        ? profile.descriptionSources
        : profile.properties.find(p => p.name === 'description')?.paths || [],
      provenanceSources: profile.provenanceSources.length > 0
        ? profile.provenanceSources
        : profile.properties.find(p => p.name === 'provenance')?.paths || []
    }
  }

  return {
    catalog: {
      id: catalog.identifier,
      iri: catalog.iri,
      label: catalog.title,
      description: catalog.description
    },
    profiles
  }
}

// ============================================================================
// Exported Namespace Constants (for consumers)
// ============================================================================

export const NS = {
  PROF,
  SH,
  DCTERMS,
  SKOS,
  PREZ,
  ALTR_EXT,
  RDF,
  SCHEMA
} as const
