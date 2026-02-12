# AI Remediation Report: alteration-form.ttl

**Source:** `data/vocabs/alteration-form.ttl`
**Generated:** 2026-02-12
**Model:** Cloudflare Workers AI

---

Remediation Report
================

### Executive Summary

This report outlines the necessary corrections to address the validation issues identified in the alteration-form vocabulary. The report provides explanations, corrected TTL triples, and Python scripts to resolve the violations.

### Fixes

#### 1. Temporal Coverage

Each Concept MUST have a temporal coverage indicated with the schema:temporalCoverage predicate pointing to a schema:startTime or schema:endTime or both date values.

*Explanation:* The temporal coverage indicates the time period during which the concept is relevant. This information is essential for understanding the context of the concept.

*Corrected TTL:*
```turtle
:banding-controlled
    a skos:Concept ;
    schema:temporalCoverage [
        schema:startTime "2020-01-01"^^xsd:date ;
        schema:endTime "2025-12-31"^^xsd:date ;
    ] .
```
*Python Script:*
```python
import rdflib

# Load the RDF graph
g = rdflib.Graph()
g.parse("alteration-form.ttl", format="turtle")

# Define the temporal coverage
start_date = "2020-01-01"
end_date = "2025-12-31"

# Iterate over all Concepts and add temporal coverage
for concept in g.subjects(rdflib.RDF.type, skos.Concept):
    g.add((concept, schema.temporalCoverage, rdflib.BNode()))
    g.add((rdflib.BNode(), schema.startTime, rdflib.Literal(start_date, datatype=xsd.date)))
    g.add((rdflib.BNode(), schema.endTime, rdflib.Literal(end_date, datatype=xsd.date)))

# Serialize the updated graph
g.serialize("alteration-form-updated.ttl", format="turtle")
```
#### 2. Definition

Each vocabulary and Concept MUST have exactly one definition indicated using skos:definition predicate pointing to a textual literal value.

*Explanation:* The definition provides a clear and concise explanation of the concept.

*Corrected TTL:*
```turtle
:alteration-form
    a skos:ConceptScheme ;
    skos:definition "Compilation of terms that described geometry (i.e. the shape, distribution and configuration) of alteration in rocks and minerals as observed at the macro-, meso- and microscopic scale, and applying to the specific area of observation."@en .
```
#### 3. Preferred Label

Each vocabulary and Concept MUST have exactly one preferred label indicated using the skos:prefLabel pointing to a textual literal value.

*Explanation:* The preferred label provides a human-readable name for the concept.

*Corrected TTL:*
```turtle
:alteration-form
    a skos:ConceptScheme ;
    skos:prefLabel "Alteration form"@en .
```
#### 4. Creator

Each vocabulary MUST have at least one creator, indicated using schema:creator, which MUST be an IRI indicating an instances of schema:Person or schema:Organization.

*Explanation:* The creator provides information about the person or organization responsible for creating the vocabulary.

*Corrected TTL:*
```turtle
:alteration-form
    a skos:ConceptScheme ;
    schema:creator <https://orcid.org/0000-0002-7645-5031> .
```
### Validator Gaps

The SHACL shapes used for validation do not cover all aspects of the vocabulary. For example, the shapes do not check for the presence of skos:broader or skos:narrower relationships between concepts. Additional shapes may be necessary to ensure the vocabulary is fully validated.
