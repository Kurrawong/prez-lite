/**
 * Standard vocabulary labels for common RDF/SKOS/Schema predicates.
 * Parsed once into an N3 Store on first use for predicate label resolution.
 */

import { Store, Parser } from 'n3'

export const STANDARD_VOCAB_LABELS_TTL = `
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix skos: <http://www.w3.org/2004/02/skos/core#> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix schema: <https://schema.org/> .
@prefix prov: <http://www.w3.org/ns/prov#> .
@prefix reg: <http://purl.org/linked-data/registry#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix dcterms: <http://purl.org/dc/terms/> .

rdf:type rdfs:label "type"@en ;
    skos:definition "The subject is an instance of a class."@en .

rdfs:label rdfs:label "label" .

skos:prefLabel rdfs:label "preferred label"@en ;
    skos:definition "The preferred lexical label for a resource, in a given language."@en .

skos:altLabel rdfs:label "alternative label"@en ;
    skos:definition "An alternative lexical label for a resource."@en .

skos:definition rdfs:label "definition"@en ;
    skos:definition "A statement or formal explanation of the meaning of a concept."@en .

skos:historyNote rdfs:label "history note"@en ;
    skos:definition "A note about the past state/use/meaning of a concept."@en .

skos:scopeNote rdfs:label "scope note"@en ;
    skos:definition "A note that helps to clarify the meaning and/or the use of a concept."@en .

skos:example rdfs:label "example"@en ;
    skos:definition "An example of the use of a concept."@en .

skos:notation rdfs:label "notation"@en ;
    skos:definition "A notation, also known as classification code, is a string of characters used to uniquely identify a concept within the scope of a given concept scheme."@en .

skos:hasTopConcept rdfs:label "has top concept"@en ;
    skos:definition "Relates a concept scheme to a concept which is topmost in the broader/narrower concept hierarchies for that scheme."@en .

skos:topConceptOf rdfs:label "is top concept of"@en ;
    skos:definition "Relates a concept to the concept scheme that it is a top concept of."@en .

skos:broader rdfs:label "has broader"@en ;
    skos:definition "Relates a concept to a concept that is more general in meaning."@en .

skos:narrower rdfs:label "has narrower"@en ;
    skos:definition "Relates a concept to a concept that is more specific in meaning."@en .

skos:related rdfs:label "related"@en ;
    skos:definition "Relates a concept to a concept with which there is an associative semantic relationship."@en .

skos:inScheme rdfs:label "is in scheme"@en ;
    skos:definition "Relates a resource to a concept scheme in which it is included."@en .

skos:ConceptScheme rdfs:label "Concept Scheme"@en .
skos:Concept rdfs:label "Concept"@en .

owl:versionIRI rdfs:label "version IRI"@en .

reg:status rdfs:label "status"@en .

prov:agent rdfs:label "agent"@en .
prov:hadRole rdfs:label "role"@en .
prov:qualifiedAttribution rdfs:label "qualified attribution"@en .

dcterms:identifier rdfs:label "identifier"@en .
dcterms:provenance rdfs:label "provenance"@en .

schema:creator rdfs:label "creator"@en .
schema:publisher rdfs:label "publisher"@en .
schema:dateCreated rdfs:label "date created"@en .
schema:dateModified rdfs:label "date modified"@en .
schema:version rdfs:label "version"@en .
schema:keywords rdfs:label "keywords"@en .
schema:name rdfs:label "name"@en .
schema:description rdfs:label "description"@en .
`

let _labelStore: Store | null = null

/** Get the lazily-parsed label store */
export function getLabelStore(): Store {
  if (!_labelStore) {
    const parser = new Parser({ format: 'Turtle' })
    _labelStore = new Store()
    _labelStore.addQuads(parser.parse(STANDARD_VOCAB_LABELS_TTL))
  }
  return _labelStore
}

const RDFS_LABEL = 'http://www.w3.org/2000/01/rdf-schema#label'
const SKOS_DEFINITION = 'http://www.w3.org/2004/02/skos/core#definition'

/** Resolve a human-readable label for a predicate IRI */
export function getPredicateLabel(predicateIri: string): string {
  const store = getLabelStore()
  const quads = store.getQuads(predicateIri, RDFS_LABEL, null, null)
  if (quads.length > 0) return quads[0].object.value
  // Fallback: extract local name from IRI
  const hashIdx = predicateIri.lastIndexOf('#')
  const slashIdx = predicateIri.lastIndexOf('/')
  return predicateIri.substring(Math.max(hashIdx, slashIdx) + 1)
}

/** Resolve a description for a predicate IRI */
export function getPredicateDescription(predicateIri: string): string | undefined {
  const store = getLabelStore()
  const quads = store.getQuads(predicateIri, SKOS_DEFINITION, null, null)
  return quads.length > 0 ? quads[0].object.value : undefined
}
