# AI Remediation Report: brands.ttl

**Source:** `data/vocabs/brands.ttl`
**Generated:** 2026-02-12
**Model:** Cloudflare Workers AI

---

# Remediation Report for Brands Vocabulary
=====================================================

## Executive Summary
This report provides guidance on remediating the validation issues identified in the Brands vocabulary. The report addresses six categories of violations, providing explanations, corrected TTL triples, and Python scripts where applicable.

## Fixes
### 1. Temporal Coverage

*   **Violation Explanation**: Each Concept must have a temporal coverage indicated with the `schema:temporalCoverage` predicate pointing to a `schema:startTime` or `schema:endTime` or both date values.
*   **Corrected TTL**:
    ```turtle
:aami
    a skos:Concept ;
    schema:temporalCoverage [
        a schema:DateTime ;
        schema:startTime "2020-01-01"^^xsd:date ;
        schema:endTime "2025-12-31"^^xsd:date ;
    ] ;
```
*   **Python Script**: To apply this fix programmatically, use the following script:
    ```python
import rdflib

# Load the graph
g = rdflib.Graph()
g.parse("brands.ttl", format="turtle")

# Define the temporal coverage
temporal_coverage = rdflib.BNode()
temporal_coverage.add(rdflib.RDF.type, rdflib.URIRef("http://schema.org/DateTime"))
temporal_coverage.add(rdflib.URIRef("http://schema.org/startTime"), rdflib.Literal("2020-01-01", datatype=rdflib.XSD.date))
temporal_coverage.add(rdflib.URIRef("http://schema.org/endTime"), rdflib.Literal("2025-12-31", datatype=rdflib.XSD.date))

# Add temporal coverage to each Concept
for concept in g.subjects(rdflib.RDF.type, rdflib.URIRef("http://www.w3.org/2004/02/skos/core#Concept")):
    concept.add(rdflib.URIRef("http://schema.org/temporalCoverage"), temporal_coverage)

# Serialize the updated graph
g.serialize("brands-updated.ttl", format="turtle")
```

### 2. Definition Redux

*   **Violation Explanation**: Each vocabulary and Concept must have exactly one definition indicated using the `skos:definition` predicate pointing to a textual literal value.
*   **Corrected TTL**:
    ```turtle
cs:
    a
        owl:Ontology ,
        skos:ConceptScheme ;
    skos:definition "Brands under Suncorp Group Limited."@en ;
```
*   **No script needed**: This fix can be applied manually by ensuring each vocabulary and Concept has a single `skos:definition` predicate.

### 3. Preferred Label Redux

*   **Violation Explanation**: Each vocabulary and Concept must have exactly one preferred label indicated using the `skos:prefLabel` predicate pointing to a textual literal value.
*   **Corrected TTL**:
    ```turtle
cs:
    a
        owl:Ontology ,
        skos:ConceptScheme ;
    skos:prefLabel "Brand"@en ;
```
*   **No script needed**: This fix can be applied manually by ensuring each vocabulary and Concept has a single `skos:prefLabel` predicate.

### 4. Created Date

*   **Violation Explanation**: The vocabulary must have a created date indicated using the `schema:dateCreated` predicate.
*   **Corrected TTL**:
    ```turtle
cs:
    a
        owl:Ontology ,
        skos:ConceptScheme ;
    schema:dateCreated "2025-02-19"^^xsd:date ;
```
*   **No script needed**: This fix can be applied manually by adding the `schema:dateCreated` predicate to the vocabulary.

### 5. Modified Date

*   **Violation Explanation**: The vocabulary must have a modified date indicated using the `schema:dateModified` predicate.
*   **Corrected TTL**:
    ```turtle
cs:
    a
        owl:Ontology ,
        skos:ConceptScheme ;
    schema:dateModified "2025-02-19"^^xsd:date ;
```
*   **No script needed**: This fix can be applied manually by adding the `schema:dateModified` predicate to the vocabulary.

### 6. Creator

*   **Violation Explanation**: The vocabulary must have at least one creator, indicated using the `schema:creator` predicate, which must be an IRI indicating an instance of `schema:Person` or `schema:Organization`.
*   **Corrected TTL**:
    ```turtle
cs:
    a
        owl:Ontology ,
        skos:ConceptScheme ;
    schema:creator <https://linked.data.gov.au/org/suncorp> ;
```
*   **No script needed**: This fix can be applied manually by adding the `schema:creator` predicate to the vocabulary.

## Validator Gaps
The SHACL shapes used for validation appear to be comprehensive. However, it is recommended to review the shapes to ensure they align with the latest requirements and best practices.
