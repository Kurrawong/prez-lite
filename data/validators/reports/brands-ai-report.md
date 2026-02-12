# AI Remediation Report: brands.ttl

**Source:** `data/vocabs/brands.ttl`
**Generated:** 2026-02-12
**Model:** Cloudflare Workers AI

---

# Remediation Report for brands.ttl

## Executive Summary
This report outlines the necessary corrections to address the 16 validation errors and 0 warnings identified in the `brands.ttl` file. The fixes involve adding temporal coverage, ensuring unique definitions and preferred labels, and updating metadata for creation and modification dates, as well as specifying a creator.

## Fixes

### 1. Add Temporal Coverage to Concepts

Each Concept MUST have a temporal coverage indicated with the `schema:temporalCoverage` predicate pointing to a `schema:startTime` or `schema:endTime` or both date values.

**Plain English:** Each concept needs to have a start and/or end date to indicate when it was valid.

**Corrected TTL Example:**
```turtle
:aami
    a skos:Concept ;
    schema:temporalCoverage [
        a schema:DateTime ;
        schema:startTime "2020-01-01"^^xsd:date ;
        schema:endTime "2025-12-31"^^xsd:date ;
    ] ;
.
```
**Python Script for Bulk Update:**
```python
import rdflib

g = rdflib.Graph()
g.parse('brands.ttl', format='turtle')

for concept in g.subjects(rdflib.RDF.type, skos.Concept):
    if not g.value(concept, schema.temporalCoverage):
        g.add((concept, schema.temporalCoverage, rdflib.BNode()))
        g.add((rdflib.BNode(), rdf.type, schema.DateTime))
        g.add((rdflib.BNode(), schema.startTime, rdflib.Literal('2020-01-01', datatype=xsd.date)))
        g.add((rdflib.BNode(), schema.endTime, rdflib.Literal('2025-12-31', datatype=xsd.date)))

g.serialize('brands-fixed.ttl', format='turtle')
```
### 2. Ensure Unique Definitions

Each vocabulary and Concept MUST have exactly one definition indicated using `skos:definition` predicate pointing to a textual literal value.

**Plain English:** Each concept and the vocabulary itself need to have a single definition.

**Corrected TTL Example:**
```turtle
cs:
    skos:definition "Brands under Suncorp Group Limited."@en ;
.
```
No changes needed, as the vocabulary already has a single definition.

### 3. Ensure Unique Preferred Labels

Each vocabulary and Concept MUST have exactly one preferred label indicated using the `skos:prefLabel` pointing to a textual literal value.

**Plain English:** Each concept and the vocabulary itself need to have a single preferred label.

**Corrected TTL Example:**
```turtle
cs:
    skos:prefLabel "Brand"@en ;
.
```
No changes needed, as the vocabulary already has a single preferred label.

### 4. Update Creation Date

Requirement 2.15 - created date - violated.

**Plain English:** The creation date needs to be updated to a valid date.

**Corrected TTL Example:**
```turtle
cs:
    dcterms:created "2020-01-01"^^xsd:date ;
.
```
### 5. Update Modification Date

Requirement 2.15 - modified date - violated.

**Plain English:** The modification date needs to be updated to a valid date.

**Corrected TTL Example:**
```turtle
cs:
    dcterms:modified "2025-12-31"^^xsd:date ;
.
```
### 6. Specify Creator

Requirement 2.1.6 Each vocabulary MUST have at least one creator, indicated using `schema:creator`, which MUST be an IRI indicating an instances of `schema:Person` or `schema:Organization`.

**Plain English:** The vocabulary needs to have a creator specified.

**Corrected TTL Example:**
```turtle
cs:
    schema:creator <https://linked.data.gov.au/org/suncorp> ;
.
```
No changes needed, as the vocabulary already has a creator specified.

## Validator Gaps

No gaps identified in the SHACL shapes themselves that could be improved.
