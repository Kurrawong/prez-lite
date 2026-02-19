---
title: Features Overview
status: current
updated: 2025-02-08
---

# Features Overview

> Complete feature inventory organized by capability area.

## Feature Map

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           PREZ-LITE FEATURES                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────┐ │
│  │   DATA PROCESSING   │  │    UI RENDERING     │  │   NAVIGATION    │ │
│  ├─────────────────────┤  ├─────────────────────┤  ├─────────────────┤ │
│  │ • TTL Parsing       │  │ • Vocabulary Cards  │  │ • Route Pages   │ │
│  │ • SHACL Profiles    │  │ • Concept Tree      │  │ • Query Params  │ │
│  │ • Label Resolution  │  │ • Property Tables   │  │ • Breadcrumbs   │ │
│  │ • Multi-format      │  │ • Inline Panels     │  │ • Back Links    │ │
│  │   Export (9 types)  │  │ • Dark Mode         │  │ • URL Sync      │ │
│  │ • Search Indexing   │  │ • Responsive        │  │                 │ │
│  └─────────────────────┘  └─────────────────────┘  └─────────────────┘ │
│                                                                         │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────┐ │
│  │      SEARCH         │  │      SHARING        │  │    AUTHORING    │ │
│  ├─────────────────────┤  ├─────────────────────┤  ├─────────────────┤ │
│  │ • Full-text (Orama) │  │ • Download Formats  │  │ • Profile Helper│ │
│  │ • Vocab Facets      │  │ • Web Components    │  │ • TTL Editor    │ │
│  │ • Publisher Facets  │  │ • Embed Preview     │  │ • Validation    │ │
│  │ • Pagination        │  │ • Code Generator    │  │ • Property Pick │ │
│  │ • Debounced Input   │  │ • URL Copying       │  │                 │ │
│  └─────────────────────┘  └─────────────────────┘  └─────────────────┘ │
│                                                                         │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────┐ │
│  │  WEB COMPONENTS     │  │   CONTENT SYSTEM    │  │    DEPLOYMENT   │ │
│  ├─────────────────────┤  ├─────────────────────┤  ├─────────────────┤ │
│  │ • prez-list         │  │ • Markdown Pages    │  │ • Static SSG    │ │
│  │   - select mode     │  │ • MDC Components    │  │ • GitHub Pages  │ │
│  │   - dropdown mode   │  │ • Navigation Auto   │  │ • Nuxt Layers   │ │
│  │   - radio mode      │  │ • Mermaid Diagrams  │  │ • Pre-built     │ │
│  │   - table mode      │  │ • Frontmatter       │  │   Assets        │ │
│  │ • Search/Filter     │  │                     │  │                 │ │
│  │ • Multi-select      │  │                     │  │                 │ │
│  └─────────────────────┘  └─────────────────────┘  └─────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Feature Categories

### [Vocabulary Browsing](vocabulary-browsing.md)
Core browsing experience for SKOS vocabularies.

| Feature | Description |
|---------|-------------|
| Vocabulary List | Cards/table views with search, sorting, pagination |
| Scheme Detail | Metadata, concept tree, inline panel |
| Concept Detail | Properties, relationships, mappings, notes |
| Tree Navigation | Expand/collapse, search filter, select |

### [Search](search.md)
Full-text search across all vocabulary content.

| Feature | Description |
|---------|-------------|
| Orama Engine | Fast client-side full-text search |
| Faceted Filters | Filter by vocabulary, publisher |
| Pagination | Configurable results per page |
| URL Sync | Shareable search URLs |

### [Sharing & Export](sharing.md)
Machine-readable exports and embeddable components.

| Feature | Description |
|---------|-------------|
| 9 Export Formats | TTL, JSON-LD, RDF/XML, CSV, HTML, annotated variants |
| Web Components | Embeddable `<prez-list>` with multiple display modes |
| Share Pages | Per-vocabulary download and embed pages |
| Code Generator | Interactive embed code builder |

### [Profile System](authoring.md)
SHACL-based configuration for rendering and export.

| Feature | Description |
|---------|-------------|
| Profile Helper | Visual builder and TTL editor |
| Validation | Real-time syntax and structure checking |
| Source Predicates | Configure label/description sources |
| Generation Flags | Control output annotations |

### [Data Processing](../5-technical/data-pipeline.md)
Build-time vocabulary processing.

| Feature | Description |
|---------|-------------|
| TTL Parsing | N3.js-based RDF processing |
| Label Resolution | Background vocabulary labels |
| Multi-format Export | 9 output format generators |
| Search Indexing | Orama index generation |

### [Content System](content-system.md)
Markdown-based content pages.

| Feature | Description |
|---------|-------------|
| Nuxt Content | Markdown parsing with MDC |
| Navigation | Automatic nav from frontmatter |
| Mermaid | Diagram support |
| Custom Pages | Home, About, etc. |

---

## Feature Status

| Category | Complete | In Progress | Planned |
|----------|----------|-------------|---------|
| Vocabulary Browsing | 95% | 5% | - |
| Search | 100% | - | - |
| Sharing & Export | 90% | 10% | - |
| Profile System | 70% | 20% | 10% |
| Data Processing | 100% | - | - |
| Content System | 80% | 10% | 10% |
| **Overall** | **89%** | **8%** | **3%** |

---

## Pages Summary

| Route | Purpose | Status |
|-------|---------|--------|
| `/` | Home (content page) | ✅ |
| `/vocabs` | Vocabulary listing | ✅ |
| `/scheme` | Scheme detail + tree | ✅ |
| `/concept` | Concept detail | ✅ |
| `/search` | Full-text search | ✅ |
| `/share` | Share hub | ✅ |
| `/share/[vocab]` | Per-vocab exports | ✅ |
| `/share/components/[type]` | Component docs | 🔄 |
| `/profile-helper` | Profile builder | ✅ |
| `/about` | About page | ✅ |
