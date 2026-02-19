---
title: Profile Specification
status: current
updated: 2025-02-08
---

# Profile Specification

> How profiles control data extraction and presentation in prez-lite.

## Overview

Profiles define:
- Which properties to extract from RDF
- How to find labels and descriptions
- What annotations to generate
- What output formats to support

prez-lite uses SHACL-based profiles compatible with [Prez](https://github.com/RDFLib/prez).

---

## Profile Types

### Object Profile (`prez:ObjectProfile`)

Renders individual resources (scheme, concept, item).

```turtle
prez:ConceptSchemeDefault a prez:ObjectProfile ;
    sh:targetClass skos:ConceptScheme ;
    prez:identifier "default" ;
    dcterms:title "Concept Scheme Default Profile" .
```

### Listing Profile (`prez:ListingProfile`)

Renders collections of resources. *Not yet fully implemented.*

```turtle
prez:SchemesListing a prez:ListingProfile ;
    sh:targetClass skos:ConceptScheme ;
    prez:defaultPageSize 20 ;
    prez:maxPageSize 100 .
```

---

## Profile Properties

### Identification

| Property | Type | Description |
|----------|------|-------------|
| `prez:identifier` | string | Short unique ID (e.g., "default") |
| `dcterms:title` | string | Human-readable name |
| `dcterms:description` | string | Profile description |
| `sh:targetClass` | IRI | RDF class this profile applies to |

### Source Predicates

Define where to find values, in priority order. First match wins.

| Property | Purpose | Typical Values |
|----------|---------|----------------|
| `prez:labelSource` | Labels | `skos:prefLabel`, `dcterms:title`, `rdfs:label` |
| `prez:descriptionSource` | Descriptions | `skos:definition`, `dcterms:description` |
| `prez:provenanceSource` | Provenance | `dcterms:provenance`, `prov:wasAttributedTo` |

**Example:**
```turtle
prez:labelSource skos:prefLabel, dcterms:title, rdfs:label ;
```

This means:
1. First, look for `skos:prefLabel`
2. If not found, try `dcterms:title`
3. If still not found, use `rdfs:label`

### Generation Flags

Boolean flags controlling what annotations to generate:

| Flag | Description |
|------|-------------|
| `prez:generateIdentifier` | Generate `prez:identifier` |
| `prez:generateLink` | Generate `prez:link` |
| `prez:generateLabel` | Generate `prez:label` |
| `prez:generateDescription` | Generate `prez:description` |
| `prez:generateProvenance` | Generate `prez:provenance` |
| `prez:generateMembers` | Generate `prez:members` (collections) |
| `prez:generateFocusNode` | Generate `prez:focusNode` |

### Templates

URI templates for generating links and identifiers:

| Property | Description |
|----------|-------------|
| `prez:linkTemplate` | Template for `prez:link` values |
| `prez:membersTemplate` | Template for member links |

---

## Complete Example

```turtle
@prefix prez: <https://prez.dev/> .
@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix skos: <http://www.w3.org/2004/02/skos/core#> .
@prefix dcterms: <http://purl.org/dc/terms/> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .

prez:ConceptSchemeDefault a prez:ObjectProfile ;
    sh:targetClass skos:ConceptScheme ;
    prez:identifier "default" ;
    dcterms:title "Concept Scheme Default Profile" ;
    dcterms:description "Default profile for rendering SKOS ConceptSchemes" ;

    # Source predicates (priority order)
    prez:labelSource skos:prefLabel, dcterms:title, rdfs:label ;
    prez:descriptionSource skos:definition, dcterms:description, rdfs:comment ;
    prez:provenanceSource dcterms:provenance ;

    # Generation flags
    prez:generateIdentifier true ;
    prez:generateLink true ;
    prez:generateLabel true ;
    prez:generateDescription true ;
    prez:generateProvenance true ;
    prez:generateMembers true ;

    # Templates
    prez:linkTemplate "/scheme?uri={uri}" ;
    prez:membersTemplate "/concept?uri={uri}" ;

    # Output formats
    prez:outputFormat prez:Turtle, prez:JSON, prez:JSONLD, prez:RDFXML, prez:CSV .
```

---

## Target Classes

Common target classes:

| Class | Profile Purpose |
|-------|-----------------|
| `skos:ConceptScheme` | Vocabulary rendering |
| `skos:Concept` | Concept rendering |
| `skos:Collection` | Collection rendering |
| `dcat:Catalog` | Catalog rendering |
| `dcat:Dataset` | Dataset rendering |

---

## Multiple Profiles

You can define multiple profiles for the same target class:

| Profile | Use Case |
|---------|----------|
| `default` | Standard rendering |
| `full` | All available properties |
| `minimal` | Labels and links only |
| Custom | Domain-specific views |

---

## Profile Selection

1. **Manifest specifies profile**: Profile IRI in manifest
2. **Default fallback**: Use profile with `prez:identifier "default"`
3. **Class-based**: Match `sh:targetClass` to resource type

---

## Output Formats

| Format | `prez:outputFormat` | Extension |
|--------|---------------------|-----------|
| Turtle | `prez:Turtle` | `.ttl` |
| JSON | `prez:JSON` | `.json` |
| JSON-LD | `prez:JSONLD` | `.jsonld` |
| RDF/XML | `prez:RDFXML` | `.rdf` |
| CSV | `prez:CSV` | `.csv` |

---

## Profile Helper

Use the [Profile Helper](/profile-helper) page to interactively build profile definitions with:
- Target class selection
- Source predicate ordering
- Generation flag toggles
- Live TTL preview
- Validation feedback
