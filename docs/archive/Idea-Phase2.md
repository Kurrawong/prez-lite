# Phase 2: Catalogs, Collections, and Beyond Vocabularies

## Overview

prez-lite currently focuses on SKOS vocabularies. This document outlines future work to support the full Prez data model: catalogs containing collections containing items, with proper URL generation and non-vocabulary use cases.

---

## The Prez Hierarchy

Prez implements an OGC-style hierarchy:

```
Catalog
└── Collection (dataset/vocabulary)
    └── Item (individual resource)
```

Mapped to SKOS vocabularies:

| Prez Level | SKOS Equivalent | RDF Class |
|------------|-----------------|-----------|
| Catalog | Vocabulary collection | `schema:DataCatalog` or `dcat:Catalog` |
| Collection | ConceptScheme | `skos:ConceptScheme` |
| Item | Concept | `skos:Concept` |

---

## Current Limitations

### 1. Single Catalog Assumption

Currently, prez-lite assumes a single catalog. The processing pipeline and URL structure don't properly handle multiple catalogs.

```
# Current URL structure (implicit catalog)
/vocabs/{schemeSlug}/concepts/{conceptSlug}

# Prez-style URL structure (explicit catalog)
/catalogs/{catalogId}/collections/{schemeId}/items/{conceptId}
```

### 2. Hard-Coded Vocabulary Focus

The UI assumes SKOS vocabularies:
- Navigation shows "Vocabularies"
- Search targets concepts
- Scheme/Concept pages are vocabulary-specific

### 3. Missing Listing Profiles

We only support object profiles. Listing profiles control:
- How catalogs list their collections
- How collections list their items
- Pagination, sorting, filtering

---

## Phase 2 Goals

### Goal 1: Full Catalog Support

Support multiple catalogs, each with multiple collections:

```turtle
<https://example.org/catalog/geo-vocabs> a dcat:Catalog, schema:DataCatalog ;
    dcterms:title "Geoscience Vocabularies" ;
    dcat:dataset <https://linked.data.gov.au/def/geology-vocab> ,
                 <https://linked.data.gov.au/def/minerals-vocab> .

<https://example.org/catalog/admin-vocabs> a dcat:Catalog ;
    dcterms:title "Administrative Vocabularies" ;
    dcat:dataset <https://example.org/def/regions> .
```

**Tasks:**
- [ ] Update manifest structure to support multiple catalogs
- [ ] Update processing pipeline to catalog-aware
- [ ] Add catalog listing page (`/catalogs`)
- [ ] Add catalog detail page (`/catalogs/{catalogId}`)

### Goal 2: Flexible Collection Types

Not all collections are SKOS vocabularies. Support:

| Type | Use Case |
|------|----------|
| `skos:ConceptScheme` | Controlled vocabularies |
| `dcat:Dataset` | Generic datasets |
| `schema:DataCatalog` | Nested catalogs |
| `geo:FeatureCollection` | Geographic features |

**Tasks:**
- [ ] Abstract "collection" concept from SKOS specifics
- [ ] Profile-driven collection rendering
- [ ] Collection type indicators in UI

### Goal 3: URL Generation Strategy

Document and implement consistent URL generation:

#### Static Site URLs

```
/                                           # Home
/catalogs                                   # Catalog listing
/catalogs/{catalogSlug}                     # Catalog detail
/catalogs/{catalogSlug}/collections         # Collections in catalog
/catalogs/{catalogSlug}/collections/{collectionSlug}        # Collection detail
/catalogs/{catalogSlug}/collections/{collectionSlug}/items  # Items listing
/catalogs/{catalogSlug}/collections/{collectionSlug}/items/{itemSlug}  # Item detail
```

#### Slug Generation

From IRIs, generate URL-safe slugs:
1. Use `dcterms:identifier` if present and valid
2. Extract last path segment from IRI
3. Sanitize: lowercase, replace special chars with hyphens

```
https://linked.data.gov.au/def/geology-vocab → geology-vocab
https://example.org/concept/Granite%20Type%20A → granite-type-a
```

#### Content Negotiation (Static)

For each resource, generate multiple format files:
```
/catalogs/geo-vocabs/collections/rocks/
├── index.html          # Default HTML view
├── index.json          # JSON-LD
├── index.ttl           # Turtle
├── index.rdf           # RDF/XML
└── index.csv           # CSV (for collections)
```

Access via:
- Extension: `/collections/rocks.ttl`
- Accept header: (requires server config or client-side switching)

### Goal 4: Listing Profiles

Add `prez:ListingProfile` support:

```turtle
prez:ConceptSchemeListingProfile a prez:ListingProfile ;
    sh:targetClass skos:ConceptScheme ;
    dcterms:title "Vocabulary Listing Profile" ;

    # What to show in list views
    sh:property [
        sh:path dcterms:title ;
        sh:name "Title" ;
        sh:order 1 ;
    ] ;
    sh:property [
        sh:path dcterms:description ;
        sh:name "Description" ;
        sh:order 2 ;
    ] ;
    sh:property [
        sh:path dcterms:modified ;
        sh:name "Last Modified" ;
        sh:order 3 ;
    ] ;

    # Pagination
    prez:defaultPageSize 20 ;
    prez:maxPageSize 100 .
```

**Tasks:**
- [ ] Add ListingProfile to profile parser
- [ ] Generate listing pages from ListingProfile
- [ ] Support pagination metadata

### Goal 5: Non-Vocabulary Use Cases

Support common Linked Data patterns beyond SKOS:

#### DCAT Datasets
```turtle
<dataset> a dcat:Dataset ;
    dcterms:title "Mineral Resources Data" ;
    dcat:distribution [
        dcat:downloadURL <https://example.org/data.csv> ;
        dcat:mediaType "text/csv"
    ] .
```

#### Schema.org Things
```turtle
<organization> a schema:Organization ;
    schema:name "Geological Survey" ;
    schema:url <https://example.org> .
```

#### Geographic Features
```turtle
<feature> a geo:Feature ;
    rdfs:label "Murray Basin" ;
    geo:hasGeometry [ ... ] .
```

**Tasks:**
- [ ] Create profiles for common types (DCAT, Schema.org)
- [ ] Generic item renderer (not just Concept)
- [ ] Type-specific UI components

---

## Technical Approach

### Manifest Evolution

Current manifest focuses on vocabularies. Evolve to:

```turtle
<manifest> a prez:Manifest ;
    prez:catalog <catalog-1>, <catalog-2> .

<catalog-1> a prez:CatalogDefinition ;
    prez:source "data/catalogs/geo-vocabs/" ;
    prez:profile prez:GeoscienceCatalogProfile .
```

### Processing Pipeline

1. **Discover**: Find all catalogs, collections, items
2. **Profile**: Load and apply profiles per type
3. **Generate**: Create static files per URL pattern
4. **Index**: Build search index across all content

### UI Architecture

```
pages/
├── index.vue                    # Home (catalog overview)
├── catalogs/
│   ├── index.vue               # Catalog listing
│   └── [catalog]/
│       ├── index.vue           # Catalog detail
│       └── collections/
│           ├── index.vue       # Collection listing
│           └── [collection]/
│               ├── index.vue   # Collection detail
│               └── items/
│                   ├── index.vue      # Item listing
│                   └── [item].vue     # Item detail
```

---

## Migration Path

### Phase 2a: Groundwork
- Abstract collection handling from SKOS
- Add catalog concept to data model
- Update profile parser for listing profiles

### Phase 2b: URL Restructure
- Implement new URL scheme
- Add redirects from old URLs
- Update internal links

### Phase 2c: Multi-Catalog
- Full catalog support
- Catalog management UI
- Cross-catalog search

### Phase 2d: Beyond Vocabularies
- DCAT dataset support
- Generic item rendering
- Type-specific profiles

---

## Open Questions

1. **Backward Compatibility**: How to handle existing `/vocabs/` URLs?
   - Option A: Redirects to new structure
   - Option B: Maintain both URL schemes
   - Option C: Breaking change (major version)

2. **Single vs Multi Catalog**: Should simple deployments still work without explicit catalogs?
   - Option A: Implicit "default" catalog
   - Option B: Always require catalog definition

3. **Profile Complexity**: How much of Prez's profile system do we implement?
   - Full SHACL property paths?
   - Content negotiation by profile?
   - Runtime profile switching?

4. **Search Scope**: How does search work across catalogs?
   - Global search across all content?
   - Per-catalog search?
   - Faceted search by catalog/collection?

---

## Dependencies

- **Profile Helper improvements** (Idea-Authoring.md) - Foundation for profile editing
- **Data processing refactor** - Needs to support catalogs
- **Web component updates** - Generic item rendering

---

## References

- [Prez Documentation](https://github.com/RDFLib/prez)
- [OGC API Records](https://ogcapi.ogc.org/records/)
- [DCAT Vocabulary](https://www.w3.org/TR/vocab-dcat-2/)
- [Schema.org](https://schema.org/)
