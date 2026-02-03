/**
 * Share page utilities
 * Fetches export manifest and provides download helpers
 */

export interface VocabExport {
  slug: string
  iri: string
  label: string
  description: string
  conceptCount: number
  modified?: string
  version?: string
  formats: string[]
}

export interface ExportManifest {
  generated: string
  count: number
  vocabs: VocabExport[]
}

export interface ExportFormat {
  id: string
  label: string
  description: string
  extension: string
  mimeType: string
}

export const EXPORT_FORMATS: ExportFormat[] = [
  { id: 'ttl', label: 'Turtle', description: 'RDF Turtle format', extension: 'ttl', mimeType: 'text/turtle' },
  { id: 'json', label: 'JSON', description: 'Simplified JSON for web apps', extension: 'json', mimeType: 'application/json' },
  { id: 'jsonld', label: 'JSON-LD', description: 'JSON for Linked Data', extension: 'jsonld', mimeType: 'application/ld+json' },
  { id: 'rdf', label: 'RDF/XML', description: 'RDF in XML format', extension: 'rdf', mimeType: 'application/rdf+xml' },
  { id: 'csv', label: 'CSV', description: 'Comma-separated values', extension: 'csv', mimeType: 'text/csv' }
]

export type ComponentType = 'select' | 'tree' | 'list' | 'autocomplete'

export interface ComponentInfo {
  id: ComponentType
  tag: string
  label: string
  description: string
}

export const COMPONENT_TYPES: ComponentInfo[] = [
  { id: 'select', tag: 'prez-vocab-select', label: 'Select', description: 'Dropdown select menu' },
  { id: 'tree', tag: 'prez-vocab-tree', label: 'Tree', description: 'Hierarchical tree view' },
  { id: 'list', tag: 'prez-vocab-list', label: 'List', description: 'Flat searchable list' },
  { id: 'autocomplete', tag: 'prez-vocab-autocomplete', label: 'Autocomplete', description: 'Typeahead search' }
]

async function fetchManifest(): Promise<ExportManifest> {
  try {
    return await $fetch<ExportManifest>('/export/vocabs/index.json')
  } catch {
    console.warn('[prez-lite] No export manifest found. Run build:export to generate.')
    return { generated: '', count: 0, vocabs: [] }
  }
}

export function useShare() {
  const { data: manifest, status } = useLazyAsyncData('export-manifest', fetchManifest, { server: false })

  const vocabs = computed(() => manifest.value?.vocabs || [])

  function getVocab(slug: string): VocabExport | undefined {
    return vocabs.value.find(v => v.slug === slug)
  }

  function getVocabByIri(iri: string): VocabExport | undefined {
    return vocabs.value.find(v => v.iri === iri)
  }

  function getShareUrl(iri: string): string | undefined {
    const vocab = getVocabByIri(iri)
    return vocab ? `/share/${vocab.slug}` : undefined
  }

  function getDownloadUrl(slug: string, format: string): string {
    return `/export/vocabs/${slug}/${slug}.${format}`
  }

  function getFullDownloadUrl(slug: string, format: string): string {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
    return `${baseUrl}${getDownloadUrl(slug, format)}`
  }

  return {
    manifest,
    vocabs,
    status,
    getVocab,
    getVocabByIri,
    getShareUrl,
    getDownloadUrl,
    getFullDownloadUrl,
    formats: EXPORT_FORMATS,
    componentTypes: COMPONENT_TYPES
  }
}
