/**
 * Share page utilities
 * Fetches export manifest and provides download helpers
 */

import { fetchVocabMetadata, type VocabMetadata } from '~/composables/useVocabData'

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

export interface ExportFormat {
  id: string
  label: string
  description: string
  extension: string
  filename: (slug: string) => string
  mimeType: string
}

export const EXPORT_FORMATS: ExportFormat[] = [
  // Annotated RDF (most useful first)
  { id: 'ttl-anot', label: 'Turtle (Annotated)', description: 'Turtle with resolved labels for all IRIs', extension: 'ttl', filename: (s) => `${s}-anot+turtle.ttl`, mimeType: 'text/turtle' },
  { id: 'ttl', label: 'Turtle', description: 'RDF Turtle - human-readable linked data format', extension: 'ttl', filename: (s) => `${s}-turtle.ttl`, mimeType: 'text/turtle' },
  { id: 'jsonld', label: 'JSON-LD', description: 'JSON for Linked Data - RDF in JSON syntax', extension: 'jsonld', filename: (s) => `${s}-json+ld.json`, mimeType: 'application/ld+json' },
  { id: 'rdf', label: 'RDF/XML', description: 'RDF in XML format - for legacy systems', extension: 'rdf', filename: (s) => `${s}-rdf.xml`, mimeType: 'application/rdf+xml' },

  // Web/App formats
  { id: 'json', label: 'JSON (Concepts)', description: 'Simple JSON list for web apps and components', extension: 'json', filename: (s) => `${s}-concepts.json`, mimeType: 'application/json' },
  { id: 'csv', label: 'CSV (Concepts)', description: 'Spreadsheet-compatible tabular format', extension: 'csv', filename: (s) => `${s}-concepts.csv`, mimeType: 'text/csv' },
  { id: 'html', label: 'HTML', description: 'Standalone HTML page for viewing', extension: 'html', filename: (s) => `${s}-page.html`, mimeType: 'text/html' },

  // Annotated JSON-LD (per-concept files use this)
  { id: 'jsonld-anot', label: 'JSON-LD (Annotated)', description: 'JSON-LD with resolved labels for all IRIs', extension: 'json', filename: (s) => `${s}-anot+ld+json.json`, mimeType: 'application/ld+json' },
]

export type ComponentType = 'select' | 'list'

export interface ComponentInfo {
  id: ComponentType
  tag: string
  label: string
  description: string
}

export const COMPONENT_TYPES: ComponentInfo[] = [
  { id: 'list', tag: 'prez-list', label: 'List', description: 'Interactive vocabulary list - supports tree, dropdown, radio, and table modes' }
]

// Convert VocabMetadata to VocabExport for backwards compatibility
function metadataToExport(meta: VocabMetadata): VocabExport {
  return {
    slug: meta.slug,
    iri: meta.iri,
    label: meta.prefLabel,
    description: meta.definition || '',
    conceptCount: meta.conceptCount,
    modified: meta.modified,
    version: meta.version,
    formats: meta.formats || ['ttl', 'json', 'jsonld', 'rdf', 'csv']
  }
}

async function fetchVocabs(): Promise<VocabExport[]> {
  try {
    const metadata = await fetchVocabMetadata()
    return metadata.map(metadataToExport)
  } catch {
    console.warn('[prez-lite] No vocabulary metadata found.')
    return []
  }
}

export function useShare() {
  const { data: vocabList, status } = useLazyAsyncData('export-vocabs', fetchVocabs, { server: false })

  const vocabs = computed(() => vocabList.value || [])

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

  function getConceptShareUrl(schemeIri: string, conceptIri: string): string | undefined {
    const vocab = getVocabByIri(schemeIri)
    return vocab ? `/share/concept?vocab=${encodeURIComponent(vocab.slug)}&uri=${encodeURIComponent(conceptIri)}` : undefined
  }

  function getConceptDownloadUrl(vocabSlug: string, conceptIri: string): string {
    const conceptId = conceptIri.split(/[#/]/).pop() || conceptIri
    const prefix = (conceptId.charAt(0) || '_').toLowerCase()
    return `/export/${vocabSlug}/concepts/${prefix}/${conceptId}-anot+ld+json.json`
  }

  function getDownloadUrl(slug: string, formatId: string): string {
    const format = EXPORT_FORMATS.find(f => f.id === formatId)
    if (format) {
      return `/export/${slug}/${format.filename(slug)}`
    }
    // Fallback for unknown formats
    return `/export/${slug}/${slug}-${formatId}`
  }

  function getFullDownloadUrl(slug: string, format: string): string {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
    return `${baseUrl}${getDownloadUrl(slug, format)}`
  }

  return {
    vocabs,
    status,
    getVocab,
    getVocabByIri,
    getShareUrl,
    getConceptShareUrl,
    getConceptDownloadUrl,
    getDownloadUrl,
    getFullDownloadUrl,
    formats: EXPORT_FORMATS,
    componentTypes: COMPONENT_TYPES
  }
}
