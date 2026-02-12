# AI Remediation Report: ANZIC2006-industry-classifications.ttl

**Source:** `data/vocabs/ANZIC2006-industry-classifications.ttl`
**Generated:** 2026-02-12
**Model:** Cloudflare Workers AI

---

# Remediation Report

## Executive Summary
The ANZIC2006-industry-classifications vocabulary is non-conformant due to missing temporal coverage information for each concept. This report provides the necessary corrections to address the identified violations.

## Fixes

### 1. Add temporal coverage to each Concept

**Violation Explanation:** Each Concept is missing a temporal coverage indicated with the `schema:temporalCoverage` predicate pointing to a `schema:startTime` or `schema:endTime` or both date values.

**Corrected TTL Example:**
```turtle
icat:A0110
    a skos:Concept ;
    ...
    schema:temporalCoverage [
        a schema:DateTime ;
        schema:startTime "2006-01-01"^^xsd:date ;
        schema:endTime "2023-12-31"^^xsd:date ;
    ] ;
    ...
.
```
**Python Script for Bulk Update:**
```python
import rdflib

# Load the vocabulary
g = rdflib.Graph()
g.parse("ANZIC2006-industry-classifications.ttl", format="turtle")

# Define the temporal coverage
temporal_coverage = rdflib.BNode()
temporal_coverage.add(rdflib.RDF.type, rdflib.URIRef("http://schema.org/DateTime"))
temporal_coverage.add(rdflib.URIRef("http://schema.org/startTime"), rdflib.Literal("2006-01-01", datatype=rdflib.XSD.date))
temporal_coverage.add(rdflib.URIRef("http://schema.org/endTime"), rdflib.Literal("2023-12-31", datatype=rdflib.XSD.date))

# Add temporal coverage to each Concept
for concept in g.subjects(rdflib.RDF.type, rdflib.URIRef("http://www.w3.org/2004/02/skos/core#Concept")):
    g.add(concept, rdflib.URIRef("http://schema.org/temporalCoverage"), temporal_coverage)

# Save the updated vocabulary
g.serialize("ANZIC2006-industry-classifications-updated.ttl", format="turtle")
```
Note: The script assumes that the temporal coverage is the same for all concepts. If the temporal coverage varies, the script will need to be modified accordingly.

## Validator Gaps
None identified.
