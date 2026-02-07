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
  src="https://vocabs.example.org/web-components/prez-vocab.min.js">
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

#### Styling

Use CSS custom properties:

```css
prez-list {
  --prez-primary-color: #3b82f6;
  --prez-font-family: system-ui, sans-serif;
  --prez-font-size: 14px;
  --prez-border-radius: 0.375rem;
  --prez-border-color: #e5e7eb;
}
```

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
web/public/web-components/prez-vocab.min.js
```

Size: ~50KB minified
