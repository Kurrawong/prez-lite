---
title: Sharing & Export
status: current
updated: 2025-02-08
---

# Sharing & Export

> Machine-readable exports and embeddable web components.

## Overview

prez-lite provides comprehensive vocabulary sharing through:
1. **9 Export Formats** - Standard RDF serializations plus web-friendly formats
2. **Web Components** - Embeddable `<prez-list>` widget
3. **Share Pages** - User-friendly download and embed interface

---

## Export Formats

### Available Formats

| ID | Name | Extension | MIME Type | Use Case |
|----|------|-----------|-----------|----------|
| `ttl` | Turtle | .ttl | text/turtle | Human-readable RDF |
| `ttl-anot` | Turtle (Annotated) | .ttl | text/turtle | With resolved IRI labels |
| `jsonld` | JSON-LD | .jsonld | application/ld+json | W3C linked data |
| `jsonld-anot` | JSON-LD (Annotated) | .json | application/ld+json | With prez: annotations |
| `json` | JSON | .json | application/json | Simple web app format |
| `rdf` | RDF/XML | .rdf | application/rdf+xml | Legacy RDF systems |
| `csv` | CSV | .csv | text/csv | Spreadsheets, data analysis |
| `html` | HTML | .html | text/html | Standalone page view |

### Annotated Variants

Annotated formats include:
- Resolved labels for all IRIs
- `prez:label`, `prez:description` annotations
- Human-readable property names in comments

### Export Directory Structure

```
web/public/export/
├── _system/
│   ├── vocabularies/
│   │   └── index.json          # Vocabulary metadata catalog
│   ├── search/
│   │   └── orama-index.json    # Pre-built search index
│   ├── labels.json             # Global label cache (~400KB)
│   └── profile.json            # Default field ordering
│
├── alteration-form/
│   ├── alteration-form.ttl
│   ├── alteration-form.ttl     # Annotated variant
│   ├── alteration-form.jsonld
│   ├── alteration-form.json
│   ├── alteration-form.rdf
│   ├── alteration-form.csv
│   ├── alteration-form.html
│   ├── profile.json            # Per-vocab field definitions
│   └── concepts/               # Per-concept NDJSON files
│
└── [38 more vocabularies...]
```

---

## Share Pages

### Share Hub (`/share`)

Central page for sharing vocabularies with:
- List of all available vocabularies
- Quick download buttons per format
- Component type selector
- Link to detailed share pages

### Vocabulary Share Page (`/share/[vocab]`)

Per-vocabulary page with:

| Section | Content |
|---------|---------|
| **Metadata** | Title, description, concept count, modified date |
| **Downloads** | Buttons for all 9 export formats |
| **Preview** | Interactive web component demonstration |
| **Embed Code** | Copy-ready HTML snippet |
| **API URLs** | Direct download URLs for programmatic access |

### Component Documentation (`/share/components/[type]`)

Documentation for each display mode:
- `select` - Dropdown with search
- `dropdown` - Button with popover tree
- `radio` - Radio button selection
- `table` - Tabular display

---

## Web Components

### The `<prez-list>` Component

A single, flexible component with multiple display modes.

#### Display Modes

| Mode | Attribute | Description |
|------|-----------|-------------|
| **Select** | `type="select"` | Tree view with expand/collapse |
| **Dropdown** | `type="dropdown"` | Button with popover tree |
| **Radio** | `type="radio"` | Radio button selection |
| **Table** | `type="table"` | Tabular display with columns |

#### Basic Usage

```html
<!-- Include the component bundle -->
<script type="module"
  src="https://vocabs.example.org/web-components/prez-lite.min.js">
</script>

<!-- Use the component -->
<prez-list
  base-url="https://vocabs.example.org"
  vocab="alteration-form"
  type="select"
></prez-list>
```

#### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `base-url` | string | - | Base URL of prez-lite instance |
| `vocab` | string | - | Vocabulary slug |
| `vocab-url` | string | - | Direct URL to vocab JSON (overrides base-url/vocab) |
| `type` | string | `select` | Display mode: select, dropdown, radio, table |
| `theme` | string | `auto` | Color scheme: `auto`, `light`, or `dark` |
| `search` | boolean | false | Enable search/filter input |
| `multiple` | boolean | false | Allow multiple selection (checkbox mode) |
| `horizontal` | boolean | false | Horizontal layout (radio mode only) |
| `value` | string | - | Pre-selected concept IRI |

#### Events

| Event | Detail | When Fired |
|-------|--------|------------|
| `prez-load` | `{ concepts: [...] }` | Data loaded successfully |
| `prez-change` | `{ value: IRI, label: string }` | Selection changed |
| `prez-error` | `{ error: Error }` | Load or processing error |
| `prez-expand` | `{ iri: string, expanded: boolean }` | Tree node expanded/collapsed |
| `prez-filter` | `{ query: string, matches: number }` | Search filter applied |

#### Theme Control

Control color scheme with the `theme` attribute:

```html
<!-- Auto: follows system preference (default) -->
<prez-list vocab="alteration-form"></prez-list>

<!-- Force light mode -->
<prez-list vocab="alteration-form" theme="light"></prez-list>

<!-- Force dark mode -->
<prez-list vocab="alteration-form" theme="dark"></prez-list>
```

#### Styling with CSS Custom Properties

Components automatically support light and dark modes. Override colors using inline styles:

```html
<prez-list
  vocab="alteration-form"
  style="--prez-bg: #0c4a6e; --prez-text: #e0f2fe; --prez-primary: #38bdf8">
</prez-list>
```

**Available CSS Variables:**

| Variable | Description | Light Default | Dark Default |
|----------|-------------|---------------|--------------|
| `--prez-bg` | Main background | `#ffffff` | `#1f2937` |
| `--prez-text` | Primary text | `#374151` | `#f3f4f6` |
| `--prez-border` | Default borders | `#d1d5db` | `#4b5563` |
| `--prez-primary` | Primary/brand color | `#3b82f6` | `#60a5fa` |
| `--prez-selected-bg` | Selected items | `#dbeafe` | `#2563eb` |
| `--prez-hover-bg` | Hover states | `#f3f4f6` | `#374151` |

**Note:** Inline styles override CSS variables, allowing component-specific customization.

#### SPARQL Mode

Connect directly to a SPARQL endpoint instead of static JSON files. The component lazily loads children on drill-down.

```html
<!-- Minimal SPARQL configuration -->
<prez-list
  sparql-endpoint="https://vocabs.example.org/sparql"
  vocab-iri="https://example.org/vocab/colors"
  search
></prez-list>

<!-- Full configuration with all options -->
<prez-list
  sparql-endpoint="https://vocabs.example.org/sparql"
  vocab-iri="https://example.org/vocab/colors"
  named-graph="https://example.org/graph/vocabs"
  timeout="15000"
  label-predicates="skos:prefLabel,dcterms:title,rdfs:label"
  description-predicates="skos:definition,dcterms:description"
  type="select"
  search
  show-count
></prez-list>
```

**SPARQL-Specific Attributes:**

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `sparql-endpoint` | string | - | SPARQL endpoint URL (enables SPARQL mode) |
| `vocab-iri` | string | - | ConceptScheme IRI (required in SPARQL mode) |
| `named-graph` | string | - | Named graph to query within |
| `timeout` | number | `10000` | Request timeout in milliseconds |
| `label-predicates` | string | `skos:prefLabel,...` | Comma-separated label predicates |
| `description-predicates` | string | `skos:definition,...` | Comma-separated description predicates |

**Profile-Driven Predicate Configuration:**

By default, SPARQL queries use the same predicate fallback chain as the static export pipeline:
- **Labels**: `skos:prefLabel` → `dcterms:title` → `rdfs:label`
- **Descriptions**: `skos:definition` → `dcterms:description`

Override using prefixed names or full IRIs:
```html
<prez-list
  sparql-endpoint="https://endpoint/sparql"
  vocab-iri="https://example.org/vocab"
  label-predicates="rdfs:label"
  description-predicates="dcterms:description,skos:scopeNote"
></prez-list>
```

**Behaviour:**
- Initial load fetches scheme metadata and top concepts
- Expanding a node lazily fetches narrower concepts via SPARQL
- Search queries the endpoint with 300ms debounce (not client-side filtering)
- All existing display types (`select`, `dropdown`, `radio`, `table`) work in SPARQL mode

**CORS Requirement:** The SPARQL endpoint must return `Access-Control-Allow-Origin` headers for browser requests. Common triplestores (Fuseki, GraphDB, Virtuoso) support CORS when configured.

#### JavaScript Integration

```javascript
const list = document.querySelector('prez-list')

// Listen for selection changes
list.addEventListener('prez-change', (e) => {
  console.log('Selected:', e.detail.value, e.detail.label)
})

// Get current value
const selected = list.value

// Set value programmatically
list.value = 'http://example.org/concept/granite'
```

---

## Interactive Preview

The share pages include a live preview component that:
- Renders the actual web component
- Updates as options change
- Shows real vocabulary data
- Demonstrates all display modes

---

## API Access

### Vocabulary Metadata

```
GET /export/_system/vocabularies/index.json
```

Returns catalog of all vocabularies with metadata.

### Vocabulary Export

```
GET /export/{vocab-slug}/{vocab-slug}.{format}
```

Direct access to any export format.

### Labels Cache

```
GET /export/_system/labels.json
```

Global IRI-to-label mappings for display.

---

## Implementation

### Components

| File | Purpose |
|------|---------|
| `web/app/pages/share/index.vue` | Share hub page |
| `web/app/pages/share/[vocab].vue` | Per-vocab share page |
| `web/app/components/share/InteractivePreview.vue` | Live component preview |
| `web/app/composables/useShare.ts` | Share data and URLs |
| `packages/web-components/src/components/list.ts` | prez-list implementation |

### Web Component Bundle

Built and served from:
```
web/public/web-components/prez-lite.min.js
```

Size: ~66KB (16KB gzipped)
