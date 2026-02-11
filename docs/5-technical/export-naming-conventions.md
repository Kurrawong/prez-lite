---
title: Export Naming Conventions Review
status: complete
date: 2026-02-09
---

# Export Naming Conventions Review

> Analysis of current naming patterns and recommendations for standards alignment

## Executive Summary

prez-lite currently uses **functional but inconsistent** naming conventions that blend RDF-centric and web application approaches. While the implementation works well, there are opportunities for:
- **Removing duplication** (list vs concepts files)
- **Standardizing annotation marking** (anot+ vs -annotated)
- **Aligning with standards** (OGC Records API, DCAT)
- **Improving discoverability** (distribution metadata)

**Overall Assessment:** ⚠️ Functional but needs consistency improvements

---

## Current Naming Structure

### Export Directory Layout

```
export/
├── system/
│   ├── vocabularies/index.json      # Vocabulary catalog
│   ├── search/orama-index.json      # Search index
│   ├── labels.json                  # IRI-to-label cache
│   └── profile.json                 # Field definitions
│
└── {vocab-slug}/
    ├── {vocab}-turtle.ttl           # Simplified Turtle
    ├── {vocab}-anot+turtle.ttl      # Annotated Turtle
    ├── {vocab}-json+ld.json         # JSON-LD
    ├── {vocab}-anot+ld+json.json    # Annotated JSON-LD
    ├── {vocab}-rdf.xml              # RDF/XML
    ├── {vocab}-concepts.json        # ⚠️ DUPLICATE
    ├── {vocab}-concepts.csv         # ⚠️ DUPLICATE
    ├── {vocab}-list.json            # ⚠️ DUPLICATE
    ├── {vocab}-list.csv             # ⚠️ DUPLICATE
    ├── {vocab}-page.html            # Standalone HTML
    ├── profile.json                 # Per-vocab fields
    └── concepts/{prefix}/{id}-anot+ld+json.json
```

### Naming Patterns

| Pattern | Purpose | Status |
|---------|---------|--------|
| `{vocab}-turtle.ttl` | Simplified RDF Turtle | ✅ Clear |
| `{vocab}-anot+turtle.ttl` | Turtle with labels | ⚠️ Non-standard syntax |
| `{vocab}-json+ld.json` | Standard JSON-LD | ✅ Clear |
| `{vocab}-anot+ld+json.json` | JSON-LD with labels | ⚠️ Non-standard syntax |
| `{vocab}-rdf.xml` | RDF/XML format | ✅ Clear |
| `{vocab}-concepts.json` | Simple JSON list | ✅ Clear |
| `{vocab}-list.json` | Simple JSON list | ❌ DUPLICATE |
| `{vocab}-concepts.csv` | Spreadsheet format | ✅ Clear |
| `{vocab}-list.csv` | Spreadsheet format | ❌ DUPLICATE |
| `{vocab}-page.html` | Standalone HTML | ✅ Clear |

---

## Identified Issues

### Issue 1: Duplicate Files (Same Content)

**Problem:** Two naming conventions for identical content

```bash
alteration-form-list.json     }  Same content
alteration-form-concepts.json }  Different names

alteration-form-list.csv      }  Same content
alteration-form-concepts.csv  }  Different names
```

**Impact:**
- Wastes ~42 KB per vocabulary (21 KB × 2 formats)
- Confuses users about which file to use
- Increases build time and storage

**Recommendation:** ✅ **Remove one set**

**Option A:** Keep `-concepts` (more semantically clear)
```bash
alteration-form-concepts.json
alteration-form-concepts.csv
```

**Option B:** Keep `-list` (shorter, REST-friendly)
```bash
alteration-form-list.json
alteration-form-list.csv
```

**Preferred:** Option A (`-concepts`) - more descriptive

### Issue 2: Non-Standard Annotation Syntax

**Problem:** `anot+` prefix not IANA-registered media type

Current naming:
```bash
alteration-form-anot+turtle.ttl      # text/anot+turtle (invalid MIME)
alteration-form-anot+ld+json.json    # application/anot+ld+json (invalid)
```

IANA registered types:
```bash
text/turtle                          # ✅ Standard
application/ld+json                  # ✅ Standard
text/anot+turtle                     # ❌ Not registered
application/anot+ld+json             # ❌ Not registered
```

**Impact:**
- Content negotiation won't work (`Accept: application/anot+ld+json` is invalid)
- External tools don't recognize the format
- Breaks HTTP standard practices

**Recommendation:** ✅ **Use `-annotated` suffix**

```bash
alteration-form-turtle.ttl           # Standard Turtle
alteration-form-turtle-annotated.ttl # With prez:label annotations
alteration-form-jsonld.json          # Standard JSON-LD
alteration-form-jsonld-annotated.json # With prez: annotations
```

**Benefits:**
- Standard media types work correctly
- Clear semantic meaning
- Follows common convention (e.g., `-min`, `-dev`)

### Issue 3: Inconsistent Annotation Marking

**Problem:** Not all formats clearly indicate annotation status

| File | Annotated? | Marked? |
|------|------------|---------|
| `*-anot+turtle.ttl` | Yes | ✅ Yes |
| `*-anot+ld+json.json` | Yes | ✅ Yes |
| `*-concepts.json` | No | ⚠️ Unclear |
| `*-rdf.xml` | No | ⚠️ Unclear |

**Recommendation:** ✅ **Consistent marking**

```bash
# RDF formats (both variants)
{vocab}-turtle.ttl
{vocab}-turtle-annotated.ttl
{vocab}-jsonld.json
{vocab}-jsonld-annotated.json
{vocab}-rdfxml.xml
{vocab}-rdfxml-annotated.xml

# Simple formats (single variant, never annotated)
{vocab}-concepts.json
{vocab}-concepts.csv
{vocab}-page.html
```

### Issue 4: Missing Distribution Metadata

**Problem:** File formats only documented in JavaScript code

Current: Metadata exists only in `useShare.ts`:
```typescript
const EXPORT_FORMATS = [
  { id: 'ttl', label: 'Turtle', mimeType: 'text/turtle', ... },
  ...
]
```

**Not discoverable by:**
- External tools/crawlers
- Machine readers
- DCAT harvesters
- OGC Records API clients

**Recommendation:** ✅ **Export distribution metadata**

Add `distributions.json` to each vocabulary directory:

```json
{
  "distributions": [
    {
      "id": "turtle",
      "label": "Turtle RDF",
      "description": "RDF Turtle - human-readable linked data format",
      "url": "alteration-form-turtle.ttl",
      "mediaType": "text/turtle",
      "format": "TTL",
      "bytes": 37824,
      "annotations": false
    },
    {
      "id": "turtle-annotated",
      "label": "Turtle RDF (Annotated)",
      "description": "Turtle with resolved labels using prez:label",
      "url": "alteration-form-turtle-annotated.ttl",
      "mediaType": "text/turtle",
      "format": "TTL",
      "bytes": 41203,
      "annotations": true
    },
    {
      "id": "concepts",
      "label": "Concept List (JSON)",
      "description": "Simple web-friendly JSON format",
      "url": "alteration-form-concepts.json",
      "mediaType": "application/json",
      "format": "JSON",
      "bytes": 21504,
      "annotations": false
    }
  ]
}
```

**Aligns with:**
- OGC Records API distribution pattern
- DCAT `dcat:Distribution` vocabulary
- Schema.org `DataDownload` pattern

### Issue 5: Terminology Inconsistency

**Problem:** Mixed use of vocab/scheme/collection/dataset

| Context | Term Used |
|---------|-----------|
| URLs | `vocab-slug` |
| Code variables | `sourceName`, `vocabName`, `schemeName` |
| Documentation | "Vocabulary" and "Scheme" |
| RDF | `skos:ConceptScheme` |
| Standards | DCAT uses "Dataset" |

**Recommendation:** ✅ **Standardize by context**

```
USER-FACING:
  "Vocabulary" (UI, docs, export pages)

TECHNICAL (RDF):
  "ConceptScheme" (SKOS standard)

CATALOG:
  "Dataset" (DCAT standard)

API/URLs:
  "vocab-slug" (simple, URL-safe)
```

### Issue 6: Concept File Organization

**Current structure:**
```
concepts/
├── a/  (alphabetical prefix)
│   └── alpine-meadow-anot+ld+json.json
├── n/
│   └── non-pervasive-anot+ld+json.json
└── u/
    └── unaltered-anot+ld+json.json
```

**Pros:**
- ✅ Scales well (distributes 1000+ files across 26 directories)
- ✅ Alphabetical sorting is intuitive

**Cons:**
- ⚠️ Only one format (annotated JSON-LD)
- ⚠️ Not grouped by vocabulary
- ⚠️ Prefix based on slugified ID (may not be stable)

**Recommendation:** ✅ **Document current approach clearly**

Current strategy works for scale and simplicity. Document rationale:

```markdown
## Per-Concept Files

- **Location:** `concepts/{prefix}/{concept-id}-anot+ld+json.json`
- **Format:** JSON-LD with prez: annotations only
- **Prefix:** First letter of slugified concept ID
- **Purpose:** Web component data loading
- **Not intended:** As primary source (use vocab-level exports)
- **Rationale:** Single format minimizes storage (12 KB each vs. 247 KB × 6 formats)
```

**Future consideration (OGC alignment):**
```
concepts/{vocab-slug}/{concept-id}/
├── concept.json
├── concept.ttl
└── concept.jsonld
```

---

## Standards Alignment Analysis

### OGC Records API

**Standard structure:**
```
/catalogs/{catalog-id}
/collections/{collection-id}
/items/{item-id}
```

**prez-lite current:**
```
/export/{vocab-slug}/
/export/{vocab-slug}/concepts/{prefix}/{id}
```

**Alignment:** ⚠️ Implicit mapping possible

```
Catalog    = export/ (implicit)
Collection = {vocab-slug}/
Item       = concepts/{prefix}/{id}
```

**Recommendation:** Phase 2 work - formal OGC API implementation

### DCAT (Data Catalog Vocabulary)

**Standard:** `dcat:Dataset` with `dcat:Distribution` records

**prez-lite current:**
- ✅ Vocabulary metadata in `system/vocabularies/index.json`
- ❌ No formal `dcat:Distribution` records

**Recommendation:** ✅ Add distribution metadata (Issue #4)

### IANA Media Types

**Standard:** Registered media types in IANA registry

**prez-lite current:**
- ✅ Uses standard types: `text/turtle`, `application/ld+json`
- ❌ Custom types: `text/anot+turtle` (not registered)

**Recommendation:** ✅ Use standard types + annotation suffix (Issue #2)

### Schema.org

**Standard:** `schema:Dataset` with `schema:DataDownload`

**prez-lite current:**
- ✅ Good alignment with vocabulary metadata
- ⚠️ Could be richer with explicit Schema.org markup

**Recommendation:** Consider adding Schema.org JSON-LD to export pages

---

## Recommendations Summary

### Priority 1: Quick Wins (< 4 hours)

| Task | Effort | Impact | Files Affected |
|------|--------|--------|----------------|
| Remove duplicate `-list` files | 15min | High | useShare.ts, process-vocab.js |
| Standardize annotation naming | 2hrs | High | useShare.ts, process-vocab.js, docs |
| Document concept file strategy | 1hr | Medium | docs/3-features/sharing.md |
| Standardize terminology in docs | 1hr | Medium | Multiple .md files |

**Total effort:** ~4 hours
**Impact:** Significant clarity improvement

### Priority 2: Distribution Metadata (3 hours)

| Task | Effort | Impact |
|------|--------|--------|
| Add distributions.json generation | 2hrs | Medium |
| Update export pages to use metadata | 1hr | Medium |

**Total effort:** ~3 hours
**Impact:** Standards compliance, discoverability

### Priority 3: Future Work (Phase 2)

| Task | Effort | Impact |
|------|--------|--------|
| OGC Records API formal structure | 2-3 weeks | High |
| Per-concept format variety | 1 week | Low |
| Content negotiation support | 1 week | Medium |

---

## Proposed Naming Convention

### Complete File List

```
{vocab-slug}/
├── distributions.json                # NEW: Format metadata
├── profile.json                      # Per-vocab field definitions
│
├── {vocab}-turtle.ttl                # Simplified Turtle
├── {vocab}-turtle-annotated.ttl      # RENAMED: With prez:label
│
├── {vocab}-jsonld.json               # RENAMED: Standard JSON-LD
├── {vocab}-jsonld-annotated.json     # RENAMED: With prez: annotations
│
├── {vocab}-rdfxml.xml                # RENAMED: RDF/XML
│
├── {vocab}-concepts.json             # Simple JSON (keep)
├── {vocab}-concepts.csv              # Simple CSV (keep)
│
├── {vocab}-page.html                 # Standalone HTML
│
└── concepts/{prefix}/
    └── {id}-jsonld-annotated.json    # RENAMED: Per-concept files
```

### Changes Required

| Current | Proposed | Reason |
|---------|----------|--------|
| `-anot+turtle.ttl` | `-turtle-annotated.ttl` | Standard media type |
| `-anot+ld+json.json` | `-jsonld-annotated.json` | Standard media type |
| `-json+ld.json` | `-jsonld.json` | Shorter, clearer |
| `-rdf.xml` | `-rdfxml.xml` | Consistent naming |
| `-list.json` | DELETE | Remove duplicate |
| `-list.csv` | DELETE | Remove duplicate |
| `concepts/{id}-anot+ld+json.json` | `{id}-jsonld-annotated.json` | Consistent with above |

### Migration Path

**For backward compatibility:**

1. **Generate both naming conventions** (old + new) during transition
2. **Add deprecation warnings** in documentation
3. **Remove old naming** after 2-3 releases

**Code changes:**

```javascript
// useShare.ts - EXPORT_FORMATS
const EXPORT_FORMATS = [
  {
    id: 'turtle',
    filename: (s) => `${s}-turtle.ttl`,
    deprecated: null
  },
  {
    id: 'turtle-annotated',
    filename: (s) => `${s}-turtle-annotated.ttl`,
    deprecated: `${s}-anot+turtle.ttl`  // Keep old file for now
  },
  {
    id: 'jsonld',
    filename: (s) => `${s}-jsonld.json`,
    deprecated: `${s}-json+ld.json`
  },
  {
    id: 'jsonld-annotated',
    filename: (s) => `${s}-jsonld-annotated.json`,
    deprecated: `${s}-anot+ld+json.json`
  },
  {
    id: 'concepts',
    filename: (s) => `${s}-concepts.json`,
    deprecated: `${s}-list.json`
  },
  // ... DELETE: list.json, list.csv
]
```

---

## Implementation Checklist

### Phase 1: Documentation & Cleanup (Now)

- [ ] Document current naming conventions (this file)
- [ ] Remove duplicate `-list` files from generation
- [ ] Update `useShare.ts` EXPORT_FORMATS array
- [ ] Update `process-vocab.js` file generation
- [ ] Document concept file organization strategy
- [ ] Standardize terminology in docs

**Files to update:**
- `packages/data-processing/scripts/process-vocab.js`
- `web/app/composables/useShare.ts`
- `docs/3-features/sharing.md`
- `docs/2-specification/json-contract.md`

### Phase 2: Distribution Metadata (Next Release)

- [ ] Add `distributions.json` generation to process-vocab.js
- [ ] Include file sizes in distribution metadata
- [ ] Update export pages to read distributions.json
- [ ] Add Schema.org JSON-LD to export pages

### Phase 3: Rename Files (Future Release)

- [ ] Implement new naming convention
- [ ] Generate both old + new during transition
- [ ] Add deprecation notices
- [ ] Update all documentation
- [ ] Remove old naming after 2 releases

### Phase 4: OGC Alignment (Phase 2 Project)

- [ ] Formal OGC Records API structure
- [ ] Catalog/Collection/Item paths
- [ ] DCAT RDF exports
- [ ] Content negotiation support

---

## Cost-Benefit Analysis

### Removing Duplicates

**Current waste:**
- 36 vocabs × 42 KB (21 KB × 2) = **1.5 MB**
- Build time: ~2 seconds per vocabulary = **72 seconds**

**Benefit:** Minimal disk savings, but significant clarity improvement

### Standardizing Annotation Naming

**Current confusion:**
- Users unsure which format to use
- External tools can't parse media types
- Content negotiation broken

**Benefit:**
- ✅ Standards compliance
- ✅ Better discoverability
- ✅ HTTP best practices

### Adding Distribution Metadata

**Current limitation:**
- Formats only documented in code
- Not discoverable by external tools
- Manual documentation required

**Benefit:**
- ✅ Machine-readable format list
- ✅ DCAT/OGC compliance
- ✅ Automatic documentation

---

## Related Standards

### Relevant Specifications

| Standard | Relevance | Adoption |
|----------|-----------|----------|
| [OGC Records API](https://ogcapi.ogc.org/records/) | Catalog structure | ⚠️ Planned |
| [DCAT 2](https://www.w3.org/TR/vocab-dcat-2/) | Dataset/distribution vocabulary | ⚠️ Partial |
| [IANA Media Types](https://www.iana.org/assignments/media-types/) | File format registration | ✅ Yes |
| [SKOS](https://www.w3.org/TR/skos-reference/) | ConceptScheme vocabulary | ✅ Yes |
| [Schema.org](https://schema.org/Dataset) | Lightweight semantic markup | ✅ Partial |

### Media Type References

```
text/turtle               https://www.iana.org/assignments/media-types/text/turtle
application/ld+json       https://www.iana.org/assignments/media-types/application/ld+json
application/rdf+xml       https://www.iana.org/assignments/media-types/application/rdf+xml
text/csv                  https://www.iana.org/assignments/media-types/text/csv
application/json          https://www.iana.org/assignments/media-types/application/json
```

---

## Conclusion

### Current State: Functional but Inconsistent

- ✅ All necessary formats generated
- ✅ Files are accessible and usable
- ⚠️ Naming is inconsistent
- ⚠️ Some duplication exists
- ❌ Not fully standards-aligned

### Recommended Improvements

**High Priority (Do Now):**
1. Remove duplicate `-list` files
2. Document concept file strategy
3. Standardize terminology in docs

**Medium Priority (Next Release):**
4. Rename annotation formats (`-annotated` suffix)
5. Add distribution metadata files

**Low Priority (Future):**
6. Formal OGC Records API alignment
7. Content negotiation support

### Expected Outcomes

**After Priority 1 & 2 changes:**
- ✅ Clear, consistent naming
- ✅ Standards-compliant media types
- ✅ Discoverable format metadata
- ✅ Better documentation
- ✅ Reduced confusion

**Implementation effort:** ~7 hours for Priority 1 & 2

---

## Related Documentation

- [Export Format Audit](./export-format-audit.md) - Analysis of export strategy
- [Disk Usage Analysis](./disk-usage-analysis.md) - Storage projections
- [Data Pipeline](./data-pipeline.md) - Processing pipeline overview
- [Sharing & Export](../3-features/sharing.md) - Feature documentation
