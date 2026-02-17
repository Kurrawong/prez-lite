import { fetchSchemes, fetchConcepts, fetchLabels, fetchVocabMetadata, fetchListCollections, getLabel, buildConceptMap, resolveLabel, type Scheme, type Concept, type LabelsIndex, type CollectionListItem } from '~/composables/useVocabData'
import { useAnnotatedProperties, type RenderedProperty, type PropertyValue } from '~/utils/annotated-properties'

export interface TreeItem {
  id: string
  label: string
  icon?: string
  children?: TreeItem[]
  defaultExpanded?: boolean
}

/**
 * Format property values as a simple string for table display
 */
function formatPropertyValues(values: PropertyValue[]): string {
  return values.map(v => {
    if (v.type === 'literal') {
      return v.value
    } else if (v.type === 'iri') {
      return v.label ?? v.value
    } else if (v.type === 'nested' && v.nestedProperties) {
      // Format nested properties as key: value pairs
      return v.nestedProperties
        .map(np => `${np.predicateLabel}: ${formatPropertyValues(np.values)}`)
        .join('; ')
    }
    return ''
  }).join(', ')
}

export function useScheme(uri: Ref<string>) {
  const { data: schemes } = useAsyncData('schemes', fetchSchemes, { server: false })
  const scheme = computed(() => schemes.value?.find(s => s.iri === uri.value))

  // Get slug for annotated properties lookup
  const { data: vocabMetadata } = useAsyncData('vocabMetadata', fetchVocabMetadata, { server: false })
  const currentVocabMeta = computed(() => vocabMetadata.value?.find(v => v.iri === uri.value))
  const slug = computed(() => currentVocabMeta.value?.slug)
  const validation = computed(() => currentVocabMeta.value?.validation)

  const { data: concepts, status } = useAsyncData(
    () => `concepts-${uri.value}`,
    () => uri.value ? fetchConcepts(uri.value) : Promise.resolve([]),
    { server: false, watch: [uri] }
  )

  const { data: labelsIndex } = useAsyncData('labels', fetchLabels, { server: false })

  // Fetch collections for this vocab (only when slug is available)
  const { data: collections } = useAsyncData(
    () => `collections-${slug.value}`,
    () => slug.value ? fetchListCollections(slug.value) : Promise.resolve([]),
    { server: false, watch: [slug] }
  )

  // Get annotated properties from the anot-ld-json file
  const { properties: annotatedProperties, status: annotatedStatus } = useAnnotatedProperties(slug, 'conceptScheme')

  const conceptMap = computed(() => concepts.value ? buildConceptMap(concepts.value) : new Map())

  // Build tree items for UTree
  const treeItems = computed(() => {
    if (!concepts.value || !scheme.value) return []

    // Build narrower map (parent -> children)
    const narrowerMap = new Map<string, Concept[]>()
    concepts.value.forEach(c => {
      c.broader?.forEach(parent => {
        if (!narrowerMap.has(parent)) narrowerMap.set(parent, [])
        narrowerMap.get(parent)!.push(c)
      })
    })

    // Find top concepts (explicitly declared or no broader)
    const topIris = new Set(scheme.value.topConcepts ?? [])
    const hasParent = new Set<string>()
    concepts.value.forEach(c => {
      c.broader?.forEach(() => hasParent.add(c.iri))
    })

    const topConcepts = concepts.value.filter(c =>
      topIris.has(c.iri) || (c.topConceptOf?.includes(scheme.value!.iri) && !hasParent.has(c.iri)) || (!c.broader?.length && !hasParent.has(c.iri))
    )

    // Build tree recursively
    function buildNode(concept: Concept, depth = 0): TreeItem {
      const children = narrowerMap.get(concept.iri) || []
      return {
        id: concept.iri,
        label: getLabel(concept.prefLabel),
        icon: children.length > 0 ? 'i-heroicons-folder' : 'i-heroicons-document',
        defaultExpanded: depth === 0 && children.length < 10,
        children: children.length > 0 ? children.map(c => buildNode(c, depth + 1)) : undefined
      }
    }

    // Sort top concepts alphabetically
    return topConcepts
      .sort((a, b) => getLabel(a.prefLabel).localeCompare(getLabel(b.prefLabel)))
      .map(c => buildNode(c))
  })

  // Metadata table - use annotated properties if available, fallback to basic
  const metadataRows = computed(() => {
    // If we have annotated properties, use them
    if (annotatedProperties.value?.length) {
      return annotatedProperties.value.map(prop => ({
        property: prop.predicateLabel,
        propertyIri: prop.predicate,
        propertyDescription: prop.predicateDescription,
        value: formatPropertyValues(prop.values),
        values: prop.values, // Keep raw values for rich rendering
      }))
    }

    // Fallback to basic scheme metadata
    if (!scheme.value) return []
    const rows: { property: string; value: string }[] = []

    if (scheme.value.version) rows.push({ property: 'Version', value: scheme.value.version })
    if (scheme.value.created) rows.push({ property: 'Created', value: scheme.value.created })
    if (scheme.value.modified) rows.push({ property: 'Modified', value: scheme.value.modified })

    // Resolve creator/publisher labels
    if (scheme.value.creator?.length) {
      const labels = scheme.value.creatorLabels?.filter(Boolean) || []
      rows.push({
        property: 'Creator',
        value: labels.length ? labels.join(', ') : scheme.value.creator.map(c => resolveLabel(c, conceptMap.value, labelsIndex.value || {}, 'en')).join(', ')
      })
    }
    if (scheme.value.publisher?.length) {
      const labels = scheme.value.publisherLabels?.filter(Boolean) || []
      rows.push({
        property: 'Publisher',
        value: labels.length ? labels.join(', ') : scheme.value.publisher.map(p => resolveLabel(p, conceptMap.value, labelsIndex.value || {}, 'en')).join(', ')
      })
    }

    rows.push({ property: 'Concept Count', value: String(scheme.value.conceptCount) })

    return rows
  })

  // Re-export annotated properties for components that want rich rendering
  const richMetadata = computed(() => annotatedProperties.value ?? [])

  const breadcrumbs = computed(() => [
    { label: 'Vocabularies', to: '/vocabs' },
    { label: getLabel(scheme.value?.prefLabel) || 'Scheme' }
  ])

  return {
    scheme,
    schemes,
    concepts,
    collections,
    status,
    labelsIndex,
    conceptMap,
    treeItems,
    metadataRows,
    richMetadata,
    slug,
    validation,
    breadcrumbs
  }
}
