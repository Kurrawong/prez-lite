---
title: Data Processing Specification
status: current
updated: 2025-02-08
---

# Data Processing Specification

> How TTL vocabularies are processed into web-ready formats.

## Overview

The data processing pipeline transforms SKOS/VocPub vocabularies into multiple output formats for web consumption.

```
Source TTL → Background Labels → SHACL Profiles
     ↓
Simplified Graph + Annotated Graph
     ↓
Multi-format Exports + Web Assets
```

---

## Processing Pipeline

### Location

```
packages/data-processing/
├── scripts/
│   ├── process-vocab.js           # Main pipeline orchestrator
│   ├── generate-vocab-metadata.js # Extract scheme metadata
│   ├── generate-search-index.js   # Build Orama search index
│   ├── generate-vocablist.js      # Create vocabulary catalog
│   ├── generate-labels.js         # Extract label cache
│   ├── download-vocab-labels.js   # Fetch external labels
│   ├── process-rdf.js             # RDF manipulation utilities
│   └── test-vocab-processing.js   # Semantic comparison testing
```

### Pipeline Steps

| Step | Script | Input | Output |
|------|--------|-------|--------|
| 1. Parse | `process-vocab.js` | Source TTL | RDF Quads |
| 2. Labels | `generate-labels.js` | Background TTLs | `labels.json` |
| 3. Metadata | `generate-vocab-metadata.js` | RDF Quads | `index.json` |
| 4. Simplify | `process-vocab.js` | Quads + Profile | Simplified TTL |
| 5. Annotate | `process-vocab.js` | Quads + Labels | Annotated TTL |
| 6. Export | `process-vocab.js` | Simplified + Annotated | 9 formats |
| 7. Index | `generate-search-index.js` | All vocabs | Orama index |
| 8. Catalog | `generate-vocablist.js` | Metadata | Vocab list |

---

## Output Formats

### Format Specifications

| Format | Generator | Description |
|--------|-----------|-------------|
| **Turtle** | N3 Writer | Standard SKOS structure |
| **Turtle (Annotated)** | N3 Writer + labels | IRIs annotated with labels |
| **JSON-LD** | JSON-LD library | W3C JSON-LD 1.1 |
| **JSON-LD (Annotated)** | JSON-LD + prez: | With prez annotations |
| **JSON** | Custom | Simple web app format |
| **RDF/XML** | N3/RDF serializer | Legacy XML format |
| **CSV** | Custom | Flat concept list |
| **HTML** | Template | Standalone page |

### Output Structure

```
web/public/export/
├── _system/
│   ├── vocabularies/index.json   # Vocabulary catalog
│   ├── search/orama-index.json   # Pre-built search
│   ├── labels.json               # Global label cache
│   └── profile.json              # Default field ordering
│
├── {vocab-slug}/
│   ├── {vocab}.ttl               # Turtle
│   ├── {vocab}-annotated.ttl     # Annotated Turtle
│   ├── {vocab}.jsonld            # JSON-LD
│   ├── {vocab}-annotated.json    # Annotated JSON-LD
│   ├── {vocab}.json              # Simple JSON
│   ├── {vocab}.rdf               # RDF/XML
│   ├── {vocab}.csv               # CSV
│   ├── {vocab}.html              # HTML page
│   ├── profile.json              # Field definitions
│   └── concepts/                 # Per-concept NDJSON
│       └── {scheme-slug}.ndjson
```

---

## Profile Processing

### SHACL Profile Application

Profiles control what properties are extracted and how they're rendered.

```turtle
prez:ConceptSchemeProfile a prez:ObjectProfile ;
    sh:targetClass skos:ConceptScheme ;
    prez:labelSource skos:prefLabel, dcterms:title ;
    prez:descriptionSource skos:definition ;
    prez:generateLabel true ;
    prez:generateDescription true .
```

### Profile-Driven Extraction

| Profile Property | Effect |
|------------------|--------|
| `prez:labelSource` | Priority order for finding labels |
| `prez:descriptionSource` | Priority order for descriptions |
| `prez:generateLabel` | Add `prez:label` to output |
| `prez:generateDescription` | Add `prez:description` to output |
| `prez:generateLink` | Add `prez:link` for navigation |

---

## Label Resolution

### Background Vocabularies

Labels for external IRIs are resolved from background vocabularies:

```
data/background/
├── labels.ttl              # Custom labels
├── agents.ttl              # Organization labels
├── reg-statuses.ttl        # Status vocabulary
└── ...
```

### Label Cache

Generated `labels.json` contains IRI-to-label mappings:

```json
{
  "http://purl.org/dc/terms/title": "Title",
  "http://www.w3.org/2004/02/skos/core#prefLabel": "Preferred Label",
  "https://linked.data.gov.au/org/gswa": "Geological Survey of Western Australia"
}
```

### Label Fetch Script

For IRIs not in background vocabularies:

```bash
./scripts/fetch-labels.sh
```

Fetches labels from external SPARQL endpoints.

---

## Search Index

### Orama Index Generation

The search index is pre-built for optimal client performance.

```javascript
// generate-search-index.js
const index = await create({
  schema: {
    iri: 'string',
    prefLabel: 'string',
    altLabels: 'string[]',
    definition: 'string',
    notation: 'string',
    scheme: 'string',
    schemeLabel: 'string',
    publisher: 'string[]'
  }
})
```

### Index Location

```
web/public/export/_system/search/orama-index.json
```

Size: ~30KB for typical vocabulary collections.

---

## Vocabulary Catalog

### Metadata Index

Generated catalog of all vocabularies:

```json
{
  "vocabularies": [
    {
      "id": "alteration-form",
      "iri": "https://linked.data.gov.au/def/alteration-form",
      "title": "Alteration Form",
      "description": "Types of alteration forms...",
      "conceptCount": 15,
      "modified": "2024-01-15",
      "publisher": ["Geological Survey"]
    }
  ]
}
```

### Location

```
web/public/export/_system/vocabularies/index.json
```

---

## Build Commands

### Full Pipeline

```bash
# Run all processing
pnpm --filter data-processing process

# Generate search index only
pnpm --filter data-processing generate-search

# Generate vocabulary catalog only
pnpm --filter data-processing generate-catalog
```

### Testing

```bash
# Semantic comparison of output
pnpm --filter data-processing test
```

Compares generated output against expected results.

---

## Configuration

### Manifest

The processing manifest defines what to process:

```turtle
<manifest> a prez:Manifest ;
    prez:vocabulary <vocab-1>, <vocab-2> ;
    prez:background <background-labels> ;
    prez:profile <default-profile> .
```

### Environment

| Variable | Purpose |
|----------|---------|
| `DATA_DIR` | Source vocabulary directory |
| `OUTPUT_DIR` | Export output directory |
| `BACKGROUND_DIR` | Background vocabularies |
