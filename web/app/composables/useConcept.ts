import { fetchSchemes, findConcept, fetchConcepts, fetchLabels, getLabel, getAllLabels, buildConceptMap, resolveLabel, type Concept, type LabelsIndex } from '~/composables/useVocabData'

export interface RelationRow {
  label: string
  uri: string
  isInternal: boolean
}

export function useConcept(uri: Ref<string>) {
  const { data: concept, status } = useAsyncData(
    () => `concept-${uri.value}`,
    () => uri.value ? findConcept(uri.value) : Promise.resolve(null),
    { server: false, watch: [uri] }
  )

  const { data: schemes } = useAsyncData('schemes', fetchSchemes, { server: false })
  const { data: labelsIndex } = useAsyncData('labels', fetchLabels, { server: false })

  const scheme = computed(() => {
    const schemeIri = concept.value?.inScheme?.[0] ?? concept.value?.topConceptOf?.[0]
    return schemes.value?.find(s => s.iri === schemeIri)
  })

  // Load all concepts from scheme for label resolution
  const { data: schemeConcepts } = useAsyncData(
    () => `scheme-concepts-${scheme.value?.iri}`,
    () => scheme.value ? fetchConcepts(scheme.value.iri) : Promise.resolve([]),
    { server: false, watch: [scheme] }
  )

  const conceptMap = computed(() => schemeConcepts.value ? buildConceptMap(schemeConcepts.value) : new Map())

  // Helper to resolve label
  function resolveLabelFor(iri: string): string {
    return resolveLabel(iri, conceptMap.value, labelsIndex.value || {}, 'en')
  }

  // Property tables - grouped by property name
  const coreProperties = computed(() => {
    if (!concept.value) return []

    interface PropertyRow {
      property: string
      values: Array<{ value: string; lang?: string }>
    }

    const rows: PropertyRow[] = []

    // Preferred labels
    const prefLabels = getAllLabels(concept.value.prefLabel)
    if (prefLabels.length) {
      rows.push({ property: 'Preferred Label', values: prefLabels })
    }

    // Alternative labels
    const altLabels = getAllLabels(concept.value.altLabel)
    if (altLabels.length) {
      rows.push({ property: 'Alternative Label', values: altLabels })
    }

    // Definitions
    const definitions = getAllLabels(concept.value.definition)
    if (definitions.length) {
      rows.push({ property: 'Definition', values: definitions })
    }

    if (concept.value.notation) {
      rows.push({ property: 'Notation', values: [{ value: concept.value.notation }] })
    }

    return rows
  })

  // Notes
  const notes = computed(() => {
    if (!concept.value) return []
    const items: { title: string; content: string }[] = []

    if (concept.value.historyNote) {
      items.push({ title: 'History Note', content: getLabel(concept.value.historyNote) })
    }
    if (concept.value.scopeNote) {
      items.push({ title: 'Scope Note', content: getLabel(concept.value.scopeNote) })
    }
    if (concept.value.example) {
      items.push({ title: 'Example', content: getLabel(concept.value.example) })
    }
    if (concept.value.changeNote) {
      items.push({ title: 'Change Note', content: getLabel(concept.value.changeNote) })
    }
    if (concept.value.editorialNote) {
      items.push({ title: 'Editorial Note', content: getLabel(concept.value.editorialNote) })
    }

    return items
  })

  function makeRelationRows(iris: string[] | undefined): RelationRow[] {
    if (!iris?.length) return []
    return iris.map(iri => ({
      label: resolveLabelFor(iri),
      uri: iri,
      isInternal: conceptMap.value.has(iri)
    }))
  }

  const relationships = computed(() => {
    if (!concept.value) return []
    return [
      { title: 'Broader Concepts', icon: 'i-heroicons-arrow-up', items: makeRelationRows(concept.value.broader) },
      { title: 'Narrower Concepts', icon: 'i-heroicons-arrow-down', items: makeRelationRows(concept.value.narrower) },
      { title: 'Related Concepts', icon: 'i-heroicons-arrows-right-left', items: makeRelationRows(concept.value.related) }
    ].filter(r => r.items.length > 0)
  })

  const mappings = computed(() => {
    if (!concept.value) return []
    return [
      { title: 'Exact Match', color: 'success' as const, items: concept.value.exactMatch || [] },
      { title: 'Close Match', color: 'info' as const, items: concept.value.closeMatch || [] },
      { title: 'Broad Match', color: 'warning' as const, items: concept.value.broadMatch || [] },
      { title: 'Narrow Match', color: 'warning' as const, items: concept.value.narrowMatch || [] },
      { title: 'Related Match', color: 'neutral' as const, items: concept.value.relatedMatch || [] }
    ].filter(m => m.items.length > 0)
  })

  // Citations
  const citations = computed(() => concept.value?.citation || [])

  const breadcrumbs = computed(() => {
    const items: { label: string; to?: string | object }[] = [{ label: 'Vocabularies', to: '/vocabs' }]
    if (scheme.value) {
      items.push({
        label: getLabel(scheme.value.prefLabel),
        to: { path: '/scheme', query: { uri: scheme.value.iri } }
      })
    }
    items.push({ label: getLabel(concept.value?.prefLabel) || 'Concept' })
    return items
  })

  return {
    concept,
    status,
    scheme,
    schemes,
    labelsIndex,
    conceptMap,
    coreProperties,
    notes,
    relationships,
    mappings,
    citations,
    breadcrumbs,
    resolveLabelFor
  }
}
