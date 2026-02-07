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

Embed vocabulary lists directly in any web application using our custom element.

### Available Component

| Tag | Description |
|-----|-------------|
| `<prez-list>` | Interactive vocabulary list with multiple display modes (tree, dropdown, radio, table) |

[View Component Documentation →](/share/components/list)

### Quick Start

```html
<script src="https://your-site.com/web-components/prez-vocab.min.js" type="module"></script>

<prez-list vocab="your-vocab-slug"></prez-list>
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
