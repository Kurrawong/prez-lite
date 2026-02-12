# Vocabulary Data Processing

## Overview

This package processes SKOS vocabulary source files (TTL) and generates multiple output formats suitable for web publishing, API responses, and static asset hosting.

## Folder Structure

```
packages/data-processing/
├── scripts/                    # Processing scripts
│   ├── process-vocab.js        # Main processing script
│   ├── download-vocab-labels.js# Download vocab labels from SPARQL
│   └── test-vocab-processing.js# Test runner
├── examples/
│   ├── index.html              # Generated link hub for example HTML pages
│   ├── background/             # Background label files for tests
│   ├── data/                   # Generated test outputs
│   │   ├── ga-vocab/           # GA vocabulary outputs
│   │   ├── ga-concept/         # GA concept outputs
│   │   ├── ga-vocablist/       # GA catalog outputs
│   │   ├── ggic-vocab/         # GGIC vocabulary outputs
│   │   └── gswa-vocab/         # GSWA vocabulary outputs
│   ├── ga-vocab-ref/           # GA example: source + profiles
│   ├── ga-vocablist-ref/       # GA catalog example
│   ├── ggic-vocab-ref/         # GGIC example: source + profiles
│   └── gswa-vocab-ref/         # GSWA example: source + profiles
└── README.md
```

## Key Concepts

### Source Input Files

Each vocabulary requires a **source input file** - the complete vocabulary in TTL format:

- `*-source-input.ttl` - The full vocabulary (ConceptScheme + all Concepts)
- `*-source-catalog.ttl` - Catalog/listing source files

**Important:** The source input must contain ALL concepts. Do not confuse with output files like `*-turtle.ttl` which may only contain the scheme metadata.

### SHACL Profiles

Processing is driven by **SHACL profiles** (`profiles.ttl`) that define:
- Target classes (ConceptScheme, Concept, DataCatalog)
- Label/description source predicates
- Output formats to generate
- Prez annotation flags

### Output Files

Generated assets include:

| File | Description |
|------|-------------|
| `*-turtle.ttl` | Simplified TTL (scheme/concept only) |
| `*-anot-turtle.ttl` | Annotated TTL with prez: predicates |
| `*-anot-ld-json.json` | Annotated JSON-LD |
| `*-json-ld.json` | Standard JSON-LD |
| `*-rdf.xml` | RDF/XML format |
| `*-list.csv` | Concept list as CSV |
| `*-list.json` | Concept list as JSON |
| `*-page.html` | Rendered HTML page |
| `profile.json` | Field/column ordering exported from SHACL (written per output directory) |

Notes:
- **`profile.json`** is generated when processing with SHACL (`--profiles ...`) and is written to the same output directory as the other exported assets (e.g. `examples/data/ga-vocab/profile.json`).
- The HTML page generation can use the exported **annotated** asset (e.g. `*-anot-turtle.ttl`) plus `profile.json` to render in profile-defined order.

## Processing Pipeline

```
┌─────────────────────────────────────────────────────────────────────┐
│  1. SOURCE INPUT                                                     │
│     *-source-input.ttl (full vocabulary: scheme + concepts)         │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│  2. BACKGROUND LABELS                                                │
│     External reference labels → examples/background/*.ttl            │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│  3. SHACL PROFILE                                                    │
│     profiles.ttl defines: label sources, formats, prez annotations  │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│  4. PROCESS & GENERATE                                               │
│     process-vocab.js combines source + background + profile         │
│     → Generates all output formats                                   │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│  5. OUTPUT ASSETS                                                    │
│     Output folder with all generated files                          │
└─────────────────────────────────────────────────────────────────────┘
```

## Usage

### Single File Mode

Process a single vocabulary file:

```bash
# Process a vocabulary
node scripts/process-vocab.js \
  --profiles examples/ga-vocab-ref/profiles.ttl \
  --source examples/ga-vocab-ref/ga-vocab-source-input.ttl \
  --type vocab \
  --outDir examples/data/ga-vocab

# Process a concept
node scripts/process-vocab.js \
  --profiles examples/ga-vocab-ref/profiles.ttl \
  --source examples/ga-vocab-ref/ga-concept-source-input.ttl \
  --type concept \
  --outDir examples/data/ga-concept

# Process a catalog
node scripts/process-vocab.js \
  --profiles examples/ga-vocablist-ref/profiles.ttl \
  --source examples/ga-vocablist-ref/ga-vocablist-source-catalog.ttl \
  --type catalog \
  --outDir examples/data/ga-vocablist
```

### Batch Mode

Process all vocabularies in a directory:

```bash
node scripts/process-vocab.js \
  --profiles profiles/profiles.ttl \
  --sourceDir vocabs/ \
  --outputBase export/ \
  --pattern "*-source-input.ttl" \
  --backgroundDir background/
```

This will:
1. Find all files matching the pattern in `vocabs/`
2. Determine the type (vocab/concept/catalog) from the filename
3. Create a subdirectory in `export/` for each vocab
4. Generate all configured output formats

### npm Scripts

```bash
# Process individual vocabs
npm run process:ga:vocab
npm run process:ga:concept
npm run process:ga:vocablist
npm run process:gswa:vocab
npm run process:ggic:vocab

# Process all
npm run process:ga:all
npm run process:all

# Run tests
npm test

# Regenerate and test
npm run test:regenerate
```

## GitHub Action

A reusable GitHub Action is available for automated vocabulary processing.

### Using in This Repository

The action is automatically used in the deploy workflow when vocab files change.

### Using in External Repositories

External organizations can use the action to process their own vocabularies:

```yaml
# .github/workflows/build-vocabs.yml
name: Build Vocabularies

on:
  push:
    paths:
      - 'vocabs/**'
      - 'profiles/**'
      - 'background/**'
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      # Process all vocabs in batch mode
      - uses: your-org/prez-lite/.github/actions/process-vocabs@main
        with:
          source-dir: vocabs/
          profiles: profiles/org-profile.ttl
          output-dir: export/
          background-dir: background/
      
      # Or process a single file
      - uses: your-org/prez-lite/.github/actions/process-vocabs@main
        with:
          source-file: vocabs/my-vocab-source-input.ttl
          profiles: profiles/org-profile.ttl
          output-dir: export/my-vocab/
          type: vocab
      
      # Commit generated files
      - name: Commit generated files
        run: |
          git config user.name "github-actions"
          git config user.email "github-actions@github.com"
          git add export/
          git commit -m "chore: regenerate vocab exports" || exit 0
          git push
```

### Action Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `source-dir` | Directory containing source TTL files (batch mode) | No | - |
| `source-file` | Single source TTL file to process | No | - |
| `profiles` | Path to SHACL profiles.ttl file | Yes | - |
| `output-dir` | Output directory for generated files | Yes | - |
| `background-dir` | Directory containing background label TTL files | No | - |
| `type` | Processing type: vocab, concept, or catalog | No | `vocab` |
| `pattern` | File pattern for batch mode | No | `*-source-input.ttl` |
| `node-version` | Node.js version to use | No | `22` |

### Action Outputs

| Output | Description |
|--------|-------------|
| `files-processed` | Number of files successfully processed |

## SHACL Profile Configuration

Profiles are defined in TTL using SHACL and prof:Profile:

```turtle
@prefix prof: <http://www.w3.org/ns/dx/prof/> .
@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix prez: <https://prez.dev/> .
@prefix skos: <http://www.w3.org/2004/02/skos/core#> .
@prefix altr-ext: <http://www.w3.org/ns/dx/connegp/altr-ext#> .

# Profile for Concept Schemes
prez:OGCSchemesObjectProfile a prof:Profile, sh:NodeShape ;
    sh:targetClass skos:ConceptScheme ;
    prez:labelSource skos:prefLabel, rdfs:label ;
    prez:descriptionSource skos:definition ;
    prez:generateLabel true ;
    prez:generateDescription true ;
    prez:generateFocusNode true ;
    altr-ext:hasResourceFormat "text/turtle", "application/ld+json", "text/csv" .

# Umbrella profile
prez:MyVocabsProfile a prof:Profile ;
    prez:catalog <http://example.org/catalogue/my-vocabs> ;
    altr-ext:hasNodeShape [
        sh:targetClass skos:ConceptScheme ;
        altr-ext:hasDefaultProfile prez:OGCSchemesObjectProfile
    ] .
```

## Background Labels

External references (publishers, statuses, related concepts) need labels. Use `prezmanifest` to discover and fetch them:

```bash
# Install
pip install prezmanifest

# Discover label requirements
pm labels discover <source-input.ttl>

# Fetch labels from endpoint
pm labels fetch <source-input.ttl> --output background.ttl
```

See: https://github.com/Kurrawong/prezmanifest

## Testing

```bash
# Run tests only
npm test

# Regenerate outputs and run tests
npm run test:regenerate

# With verbose output
node scripts/test-vocab-processing.js --regenerate --verbose
```

When the test runner executes, it also generates/updates `examples/index.html` to link to each `*-page.html` under `examples/data/**/`.

Tests validate:
- File existence and parsing
- Required prez: annotations present
- Correct RDF types (ConceptScheme, Concept, DataCatalog)
- Focus node markers

## Shared Code

The SHACL profile parser is shared between this package and the web application. It lives in `@prez-lite/web/app/utils/shacl-profile-parser.ts` and is imported as:

```javascript
import { parseProfilesFile, toProcessingConfig } from '@prez-lite/web/utils/shacl-profile-parser';
```

This enables the same parsing logic to work in both:
- Node.js (data processing pipeline)
- Browser (Profile Helper UI)
