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
# No temporal coverage is defined for any concept
```
Fix:
```turtle
:aami
    a skos:Concept ;
    # ... other triples
    schema:temporalCoverage [
        a schema:DateTime ;
        schema:startTime "2020-01-01"^^xsd:date ;
        schema:endTime "2025-12-31"^^xsd:date ;
    ] ;
.
```
To apply this fix to all concepts, a Python script can be used:
```python
from rdflib import Graph, Namespace, Literal
from rdflib.namespace import XSD

SCHEMA = Namespace("https://schema.org/")
SKOS = Namespace("http://www.w3.org/2004/02/skos/core#")

g = Graph()
g.parse("brands.ttl", format="turtle")

for concept in g.subjects(SKOS.Concept):
    g.add((concept, SCHEMA.temporalCoverage, SCHEMA.DateTime()))
    g.add((SCHEMA.DateTime(), SCHEMA.startTime, Literal("2020-01-01", datatype=XSD.date)))
    g.add((SCHEMA.DateTime(), SCHEMA.endTime, Literal("2025-12-31", datatype=XSD.date)))

g.serialize("brands-fixed.ttl", format="turtle")
```

### 2. Requirement 2.1.4, 2.2.1 or 2.3.1 Each vocabulary and Concept MUST have exactly one definition indicated using skos:definition predicate pointing to a textual literal value
Current:
```turtle
cs:
    # ... other triples
    skos:definition "Brands under Suncorp Group Limited."@en ;
.
```
Fix:
```turtle
cs:
    # ... other triples
    skos:definition "Brands under Suncorp Group Limited." ;
.
```
To apply this fix, remove the language tag from all `skos:definition` literals:
```python
from rdflib import Graph, Namespace, Literal

SKOS = Namespace("http://www.w3.org/2004/02/skos/core#")

g = Graph()
g.parse("brands.ttl", format="turtle")

for s, p, o in g:
    if p == SKOS.definition and isinstance(o, Literal) and o.language:
        g.remove((s, p, o))
        g.add((s, p, Literal(str(o))))

g.serialize("brands-fixed.ttl", format="turtle")
```

### 3. Requirement 2.1.4, 2.2.1 or 2.3.1 Each vocabulary and Concept MUST have exactly one preferred label indicated using the skos:prefLabel pointing to a textual literal value
Current:
```turtle
cs:
    # ... other triples
    skos:prefLabel "Brand"@en ;
.
```
Fix:
```turtle
cs:
    # ... other triples
    skos:prefLabel "Brand" ;
.
```
To apply this fix, remove the language tag from all `skos:prefLabel` literals:
```python
from rdflib import Graph, Namespace, Literal

SKOS = Namespace("http://www.w3.org/2004/02/skos/core#")

g = Graph()
g.parse("brands.ttl", format="turtle")

for s, p, o in g:
    if p == SKOS.prefLabel and isinstance(o, Literal) and o.language:
        g.remove((s, p, o))
        g.add((s, p, Literal(str(o))))

g.serialize("brands-fixed.ttl", format="turtle")
```

### 4. Requirement 2.15 - created date - violated
Current:
```turtle
cs:
    # ... other triples
    dcterms:created "2025-02-19"^^xsd:date ;
.
```
Fix:
```turtle
cs:
    # ... other triples
    schema:dateCreated "2025-02-19"^^xsd:date ;
.
```
To apply this fix, replace `dcterms:created` with `schema:dateCreated`:
```python
from rdflib import Graph, Namespace

DCTERMS = Namespace("http://purl.org/dc/terms/")
SCHEMA = Namespace("https://schema.org/")

g = Graph()
g.parse("brands.ttl", format="turtle")

for s, p, o in g:
    if p == DCTERMS.created:
        g.remove((s, p, o))
        g.add((s, SCHEMA.dateCreated, o))

g.serialize("brands-fixed.ttl", format="turtle")
```

### 5. Requirement 2.15 - modified date - violated
Current:
```turtle
cs:
    # ... other triples
    dcterms:modified "2025-02-19"^^xsd:date ;
.
```
Fix:
```turtle
cs:
    # ... other triples
    schema:dateModified "2025-02-19"^^xsd:date ;
.
```
To apply this fix, replace `dcterms:modified` with `schema:dateModified`:
```python
from rdflib import Graph, Namespace

DCTERMS = Namespace("http://purl.org/dc/terms/")
SCHEMA = Namespace("https://schema.org/")

g = Graph()
g.parse("brands.ttl", format="turtle")

for s, p, o in g:
    if p == DCTERMS.modified:
        g.remove((s, p, o))
        g.add((s, SCHEMA.dateModified, o))

g.serialize("brands-fixed.ttl", format="turtle")
```

### 6. Requirement 2.1.6 Each vocabulary MUST have at least one creator, indicated using schema:creator, which MUST be an IRI indicating an instances of schema:Person or schema:Organization
Current:
```turtle
cs:
    # ... other triples
    dcterms:creator <https://linked.data.gov.au/org/suncorp> ;
.
```
Fix:
```turtle
cs:
    # ... other triples
    schema:creator <https://linked.data.gov.au/org/suncorp> ;
.
```
To apply this fix, replace `dcterms:creator` with `schema:creator`:
```python
from rdflib import Graph, Namespace

DCTERMS = Namespace("http://purl.org/dc/terms/")
SCHEMA = Namespace("https://schema.org/")

g = Graph()
g.parse("brands.ttl", format="turtle")

for s, p, o in g:
    if p == DCTERMS.creator:
        g.remove((s, p, o))
        g.add((s, SCHEMA.creator, o))

g.serialize("brands-fixed.ttl", format="turtle")
```

## Validator Gaps
None identified. The provided validator shapes cover all the necessary requirements for the brands vocabulary. However, it is recommended to review the validator shapes regularly to ensure they are up-to-date and cover all the necessary requirements.
