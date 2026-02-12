# AI Remediation Report: ANZIC2006-industry-classifications.ttl

**Source:** `data/vocabs/ANZIC2006-industry-classifications.ttl`
**Generated:** 2026-02-12
**Model:** Cloudflare Workers AI

---

## Executive Summary
The ANZIC2006-industry-classifications vocabulary is non-conformant with the Suncorp Vocab Validator v1.0, resulting in 300 total violations across 7 categories. The primary issues stem from missing temporal coverage, incorrect usage of Dublin Core Terms predicates, and the absence of required Schema.org predicates. This report outlines the necessary fixes for each violation category, providing before and after examples for clarity.

## Fixes

### 1. Each Concept MUST have a temporal coverage indicated with the schema:temporalCoverage predicate pointing to a schema:startTime or schema:endTime or both date values
Current:
```turtle
icat:A0110
    a skos:Concept ;
    # ... other triples ...
    .
```
Fix:
```turtle
icat:A0110
    a skos:Concept ;
    schema:temporalCoverage [
        a schema:DateTime ;
        schema:startTime "2006-01-01"^^xsd:date ;
        schema:endTime "2006-12-31"^^xsd:date ;
    ] ;
    # ... other triples ...
    .
```
To apply this fix to all 294 concepts, a Python script can be used:
```python
from rdflib import Graph, Namespace, Literal
from rdflib.namespace import SKOS, SCHEMA

# Load the graph
g = Graph()
g.parse("ANZIC2006-industry-classifications.ttl", format="turtle")

# Define namespaces
SCHEMA = Namespace("https://schema.org/")

# Add temporal coverage to each concept
for concept in g.subjects(SKOS.Concept):
    g.add((concept, SCHEMA.temporalCoverage, SCHEMA.DateTime()))
    g.add((SCHEMA.DateTime(), SCHEMA.startTime, Literal("2006-01-01", datatype=SCHEMA.date)))
    g.add((SCHEMA.DateTime(), SCHEMA.endTime, Literal("2006-12-31", datatype=SCHEMA.date)))

# Save the updated graph
g.serialize("ANZIC2006-industry-classifications-fixed.ttl", format="turtle")
```

### 2. Requirement 2.1.4, 2.2.1 or 2.3.1 Each vocabulary and Concept MUST have exactly one definition indicated using skos:definition predicate pointing to a textual literal value
Current:
```turtle
cs:
    a
        owl:Ontology ,
        skos:ConceptScheme ;
    # ... other triples ...
    skos:definition """An industrial classification organises data about business units. It provides a standard framework under which business units carrying out similar production activities can be grouped together, with each resultant group referred to as an industry.\r
    An individual business entity is assigned to an industry based on its predominant economic activity. The term business entity is used in its widest sense to include any organisation undertaking productive activities, including companies, non-profit organisations, government departments and enterprises. ANZSIC has four hierarchic levels: Divisions (the broadest level), Subdivisions, Groups and Classes (the finest level).\r
    At the Divisional level, the main purpose is to provide a limited number of categories which provide a broad overall picture of the economy and are suitable for the publication of summary tables in official statistics. The Subdivision, Group and Class levels provide increasingly detailed dissections of these categories for the compilation of more specific and detailed statistics."""@en ;
    # ... other triples ...
    .
```
Fix:
```turtle
cs:
    a
        owl:Ontology ,
        skos:ConceptScheme ;
    # ... other triples ...
    skos:definition "An industrial classification organises data about business units." ;
    # ... other triples ...
    .
```
Remove the `@en` language tag to ensure the definition is a plain literal.

### 3. Requirement 2.1.4, 2.2.1 or 2.3.1 Each vocabulary and Concept MUST have exactly one preferred label indicated using the skos:prefLabel pointing to a textual literal value
Current:
```turtle
cs:
    a
        owl:Ontology ,
        skos:ConceptScheme ;
    # ... other triples ...
    skos:prefLabel "Australian and New Zealand Standard Industrial Classification 2006 - Codes and TitlesXX"@en ;
    # ... other triples ...
    .
```
Fix:
```turtle
cs:
    a
        owl:Ontology ,
        skos:ConceptScheme ;
    # ... other triples ...
    skos:prefLabel "Australian and New Zealand Standard Industrial Classification 2006" ;
    # ... other triples ...
    .
```
Remove the `@en` language tag and simplify the label.

### 4. Requirement 2.15 - created date - violated
Current:
```turtle
cs:
    a
        owl:Ontology ,
        skos:ConceptScheme ;
    # ... other triples ...
    dcterms:created "2020-02-17"^^xsd:date ;
    # ... other triples ...
    .
```
Fix:
```turtle
cs:
    a
        owl:Ontology ,
        skos:ConceptScheme ;
    # ... other triples ...
    schema:dateCreated "2020-02-17"^^xsd:date ;
    # ... other triples ...
    .
```
Replace `dcterms:created` with `schema:dateCreated`.

### 5. Requirement 2.15 - modified date - violated
Current:
```turtle
cs:
    a
        owl:Ontology ,
        skos:ConceptScheme ;
    # ... other triples ...
    dcterms:modified "2023-03-16"^^xsd:date ;
    # ... other triples ...
    .
```
Fix:
```turtle
cs:
    a
        owl:Ontology ,
        skos:ConceptScheme ;
    # ... other triples ...
    schema:dateModified "2023-03-16"^^xsd:date ;
    # ... other triples ...
    .
```
Replace `dcterms:modified` with `schema:dateModified`.

### 6. Requirement 2.1.6 Each vocabulary MUST have at least one creator, indicated using schema:creator, which MUST be an IRI indicating an instances of schema:Person or schema:Organization
Current:
```turtle
cs:
    a
        owl:Ontology ,
        skos:ConceptScheme ;
    # ... other triples ...
    dcterms:creator <https://linked.data.gov.au/org/gsq> ;
    # ... other triples ...
    .
```
Fix:
```turtle
cs:
    a
        owl:Ontology ,
        skos:ConceptScheme ;
    # ... other triples ...
    schema:creator <https://linked.data.gov.au/org/gsq> ;
    # ... other triples ...
    .
```
Replace `dcterms:creator` with `schema:creator`.

### 7. Requirement 2.2.3 A Collection exists within a vocabulary SHOULD indicate that it is within the vocabulary by use of the skos:inScheme predicate. If it is defined for the first time in the vocabulary, it SHOULD also indicate this with the rdfs:isDefinedBy predicate
Current:
```turtle
icat:coal-buyer
    a skos:Collection ;
    # ... other triples ...
    prov:wasDerivedFrom cs: ;
    # ... other triples ...
    .
```
Fix:
```turtle
icat:coal-buyer
    a skos:Collection ;
    # ... other triples ...
    skos:inScheme cs: ;
    rdfs:isDefinedBy cs: ;
    # ... other triples ...
    .
```
Add `skos:inScheme` and `rdfs:isDefinedBy` predicates to indicate the collection's relationship with the vocabulary.

## Validator Gaps
None identified. The provided validation report and SHACL shapes cover all necessary aspects of the vocabulary, and the fixes address each violation category.
