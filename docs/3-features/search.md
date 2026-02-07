---
title: Search
status: current
updated: 2025-02-08
---

# Search

> Full-text search across all vocabulary content.

## Overview

prez-lite provides client-side full-text search using [Orama](https://orama.com/), a fast JavaScript search engine. The search index is pre-built at build time for optimal performance.

---

## Search Page (`/search`)

### Features

| Feature | Description |
|---------|-------------|
| **Full-text Search** | Search across labels, definitions, notations |
| **Faceted Filtering** | Filter by vocabulary, publisher |
| **Pagination** | 10, 20, 50, or all results per page |
| **URL Sync** | Query params for shareable searches |
| **Debouncing** | Optimized for typing performance |

### URL Parameters

```
/search?q=granite&vocab=geology&page=1
```

| Parameter | Purpose |
|-----------|---------|
| `q` | Search query |
| `vocab` | Vocabulary filter |
| `publisher` | Publisher filter |
| `page` | Current page |

---

## Search Index

### Indexed Fields

| Field | Source | Weight |
|-------|--------|--------|
| `prefLabel` | skos:prefLabel | High |
| `altLabels` | skos:altLabel | Medium |
| `definition` | skos:definition | Medium |
| `notation` | skos:notation | High |
| `schemeLabel` | Scheme prefLabel | Low |

### Index Structure

```json
{
  "iri": "http://example.org/concept/granite",
  "prefLabel": "Granite",
  "altLabels": ["Granitic rock", "Granite stone"],
  "notation": "GRN",
  "definition": "A coarse-grained ignite rock...",
  "scheme": "http://example.org/scheme/rocks",
  "schemeLabel": "Rock Types",
  "publisher": ["Geological Survey"]
}
```

### Index Location

| File | Purpose |
|------|---------|
| `_system/search/orama-index.json` | Pre-built Orama index (~30KB) |
| `_system/vocabularies/index.json` | Fallback for index generation |

---

## Faceted Navigation

### Vocabulary Facets

Shows count of results per vocabulary:

```
Vocabularies
☑ Rock Types (42)
☐ Mineral Types (18)
☐ Alteration Forms (7)
```

### Publisher Facets

Shows count of results per publisher:

```
Publishers
☑ Geological Survey (52)
☐ Mining Authority (15)
```

### Facet Behavior

- Facets update dynamically with search results
- Selecting a facet filters results
- Counts reflect filtered totals
- Multiple facets can be selected

---

## Implementation

### Search Flow

```
User types query
      ↓
Debounce (300ms)
      ↓
Orama search on index
      ↓
Generate facets from results
      ↓
Apply facet filters
      ↓
Paginate results
      ↓
Render result cards
```

### Composable: `useSearch.ts`

```typescript
const {
  query,           // Search query
  results,         // Paginated results
  facets,          // Vocabulary/publisher facets
  filters,         // Active filters
  pagination,      // Page info
  search,          // Execute search
  setFilter,       // Apply facet filter
  clearFilters     // Reset filters
} = useSearch()
```

### Search Result Card

Each result shows:
- **Label** - Concept preferred label
- **Definition** - Truncated definition
- **Vocabulary** - Badge with scheme label
- **Notation** - If available
- **Link** - Navigate to concept page

---

## Performance

### Optimizations

| Optimization | Benefit |
|--------------|---------|
| Pre-built index | No runtime index building |
| Debouncing | Reduced search calls while typing |
| Client-side | No server round-trips |
| Pagination | Render only visible results |

### Index Size

Typical index sizes:
- 1,000 concepts: ~50KB
- 10,000 concepts: ~500KB
- 50,000 concepts: ~2.5MB

For very large vocabularies (100k+), consider chunked loading or server-side search.

---

## Configuration

### Customizing Search

The search index is generated at build time by:
1. `packages/data-processing/scripts/generate-search-index.js`
2. Output to `web/public/export/_system/search/`

To customize indexed fields, modify the search index generation script.
