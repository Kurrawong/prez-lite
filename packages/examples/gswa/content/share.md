---
title: Share
description: Download vocabularies and embed interactive components
navigation: true
navTitle: Share
order: 3
---

# Share Vocabularies

Download vocabularies in multiple formats or embed interactive selection components in your applications.

[Browse Vocabularies & Downloads →](/share)

---

## Web Components

Embed vocabulary selection directly in any web application using our custom elements.

### Available Components

| Component | Tag | Description |
|-----------|-----|-------------|
| **Select** | `<prez-vocab-select>` | Dropdown menu for single/multiple selection |
| **Tree** | `<prez-vocab-tree>` | Hierarchical tree view with expand/collapse |
| **List** | `<prez-vocab-list>` | Flat searchable list with filtering |
| **Autocomplete** | `<prez-vocab-autocomplete>` | Typeahead search with suggestions |

[View Component Documentation →](/share/components/select)

### Quick Start

```html
<script src="https://your-site.com/web-components/prez-vocab.min.js" type="module"></script>

<prez-vocab-select vocab="your-vocab-slug"></prez-vocab-select>
```

Components automatically resolve vocabulary data from the script's origin.

---

## Export Formats

All vocabularies available in multiple formats:

| Format | Extension | Use Case |
|--------|-----------|----------|
| Turtle | `.ttl` | RDF tools, SPARQL |
| JSON | `.json` | Web components, JavaScript |
| JSON-LD | `.jsonld` | Linked Data applications |
| RDF/XML | `.rdf` | Legacy RDF tools |
| CSV | `.csv` | Spreadsheets, data import |

[Download Vocabularies →](/share)
