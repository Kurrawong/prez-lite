# SPARQL-Backed Dynamic Web Component List

> Feasibility assessment for adding live SPARQL endpoint support to the prez-list web component

**Date:** 2026-02-09
**Status:** Assessment Complete

---

## Summary

Adding a `sparql-endpoint` attribute to `prez-list` is **feasible and recommended as an extension** to the existing component rather than a separate component. The current architecture already separates data fetching from rendering cleanly, making this a natural extension point.

---

## Current Architecture

### Data Flow

```
[vocab="slug"] or [vocab-url="url"]
        ↓
  base-element.ts: loadVocab()
        ↓
  fetch-vocab.ts: fetchVocab(url) → JSON fetch → transform → VocabData
        ↓
  list.ts: renders tree/flat/table/radio/dropdown from VocabData
```

### Key Interfaces

```typescript
interface VocabData {
  iri: string
  label: string
  description: string
  concepts: VocabConcept[]   // flat list of all concepts
  tree: VocabTreeNode[]      // hierarchy built from broader relations
}

interface VocabConcept {
  iri: string
  label: string
  notation?: string
  description?: string
  altLabels?: string[]
  broader?: string[]
  narrower?: string[]
}

interface VocabTreeNode {
  iri: string
  label: string
  notation?: string
  description?: string
  children: VocabTreeNode[]  // populated eagerly from full dataset
}
```

### Current Behaviour

- **Eager loading**: Fetches all concepts in one JSON request, builds full tree client-side
- **Tree built from `broader` relations**: `buildTree()` in fetch-vocab.ts finds top concepts (no broader) and recursively attaches children
- **5-minute in-memory cache** per URL
- **Rendering is fully decoupled** from data loading — `list.ts` only reads `this.vocabData`

---

## Option Analysis

### Option A: Extend Existing `prez-list` Component (Recommended)

Add a `sparql-endpoint` attribute that switches data fetching from static JSON to live SPARQL queries.

```html
<!-- Static mode (existing) -->
<prez-list vocab="example-colors"></prez-list>

<!-- SPARQL mode (new) -->
<prez-list sparql-endpoint="https://vocabs.example.org/sparql"
           vocab-iri="https://example.org/vocab/colors">
</prez-list>
```

**How it works:**
1. When `sparql-endpoint` is set, `loadVocab()` switches to SPARQL fetching instead of JSON
2. Initial load fetches the ConceptScheme metadata + top concepts only
3. On `toggleExpand()`, lazily fetches narrower concepts for that node
4. Tree nodes start with `children: []` and a `hasChildren: boolean` flag
5. Rendering already handles expand/collapse — just needs a loading state per node

**Pros:**
- Single component to learn and document
- All display types (tree, dropdown, table, radio) work with SPARQL data
- Shared theming, events, accessibility, selection logic
- No code duplication
- Users can switch between static and dynamic with one attribute change

**Cons:**
- Increases component complexity (~150-200 lines of SPARQL logic)
- Need to handle the lazy-loading tree differently from the eager-loaded one
- Bundle size increase (~2-3 KB gzipped for SPARQL utilities)

### Option B: Separate `prez-sparql-list` Component

A new component that extends `PrezVocabBase` but uses SPARQL instead of JSON fetching.

**Pros:**
- Clean separation of concerns
- Static component stays simple
- Can be loaded independently (code splitting)

**Cons:**
- Duplicates all rendering logic (1400+ lines in list.ts) or requires extracting to shared mixins
- Two components to document, test, and maintain
- Users need to learn which component to use
- Divergence risk — bug fixes need applying to both

### Option C: SPARQL Data Adapter (Middleware Pattern)

A standalone utility that sits between a SPARQL endpoint and the existing component, translating queries into VocabData JSON.

```html
<prez-sparql-source endpoint="https://vocabs.example.org/sparql"
                     vocab-iri="https://example.org/vocab/colors"
                     output="vocab-data">
</prez-sparql-source>
<prez-list vocab-data="vocab-data"></prez-list>
```

**Pros:**
- Zero changes to existing component
- Reusable for other components

**Cons:**
- Two-element pattern is awkward for end users
- Loses lazy loading benefit — still needs to fetch all data upfront to produce VocabData
- Custom element communication adds complexity

---

## Recommended Approach: Option A (Extension)

### Why

1. **Rendering is already decoupled** — `list.ts` reads `this.vocabData` and `this.vocabData.tree`, it doesn't care where the data came from
2. **Lazy loading fits naturally** — `toggleExpand()` already exists, adding an async fetch before expanding is minimal
3. **The tree node model just needs one addition** — a `hasChildren` boolean for unexpanded nodes (SPARQL can tell us via `COUNT`)
4. **Users expect one component** — the attribute-driven API (`sparql-endpoint` vs `vocab`) is intuitive

### Implementation Approach

#### New Properties on `PrezVocabBase`

```typescript
/** SPARQL endpoint URL — enables dynamic mode */
@property({ type: String, attribute: 'sparql-endpoint' })
sparqlEndpoint: string | null = null

/** ConceptScheme IRI (required in SPARQL mode) */
@property({ type: String, attribute: 'vocab-iri' })
vocabIri: string | null = null

/** Named graph to query within (optional) */
@property({ type: String, attribute: 'named-graph' })
namedGraph: string | null = null
```

#### SPARQL Queries Required

**1. Fetch ConceptScheme metadata + top concepts:**

```sparql
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>

SELECT ?concept ?label ?notation ?definition
       (COUNT(?narrower) AS ?childCount)
WHERE {
  ?concept skos:topConceptOf <SCHEME_IRI> .
  ?concept skos:prefLabel ?label .
  FILTER(LANG(?label) = "" || LANG(?label) = "en")
  OPTIONAL { ?concept skos:notation ?notation }
  OPTIONAL { ?concept skos:definition ?definition }
  OPTIONAL { ?narrower skos:broader ?concept }
}
GROUP BY ?concept ?label ?notation ?definition
ORDER BY ?label
```

**2. Fetch narrower concepts on drill-down:**

```sparql
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>

SELECT ?concept ?label ?notation ?definition
       (COUNT(?child) AS ?childCount)
WHERE {
  ?concept skos:broader <PARENT_IRI> .
  ?concept skos:prefLabel ?label .
  FILTER(LANG(?label) = "" || LANG(?label) = "en")
  OPTIONAL { ?concept skos:notation ?notation }
  OPTIONAL { ?concept skos:definition ?definition }
  OPTIONAL { ?child skos:broader ?concept }
}
GROUP BY ?concept ?label ?notation ?definition
ORDER BY ?label
```

**3. Search across all concepts:**

```sparql
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>

SELECT ?concept ?label ?notation ?definition
WHERE {
  ?concept skos:inScheme <SCHEME_IRI> .
  ?concept skos:prefLabel ?label .
  FILTER(LANG(?label) = "" || LANG(?label) = "en")
  FILTER(CONTAINS(LCASE(?label), LCASE("SEARCH_TERM")))
  OPTIONAL { ?concept skos:notation ?notation }
  OPTIONAL { ?concept skos:definition ?definition }
}
ORDER BY ?label
LIMIT 50
```

#### Lazy Loading Tree Model

```typescript
interface SparqlTreeNode extends VocabTreeNode {
  hasChildren: boolean    // from COUNT query
  childrenLoaded: boolean // false until expanded
  loading: boolean        // true during fetch
}
```

On expand:
1. Check `childrenLoaded` — if true, just toggle visibility (existing behaviour)
2. If false, set `loading: true`, fire SPARQL query for narrower concepts
3. On response, populate `children`, set `childrenLoaded: true`, `loading: false`
4. Cache results in a `Map<string, SparqlTreeNode[]>`

#### Changes to Rendering

Minimal — add a loading spinner in tree nodes during fetch:

```typescript
// In renderTreeNode, after expand button:
${node.loading ? html`<span class="loading-indicator">...</span>` : nothing}
```

And treat `hasChildren && !childrenLoaded` as expandable (show expand arrow even with empty children array).

---

## Key Risks and Mitigations

### 1. CORS

**Risk:** Most SPARQL endpoints don't set `Access-Control-Allow-Origin` headers for browser requests.

**Mitigation:**
- Document that the endpoint must support CORS
- Consider a `proxy-url` attribute for endpoints behind a server-side proxy
- Common triplestore configs (Fuseki, GraphDB, Virtuoso) all support CORS when configured

### 2. Endpoint Availability

**Risk:** Live endpoint may be slow or unavailable.

**Mitigation:**
- Timeout per request (default 10s, configurable via `timeout` attribute)
- Retry with exponential backoff (1 attempt)
- Clear error states shown to user via existing error rendering
- Cache successful responses (existing 5-min cache pattern)

### 3. Variable SPARQL Dialects

**Risk:** Not all endpoints support the same SPARQL 1.1 features.

**Mitigation:**
- Use only basic SPARQL 1.1 SELECT with GROUP BY — widely supported
- Avoid SPARQL 1.1 property paths in core queries
- The queries above work on Fuseki, GraphDB, Virtuoso, Stardog, Oxigraph, and Blazegraph
- Provide a `query-template` attribute for custom query overrides (future enhancement)

### 4. Large Result Sets

**Risk:** Vocabularies with thousands of top concepts could overwhelm the UI.

**Mitigation:**
- Default `LIMIT 200` on top concepts query
- Pagination via `limit` and `offset` attributes
- Lazy loading inherently limits data transfer
- Search debounced at 300ms

### 5. Bundle Size

**Risk:** Adding SPARQL logic increases the component bundle.

**Mitigation:**
- Estimated +2-3 KB gzipped (query builder + response parser)
- No external SPARQL libraries needed — raw `fetch` with `application/sparql-results+json`
- Could be tree-shaken if SPARQL code is in a separate module imported conditionally

---

## Estimated Effort

| Task | Estimate |
|------|----------|
| SPARQL query builder utility | 2-3 hours |
| Lazy tree loading in base-element | 2-3 hours |
| Tree node loading states in list.ts | 1-2 hours |
| Search integration with SPARQL | 1-2 hours |
| Error handling + timeout | 1 hour |
| Testing with real endpoints | 2-3 hours |
| Documentation | 1-2 hours |
| **Total** | **10-16 hours** |

---

## API Surface (Proposed)

```html
<!-- Minimal -->
<prez-list sparql-endpoint="https://vocabs.example.org/sparql"
           vocab-iri="https://example.org/vocab/colors">
</prez-list>

<!-- Full options -->
<prez-list sparql-endpoint="https://vocabs.example.org/sparql"
           vocab-iri="https://example.org/vocab/colors"
           named-graph="https://example.org/graph/vocabs"
           timeout="15000"
           limit="100"
           type="select"
           search
           show-count
           theme="auto">
</prez-list>
```

All existing display attributes (`type`, `search`, `multiple`, `flat`, `horizontal`, `show-count`, `show-description`, `fields`, `max-level`, `theme`) remain compatible.

---

## Conclusion

Extending `prez-list` with a `sparql-endpoint` attribute is the right approach. The architecture already separates data from rendering, the lazy-loading model maps naturally to the existing expand/collapse UX, and users get a single component that works with both static exports and live endpoints.
