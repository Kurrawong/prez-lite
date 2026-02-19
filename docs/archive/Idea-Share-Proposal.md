# Vocabulary Sharing Proposal

## Overview

This proposal outlines the implementation of vocabulary sharing capabilities for Prez Lite, enabling organizations to share their vocabularies in machine-readable formats and as embeddable web components.

**Goals:**
- Export vocabularies in multiple standard formats
- Provide embeddable web components for vocabulary selection/display
- Create a user-friendly share page for discovering available exports
- Support both technical and non-technical users

---

## Part 1: Machine-Readable Exports

### 1.1 Export Formats

| Format | File Extension | Use Case |
|--------|---------------|----------|
| Turtle (TTL) | `.ttl` | RDF triple store import, SPARQL endpoints |
| Annotated TTL | `-annotated.ttl` | Human-readable with comments |
| JSON | `.json` | JavaScript/web applications |
| JSON-LD | `.jsonld` | Linked data web applications |
| RDF/XML | `.rdf` | Legacy RDF systems |
| CSV | `.csv` | Spreadsheets, data analysis |
| SKOS-XL JSON | `-xl.json` | Extended label support |

### 1.2 Directory Structure

```
public/
└── export/
    └── vocabs/
        ├── index.json                    # Manifest of all vocabs
        ├── alteration-types/
        │   ├── alteration-types.ttl
        │   ├── alteration-types-annotated.ttl
        │   ├── alteration-types.json
        │   ├── alteration-types.jsonld
        │   ├── alteration-types.rdf
        │   ├── alteration-types.csv
        │   └── metadata.json             # Format links, stats
        └── geological-units/
            └── ...
```

### 1.3 Export Manifest (`index.json`)

```json
{
  "generated": "2024-02-03T10:00:00Z",
  "baseUrl": "https://vocabs.example.org",
  "vocabularies": [
    {
      "id": "alteration-types",
      "iri": "https://linked.data.gov.au/def/alteration-types",
      "title": "Alteration Types",
      "description": "Types of geological alteration",
      "conceptCount": 42,
      "modified": "2024-01-15",
      "formats": {
        "ttl": "/export/vocabs/alteration-types/alteration-types.ttl",
        "json": "/export/vocabs/alteration-types/alteration-types.json",
        "jsonld": "/export/vocabs/alteration-types/alteration-types.jsonld",
        "rdf": "/export/vocabs/alteration-types/alteration-types.rdf",
        "csv": "/export/vocabs/alteration-types/alteration-types.csv"
      },
      "webComponent": "/export/vocabs/alteration-types/alteration-types.json"
    }
  ]
}
```

### 1.4 Build Script Enhancement

**New file: `scripts/export-vocabs.js`**

```javascript
// Pseudo-code outline
import { Parser, Writer } from 'n3'
import { jsonld } from 'jsonld'

async function exportVocabulary(ttlPath, outputDir) {
  const ttlContent = await readFile(ttlPath)
  const quads = await parseTurtle(ttlContent)

  // Generate each format
  await writeFile(`${outputDir}/${name}.ttl`, ttlContent)
  await writeFile(`${outputDir}/${name}-annotated.ttl`, generateAnnotatedTtl(quads))
  await writeFile(`${outputDir}/${name}.json`, generateJson(quads))
  await writeFile(`${outputDir}/${name}.jsonld`, await generateJsonLd(quads))
  await writeFile(`${outputDir}/${name}.rdf`, generateRdfXml(quads))
  await writeFile(`${outputDir}/${name}.csv`, generateCsv(quads))
}
```

**Dependencies:**
- `n3` - RDF parsing/serialization
- `jsonld` - JSON-LD processing
- `fast-csv` - CSV generation

---

## Part 2: Web Components

### 2.1 Component Types

| Component | Tag Name | Purpose |
|-----------|----------|---------|
| Dropdown Select | `<prez-vocab-select>` | Single/multi-select dropdown |
| Tree View | `<prez-vocab-tree>` | Hierarchical tree with expand/collapse |
| List View | `<prez-vocab-list>` | Flat searchable list |
| Radio Group | `<prez-vocab-radio>` | Single selection radio buttons |
| Checkbox Group | `<prez-vocab-checkbox>` | Multiple selection checkboxes |
| Autocomplete | `<prez-vocab-autocomplete>` | Type-ahead search |

### 2.2 Web Component Architecture

**Technology Choice: Vanilla Web Components + Lit**

Using Lit (lightweight web component library) provides:
- Small bundle size (~5KB gzipped)
- Framework-agnostic (works in React, Vue, Angular, plain HTML)
- TypeScript support
- Reactive properties
- Shadow DOM encapsulation

**Alternative considered:** Vue custom elements from Nuxt UI
- Pros: Reuse existing components
- Cons: Larger bundle (~50KB+), Vue runtime required
- Decision: Use Lit for smaller, more portable components

### 2.3 Component API

#### `<prez-vocab-select>`

```html
<!-- Basic usage - base-url auto-detected from script source -->
<script src="https://vocabs.gswa.gov.au/web-components/prez-lite.min.js"></script>
<prez-vocab-select vocab="alteration-types"></prez-vocab-select>

<!-- Full options -->
<prez-vocab-select
  vocab="alteration-types"
  multiple
  searchable
  placeholder="Select alteration type..."
  value="https://linked.data.gov.au/def/alteration-types/silicification"
  max-selections="3"
></prez-vocab-select>

<!-- Cross-origin: explicit base-url when using data from different instance -->
<script src="https://cdn.example.com/prez-lite.min.js"></script>
<prez-vocab-select
  vocab="alteration-types"
  base-url="https://vocabs.gswa.gov.au"
></prez-vocab-select>

<!-- Direct URL: bypass auto-detection entirely -->
<prez-vocab-select
  vocab-url="https://vocabs.gswa.gov.au/export/vocabs/alteration-types/alteration-types.json"
></prez-vocab-select>
```

**Attributes:**

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `vocab` | string | - | Vocabulary name |
| `vocab-url` | string | - | Direct URL to JSON file (overrides vocab + base-url) |
| `base-url` | string | auto | Base URL for vocab resolution (auto-detected from script src) |
| `multiple` | boolean | false | Allow multiple selections |
| `searchable` | boolean | false | Enable search/filter |
| `placeholder` | string | "Select..." | Placeholder text |
| `value` | string | - | Selected IRI (single) |
| `values` | string | - | Comma-separated IRIs (multiple) |
| `disabled` | boolean | false | Disable component |
| `required` | boolean | false | Mark as required |
| `max-selections` | number | - | Limit selections (multiple mode) |
| `show-iri` | boolean | false | Display IRIs alongside labels |
| `lang` | string | "en" | Preferred label language |

**Events:**

| Event | Detail | Description |
|-------|--------|-------------|
| `prez-change` | `{ value, values, items }` | Selection changed |
| `prez-search` | `{ query }` | Search text changed |
| `prez-load` | `{ vocab, conceptCount }` | Vocabulary loaded |
| `prez-error` | `{ error }` | Load/parse error |

**Methods:**

```javascript
const select = document.querySelector('prez-vocab-select')

// Get selected values
select.getSelectedIris()      // ['iri1', 'iri2']
select.getSelectedLabels()    // ['Label 1', 'Label 2']
select.getSelectedItems()     // [{ iri, label, notation, ... }]

// Set values programmatically
select.setValue('iri')
select.setValues(['iri1', 'iri2'])
select.clear()

// Control
select.open()
select.close()
select.focus()
```

#### `<prez-vocab-tree>`

```html
<prez-vocab-tree
  vocab="geological-units"
  base-url="https://vocabs.gswa.gov.au"
  expand-all
  selectable
  multiple
></prez-vocab-tree>
```

**Additional Attributes:**

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `expand-all` | boolean | false | Expand all nodes initially |
| `expand-level` | number | 1 | Levels to expand by default |
| `selectable` | boolean | false | Enable node selection |
| `show-count` | boolean | false | Show child counts |
| `show-icons` | boolean | true | Show folder/document icons |

### 2.4 JSON Data Format

The web components consume a simplified JSON format:

```json
{
  "iri": "https://linked.data.gov.au/def/alteration-types",
  "label": "Alteration Types",
  "description": "Types of geological alteration",
  "concepts": [
    {
      "iri": "https://linked.data.gov.au/def/alteration-types/silicification",
      "label": "Silicification",
      "notation": "SIL",
      "definition": "Replacement by silica",
      "broader": ["https://linked.data.gov.au/def/alteration-types/replacement"],
      "narrower": [],
      "altLabels": ["Siliceous alteration"]
    }
  ],
  "tree": [
    {
      "iri": "...",
      "label": "...",
      "children": [...]
    }
  ]
}
```

### 2.5 Bundle Structure

```
public/
└── web-components/
    ├── prez-lite.min.js         # All components bundled (~15KB gzip)
    ├── prez-vocab.min.css        # Default styles (~3KB gzip)
    ├── prez-vocab-select.js      # Individual component
    ├── prez-vocab-tree.js
    ├── prez-vocab-list.js
    └── README.md                 # Usage documentation
```

### 2.6 Styling

Components use CSS custom properties for theming:

```css
prez-vocab-select {
  --prez-primary: #2563eb;
  --prez-primary-hover: #1d4ed8;
  --prez-border: #e5e7eb;
  --prez-border-radius: 0.375rem;
  --prez-font-family: system-ui, sans-serif;
  --prez-font-size: 0.875rem;
  --prez-background: white;
  --prez-text: #1f2937;
  --prez-text-muted: #6b7280;
}
```

---

## Part 3: Share Page

### 3.1 Page Structure

**Route:** `/share`

**Sections:**
1. Introduction - What sharing means, who it's for
2. Vocabulary List - All available vocabularies with export links
3. Quick Start - Code snippets for common use cases
4. Documentation - Detailed API reference

### 3.2 Wireframe

```
┌─────────────────────────────────────────────────────────────┐
│  Share Your Vocabularies                                     │
│  ─────────────────────────────────────────────────────────  │
│  Download vocabularies in standard formats or embed them     │
│  directly in your applications using our web components.     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ 🔍 Search vocabularies...                               ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Alteration Types                              42 concepts││
│  │ Types of geological alteration                          ││
│  │                                                          ││
│  │ Download: [TTL] [JSON] [JSON-LD] [RDF/XML] [CSV]        ││
│  │ Embed:    [Copy Code ▼]                                 ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Geological Units                             156 concepts││
│  │ Classification of geological units                       ││
│  │                                                          ││
│  │ Download: [TTL] [JSON] [JSON-LD] [RDF/XML] [CSV]        ││
│  │ Embed:    [Copy Code ▼]                                 ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
├─────────────────────────────────────────────────────────────┤
│  Quick Start                                                 │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  [Dropdown ▼] [Tree] [List] [Autocomplete]                  │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ <script src="https://vocabs.example.org/               ││
│  │          web-components/prez-lite.min.js">             ││
│  │ </script>                                               ││
│  │                                                          ││
│  │ <prez-vocab-select                                      ││
│  │   vocab="alteration-types"                              ││
│  │   searchable                                            ││
│  │ ></prez-vocab-select>                                   ││
│  │                                          [Copy] [Preview]││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
│  Live Preview:                                               │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ [Rendered web component preview]                        ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 3.3 Individual Vocabulary Share Page

**Route:** `/share/[vocab-name]`

Dedicated page for each vocabulary with:
- Full metadata display
- All download format buttons
- Interactive code generator with options
- Live preview of web component
- Copy buttons for each code snippet
- Framework-specific examples (React, Vue, Angular)

---

## Part 4: Implementation Plan

### Phase 1: Export Infrastructure (Week 1-2)

**Tasks:**

1. **Create export script** (`scripts/export-vocabs.js`)
   - Parse TTL files with n3
   - Generate JSON format for web components
   - Generate JSON-LD with proper context
   - Generate RDF/XML serialization
   - Generate CSV with flattened hierarchy
   - Create annotated TTL with comments

2. **Update build process**
   - Integrate export script into `build-data.js`
   - Generate manifest `index.json`
   - Copy exports to `public/export/`

3. **Add HTTP headers config**
   - Configure proper MIME types
   - Add CORS headers for cross-origin fetch
   - Add content-disposition for downloads

**Deliverables:**
- [ ] `scripts/export-vocabs.js`
- [ ] Updated `scripts/build-data.js`
- [ ] Export manifest generation
- [ ] Nitro config for headers

### Phase 2: Web Components (Week 3-5)

**Tasks:**

1. **Set up web component project**
   - Create `packages/web-components/` directory
   - Configure Lit + TypeScript + Vite
   - Set up build for ES modules + IIFE bundle

2. **Implement core components**
   - `<prez-vocab-select>` - Dropdown with search
   - `<prez-vocab-tree>` - Hierarchical tree
   - `<prez-vocab-list>` - Flat list
   - `<prez-vocab-autocomplete>` - Type-ahead

3. **Implement styling system**
   - CSS custom properties for theming
   - Light/dark mode support
   - Responsive design

4. **Testing**
   - Unit tests with Web Test Runner
   - Visual regression tests
   - Cross-browser testing

5. **Bundle and integrate**
   - Build optimized bundles
   - Copy to `public/web-components/`
   - Generate TypeScript declarations

**Deliverables:**
- [ ] `packages/web-components/` project
- [ ] 4 core web components
- [ ] Bundled output in `public/web-components/`
- [ ] Component documentation

### Phase 3: Share Pages (Week 6-7)

**Tasks:**

1. **Create share index page** (`/share`)
   - Vocabulary listing with search
   - Download buttons for each format
   - Embed code snippets

2. **Create vocabulary share page** (`/share/[vocab]`)
   - Full vocabulary details
   - Interactive code generator
   - Live preview
   - Framework examples

3. **Code generator component**
   - Options panel (component type, attributes)
   - Live code preview
   - Copy to clipboard
   - Syntax highlighting

4. **Preview component**
   - Sandboxed iframe preview
   - Real-time updates as options change

**Deliverables:**
- [ ] `/share` page
- [ ] `/share/[vocab]` dynamic page
- [ ] Code generator component
- [ ] Preview sandbox component

### Phase 4: Documentation & Polish (Week 8)

**Tasks:**

1. **Documentation**
   - API reference for all components
   - Integration guides (React, Vue, Angular, vanilla)
   - Troubleshooting guide

2. **Examples**
   - Working CodePen/JSFiddle examples
   - Framework-specific repos

3. **Polish**
   - Error handling improvements
   - Loading states
   - Accessibility audit
   - Performance optimization

**Deliverables:**
- [ ] Documentation in `/content/docs/`
- [ ] External examples
- [ ] Accessibility report

---

## Technical Specifications

### Dependencies to Add

```json
{
  "devDependencies": {
    "lit": "^3.1.0",
    "n3": "^1.17.0",
    "jsonld": "^8.3.0",
    "fast-csv": "^5.0.0",
    "vite": "^5.0.0",
    "@web/test-runner": "^0.18.0"
  }
}
```

### Monorepo Structure

```
prez-lite/
├── web/                      # Nuxt layer (extended by organizations)
│   └── public/
│       └── web-components/   # Pre-built components (output from packages/)
│           ├── prez-lite.min.js
│           └── prez-vocab.min.css
├── packages/
│   └── web-components/       # Web component SOURCE (organizations don't touch this)
│       ├── src/
│       │   ├── components/
│       │   │   ├── vocab-select.ts
│       │   │   ├── vocab-tree.ts
│       │   │   ├── vocab-list.ts
│       │   │   └── vocab-autocomplete.ts
│       │   ├── utils/
│       │   │   ├── fetch-vocab.ts
│       │   │   └── tree-utils.ts
│       │   ├── styles/
│       │   │   └── base.css
│       │   └── index.ts
│       ├── package.json
│       ├── vite.config.ts
│       └── tsconfig.json
├── template/                 # Minimal starter for organizations
├── scripts/
│   ├── build-data.js
│   ├── export-vocabs.js      # New
│   └── build-web-components.js  # Builds packages/ → web/public/web-components/
└── package.json              # Workspace root
```

**Note:** Organizations extending prez-lite via Nuxt layers receive the pre-built web components automatically in `web/public/web-components/`. The `packages/` folder is only used within prez-lite itself to build the components.

### Build Integration

Update `package.json` scripts:

```json
{
  "scripts": {
    "build": "pnpm build:data && pnpm build:components && pnpm build:web",
    "build:data": "node scripts/build-data.js && node scripts/export-vocabs.js",
    "build:components": "pnpm --filter @prez-lite/web-components build",
    "build:web": "nuxt generate"
  }
}
```

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Bundle size (all components) | < 20KB gzipped |
| Time to first render | < 100ms |
| Lighthouse accessibility | 100 |
| Browser support | Chrome, Firefox, Safari, Edge (latest 2) |
| Export format accuracy | 100% round-trip compatible |

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Large vocab performance | Medium | High | Virtualized lists, lazy loading |
| Cross-origin issues | Medium | Medium | CORS config, fallback messaging |
| Browser compatibility | Low | Medium | Polyfills, progressive enhancement |
| Bundle size creep | Medium | Low | Tree-shaking, code splitting |

---

## Timeline Summary

| Phase | Duration | Milestone |
|-------|----------|-----------|
| Phase 1: Exports | 2 weeks | All formats generated at build |
| Phase 2: Components | 3 weeks | 4 web components working |
| Phase 3: Share Pages | 2 weeks | Share UI complete |
| Phase 4: Polish | 1 week | Documentation & examples |
| **Total** | **8 weeks** | Full feature release |

---

## Next Steps

1. Review and approve this proposal
2. Create GitHub issues for each phase
3. Set up web-components package structure
4. Begin Phase 1 implementation

---

## Appendix: Example Integration Code

### React Integration

```jsx
import { useEffect, useRef } from 'react'
// Note: In React, base-url must be set explicitly since the script is bundled
import '@prez-lite/web-components'

function VocabSelect({ vocab, baseUrl, onChange }) {
  const ref = useRef()

  useEffect(() => {
    const handleChange = (e) => onChange(e.detail)
    ref.current?.addEventListener('prez-change', handleChange)
    return () => ref.current?.removeEventListener('prez-change', handleChange)
  }, [onChange])

  return (
    <prez-vocab-select
      ref={ref}
      vocab={vocab}
      base-url={baseUrl}
      searchable
    />
  )
}
```

### Vue Integration

```vue
<script setup>
// Note: In Vue, base-url must be set explicitly since the script is bundled
import '@prez-lite/web-components'

const props = defineProps<{ baseUrl: string }>()
const selected = ref(null)

function handleChange(event) {
  selected.value = event.detail.value
}
</script>

<template>
  <prez-vocab-select
    vocab="alteration-types"
    :base-url="baseUrl"
    searchable
    @prez-change="handleChange"
  />
</template>
```

### Angular Integration

```typescript
import { Component, CUSTOM_ELEMENTS_SCHEMA, Input } from '@angular/core'
import '@prez-lite/web-components'

// Note: In Angular, base-url must be set explicitly since the script is bundled
@Component({
  selector: 'app-vocab-picker',
  template: `
    <prez-vocab-select
      vocab="alteration-types"
      [attr.base-url]="baseUrl"
      searchable
      (prez-change)="onSelect($event)"
    ></prez-vocab-select>
  `,
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class VocabPickerComponent {
  @Input() baseUrl: string = ''

  onSelect(event: CustomEvent) {
    console.log('Selected:', event.detail)
  }
}
```

### Plain HTML (simplest - auto-detection works)

```html
<!-- base-url auto-detected from script src -->
<script src="https://vocabs.gswa.gov.au/web-components/prez-lite.min.js"></script>
<prez-vocab-select vocab="alteration-types" searchable></prez-vocab-select>
```
