# AI Remediation Report: brands.ttl

**Source:** `data/vocabs/brands.ttl`
**Generated:** 2026-02-12
**Model:** Cloudflare Workers AI

---

## Executive Summary
The provided TTL file for the brands vocabulary contains several violations against the Suncorp Vocab Validator. The main issues include missing temporal coverage for concepts, incorrect usage of predicates for definition and preferred label, missing or incorrect created and modified dates, and missing creator information. This report outlines the necessary fixes for each violation category.

## Fixes
### 1. Each Concept MUST have a temporal coverage indicated with the schema:temporalCoverage predicate pointing to a schema:startTime or schema:endTime or both date values
Current:
```turtle
:aami
    a skos:Concept ;
    # ... other triples
```
Fix:
```turtle
:aami
    a skos:Concept ;
    schema:temporalCoverage [
        a schema:DateTime ;
        schema:startTime "2020-01-01"^^xsd:date ;
        schema:endTime "2025-12-31"^^xsd:date ;
    ] ;
    # ... other triples
```
To apply this fix to all concepts, a Python script can be used:
```python
from rdflib import Graph, Namespace, Literal
from rdflib.namespace import XSD

SCHEMA = Namespace("https://schema.org/")
SKOS = Namespace("http://www.w3.org/2004/02/skos/core#")

g = Graph()
g.parse("brands.ttl", format="turtle")

for concept in g.subjects(RDF.type, SKOS.Concept):
    g.add((concept, SCHEMA.temporalCoverage, BNode()))
    temporal_coverage = g.value(concept, SCHEMA.temporalCoverage)
    g.add((temporal_coverage, RDF.type, SCHEMA.DateTime))
    g.add((temporal_coverage, SCHEMA.startTime, Literal("2020-01-01", datatype=XSD.date)))
    g.add((temporal_coverage, SCHEMA.endTime, Literal("2025-12-31", datatype=XSD.date)))

g.serialize("brands-fixed.ttl", format="turtle")
```

### 2. Requirement 2.1.4, 2.2.1 or 2.3.1 Each vocabulary and Concept MUST have exactly one definition indicated using skos:definition predicate pointing to a textual literal value
Current:
```turtle
cs:
    a
        owl:Ontology ,
        skos:ConceptScheme ;
    # ... other triples
    skos:definition "Brands under Suncorp Group Limited."@en ;
    # ... other triples
```
Fix:
```turtle
cs:
    a
        owl:Ontology ,
        skos:ConceptScheme ;
    # ... other triples
    skos:definition "Brands under Suncorp Group Limited." ;
    # ... other triples
```
The `@en` language tag needs to be removed to make the literal a plain string.

### 3. Requirement 2.1.4, 2.2.1 or 2.3.1 Each vocabulary and Concept MUST have exactly one preferred label indicated using the skos:prefLabel pointing to a textual literal value
Current:
```turtle
cs:
    a
        owl:Ontology ,
        skos:ConceptScheme ;
    # ... other triples
    skos:prefLabel "Brand"@en ;
    # ... other triples
```
Fix:
```turtle
cs:
    a
        owl:Ontology ,
        skos:ConceptScheme ;
    # ... other triples
    skos:prefLabel "Brand" ;
    # ... other triples
```
The `@en` language tag needs to be removed to make the literal a plain string.

### 4. Requirement 2.15 - created date - violated
Current:
```turtle
cs:
    a
        owl:Ontology ,
        skos:ConceptScheme ;
    # ... other triples
    dcterms:created "2025-02-19"^^xsd:date ;
    # ... other triples
```
Fix:
```turtle
cs:
    a
        owl:Ontology ,
        skos:ConceptScheme ;
    # ... other triples
    schema:dateCreated "2025-02-19"^^xsd:date ;
    # ... other triples
```
The `dcterms:created` predicate needs to be replaced with `schema:dateCreated`.

### 5. Requirement 2.15 - modified date - violated
Current:
```turtle
cs:
    a
        owl:Ontology ,
        skos:ConceptScheme ;
    # ... other triples
    dcterms:modified "2025-02-19"^^xsd:date ;
    # ... other triples
```
Fix:
```turtle
cs:
    a
        owl:Ontology ,
        skos:ConceptScheme ;
    # ... other triples
    schema:dateModified "2025-02-19"^^xsd:date ;
    # ... other triples
```
The `dcterms:modified` predicate needs to be replaced with `schema:dateModified`.

### 6. Requirement 2.1.6 Each vocabulary MUST have at least one creator, indicated using schema:creator, which MUST be an IRI indicating an instances of schema:Person or schema:Organization
Current:
```turtle
cs:
    a
        owl:Ontology ,
        skos:ConceptScheme ;
    # ... other triples
    dcterms:creator <https://linked.data.gov.au/org/suncorp> ;
    # ... other triples
```
Fix:
```turtle
cs:
    a
        owl:Ontology ,
        skos:ConceptScheme ;
    # ... other triples
    schema:creator <https://linked.data.gov.au/org/suncorp> ;
    # ... other triples
```
The `dcterms:creator` predicate needs to be replaced with `schema:creator`.

## Validator Gaps
None identified. The provided validator shapes cover all the necessary requirements for the vocabulary. However, it is recommended to review the validator shapes regularly to ensure they are up-to-date and cover all the necessary requirements.
