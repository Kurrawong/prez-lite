---
title: Authoring Vocabularies
description: Guide to creating and publishing SKOS vocabularies in Prez Lite
navigation: true
navTitle: Authoring
order: 5
---

# Authoring Vocabularies

This guide explains how to create and publish SKOS vocabularies in Prez Lite.

## Overview

Prez Lite uses a file-based approach to vocabulary publishing. Vocabularies are authored as Turtle (TTL) files and placed in the data directory structure:

```
data/
├── manifest.ttl          # Declares data sources
├── config/
│   └── profiles.ttl      # Prez profile configuration
├── vocabs/               # Your vocabulary files
│   └── my-vocabulary.ttl
└── background/           # Labels for external IRIs
    └── agents.ttl
```

---

## Creating a Vocabulary

Each vocabulary is a single TTL file containing a `skos:ConceptScheme` and its `skos:Concept` members.

### Minimal Example

```turtle
PREFIX : <https://example.org/def/colors/>
PREFIX cs: <https://example.org/def/colors>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
PREFIX schema: <https://schema.org/>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

cs:
    a skos:ConceptScheme ;
    skos:prefLabel "Colors"@en ;
    skos:definition "A vocabulary of color terms."@en ;
    skos:hasTopConcept :red, :blue, :green ;
    schema:creator <https://example.org/org/my-org> ;
    schema:dateCreated "2024-01-15"^^xsd:date ;
    schema:publisher <https://example.org/org/my-org> ;
.

:red
    a skos:Concept ;
    skos:prefLabel "Red"@en ;
    skos:definition "The color of blood or a ripe tomato."@en ;
    skos:inScheme cs: ;
    skos:topConceptOf cs: ;
.

:blue
    a skos:Concept ;
    skos:prefLabel "Blue"@en ;
    skos:definition "The color of the sky on a clear day."@en ;
    skos:inScheme cs: ;
    skos:topConceptOf cs: ;
.

:green
    a skos:Concept ;
    skos:prefLabel "Green"@en ;
    skos:definition "The color of grass and leaves."@en ;
    skos:inScheme cs: ;
    skos:topConceptOf cs: ;
.
```

### Required Properties

#### ConceptScheme

| Property | Description |
|----------|-------------|
| `skos:prefLabel` | Human-readable name |
| `skos:definition` | Description of the vocabulary |
| `skos:hasTopConcept` | Links to top-level concepts |
| `schema:creator` | Organization or person who created it |
| `schema:publisher` | Publishing organization |

#### Concept

| Property | Description |
|----------|-------------|
| `skos:prefLabel` | Human-readable name |
| `skos:definition` | Meaning of the concept |
| `skos:inScheme` | Reference to parent ConceptScheme |

### Hierarchical Concepts

Use `skos:broader` and `skos:narrower` to create hierarchies:

```turtle
:primary-colors
    a skos:Concept ;
    skos:prefLabel "Primary Colors"@en ;
    skos:inScheme cs: ;
    skos:topConceptOf cs: ;
    skos:narrower :red, :blue, :yellow ;
.

:red
    a skos:Concept ;
    skos:prefLabel "Red"@en ;
    skos:inScheme cs: ;
    skos:broader :primary-colors ;
.
```

---

## Background Files

Background files provide labels for external IRIs referenced in your vocabularies (e.g., organizations, people, related vocabularies).

### Purpose

When your vocabulary references external resources:

```turtle
schema:creator <https://linked.data.gov.au/org/gswa> ;
```

Prez Lite needs a label to display. Background files provide these labels.

### Example: agents.ttl

```turtle
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX schema: <https://schema.org/>

<https://linked.data.gov.au/org/gswa>
    a schema:Organization ;
    rdfs:label "Geological Survey of Western Australia" ;
    schema:name "Geological Survey of Western Australia" ;
.

<https://orcid.org/0000-0002-7645-5031>
    a schema:Person ;
    rdfs:label "Angela Riganti" ;
    schema:name "Angela Riganti" ;
.
```

### Common Background Files

| File | Contents |
|------|----------|
| `agents.ttl` | Organizations and people |
| `reg-statuses.ttl` | Registry status values |
| `data-roles.ttl` | ISO data roles (custodian, author, etc.) |

---

## The Profiles File

The `profiles.ttl` file configures how Prez Lite renders your vocabularies.

### Key Components

#### Catalog Definition

Defines the vocabulary collection metadata:

```turtle
<https://example.org/catalogue/my-vocabs> a prez:Catalog ;
    dcterms:identifier "catalogue:my-vocabs"^^xsd:token ;
    dcterms:title "My Vocabularies" ;
    dcterms:description "A collection of domain vocabularies." .
```

#### Object Profiles

Control how different resource types are displayed:

```turtle
prez:OGCSchemesObjectProfile a prof:Profile, prez:ObjectProfile ;
    dcterms:identifier "ogc-schemes-object"^^xsd:token ;
    dcterms:title "Concept Scheme Object Profile" ;
    sh:targetClass skos:ConceptScheme ;

    # What properties to use for labels
    prez:labelSource skos:prefLabel, dcterms:title, rdfs:label ;
    prez:descriptionSource skos:definition, dcterms:description ;

    # What to generate
    prez:generateIdentifier true ;
    prez:generateLabel true ;
    prez:generateDescription true ;
.
```

---

## The Manifest

The `manifest.ttl` declares which files to load:

```turtle
PREFIX mrr: <https://prez.dev/ManifestResourceRoles/>
PREFIX prez: <https://prez.dev/>
PREFIX prof: <http://www.w3.org/ns/dx/prof/>
PREFIX schema: <https://schema.org/>

[]  a prez:Manifest ;
    prof:hasResource
        [
            prof:hasArtifact "vocabs/*.ttl" ;
            prof:hasRole mrr:ResourceData ;
            schema:name "Vocabulary Data" ;
        ] ,
        [
            prof:hasArtifact "background/*.ttl" ;
            prof:hasRole mrr:IncompleteCatalogueAndResourceLabels ;
            schema:name "Background Labels" ;
        ] ;
.
```

---

## VocPub Profile

For maximum compatibility, author vocabularies conforming to the [VocPub profile](https://w3id.org/profile/vocpub).

### Recommended Metadata

```turtle
cs:
    a skos:ConceptScheme ;

    # Required
    skos:prefLabel "Vocabulary Name"@en ;
    skos:definition "What this vocabulary describes."@en ;
    skos:hasTopConcept :concept1 ;
    schema:creator <https://example.org/org/creator> ;
    schema:publisher <https://example.org/org/publisher> ;
    schema:dateCreated "2024-01-15"^^xsd:date ;

    # Recommended
    schema:dateModified "2024-06-01"^^xsd:date ;
    schema:version "1.0" ;
    skos:historyNote "Created to standardize terminology..."@en ;
    reg:status <https://linked.data.gov.au/def/reg-statuses/stable> ;

    # Optional
    schema:keywords <https://example.org/themes/geology> ;
    prov:qualifiedAttribution [
        prov:hadRole isoroles:custodian ;
        prov:agent <https://orcid.org/0000-0001-2345-6789> ;
    ] ;
.
```

---

## Workflow Summary

1. **Create vocabulary TTL file** in `data/vocabs/`
2. **Add background labels** for any external IRIs in `data/background/`
3. **Update profiles.ttl** if adding new resource types or changing display behavior
4. **Run the build** to generate static exports
5. **Deploy** to your hosting service

---

## Validation

Before publishing, validate your vocabularies:

- Use a Turtle syntax validator
- Check that all `skos:inScheme` references match the ConceptScheme IRI
- Verify `skos:broader`/`skos:narrower` relationships are consistent
- Ensure all external IRIs have labels in background files

---

## Next Steps

- [Browse existing vocabularies](/vocabs) to see examples
- [Download vocabularies](/share) to examine their structure
- Review the [About page](/about) for architecture details
