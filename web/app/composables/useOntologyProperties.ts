/**
 * Ontology Properties Composable
 *
 * Provides property definitions for common ontology namespaces used in
 * vocabulary profiles: SKOS, Dublin Core, PROV, Schema.org, and RDFS.
 */

export interface OntologyProperty {
  iri: string
  localName: string
  label: string
  description: string
  category: 'label' | 'description' | 'provenance' | 'metadata' | 'hierarchy' | 'other'
}

export interface OntologyNamespace {
  prefix: string
  iri: string
  label: string
  properties: OntologyProperty[]
}

const SKOS = 'http://www.w3.org/2004/02/skos/core#'
const DCTERMS = 'http://purl.org/dc/terms/'
const DC = 'http://purl.org/dc/elements/1.1/'
const PROV = 'http://www.w3.org/ns/prov#'
const SCHEMA = 'https://schema.org/'
const RDFS = 'http://www.w3.org/2000/01/rdf-schema#'

export function useOntologyProperties() {
  const namespaces: OntologyNamespace[] = [
    {
      prefix: 'skos',
      iri: SKOS,
      label: 'SKOS',
      properties: [
        // Label properties
        { iri: `${SKOS}prefLabel`, localName: 'prefLabel', label: 'Preferred Label', description: 'The preferred lexical label for a resource', category: 'label' },
        { iri: `${SKOS}altLabel`, localName: 'altLabel', label: 'Alternative Label', description: 'An alternative lexical label for a resource', category: 'label' },
        { iri: `${SKOS}hiddenLabel`, localName: 'hiddenLabel', label: 'Hidden Label', description: 'A lexical label for search/indexing but not display', category: 'label' },
        // Description properties
        { iri: `${SKOS}definition`, localName: 'definition', label: 'Definition', description: 'A statement of the meaning of a concept', category: 'description' },
        { iri: `${SKOS}scopeNote`, localName: 'scopeNote', label: 'Scope Note', description: 'A note about the scope of a concept', category: 'description' },
        { iri: `${SKOS}example`, localName: 'example', label: 'Example', description: 'An example of the use of a concept', category: 'description' },
        { iri: `${SKOS}historyNote`, localName: 'historyNote', label: 'History Note', description: 'A note about the history of the concept', category: 'description' },
        { iri: `${SKOS}editorialNote`, localName: 'editorialNote', label: 'Editorial Note', description: 'An editorial note about the concept', category: 'description' },
        { iri: `${SKOS}changeNote`, localName: 'changeNote', label: 'Change Note', description: 'A note about changes to the concept', category: 'description' },
        { iri: `${SKOS}note`, localName: 'note', label: 'Note', description: 'A general note about the concept', category: 'description' },
        // Hierarchy properties
        { iri: `${SKOS}broader`, localName: 'broader', label: 'Broader', description: 'A broader concept in the hierarchy', category: 'hierarchy' },
        { iri: `${SKOS}narrower`, localName: 'narrower', label: 'Narrower', description: 'A narrower concept in the hierarchy', category: 'hierarchy' },
        { iri: `${SKOS}related`, localName: 'related', label: 'Related', description: 'A related concept', category: 'hierarchy' },
        { iri: `${SKOS}inScheme`, localName: 'inScheme', label: 'In Scheme', description: 'The concept scheme this concept belongs to', category: 'metadata' },
        { iri: `${SKOS}topConceptOf`, localName: 'topConceptOf', label: 'Top Concept Of', description: 'The scheme where this is a top concept', category: 'hierarchy' },
        { iri: `${SKOS}hasTopConcept`, localName: 'hasTopConcept', label: 'Has Top Concept', description: 'A top-level concept in this scheme', category: 'hierarchy' },
        // Other
        { iri: `${SKOS}notation`, localName: 'notation', label: 'Notation', description: 'A notation/code for the concept', category: 'metadata' },
      ],
    },
    {
      prefix: 'dcterms',
      iri: DCTERMS,
      label: 'Dublin Core Terms',
      properties: [
        // Label properties
        { iri: `${DCTERMS}title`, localName: 'title', label: 'Title', description: 'A name given to the resource', category: 'label' },
        // Description properties
        { iri: `${DCTERMS}description`, localName: 'description', label: 'Description', description: 'An account of the resource', category: 'description' },
        { iri: `${DCTERMS}abstract`, localName: 'abstract', label: 'Abstract', description: 'A summary of the resource', category: 'description' },
        // Provenance properties
        { iri: `${DCTERMS}provenance`, localName: 'provenance', label: 'Provenance', description: 'A statement of changes in ownership and custody', category: 'provenance' },
        { iri: `${DCTERMS}source`, localName: 'source', label: 'Source', description: 'A related resource from which this is derived', category: 'provenance' },
        // Metadata properties
        { iri: `${DCTERMS}created`, localName: 'created', label: 'Created', description: 'Date of creation', category: 'metadata' },
        { iri: `${DCTERMS}modified`, localName: 'modified', label: 'Modified', description: 'Date of last modification', category: 'metadata' },
        { iri: `${DCTERMS}issued`, localName: 'issued', label: 'Issued', description: 'Date of formal issuance', category: 'metadata' },
        { iri: `${DCTERMS}creator`, localName: 'creator', label: 'Creator', description: 'An entity responsible for making the resource', category: 'metadata' },
        { iri: `${DCTERMS}publisher`, localName: 'publisher', label: 'Publisher', description: 'An entity responsible for making the resource available', category: 'metadata' },
        { iri: `${DCTERMS}contributor`, localName: 'contributor', label: 'Contributor', description: 'An entity responsible for contributions', category: 'metadata' },
        { iri: `${DCTERMS}identifier`, localName: 'identifier', label: 'Identifier', description: 'An unambiguous reference to the resource', category: 'metadata' },
        { iri: `${DCTERMS}rights`, localName: 'rights', label: 'Rights', description: 'Information about rights held over the resource', category: 'metadata' },
        { iri: `${DCTERMS}license`, localName: 'license', label: 'License', description: 'A legal document giving permission', category: 'metadata' },
      ],
    },
    {
      prefix: 'dc',
      iri: DC,
      label: 'Dublin Core Elements',
      properties: [
        { iri: `${DC}title`, localName: 'title', label: 'Title', description: 'A name given to the resource (legacy)', category: 'label' },
        { iri: `${DC}description`, localName: 'description', label: 'Description', description: 'An account of the resource (legacy)', category: 'description' },
        { iri: `${DC}creator`, localName: 'creator', label: 'Creator', description: 'An entity responsible for making the resource (legacy)', category: 'metadata' },
        { iri: `${DC}source`, localName: 'source', label: 'Source', description: 'A related resource (legacy)', category: 'provenance' },
      ],
    },
    {
      prefix: 'prov',
      iri: PROV,
      label: 'PROV-O',
      properties: [
        { iri: `${PROV}wasAttributedTo`, localName: 'wasAttributedTo', label: 'Was Attributed To', description: 'Agent the resource is attributed to', category: 'provenance' },
        { iri: `${PROV}qualifiedAttribution`, localName: 'qualifiedAttribution', label: 'Qualified Attribution', description: 'Qualified attribution relationship', category: 'provenance' },
        { iri: `${PROV}wasGeneratedBy`, localName: 'wasGeneratedBy', label: 'Was Generated By', description: 'Activity that generated this resource', category: 'provenance' },
        { iri: `${PROV}wasDerivedFrom`, localName: 'wasDerivedFrom', label: 'Was Derived From', description: 'Resource this was derived from', category: 'provenance' },
        { iri: `${PROV}generatedAtTime`, localName: 'generatedAtTime', label: 'Generated At Time', description: 'Time of generation', category: 'provenance' },
      ],
    },
    {
      prefix: 'schema',
      iri: SCHEMA,
      label: 'Schema.org',
      properties: [
        { iri: `${SCHEMA}name`, localName: 'name', label: 'Name', description: 'The name of the item', category: 'label' },
        { iri: `${SCHEMA}description`, localName: 'description', label: 'Description', description: 'A description of the item', category: 'description' },
        { iri: `${SCHEMA}dateCreated`, localName: 'dateCreated', label: 'Date Created', description: 'The date on which this was created', category: 'metadata' },
        { iri: `${SCHEMA}dateModified`, localName: 'dateModified', label: 'Date Modified', description: 'The date on which this was modified', category: 'metadata' },
        { iri: `${SCHEMA}creator`, localName: 'creator', label: 'Creator', description: 'The creator/author', category: 'metadata' },
        { iri: `${SCHEMA}publisher`, localName: 'publisher', label: 'Publisher', description: 'The publisher', category: 'metadata' },
      ],
    },
    {
      prefix: 'rdfs',
      iri: RDFS,
      label: 'RDFS',
      properties: [
        { iri: `${RDFS}label`, localName: 'label', label: 'Label', description: 'A human-readable name', category: 'label' },
        { iri: `${RDFS}comment`, localName: 'comment', label: 'Comment', description: 'A description', category: 'description' },
        { iri: `${RDFS}seeAlso`, localName: 'seeAlso', label: 'See Also', description: 'A related resource', category: 'other' },
        { iri: `${RDFS}isDefinedBy`, localName: 'isDefinedBy', label: 'Is Defined By', description: 'The defining resource', category: 'metadata' },
      ],
    },
  ]

  // Get all properties across namespaces
  const allProperties = computed(() => {
    return namespaces.flatMap(ns => ns.properties)
  })

  // Get properties by category
  function getPropertiesByCategory(category: OntologyProperty['category']): OntologyProperty[] {
    return allProperties.value.filter(p => p.category === category)
  }

  // Get label properties (commonly used for prez:labelSource)
  const labelProperties = computed(() => getPropertiesByCategory('label'))

  // Get description properties (commonly used for prez:descriptionSource)
  const descriptionProperties = computed(() => getPropertiesByCategory('description'))

  // Get provenance properties (commonly used for prez:provenanceSource)
  const provenanceProperties = computed(() => getPropertiesByCategory('provenance'))

  // Find property by IRI
  function findPropertyByIri(iri: string): OntologyProperty | undefined {
    return allProperties.value.find(p => p.iri === iri)
  }

  // Get namespace prefix for IRI
  function getPrefixForIri(iri: string): string | undefined {
    const ns = namespaces.find(n => iri.startsWith(n.iri))
    return ns?.prefix
  }

  // Format IRI as prefixed notation
  function toPrefixed(iri: string): string {
    const ns = namespaces.find(n => iri.startsWith(n.iri))
    if (ns) {
      const localName = iri.slice(ns.iri.length)
      return `${ns.prefix}:${localName}`
    }
    return `<${iri}>`
  }

  // Common target classes for profiles
  const targetClasses = [
    { iri: 'http://www.w3.org/2004/02/skos/core#ConceptScheme', label: 'SKOS Concept Scheme', prefixed: 'skos:ConceptScheme' },
    { iri: 'http://www.w3.org/2004/02/skos/core#Concept', label: 'SKOS Concept', prefixed: 'skos:Concept' },
    { iri: 'http://www.w3.org/2004/02/skos/core#Collection', label: 'SKOS Collection', prefixed: 'skos:Collection' },
    { iri: 'https://schema.org/DataCatalog', label: 'Schema.org DataCatalog', prefixed: 'schema:DataCatalog' },
    { iri: 'http://www.w3.org/ns/dcat#Dataset', label: 'DCAT Dataset', prefixed: 'dcat:Dataset' },
    { iri: 'http://www.w3.org/ns/dcat#Catalog', label: 'DCAT Catalog', prefixed: 'dcat:Catalog' },
  ]

  // Output formats supported by Prez
  const outputFormats = [
    { id: 'text/anot+turtle', label: 'Annotated Turtle', extension: 'ttl' },
    { id: 'text/turtle', label: 'Turtle', extension: 'ttl' },
    { id: 'application/ld+json', label: 'JSON-LD', extension: 'jsonld' },
    { id: 'application/anot+ld+json', label: 'Annotated JSON-LD', extension: 'jsonld' },
    { id: 'application/rdf+xml', label: 'RDF/XML', extension: 'rdf' },
    { id: 'text/csv', label: 'CSV', extension: 'csv' },
    { id: 'application/json', label: 'JSON', extension: 'json' },
    { id: 'text/html', label: 'HTML', extension: 'html' },
  ]

  return {
    namespaces,
    allProperties,
    labelProperties,
    descriptionProperties,
    provenanceProperties,
    findPropertyByIri,
    getPrefixForIri,
    toPrefixed,
    getPropertiesByCategory,
    targetClasses,
    outputFormats,
  }
}
