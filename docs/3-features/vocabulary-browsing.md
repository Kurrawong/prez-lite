---
title: Vocabulary Browsing
status: current
updated: 2025-02-08
---

# Vocabulary Browsing

> Core features for exploring SKOS vocabularies.

## Vocabulary List (`/vocabs`)

Browse all published vocabularies with rich filtering and display options.

### View Modes

| Mode | Description |
|------|-------------|
| **Cards** | Grid of vocabulary cards with metadata |
| **Table** | Sortable columns with compact display |

### Filtering & Sorting

| Feature | Options |
|---------|---------|
| **Search** | Filter by vocabulary name |
| **Sort By** | Name (A-Z, Z-A), Modified date, Concept count |
| **Pagination** | 12, 24, 48 items per page |

### Card Display

Each vocabulary card shows:
- **Label** - Preferred label
- **Description** - Definition (truncated)
- **Concept Count** - Badge with number of concepts
- **Version** - Version badge if available
- **Modified** - Last modified date

### Implementation

- **Page**: `web/app/pages/vocabs.vue`
- **Composable**: `useVocabs.ts`
- **Data**: `schemes.json` or vocabulary metadata index

---

## Scheme Detail (`/scheme?uri=...`)

View a vocabulary scheme with its concept hierarchy.

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Title                                           [IRI]      │
├─────────────────────────────────────────────────────────────┤
│  Description (expandable with "Show more")                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────┐  ┌─────────────────────────┐  │
│  │     Concept Tree        │  │    Inline Concept       │  │
│  │                         │  │       Panel             │  │
│  │  ▶ Top Concept 1        │  │                         │  │
│  │    ▶ Child 1.1          │  │  [Selected concept      │  │
│  │    ▼ Child 1.2          │  │   details shown here]   │  │
│  │      • Grandchild       │  │                         │  │
│  │  ▶ Top Concept 2        │  │                         │  │
│  │                         │  │                         │  │
│  └─────────────────────────┘  └─────────────────────────┘  │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  Metadata Table (version, dates, creator, publisher)        │
└─────────────────────────────────────────────────────────────┘
```

### Concept Tree Features

| Feature | Description |
|---------|-------------|
| **Expand/Collapse** | Click arrows to show/hide children |
| **Expand All** | Button to expand entire tree |
| **Collapse All** | Button to collapse to top level |
| **Search Filter** | Filter concepts by label |
| **Selection** | Click concept to show in panel |
| **Navigate** | Click title in panel for full page |

### URL Sync

Tree selection syncs to URL:
```
/scheme?uri=<scheme>&concept=<conceptIri>
```

Enables shareable links to specific concepts within a scheme.

### Metadata Table

Uses `RichMetadataTable` component for profile-driven property rendering:
- Version, status
- Created/modified dates
- Creator, publisher (with resolved labels)
- Concept count
- Other metadata from profile

### Implementation

- **Page**: `web/app/pages/scheme.vue`
- **Components**: `ConceptTree.vue`, `ConceptTreeNode.vue`, `ConceptPanel.vue`
- **Composable**: `useScheme.ts`

---

## Concept Detail (`/concept?uri=...`)

Full detail view for an individual concept.

### Sections

| Section | Properties |
|---------|------------|
| **Header** | Label, IRI, notation, status |
| **Definitions** | skos:definition, descriptions |
| **Hierarchy** | Broader, narrower concepts with icons |
| **Relationships** | Related concepts |
| **Mappings** | exactMatch, closeMatch, broadMatch, narrowMatch, relatedMatch |
| **Notes** | History, scope, example, change, editorial notes |
| **Citations** | References and links |
| **Properties** | Other properties from profile |

### Relationship Icons

| Relationship | Icon | Color |
|--------------|------|-------|
| Broader | ↑ | Default |
| Narrower | ↓ | Default |
| Related | ↔ | Default |
| Exact Match | = | Success |
| Close Match | ≈ | Info |
| Broad/Narrow Match | ↑↓ | Warning |

### Navigation

- **Breadcrumbs** - Path back to scheme
- **Back Link** - Return to previous view
- **IRI Links** - Click related concepts to navigate

### Implementation

- **Page**: `web/app/pages/concept.vue`
- **Component**: `RichMetadataTable.vue`
- **Composable**: `useConcept.ts`

---

## Property Rendering

The `RichMetadataTable` component provides profile-driven property display.

### Features

| Feature | Description |
|---------|-------------|
| **IRI Resolution** | IRIs rendered as links with resolved labels |
| **Language Tags** | Multi-language values with tag display |
| **Nested Structures** | Blank nodes rendered with nested tables |
| **Grouping** | Multi-value properties grouped in single row |
| **Ordering** | Properties ordered per profile specification |

### Supported Types

- Literals (strings, dates, numbers)
- IRIs (with label lookup)
- Language-tagged strings
- Blank nodes (nested rendering)
- Lists and collections
