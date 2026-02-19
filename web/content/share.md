---
title: Share
description: Download vocabularies and embed interactive components
navigation: true
navTitle: Share
order: 3
---

# Share Vocabularies

Download vocabularies in multiple formats or embed interactive components in your applications.

[Browse Downloads](/share)

---

## Export Formats

Every vocabulary is automatically exported in multiple formats:

| Format | Extension | Use Case |
|--------|-----------|----------|
| Turtle | `.ttl` | RDF tools, SPARQL endpoints |
| JSON-LD | `.jsonld` | Linked Data applications |
| JSON | `.json` | Web apps, JavaScript |
| RDF/XML | `.rdf` | Legacy RDF tools |
| CSV | `.csv` | Spreadsheets, data import |

---

## Embeddable Web Components

Add vocabulary selection to any web page with the `<prez-list>` custom element.

```html
<script src="https://your-site.com/web-components/prez-lite.min.js" type="module"></script>

<prez-list vocab="your-vocab-slug"></prez-list>
```

Display modes: **tree**, **dropdown**, **radio buttons**, **table**.

Components fetch their own data — no backend integration needed.

[View component documentation](/share/components/list)
