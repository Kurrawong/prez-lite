---
title: Data Pipeline
status: current
updated: 2025-02-08
---

# Data Pipeline

> How vocabulary data is processed from TTL to web-ready formats.

## Overview

```
Source TTL + SHACL Profiles + Background Labels
                    ↓
        @prez-lite/data-processing
                    ↓
    Simplified TTL + Annotated TTL + 9 Export Formats
                    ↓
         web/public/export/ + Search Index
```

---

## Data Processing Package

Located at `packages/data-processing/`, this package handles all vocabulary processing.

### Package Info

```json
{
  "name": "@prez-lite/data-processing",
  "dependencies": {
    "n3": "^2.0.1",
    "jsonld": "^8.3.3",
    "@orama/orama": "^3.1.18",
    "@fast-csv/format": "^5.0.2"
  }
}
```

### Scripts

| Script | Purpose |
|--------|---------|
| `process-vocab.js` | Main pipeline - parse, transform, export |
| `generate-vocab-metadata.js` | Extract scheme metadata to JSON |
| `generate-search-index.js` | Build Orama search index |
| `generate-vocablist.js` | Create vocabulary catalog listing |
| `generate-labels.js` | Extract and cache IRI labels |
| `download-vocab-labels.js` | Fetch labels from external SPARQL |
| `process-rdf.js` | RDF graph manipulation utilities |
| `test-vocab-processing.js` | Semantic comparison testing |

### Commands

```bash
# Process all example vocabularies
pnpm --filter data-processing process:all

# Process specific vocabulary type
pnpm --filter data-processing process:ga:vocab
pnpm --filter data-processing process:ga:concept
pnpm --filter data-processing process:ga:vocablist

# Run tests (semantic comparison)
pnpm --filter data-processing test
```

---

## SHACL Profile Parsing

prez-lite uses a custom SHACL parser built on N3.js, not a separate SHACL library.

### Location

`web/app/utils/shacl-profile-parser.ts`

### Capabilities

| Feature | SHACL Construct |
|---------|-----------------|
| Profile definitions | `prof:Profile` |
| Target class binding | `sh:NodeShape` + `sh:targetClass` |
| Property extraction | `sh:property` + `sh:path` |
| Prez annotations | `prez:generateLabel`, `prez:labelSource`, etc. |
| Content negotiation | `altr-ext:*` extensions |

### Types Exported

```typescript
interface ParsedProfile {
  iri: string
  identifier: string | null
  title: string | null
  targetClass: string | null
  formats: string[]
  generate: PrezGenerateFlags
  labelSources: string[]
  descriptionSources: string[]
  provenanceSources: string[]
  properties: PropertyShape[]
}

interface PrezGenerateFlags {
  identifier: boolean
  link: boolean
  members: boolean
  label: boolean
  description: boolean
  provenance: boolean
  focusNode: boolean
}
```

### Usage

```typescript
import { parseProfilesContent } from '~/utils/shacl-profile-parser'

const ttlContent = await readFile('profiles.ttl')
const profiles = await parseProfilesContent(ttlContent)

// Find profile for ConceptScheme
const schemeProfile = profiles.find(p =>
  p.targetClass?.includes('ConceptScheme')
)
```

---

## Processing Pipeline

### Step 1: Parse Source TTL

```javascript
import { Parser } from 'n3'

const parser = new Parser()
const quads = parser.parse(ttlContent)
```

### Step 2: Load SHACL Profiles

Profiles define what to extract and how to annotate:

```turtle
prez:ConceptSchemeProfile a prof:Profile ;
    sh:targetClass skos:ConceptScheme ;
    prez:labelSource skos:prefLabel, dcterms:title ;
    prez:descriptionSource skos:definition ;
    prez:generateLabel true ;
    prez:generateDescription true .
```

### Step 3: Resolve Background Labels

Labels for external IRIs resolved from:
- `data/background/*.ttl` - Local reference vocabularies
- SPARQL endpoints - Via `download-vocab-labels.js`

### Step 4: Generate Outputs

For each vocabulary:

| Output | Description |
|--------|-------------|
| `{vocab}.ttl` | Simplified Turtle |
| `{vocab}-annotated.ttl` | With resolved IRI labels |
| `{vocab}.jsonld` | JSON-LD format |
| `{vocab}-annotated.json` | With prez: annotations |
| `{vocab}.json` | Simple JSON |
| `{vocab}.rdf` | RDF/XML |
| `{vocab}.csv` | Flat CSV |
| `{vocab}.html` | Standalone HTML page |
| `profile.json` | Field ordering |
| `concepts/*.ndjson` | Per-concept data |

### Step 5: Build Search Index

Orama search index generated with:

```javascript
import { create } from '@orama/orama'

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

---

## Output Structure

```
web/public/export/
├── system/
│   ├── vocabularies/
│   │   └── index.json          # Vocabulary catalog
│   ├── search/
│   │   └── orama-index.json    # Pre-built search (~30KB)
│   ├── labels.json             # Global label cache (~400KB)
│   └── profile.json            # Default field ordering
│
├── alteration-form/
│   ├── alteration-form.ttl
│   ├── alteration-form-annotated.ttl
│   ├── alteration-form.jsonld
│   ├── alteration-form-annotated.json
│   ├── alteration-form.json
│   ├── alteration-form.rdf
│   ├── alteration-form.csv
│   ├── alteration-form.html
│   ├── profile.json
│   └── concepts/
│       └── alteration-form.ndjson
│
└── [38+ more vocabularies...]
```

---

## Label Resolution

### Problem

Many IRIs reference external resources without labels.

### Solution

1. **Background vocabularies** in `data/background/`
2. **Label fetch script** for external sources
3. **Cached in `labels.json`** (~400KB)

### Label Cache Format

```json
{
  "http://purl.org/dc/terms/title": "Title",
  "http://www.w3.org/2004/02/skos/core#prefLabel": "Preferred Label",
  "https://linked.data.gov.au/org/gswa": "Geological Survey of WA"
}
```

### Fetch Script

```bash
# Fetch labels from external SPARQL endpoints
node packages/data-processing/scripts/download-vocab-labels.js
```

---

## GitHub Actions Integration

For user repositories using the gh-template, the workflow:

1. **Triggers** on push to main or vocabulary changes
2. **Calls** prez-lite data processing action
3. **Generates** all export formats
4. **Builds** Nuxt static site
5. **Deploys** to configured host

```yaml
# .github/workflows/deploy.yml
- uses: Kurrawong/prez-lite/.github/actions/process-data@main
  with:
    vocab-path: data/vocabs
    output-path: web/public/export
```

---

## Testing

### Semantic Comparison

Tests compare generated output against expected results:

```bash
pnpm --filter data-processing test

# Regenerate expected output
pnpm --filter data-processing test:regenerate
```

### Test Examples

Located in `packages/data-processing/examples/`:

```
examples/
├── ga-vocab-ref/          # GA vocabulary reference
├── gswa-vocab-ref/        # GSWA vocabulary reference
├── ggic-vocab-ref/        # GGIC vocabulary reference
└── data/                  # Generated test output
```

---

## Troubleshooting

### Missing Labels

If IRIs show instead of labels:
1. Check `labels.json` for the IRI
2. Add to `data/background/` vocabularies
3. Run label fetch script

### Parse Errors

If TTL fails to parse:
1. Validate TTL syntax (try Turtle validator)
2. Check for encoding issues (UTF-8)
3. Ensure all prefixes are defined

### Large Vocabularies

For 10k+ concepts:
1. Monitor memory during build
2. Consider chunking strategy
3. See [Performance](performance.md)
