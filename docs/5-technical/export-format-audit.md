---
title: Export Format Audit
status: complete
date: 2026-02-09
---

# Export Format Audit

> Analysis of prez-lite's data processing pipeline and export strategy

## Executive Summary

**Question:** Are vocabularies/concept schemes exported in isolation, or bundled with concepts?

**Answer:** **Dual strategy** - ConceptSchemes are exported both in isolation (vocab-level files) AND with minimal metadata in per-concept files for self-contained rendering.

This is **not duplication**, but **strategic inclusion** - scheme metadata in concept files contains only prez: navigation annotations, not full scheme properties.

---

## Export Strategy Overview

### 1. Vocabulary-Level Exports
**Location:** `export/{vocab-slug}/`

Files generated per vocabulary:

| File | Size | Contents |
|------|------|----------|
| `{vocab}-turtle.ttl` | ~37KB | ConceptScheme + minimal concept data (IRIs, labels, hierarchy) |
| `{vocab}-anot-turtle.ttl` | ~32KB | Above + prez: annotations for rendering |
| `{vocab}-json-ld.json` | ~68KB | JSON-LD format of simplified graph |
| `{vocab}-anot-ld-json.json` | ~72KB | JSON-LD with prez: annotations |
| `{vocab}-list.json` | ~21KB | Flat concept list with scheme context |
| `{vocab}-list.csv` | ~17KB | CSV export for spreadsheets |

**Key Characteristic:** ConceptScheme metadata with **minimal concept data** (no full definitions, just structure)

**Code:** `packages/data-processing/scripts/process-vocab.js`
- Lines 1165-1192: `createSimplifiedGraph()`
- Lines 658-818: `createAnnotatedSchemeStore()`

### 2. Per-Concept Exports
**Location:** `export/{vocab-slug}/concepts/{prefix}/`

Individual concept files:

| File | Size | Contents |
|------|------|----------|
| `{concept-id}-anot-ld-json.json` | ~6KB | **Self-contained** concept + minimal scheme context |

**Key Characteristic:** Each concept file includes:
- Full concept properties (prefLabel, definition, broader, notation, altLabels)
- **Minimal ConceptScheme metadata** (only prez: navigation annotations)
- Catalog and profile context
- Property labels/descriptions for rendering

**What's Included from ConceptScheme:**
```json
{
  "@id": "https://example.org/vocab/colors/scheme",
  "https://prez.dev/identifier": [{"@value": "ns1:scheme"}],
  "https://prez.dev/link": [{"@value": "/catalogs/.../collections/ns1:scheme"}],
  "https://prez.dev/label": [{"@value": "Example Colors", "@language": "en"}],
  "https://prez.dev/description": [...],
  "https://prez.dev/members": [{"@value": ".../items"}]
}
```

**What's NOT Included:**
- `dcterms:created`, `dcterms:modified`, `dcterms:publisher`
- Full scheme definition and broader metadata
- Other concepts in the scheme

**Code:** Lines 2231-2267: `createAnnotatedConceptStore()`

---

## Design Rationale

### Self-Contained Rendering
Each per-concept file can render independently without fetching the main scheme file:
- Has scheme name for breadcrumbs
- Has prez:link for navigation
- Has prez:identifier for API calls
- Does NOT duplicate full scheme metadata

### Separation of Concerns

**Simplified Exports** (`-turtle.ttl`, `-json-ld.json`)
- For API consumption
- ConceptScheme + structure only
- Minimal concept data (IRIs, labels, hierarchy)

**Annotated Exports** (`-anot-turtle.ttl`, `-anot-ld-json.json`)
- For HTML rendering
- Includes prez: navigation predicates
- Full concept metadata for display

**List Exports** (`-list.json`, `-list.csv`)
- Optimized for web components
- Flat structure with scheme context per concept
- Fast loading, no tree traversal needed

### Progressive Enhancement

1. **Fast Initial Load:** Fetch `{vocab}-list.json` (21KB) for web components
2. **Detailed View:** Fetch individual concept files (6KB each) on demand
3. **Full Download:** Offer vocab-level TTL/JSON-LD for complete data

---

## File Size Analysis

### Current Approach (example-colors vocabulary)

**Vocab-level files:**
- Simplified TTL: 37KB
- Annotated JSON-LD: 72KB
- List JSON: 21KB

**Per-concept files:**
- ~6KB each (self-contained with minimal scheme context)

**For N concepts:**
- Total = 130KB (vocab files) + (6KB × N) per-concept files

### Alternative: Fully Isolated Scheme

If scheme was exported with NO concept data:

**Vocab-level:**
- Scheme-only TTL: ~5KB (ConceptScheme metadata only)
- All concepts JSON: ~(5KB × N) for complete concept list

**Per-concept:**
- Would need to fetch scheme separately: +1 HTTP request per page load
- Components would need 2 files: scheme + concept list

**Trade-off:** Current approach optimizes for:
- ✅ Self-contained rendering (no extra requests)
- ✅ Progressive loading (list → details)
- ✅ Web component efficiency (single file fetch)
- ❌ Slightly larger total disk usage

---

## Export Types

### Type: `vocab` (Default)
**Used for:** Full vocabularies with hierarchical concepts

**Generates:**
- Simplified and annotated TTL
- JSON-LD (standard and annotated)
- List JSON and CSV
- Per-concept individual files

**Code:** `ProcessVocab()` function (line 2105)

### Type: `concept`
**Used for:** Single concept exports

**Generates:**
- TTL (simplified and annotated)
- JSON-LD (standard and annotated)
- No subdirectories

**Code:** `ProcessConcept()` function (line 2300)

### Type: `catalog`
**Used for:** DataCatalog/vocabulary listings

**Generates:**
- Catalog metadata
- Different profile handling

**Code:** `ProcessCatalog()` function (line 2435)

---

## Web Component Integration

Web components (`packages/web-components/src/utils/fetch-vocab.ts`) consume:

```typescript
interface ListJsonConcept {
  iri: string
  prefLabel: string
  broader?: string
  scheme?: string      // ConceptScheme IRI
  schemeLabel?: string // ConceptScheme label
  definition?: string
  altLabels?: string[]
  notation?: string
}
```

**Why scheme fields in every concept?**
1. Display scheme context in dropdowns
2. Validate concept belongs to expected scheme
3. Build hierarchical trees without extra requests
4. Enable filtering by scheme in multi-vocab scenarios

---

## Disk Usage Implications

### Current Strategy

For 100 vocabularies with 100,000 total concepts (avg 1,000 concepts/vocab):

**Vocab-level files:** 100 × 130KB = **13MB**

**Per-concept files:** 100,000 × 6KB = **600MB**

**Total:** ~**613MB**

### Alternative: Fully Isolated

**Scheme-only files:** 100 × 5KB = **500KB**

**Concept files (no scheme):** 100,000 × 4KB = **400MB**

**Total:** ~**400MB**

**Savings:** ~200MB (33% reduction)

**Cost:**
- Components need 2 HTTP requests (scheme + concepts)
- More complex client-side data merging
- Harder to render individual concept pages

---

## Key Architectural Principles

1. **Self-Contained Rendering** - Each concept file has enough scheme context to render independently

2. **No Full Duplication** - Scheme metadata in concepts limited to prez: navigation annotations

3. **Scheme Context in Lists** - Each concept carries scheme IRI/label for component efficiency

4. **Separation of Concerns** - Simplified (API) vs. Annotated (rendering) exports

5. **Progressive Enhancement** - Fast list.json load, detailed per-concept on demand

---

## Recommendations

### Current Approach is Sound ✅

The dual-export strategy balances:
- **Performance:** Single HTTP request for web components
- **Efficiency:** Minimal scheme metadata in concept files
- **Usability:** Self-contained rendering without data merging
- **Flexibility:** Multiple export formats for different use cases

### Potential Optimizations

**If disk space becomes critical (>1TB vocabularies):**

1. **On-Demand Generation**
   - Generate per-concept files dynamically via API
   - Cache aggressively
   - Only persist vocab-level files

2. **Compressed Storage**
   - Serve pre-gzipped files (6KB → 1.5KB per concept)
   - Estimate: 600MB → 150MB for per-concept files

3. **Database Backend**
   - Store concepts in SQLite/PostgreSQL
   - Generate exports on request
   - Keep static files for direct downloads only

**Current scale (100 vocabs, 100k concepts = 613MB) does NOT require changes.**

---

## Conclusion

**Q: Are vocabularies/schemes exported in isolation?**

**A: Yes and No.**

- ✅ **Yes:** Vocab-level files export ConceptScheme with minimal concept data
- ✅ **Yes:** Per-concept files can be rendered in isolation
- ❌ **No:** Per-concept files include minimal scheme metadata (prez: annotations only)

This is **intentional design**, not duplication. The scheme metadata in concept files is:
- **Minimal:** Only 5 prez: predicates for navigation
- **Functional:** Enables self-contained rendering
- **Efficient:** ~1KB per concept vs. potential extra HTTP requests

The current export strategy is **well-architected** for static site generation with good performance characteristics.

---

## Related Documentation

- [Data Pipeline](./data-pipeline.md) - Processing pipeline overview
- [Sharing & Export](../3-features/sharing.md) - Export formats and web components
- [JSON Contract](../2-specification/json-contract.md) - JSON export format specification

---

## Files Examined

- `packages/data-processing/scripts/process-vocab.js` - Main processing logic
- `packages/web-components/src/utils/fetch-vocab.ts` - Component data loading
- `web/public/export/` - Generated export files
- `packages/gh-templates/default/public/export/example-colors/` - Example exports
