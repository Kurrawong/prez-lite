/**
 * Utility for extracting and rendering properties from annotated JSON-LD
 *
 * This mirrors the approach used in data-processing/scripts/process-vocab.js
 * to dynamically render all properties with their prez:label and prez:description.
 */

// Prez namespace
const PREZ = 'https://prez.dev/'
const PREZ_LABEL = `${PREZ}label`
const PREZ_DESCRIPTION = `${PREZ}description`
const PREZ_TYPE = `${PREZ}type`
const PREZ_FOCUS_NODE = `${PREZ}FocusNode`

// Properties to skip in rendering (handled specially or internal)
const SKIP_PREDICATES = new Set([
  'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
  'http://www.w3.org/2004/02/skos/core#prefLabel',
  'http://www.w3.org/2004/02/skos/core#hasTopConcept',
  `${PREZ}label`,
  `${PREZ}description`,
  `${PREZ}type`,
  `${PREZ}identifier`,
  `${PREZ}link`,
  `${PREZ}members`,
  `${PREZ}childrenCount`,
])

/** A single value from the JSON-LD */
export interface JsonLdValue {
  '@id'?: string
  '@value'?: string
  '@type'?: string
  '@language'?: string
}

/** A node in the JSON-LD graph */
export interface JsonLdNode {
  '@id': string
  '@type'?: string[]
  [predicate: string]: JsonLdValue[] | string | string[] | undefined
}

/** Property ordering from profile.json */
export interface PropertyOrderEntry {
  path: string
  order: number
  propertyOrder?: PropertyOrderEntry[] // For nested properties
}

/** Profile JSON configuration from profile.json */
export interface ProfileJsonConfig {
  conceptScheme?: { propertyOrder?: PropertyOrderEntry[] }
  concept?: { propertyOrder?: PropertyOrderEntry[] }
  catalog?: { propertyOrder?: PropertyOrderEntry[] }
  nestedOrder?: Record<string, PropertyOrderEntry[]>
}

/** A rendered property value */
export interface PropertyValue {
  type: 'literal' | 'iri' | 'nested'
  value: string
  label?: string
  description?: string
  language?: string
  datatype?: string
  datatypeLabel?: string
  nestedProperties?: RenderedProperty[] // For blank node objects
}

/** A rendered property row */
export interface RenderedProperty {
  predicate: string
  predicateLabel: string
  predicateDescription?: string
  values: PropertyValue[]
  order: number
}

/**
 * Parse annotated JSON-LD and build lookup maps
 */
export function parseAnnotatedJsonLd(data: JsonLdNode[]) {
  const nodeMap = new Map<string, JsonLdNode>()
  const labelMap = new Map<string, string>()
  const descriptionMap = new Map<string, string>()
  let focusNode: JsonLdNode | null = null

  for (const node of data) {
    const id = node['@id']
    if (!id) continue

    nodeMap.set(id, node)

    // Extract prez:label
    const labels = node[PREZ_LABEL] as JsonLdValue[] | undefined
    if (labels?.length) {
      labelMap.set(id, extractLiteralValue(labels[0]))
    }

    // Extract prez:description
    const descriptions = node[PREZ_DESCRIPTION] as JsonLdValue[] | undefined
    if (descriptions?.length) {
      descriptionMap.set(id, extractLiteralValue(descriptions[0]))
    }

    // Find focus node
    const prezType = node[PREZ_TYPE] as JsonLdValue[] | undefined
    if (prezType?.some(v => v['@id'] === PREZ_FOCUS_NODE)) {
      focusNode = node
    }
  }

  return { nodeMap, labelMap, descriptionMap, focusNode }
}

/**
 * Extract string value from a JSON-LD value object
 */
function extractLiteralValue(value: JsonLdValue | undefined): string {
  if (!value) return ''
  return value['@value'] ?? value['@id'] ?? ''
}

/**
 * Get local name from IRI (after last / or #)
 */
function localName(iri: string): string {
  const hashIdx = iri.lastIndexOf('#')
  const slashIdx = iri.lastIndexOf('/')
  const idx = Math.max(hashIdx, slashIdx)
  return idx >= 0 ? iri.substring(idx + 1) : iri
}

/**
 * Extract all properties from a focus node with labels and descriptions
 */
export function extractProperties(
  focusNode: JsonLdNode,
  nodeMap: Map<string, JsonLdNode>,
  labelMap: Map<string, string>,
  descriptionMap: Map<string, string>,
  profile?: ProfileJsonConfig,
  type: 'conceptScheme' | 'concept' | 'catalog' = 'conceptScheme'
): RenderedProperty[] {
  const properties: RenderedProperty[] = []
  const renderedPredicates = new Set<string>()

  // Get property order from profile
  const propertyOrder = profile?.[type]?.propertyOrder ?? []
  const orderMap = new Map(propertyOrder.map(p => [p.path, p]))
  const nestedOrder = profile?.nestedOrder ?? {}

  // Sort predicates: ordered ones first (by order), then unordered alphabetically
  const allPredicates = Object.keys(focusNode).filter(
    p => !p.startsWith('@') && !SKIP_PREDICATES.has(p)
  )

  const orderedPredicates = propertyOrder
    .map(p => p.path)
    .filter(p => allPredicates.includes(p))

  const unorderedPredicates = allPredicates
    .filter(p => !orderMap.has(p))
    .sort((a, b) => {
      const labelA = labelMap.get(a) ?? localName(a)
      const labelB = labelMap.get(b) ?? localName(b)
      return labelA.localeCompare(labelB)
    })

  const sortedPredicates = [...orderedPredicates, ...unorderedPredicates]

  for (const predicate of sortedPredicates) {
    if (renderedPredicates.has(predicate)) continue
    renderedPredicates.add(predicate)

    const rawValues = focusNode[predicate] as JsonLdValue[] | undefined
    if (!rawValues?.length) continue

    const orderEntry = orderMap.get(predicate)
    const nestedPropertyOrder = orderEntry?.propertyOrder ?? nestedOrder[predicate]

    const values: PropertyValue[] = rawValues.map(v => {
      if (v['@value'] !== undefined) {
        // Literal value
        const dt = v['@type']
        return {
          type: 'literal' as const,
          value: v['@value'],
          language: v['@language'],
          datatype: dt,
          datatypeLabel: dt ? (labelMap.get(dt) ?? localName(dt)) : undefined,
        }
      } else if (v['@id']) {
        const iri = v['@id']

        // Check if it's a blank node (nested object)
        if (iri.startsWith('_:')) {
          const blankNode = nodeMap.get(iri)
          if (blankNode) {
            const nestedProps = extractNestedProperties(
              blankNode,
              nodeMap,
              labelMap,
              descriptionMap,
              nestedPropertyOrder
            )
            return {
              type: 'nested' as const,
              value: iri,
              nestedProperties: nestedProps,
            }
          }
        }

        // Named node (IRI)
        return {
          type: 'iri' as const,
          value: iri,
          label: labelMap.get(iri) ?? localName(iri),
          description: descriptionMap.get(iri),
        }
      }
      return { type: 'literal' as const, value: '' }
    })

    properties.push({
      predicate,
      predicateLabel: labelMap.get(predicate) ?? localName(predicate),
      predicateDescription: descriptionMap.get(predicate),
      values,
      order: orderEntry?.order ?? 999,
    })
  }

  // Sort by order
  properties.sort((a, b) => a.order - b.order)

  return properties
}

/**
 * Extract properties from a nested blank node
 */
function extractNestedProperties(
  node: JsonLdNode,
  nodeMap: Map<string, JsonLdNode>,
  labelMap: Map<string, string>,
  descriptionMap: Map<string, string>,
  propertyOrder?: PropertyOrderEntry[]
): RenderedProperty[] {
  const properties: RenderedProperty[] = []
  const orderMap = new Map(propertyOrder?.map(p => [p.path, p]) ?? [])

  const allPredicates = Object.keys(node).filter(p => !p.startsWith('@'))

  // Sort by order if available
  const sortedPredicates = propertyOrder
    ? [...propertyOrder.map(p => p.path).filter(p => allPredicates.includes(p)),
       ...allPredicates.filter(p => !orderMap.has(p))]
    : allPredicates

  for (const predicate of sortedPredicates) {
    const rawValues = node[predicate] as JsonLdValue[] | undefined
    if (!rawValues?.length) continue

    const values: PropertyValue[] = rawValues.map(v => {
      if (v['@value'] !== undefined) {
        const dt = v['@type']
        return {
          type: 'literal' as const,
          value: v['@value'],
          language: v['@language'],
          datatype: dt,
          datatypeLabel: dt ? (labelMap.get(dt) ?? localName(dt)) : undefined,
        }
      } else if (v['@id']) {
        return {
          type: 'iri' as const,
          value: v['@id'],
          label: labelMap.get(v['@id']) ?? localName(v['@id']),
          description: descriptionMap.get(v['@id']),
        }
      }
      return { type: 'literal' as const, value: '' }
    })

    properties.push({
      predicate,
      predicateLabel: labelMap.get(predicate) ?? localName(predicate),
      predicateDescription: descriptionMap.get(predicate),
      values,
      order: orderMap.get(predicate)?.order ?? 999,
    })
  }

  properties.sort((a, b) => a.order - b.order)
  return properties
}

// Cache for profile to avoid refetching
let cachedProfile: ProfileJsonConfig | undefined

/**
 * Fetch system-level profile (cached)
 */
async function fetchProfile(): Promise<ProfileJsonConfig | undefined> {
  if (cachedProfile) return cachedProfile
  try {
    cachedProfile = await $fetch<ProfileJsonConfig>('/export/system/profile.json')
    return cachedProfile
  } catch {
    return undefined
  }
}

/**
 * Fetch and parse annotated JSON-LD for a vocabulary
 */
export async function fetchAnnotatedProperties(
  slug: string,
  type: 'conceptScheme' | 'concept' | 'catalog' = 'conceptScheme'
): Promise<{ properties: RenderedProperty[], focusIri: string | null }> {
  try {
    // Fetch annotated JSON-LD and profile in parallel
    const [data, profile] = await Promise.all([
      $fetch<JsonLdNode[]>(`/export/vocabs/${slug}/${slug}-anot-ld-json.json`),
      fetchProfile()
    ])

    const { nodeMap, labelMap, descriptionMap, focusNode } = parseAnnotatedJsonLd(data)

    if (!focusNode) {
      return { properties: [], focusIri: null }
    }

    const properties = extractProperties(
      focusNode,
      nodeMap,
      labelMap,
      descriptionMap,
      profile,
      type
    )

    return { properties, focusIri: focusNode['@id'] }
  } catch (error) {
    console.warn(`[annotated-properties] Failed to fetch for ${slug}:`, error)
    return { properties: [], focusIri: null }
  }
}

/**
 * Create a composable for using annotated properties (for schemes/catalogs)
 */
export function useAnnotatedProperties(
  slug: Ref<string | undefined>,
  type: 'conceptScheme' | 'concept' | 'catalog' = 'conceptScheme'
) {
  const { data, status } = useAsyncData(
    () => `annotated-${slug.value}`,
    () => slug.value ? fetchAnnotatedProperties(slug.value, type) : Promise.resolve({ properties: [], focusIri: null }),
    { server: false, watch: [slug] }
  )

  const properties = computed(() => data.value?.properties ?? [])
  const focusIri = computed(() => data.value?.focusIri ?? null)

  return { properties, focusIri, status }
}

/**
 * Derive concept ID from IRI (local name after last / or #)
 */
function conceptIdFromIri(iri: string): string {
  const hashIdx = iri.lastIndexOf('#')
  const slashIdx = iri.lastIndexOf('/')
  const idx = Math.max(hashIdx, slashIdx)
  return idx >= 0 ? iri.substring(idx + 1) : iri
}

/**
 * Get prefix directory from concept ID (first character, lowercased)
 */
function conceptPrefix(conceptId: string): string {
  return (conceptId.charAt(0) || '_').toLowerCase()
}

/**
 * Fetch and parse annotated JSON-LD for a specific concept
 * Expects file at: /export/vocabs/{slug}/concepts/{prefix}/{concept-id}-anot-ld-json.json
 */
export async function fetchConceptAnnotatedProperties(
  slug: string,
  conceptIri: string
): Promise<{ properties: RenderedProperty[], conceptIri: string | null }> {
  try {
    const conceptId = conceptIdFromIri(conceptIri)
    const prefix = conceptPrefix(conceptId)

    // Fetch concept's annotated JSON-LD and profile in parallel
    const [data, profile] = await Promise.all([
      $fetch<JsonLdNode[]>(`/export/vocabs/${slug}/concepts/${prefix}/${conceptId}-anot-ld-json.json`),
      fetchProfile()
    ])

    const { nodeMap, labelMap, descriptionMap, focusNode } = parseAnnotatedJsonLd(data)

    if (!focusNode) {
      return { properties: [], conceptIri: null }
    }

    const properties = extractProperties(
      focusNode,
      nodeMap,
      labelMap,
      descriptionMap,
      profile,
      'concept'
    )

    return { properties, conceptIri: focusNode['@id'] }
  } catch (error) {
    console.warn(`[annotated-properties] Failed to fetch concept ${conceptIri} from ${slug}:`, error)
    return { properties: [], conceptIri: null }
  }
}

/**
 * Create a composable for using annotated concept properties
 */
export function useConceptAnnotatedProperties(
  slug: Ref<string | undefined>,
  conceptIri: Ref<string | undefined>
) {
  const { data, status } = useAsyncData(
    () => `annotated-concept-${slug.value}-${conceptIri.value}`,
    () => (slug.value && conceptIri.value)
      ? fetchConceptAnnotatedProperties(slug.value, conceptIri.value)
      : Promise.resolve({ properties: [], conceptIri: null }),
    { server: false, watch: [slug, conceptIri] }
  )

  const properties = computed(() => data.value?.properties ?? [])

  return { properties, status }
}
