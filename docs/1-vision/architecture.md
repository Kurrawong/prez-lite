---
title: Architecture
status: current
updated: 2025-02-08
---

# Architecture

> High-level system design for prez-lite.

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Source Data                               │
│  data/vocabs/*.ttl    SHACL Profiles    Background TTLs     │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                 Build Pipeline                               │
│  prezmanifest (SHACL profile processing)                    │
│  → JSON generation → Search index → Export formats          │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              Static Output (web/public/)                     │
│  ├── data/           # Generated JSON for app               │
│  ├── export/         # Download formats (TTL, JSON, CSV)    │
│  └── web-components/ # Pre-built embeddable components      │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                  Nuxt Application                            │
│  Pages: /, /vocabs, /scheme, /concept, /search, /share      │
│  Components: Tree, Table, Panels, Search                     │
│  Composables: useScheme, useConcept, useSearch              │
└─────────────────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│               Static Site Output                             │
│  .output/public/ → GitHub Pages / Azure / Cloudflare        │
└─────────────────────────────────────────────────────────────┘
```

---

## Directory Structure

```
prez-lite/
├── web/                              # Nuxt 4 application
│   ├── app/
│   │   ├── pages/                    # Route pages
│   │   │   ├── index.vue             # Home
│   │   │   ├── vocabs.vue            # Vocabulary listing
│   │   │   ├── scheme.vue            # Scheme detail
│   │   │   ├── concept.vue           # Concept detail
│   │   │   ├── search.vue            # Search
│   │   │   ├── share/                # Share pages
│   │   │   └── profile-helper.vue    # Profile builder
│   │   ├── components/               # Vue components
│   │   ├── composables/              # Data loading utilities
│   │   └── utils/                    # Shared utilities
│   ├── content/                      # Markdown content pages
│   ├── public/
│   │   ├── data/                     # Generated JSON (gitignored)
│   │   ├── export/                   # Download formats
│   │   └── web-components/           # Pre-built Lit components
│   └── nuxt.config.ts
│
├── packages/
│   ├── data-processing/              # TTL → JSON pipeline
│   │   └── scripts/                  # Processing scripts
│   ├── web-components/               # Lit web component source
│   │   ├── src/
│   │   ├── dist/                     # Built output
│   │   └── package.json
│   └── gh-templates/                 # GitHub template repositories
│       ├── default/                  # Standard vocab template
│       ├── catalog/                  # Vocab + catalogs (planned)
│       └── spatial/                  # Vocab + maps (planned)
│
├── scripts/                          # Build scripts
│   └── fetch-labels.sh               # Label fetching
│
├── docs/                             # Documentation
└── pnpm-workspace.yaml
```

---

## Data Flow

### Build Time

1. **Input**: TTL vocabularies + SHACL profiles
2. **Process**: prezmanifest extracts and transforms data
3. **Output**:
   - `schemes.json` - Vocabulary metadata
   - `concepts/*.ndjson` - Concept data per scheme
   - `search-index.json` - Client-side search
   - `labels.json` - IRI → label mappings
   - `export/vocabs/` - Download formats

### Runtime

1. **Page Load**: Nuxt renders page shell
2. **Data Fetch**: Composables load JSON from `/data/`
3. **Render**: Vue components display data
4. **Interaction**: Client-side navigation, search, tree expansion

---

## Key Components

### Pages

| Route | Component | Data Source |
|-------|-----------|-------------|
| `/` | Home | `content/index.md` |
| `/vocabs` | VocabList | `schemes.json` |
| `/scheme?uri=` | SchemeDetail | `schemes.json` + `concepts/*.ndjson` |
| `/concept?uri=` | ConceptDetail | `concepts/*.ndjson` |
| `/search` | Search | `search-index.json` |
| `/share` | ShareIndex | `export/vocabs/index.json` |
| `/share/[vocab]` | ShareVocab | `export/vocabs/*/` |

### Composables

| Composable | Purpose |
|------------|---------|
| `useScheme` | Load scheme metadata and concept tree |
| `useConcept` | Load individual concept data |
| `useSearch` | Client-side search with Fuse.js |
| `useVocabData` | Low-level data fetching |

### Web Components

| Component | Purpose |
|-----------|---------|
| `<prez-list>` | Embeddable vocabulary list |
| `<prez-select>` | Concept selector dropdown |
| `<prez-tree>` | Hierarchy browser |
| `<prez-autocomplete>` | Search with suggestions |

---

## Profile System

Profiles control data extraction and presentation:

```turtle
prez:ConceptSchemeDefault a prez:ObjectProfile ;
    sh:targetClass skos:ConceptScheme ;
    prez:identifier "default" ;
    dcterms:title "Concept Scheme Default Profile" ;
    prez:labelSource skos:prefLabel, dcterms:title, rdfs:label ;
    prez:descriptionSource skos:definition, dcterms:description ;
    prez:generateLabel true ;
    prez:generateDescription true .
```

See [Profile Specification](../2-specification/profiles.md) for details.

---

## Deployment Options

| Platform | Approach |
|----------|----------|
| GitHub Pages | `nuxt generate` → push to `gh-pages` |
| Azure Static Web Apps | GitHub Action → Azure deployment |
| Cloudflare Pages | Connect repo, auto-deploy |
| Netlify | Connect repo, auto-deploy |
| Self-hosted | Serve `.output/public/` directory |
