# AI Remediation Report: ANZIC2006-industry-classifications.ttl

**Source:** `data/vocabs/ANZIC2006-industry-classifications.ttl`
**Generated:** 2026-02-12
**Model:** Cloudflare Workers AI

---

# Remediation Report

## Executive Summary
The ANZIC2006-industry-classifications vocabulary is non-conformant due to a single violation category affecting all 294 concepts. This report provides a remediation plan to address the issue.

## Fixes

### 1. Each Concept MUST have a temporal coverage indicated with the schema:temporalCoverage predicate pointing to a schema:startTime or schema:endTime or both date values

#### Explanation
Each concept in the vocabulary must have a temporal coverage indicated using the `schema:temporalCoverage` predicate, which points to either a `schema:startTime` or `schema:endTime` or both date values. This is a requirement for the vocabulary to be conformant.

#### Corrected TTL Example
```turtle
icat:A0110
    a skos:Concept ;
    dcterms:source "https://www.abs.gov.au/AUSSTATS/abs@.nsf/DetailsPage/1292.02006%20(Revision%202.0)?OpenDocument"^^xsd:anyURI ;
    rdfs:isDefinedBy cs: ;
    skos:broader icat:A0100 ;
    skos:definition "An individual business entity whose predominant economic activity is Nursery and Floriculture Production."@en ;
    skos:inScheme cs: ;
    skos:notation "A0110" ;
    skos:prefLabel "Nursery and Floriculture Production"@en ;
    schema:temporalCoverage [
        a schema:DateTime ;
        schema:startTime "2006-01-01"^^xsd:date ;
        schema:endTime "2023-12-31"^^xsd:date ;
    ] .
```

#### Python Script for Bulk Changes
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

# Add temporal coverage to each concept
for concept in g.subjects(rdflib.RDF.type, rdflib.URIRef("http://www.w3.org/2004/02/skos/core#Concept")):
    g.add(concept, rdflib.URIRef("http://schema.org/temporalCoverage"), temporal_coverage)

# Save the updated vocabulary
g.serialize("ANZIC2006-industry-classifications-updated.ttl", format="turtle")
```

## Validator Gaps
None identified.
