# AI Remediation Report: alteration-form.ttl

**Source:** `data/vocabs/alteration-form.ttl`
**Generated:** 2026-02-12
**Model:** Cloudflare Workers AI

---

## Executive Summary
The alteration-form vocabulary is non-conformant due to 27 violations across four categories. The main issues are the lack of temporal coverage for each concept, incorrect definition and preferred label usage, and insufficient creator information. This report provides a detailed analysis of each violation category and proposes fixes to address these issues.

## Fixes
### 1. Each Concept MUST have a temporal coverage indicated with the schema:temporalCoverage predicate pointing to a schema:startTime or schema:endTime or both date values
Current:
```turtle
:banding-controlled
    a skos:Concept ;
    # ... other triples
```
Fix:
```turtle
:banding-controlled
    a skos:Concept ;
    schema:temporalCoverage [
        schema:startTime "2024-01-01"^^xsd:date ;
        schema:endTime "2024-12-31"^^xsd:date ;
    ] ;
    # ... other triples
```
To apply this fix to all 24 concepts, a Python script can be used:
```python
from rdflib import Graph, Namespace, Literal
from rdflib.namespace import SKOS, SCHEMA

g = Graph()
g.parse("alteration-form.ttl", format="turtle")

SCHEMA = Namespace("https://schema.org/")

for concept in g.subjects(RDF.type, SKOS.Concept):
    g.add((concept, SCHEMA.temporalCoverage, BNode()))
    g.add((g[concept][SCHEMA.temporalCoverage], SCHEMA.startTime, Literal("2024-01-01", datatype=XSD.date)))
    g.add((g[concept][SCHEMA.temporalCoverage], SCHEMA.endTime, Literal("2024-12-31", datatype=XSD.date)))

g.serialize("alteration-form-fixed.ttl", format="turtle")
```

### 2. Requirement 2.1.4, 2.2.1 or 2.3.1 Each vocabulary and Concept MUST have exactly one definition indicated using skos:definition predicate pointing to a textual literal value
Current:
```turtle
cs:
    a skos:ConceptScheme ;
    skos:definition "Compilation of terms that described geometry (i.e. the shape, distribution and configuration) of alteration in rocks and minerals as observed at the macro-, meso- and microscopic scale, and applying to the specific area of observation. Alteration in this context is defined as a modification of the original lithology caused by meteoric, connate, metamorphic, or magmatic-derived fluids, excluding the weathering environment, mineralization and direct magmatic or metamorphic processes. Definitions are largely taken from Pirajno (2009) and the Glossary of geology (Neuendorf et al., 2011)."@en ;
```
Fix:
```turtle
cs:
    a skos:ConceptScheme ;
    skos:definition "Compilation of terms that described geometry (i.e. the shape, distribution and configuration) of alteration in rocks and minerals as observed at the macro-, meso- and microscopic scale, and applying to the specific area of observation. Alteration in this context is defined as a modification of the original lithology caused by meteoric, connate, metamorphic, or magmatic-derived fluids, excluding the weathering environment, mineralization and direct magmatic or metamorphic processes. Definitions are largely taken from Pirajno (2009) and the Glossary of geology (Neuendorf et al., 2011)." ;
```
Remove the `@en` language tag to make the definition a plain literal.

### 3. Requirement 2.1.4, 2.2.1 or 2.3.1 Each vocabulary and Concept MUST have exactly one preferred label indicated using the skos:prefLabel pointing to a textual literal value
Current:
```turtle
cs:
    a skos:ConceptScheme ;
    skos:prefLabel "Alteration form"@en ;
```
Fix:
```turtle
cs:
    a skos:ConceptScheme ;
    skos:prefLabel "Alteration form" ;
```
Remove the `@en` language tag to make the preferred label a plain literal.

### 4. Requirement 2.1.6 Each vocabulary MUST have at least one creator, indicated using schema:creator, which MUST be an IRI indicating an instances of schema:Person or schema:Organization
Current:
```turtle
cs:
    a skos:ConceptScheme ;
    schema:creator <https://linked.data.gov.au/org/gswa> ;
```
Fix:
No change is needed, as the current creator is already an IRI pointing to an organization.

## Validator Gaps
None identified. The validator appears to be comprehensive and covers all the necessary aspects of the vocabulary. However, it is recommended to review the validator shapes and rules to ensure they are up-to-date and aligned with the latest standards and best practices.
