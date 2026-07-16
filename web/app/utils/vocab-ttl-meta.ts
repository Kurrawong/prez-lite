/**
 * Lightweight metadata extraction from a raw vocabulary TTL file.
 *
 * Used by the workspace to list vocabularies that exist as TTL files on a
 * work branch (develop, edit/*) but are not yet in the generated
 * /export/system/vocabularies/index.json — the index is only rebuilt when the
 * deploy branch is reprocessed, so a newly created or newly approved vocab is
 * otherwise invisible in the workspace until it is published AND deployed.
 *
 * Parses with N3 and pulls just enough metadata to render a list entry and
 * navigate to the scheme page.
 */

import { Parser } from 'n3'

const RDF_TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type'
const SKOS = 'http://www.w3.org/2004/02/skos/core#'

export interface VocabTtlMeta {
  iri: string
  prefLabel: string
  definition?: string
  conceptCount: number
}

/**
 * Extract ConceptScheme IRI, labels and a concept count from raw TTL.
 * Returns null when the TTL is unparseable or contains no ConceptScheme.
 * Label/definition prefer @en, falling back to the first value found.
 */
export function parseVocabTtlMeta(ttl: string): VocabTtlMeta | null {
  let quads
  try {
    quads = new Parser().parse(ttl)
  } catch {
    return null
  }

  let schemeIri: string | null = null
  const concepts = new Set<string>()
  for (const q of quads) {
    if (q.predicate.value !== RDF_TYPE) continue
    if (q.object.value === `${SKOS}ConceptScheme`) {
      if (!schemeIri) schemeIri = q.subject.value
    } else if (q.object.value === `${SKOS}Concept`) {
      concepts.add(q.subject.value)
    }
  }
  if (!schemeIri) return null

  let prefLabel = ''
  let prefLabelEn = ''
  let definition = ''
  let definitionEn = ''
  for (const q of quads) {
    if (q.subject.value !== schemeIri || q.object.termType !== 'Literal') continue
    const lang = 'language' in q.object ? (q.object as { language: string }).language : ''
    if (q.predicate.value === `${SKOS}prefLabel`) {
      if (lang === 'en' && !prefLabelEn) prefLabelEn = q.object.value
      if (!prefLabel) prefLabel = q.object.value
    } else if (q.predicate.value === `${SKOS}definition`) {
      if (lang === 'en' && !definitionEn) definitionEn = q.object.value
      if (!definition) definition = q.object.value
    }
  }

  return {
    iri: schemeIri,
    prefLabel: prefLabelEn || prefLabel,
    definition: (definitionEn || definition) || undefined,
    conceptCount: concepts.size,
  }
}
