# AI Remediation Report: ANZIC2006-industry-classifications.ttl

**Source:** `data/vocabs/ANZIC2006-industry-classifications.ttl`
**Generated:** 2026-02-12
**Model:** Cloudflare Workers AI

---

### Executive Summary
The ANZIC2006-industry-classifications vocabulary is non-conformant with the Suncorp Vocab Validator v1.0, resulting in 300 total violations across 7 categories. The primary issues stem from missing temporal coverage, incorrect usage of Dublin Core Terms predicates instead of Schema.org predicates, and the absence of required properties such as creator and definition. This report outlines the necessary fixes for each violation category, providing before and after examples for clarity.

### Fixes

#### 1. Each Concept MUST have a temporal coverage indicated with the schema:temporalCoverage predicate pointing to a schema:startTime or schema:endTime or both date values
Current:
```turtle
# No temporal coverage is currently defined
```
Fix:
```turtle
# Add temporal coverage for each concept
icat:A0110
    a skos:Concept ;
    schema:temporalCoverage [
        a schema:DatasetSeries ;
        schema:startTime "2006-01-01"^^xsd:date ;
        schema:endTime "2023-12-31"^^xsd:date ;
    ] ;
```
To apply this fix to all 294 concepts, a Python script using rdflib can be utilized:
```python
from rdflib import Graph, Namespace, Literal
from rdflib.namespace import XSD

SCHEMA = Namespace("https://schema.org/")
SKOS = Namespace("http://www.w3.org/2004/02/skos/core#")

g = Graph()
g.parse("ANZIC2006-industry-classifications.ttl", format="turtle")

for concept in g.subjects(SKOS.Concept):
    g.add((concept, SCHEMA.temporalCoverage, SCHEMA.DatasetSeries()))
    g.add((SCHEMA.DatasetSeries(), SCHEMA.startTime, Literal("2006-01-01", datatype=XSD.date)))
    g.add((SCHEMA.DatasetSeries(), SCHEMA.endTime, Literal("2023-12-31", datatype=XSD.date)))

g.serialize("ANZIC2006-industry-classifications-fixed.ttl", format="turtle")
```

#### 2. Requirement 2.1.4, 2.2.1 or 2.3.1 Each vocabulary and Concept MUST have exactly one definition indicated using skos:definition predicate pointing to a textual literal value
Current:
```turtle
cs:
    skos:definition """An industrial classification organises data about business units. It provides a standard framework under which business units carrying out similar production activities can be grouped together, with each resultant group referred to as an industry.\r
    An individual business entity is assigned to an industry based on its predominant economic activity. The term business entity is used in its widest sense to include any organisation undertaking productive activities, including companies, non-profit organisations, government departments and enterprises. ANZSIC has four hierarchic levels: Divisions (the broadest level), Subdivisions, Groups and Classes (the finest level).\r
    At the Divisional level, the main purpose is to provide a limited number of categories which provide a broad overall picture of the economy and are suitable for the publication of summary tables in official statistics. The Subdivision, Group and Class levels provide increasingly detailed dissections of these categories for the compilation of more specific and detailed statistics."""@en ;
```
Fix:
```turtle
cs:
    skos:definition "An industrial classification organises data about business units." ;
```
Remove the `@en` tag to ensure the definition is a plain literal.

#### 3. Requirement 2.1.4, 2.2.1 or 2.3.1 Each vocabulary and Concept MUST have exactly one preferred label indicated using the skos:prefLabel pointing to a textual literal value
Current:
```turtle
cs:
    skos:prefLabel "Australian and New Zealand Standard Industrial Classification 2006 - Codes and TitlesXX"@en ;
```
Fix:
```turtle
cs:
    skos:prefLabel "Australian and New Zealand Standard Industrial Classification 2006" ;
```
Remove the `@en` tag and simplify the label for clarity.

#### 4. Requirement 2.15 - created date - violated
Current:
```turtle
cs:
    dcterms:created "2020-02-17"^^xsd:date ;
```
Fix:
```turtle
cs:
    schema:dateCreated "2020-02-17"^^xsd:date ;
```
Replace `dcterms:created` with `schema:dateCreated` to align with the validator's requirements.

#### 5. Requirement 2.15 - modified date - violated
Current:
```turtle
cs:
    dcterms:modified "2023-03-16"^^xsd:date ;
```
Fix:
```turtle
cs:
    schema:dateModified "2023-03-16"^^xsd:date ;
```
Replace `dcterms:modified` with `schema:dateModified` to align with the validator's requirements.

#### 6. Requirement 2.1.6 Each vocabulary MUST have at least one creator, indicated using schema:creator, which MUST be an IRI indicating an instances of schema:Person or schema:Organization
Current:
```turtle
cs:
    dcterms:creator <https://linked.data.gov.au/org/gsq> ;
```
Fix:
```turtle
cs:
    schema:creator <https://linked.data.gov.au/org/gsq> ;
```
Replace `dcterms:creator` with `schema:creator` to align with the validator's requirements.

#### 7. Requirement 2.2.3 A Collection exists within a vocabulary SHOULD indicate that it is within the vocabulary by use of the skos:inScheme predicate
Current:
```turtle
icat:coal-buyer
    a skos:Collection ;
    prov:wasDerivedFrom cs: ;
```
Fix:
```turtle
icat:coal-buyer
    a skos:Collection ;
    skos:inScheme cs: ;
    prov:wasDerivedFrom cs: ;
```
Add `skos:inScheme` to indicate the collection's relationship with the vocabulary.

### Validator Gaps
None identified. The provided validator shapes cover the necessary requirements for vocabulary and concept validation, including temporal coverage, definitions, preferred labels, creation and modification dates, creators, and collection relationships.
