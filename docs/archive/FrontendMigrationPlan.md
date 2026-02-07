# Frontend Migration Plan: Export-Driven Architecture

This document outlines the migration from the legacy data pipeline to the new SHACL-driven export structure.

## Current State Analysis

### Data Files Currently Consumed

| File | Location | Purpose | ~Size |
|------|----------|---------|-------|
| `schemes.json` | `/data/` | Vocabulary metadata list | ~100KB |
| `concepts/{slug}.ndjson` | `/data/concepts/` | Per-vocab concepts | varies |
| `search-index.json` | `/data/` | Global search index | ~23k entries |
| `labels.json` | `/data/` | External IRI labels | ~50KB |
| `/export/vocabs/index.json` | `/export/vocabs/` | Export manifest | ~10KB |

### New Export Structure

```
web/public/export/
├── _system/
│   ├── profile.json                    # SHACL field ordering
│   └── vocabularies/
│       ├── vocablist-list.json         # All vocabularies listing
│       ├── vocablist-anot+turtle.ttl   # Annotated catalog
│       └── ...other formats
└── {vocab-name}/
    ├── {vocab-name}-list.json          # Concepts (iri, prefLabel, broader)
    ├── {vocab-name}-anot+turtle.ttl    # Annotated vocab
    ├── {vocab-name}-anot+ld+json.json  # Annotated JSON-LD
    └── ...other formats
```

## Gap Analysis: What's Missing

### 1. Vocabulary Metadata (schemes.json replacement)

**Current `schemes.json` fields:**
- iri, prefLabel, definition, version, modified, created
- conceptCount, topConcepts
- creator, publisher, publisherLabels

**New `vocablist-list.json` provides:**
- iri, label, link

**Gap:** Need enriched vocabulary listing with metadata. Options:
- A. Enhance `vocablist-list.json` to include all metadata
- B. Create separate `_system/vocabularies/metadata.json` with full scheme data
- C. Client fetches scheme metadata from each `{vocab}-anot+ld+json.json`

**Recommendation:** Option B - generate `_system/vocabularies/metadata.json` during build

### 2. Per-Vocabulary Concepts (concepts/{slug}.ndjson replacement)

**Current format:** NDJSON with full concept data including:
- iri, prefLabel, altLabel, definition, notation
- broader, narrower, related, inScheme
- exactMatch, closeMatch, broadMatch, narrowMatch, relatedMatch

**New `{vocab}-list.json` provides:**
- iri, prefLabel, broader

**Gap:** Missing altLabels, definitions, narrower, relationships, mappings

**Options:**
- A. Enhance `-list.json` to include all fields
- B. Client parses `-anot+ld+json.json` for full concept data
- C. Generate additional `-concepts.json` with full data

**Recommendation:** Option A for search, Option B for detail pages

### 3. Search Index (search-index.json replacement)

**Current format:** Flat array of all concepts across all vocabs
```json
{
  "iri": "...",
  "prefLabel": "...",
  "altLabels": ["..."],
  "notation": "...",
  "scheme": "...",
  "schemeLabel": "..."
}
```

**Scale:** ~23,000 concepts

**Gap:** No global search index in new structure

**Options for Search Implementation:**

| Option | Pros | Cons | Build Time | Query Time |
|--------|------|------|------------|------------|
| **JSON array (current)** | Simple, no deps | Memory-heavy, slow filter | Fast | O(n) |
| **Pagefind** | Fast, static, no server | Extra build step, 2MB+ index | Slow | ~10ms |
| **Orama** | Fast, in-browser, facets | ~50KB bundle, needs index | Medium | ~5ms |
| **SQLite FTS5** | Powerful, standard | Needs WASM (~500KB) | Medium | ~5ms |
| **Tantivy/WASM** | Very fast | Large WASM, complex | Slow | ~2ms |
| **Pre-computed shards** | No runtime, progressive | Complex implementation | Medium | O(n/k) |

**Recommendation:** **Orama** for the following reasons:
1. Purpose-built for in-browser search with faceting
2. ~50KB bundle (acceptable)
3. Native facet/filter support
4. Can pre-build index at build time
5. Typo tolerance built-in
6. Active development, good docs

### 4. Background Labels (labels.json)

**Current:** Maps external IRIs to labels for display

**New:** Labels are embedded in `-anot+turtle.ttl` via `prez:label`

**Gap:** Need aggregated labels file or extract from annotated files

**Recommendation:** Generate `_system/labels.json` from background TTL during build

## Current Export Structure ✅

```
web/public/export/
├── _system/
│   ├── profile.json                    # SHACL field ordering (3.5KB)
│   ├── labels.json                     # Background IRI labels (405KB, 3,660 IRIs)
│   ├── vocabularies/
│   │   ├── index.json                  # Full vocab metadata (121KB, 35 vocabs)
│   │   ├── vocablist-list.json         # Vocab catalog list
│   │   └── vocablist-*.{ttl,json,csv,html,rdf}
│   └── search/
│       ├── index.json                  # Flat concept array (1.6MB, 2,529 concepts)
│       ├── orama-index.json            # Pre-built Orama index (9.5MB)
│       └── facets.json                 # Pre-computed facet counts (5KB)
└── {vocab-name}/
    ├── {vocab-name}-list.json          # Enhanced concepts (iri, prefLabel, altLabels, definition, notation, broader, scheme, schemeLabel)
    ├── {vocab-name}-anot+turtle.ttl    # Annotated Turtle
    ├── {vocab-name}-anot+ld+json.json  # Annotated JSON-LD
    ├── {vocab-name}-turtle.ttl         # Simple Turtle
    ├── {vocab-name}-json+ld.json       # JSON-LD
    ├── {vocab-name}-rdf.xml            # RDF/XML
    ├── {vocab-name}-list.csv           # CSV list
    └── {vocab-name}-page.html          # Standalone HTML
```

## Implementation Phases

### Phase 1: Build Pipeline Enhancements ✅ COMPLETE

1. **Enhance `-list.json` output** ✅
   - Added `altLabels`, `definition`, `notation` to list export
   - Added `scheme`, `schemeLabel` for search context

2. **Generate vocabularies metadata** ✅
   - Created `generate-vocab-metadata.js`
   - Output: `_system/vocabularies/index.json` with full scheme metadata
   - Includes: conceptCount, publisher, creator, themes, status, dates, formats

3. **Generate search index** ✅
   - Created `generate-search-index.js`
   - Output: `_system/search/index.json` (2,529 concepts)
   - Output: `_system/search/orama-index.json` (~9MB pre-built)
   - Output: `_system/search/facets.json` (pre-computed facet counts)

4. **Generate labels.json** ✅
   - Created `generate-labels.js`
   - Output: `_system/labels.json` (3,660 IRI labels)

**Build command:** `pnpm -w run build:all-export`

### Phase 2: Frontend Migration ✅ COMPLETE

1. **Update data fetching (useVocabData.ts)** ✅
   - New `fetchVocabMetadata()` → `_system/vocabularies/index.json`
   - `fetchSchemes()` converts new format to legacy `Scheme` interface
   - `fetchSearchIndex()` → `_system/search/index.json`
   - `fetchSearchFacets()` → `_system/search/facets.json`
   - `fetchLabels()` → `_system/labels.json`
   - `fetchListConcepts()` → per-vocab `-list.json` files
   - Full backwards compatibility with legacy data paths

2. **Migrate vocabs list page** ✅
   - Uses `fetchSchemes()` which now reads from new metadata index
   - No page changes needed due to backwards-compatible interface

3. **Migrate search page** ✅
   - Integrated Orama with pre-built index loading
   - Loads `_system/search/orama-index.json` (~9MB) on first search
   - Falls back to building index from `index.json` if pre-built not available
   - Native Orama faceting for scheme and publisher filters
   - Debounced search (150ms) for smooth typing
   - Maintains URL state sync and pagination

4. **Migrate scheme/concept pages** ✅
   - `fetchConcepts()` uses slug from metadata to load `-list.json`
   - Converts `ListConcept` to full `Concept` interface
   - Falls back to legacy NDJSON format if needed

5. **Update web components**
   - Web components already use per-vocab `-list.json` files
   - Format enhanced with altLabels, definition, notation - backwards compatible

### Phase 3: Cleanup ✅ COMPLETE

1. ✅ Remove legacy build scripts (`build-data.js`, `export-vocabs.js`)
2. ✅ Remove `/data-sample/` directory (Note: `/data/` now contains source TTL files, not legacy processed data)
3. ✅ Updated `package.json` build scripts to use new pipeline

## Search Implementation Detail: Orama

### Build-Time Index Generation

```javascript
// generate-search-index.js
import { create, insertMultiple, save } from '@orama/orama'

const db = await create({
  schema: {
    iri: 'string',
    prefLabel: 'string',
    altLabels: 'string[]',
    notation: 'string',
    definition: 'string',
    scheme: 'string',
    schemeLabel: 'string',
    publisher: 'string[]',
  },
  components: {
    tokenizer: {
      stemming: true,
      stopWords: false,
    }
  }
})

// Insert all concepts from all vocab list files
await insertMultiple(db, concepts)

// Export for static serving
const index = await save(db)
await writeFile('_system/search/orama-index.json', JSON.stringify(index))
```

### Runtime Usage

```typescript
// useSearch.ts
import { create, load, search } from '@orama/orama'

const db = await create({ /* same schema */ })
const index = await fetch('/_system/search/orama-index.json').then(r => r.json())
await load(db, index)

const results = await search(db, {
  term: query,
  properties: ['prefLabel', 'altLabels', 'notation', 'definition'],
  facets: {
    scheme: {},
    publisher: {},
  },
  limit: 20,
  offset: page * 20,
})
```

### Facet Counts

Orama provides facet counts in search results:
```typescript
results.facets.scheme // { 'iri1': 42, 'iri2': 18, ... }
results.facets.publisher // { 'pub1': 100, 'pub2': 50, ... }
```

## Data Format Enhancements

### Enhanced `-list.json` Format

```json
{
  "@context": { ... },
  "@graph": [
    {
      "iri": "https://...",
      "prefLabel": "Example Concept",
      "altLabels": ["Alt 1", "Alt 2"],
      "notation": "EX01",
      "definition": "A brief definition...",
      "broader": "https://...",
      "schemeIri": "https://...",
      "schemeLabel": "Example Vocabulary"
    }
  ]
}
```

### Vocabulary Metadata (`_system/vocabularies/index.json`)

```json
{
  "vocabularies": [
    {
      "iri": "https://...",
      "slug": "alteration-form",
      "prefLabel": "Alteration Form",
      "definition": "...",
      "conceptCount": 24,
      "topConcepts": ["https://..."],
      "modified": "2024-01-15",
      "created": "2023-06-01",
      "version": "1.0",
      "publisher": ["https://linked.data.gov.au/org/gswa"],
      "publisherLabels": ["Geological Survey of WA"],
      "creator": ["https://..."],
      "creatorLabels": ["..."],
      "themes": ["https://..."],
      "formats": ["ttl", "json", "csv", "rdf", "html"]
    }
  ]
}
```

## Migration Checklist

- [x] Enhance `-list.json` to include altLabels, definition, notation
- [x] Create `generate-vocab-metadata.js` script
- [x] Create `generate-search-index.js` with Orama
- [x] Generate `_system/labels.json` from background
- [x] Update `build:vocabs` to output to new locations
- [x] Add `build:search` npm script
- [x] Update `useVocabData.ts` for new paths
- [x] Update `useVocabs.ts` for new metadata format
- [x] Integrate Orama into `useSearch.ts`
- [x] Update `useScheme.ts` for annotated JSON-LD parsing
- [x] Update web components fetch-vocab.ts
- [x] Test all pages
- [x] Remove legacy scripts and data
- [x] Update documentation

## Dependencies to Add

```json
{
  "dependencies": {
    "@orama/orama": "^3.0.0"
  }
}
```

## Notes

- Orama index size estimate: ~2-3MB for 23k concepts (acceptable for initial load)
- Consider lazy-loading search index on search page only
- Web components can continue using per-vocab `-list.json` files
- Individual concept tree on vocab page remains unchanged (uses per-vocab data)
