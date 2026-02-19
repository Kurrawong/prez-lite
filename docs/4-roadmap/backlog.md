---
title: Backlog
status: current
updated: 2025-02-08
---

# Backlog

> Prioritized future work items.

## High Priority

### GitHub Templates Finalization

Templates now live in `packages/gh-templates/`:

- **Update default template**: Sync with recent data-processing changes
- **GitHub Actions**: Create reusable actions for data processing and deployment
- **Deployment targets**: Support GitHub Pages, Azure, AWS, Cloudflare
- **Catalog template**: Create `gh-templates/catalog/` for vocab + data catalogs
- **Spatial template**: Create `gh-templates/spatial/` for vocab + maps
- **Documentation**: Getting started guide for each template variant

### Profile System Enhancements

- **Listing Profiles**: Add `prez:ListingProfile` support for collection views
- **Multiple Profiles per Class**: Support default/full/minimal profiles
- **Property Inclusion Logic**: `sh:minCount`, `sh:maxCount` for optional/excluded properties
- **Profile Validation**: SHACL validation for created profiles

### Profile Helper UX

- **Drag-drop reordering**: Replace up/down arrows with drag handles
- **Namespace visibility**: Show `prefix:localName` format prominently
- **Contextual help**: Explain how source predicates work
- **Stepped wizard**: Progressive disclosure for complex forms
- **Property grouping**: Group by namespace in picker

### Web Components

- **prez-select**: Dropdown concept selector
- **prez-tree**: Hierarchy browser
- **prez-autocomplete**: Search with suggestions
- **Theming**: CSS custom properties for styling
- **Events**: Standard event API (change, load, error)

---

## Medium Priority

### Catalog Support (Phase 4)

- **Multi-catalog manifest**: Support multiple catalogs in manifest
- **Catalog listing page**: `/catalogs` route
- **Catalog detail page**: `/catalogs/{id}` route
- **URL restructure**: OGC-style URLs (`/catalogs/{id}/collections/{id}/items/{id}`)

### Non-SKOS Support

- **DCAT datasets**: Render `dcat:Dataset` items
- **Schema.org types**: Support `schema:Organization`, etc.
- **Geographic features**: `geo:Feature` with geometry display
- **Generic item renderer**: Profile-driven rendering for any type

### Developer Experience

- **GitHub template repo**: One-click organization setup
- **GitHub Actions**: Reusable actions for build/deploy
- **Example directory**: Working demo with test vocabulary
- **API documentation**: Generated from TypeScript

---

## Low Priority

### Future Features

- **Mapping visualization**: Show SKOS mappings between vocabularies
- **Version history**: Track vocabulary changes over time
- **Import from SPARQL**: Fetch vocabularies from existing endpoints
- **Collaborative editing**: Multi-user vocabulary authoring

### Performance

- **Chunked loading**: Lazy-load concept tree branches
- **Search sharding**: Split large search indexes
- **Pre-rendering**: Generate HTML for individual concepts
- **Service worker**: Offline support

### Spatial Features

- **Map widget**: Display geographic concepts on map
- **Spatial search**: Filter by bounding box
- **Geohash indexing**: Efficient spatial queries

---

## Technical Debt

- **Profile parser**: Extend to support full SHACL paths
- **Web component build**: Automate copy to public directory
- **Test coverage**: Add unit tests for composables
- **E2E tests**: Playwright tests for key flows

---

## Won't Do (for now)

- **Runtime SPARQL**: Against static-first principle
- **Server-side search**: Prefer client-side for simplicity
- **npm publishing**: GitHub layers work well
- **i18n**: Not enough demand yet

---

## How to Add Items

When adding to backlog:
1. Categorize by priority (High/Medium/Low)
2. Add brief description
3. Link to related docs if complex
4. Note any dependencies or blockers

When completing items:
1. Move to [Changelog](CHANGELOG.md)
2. Update [Current](current.md) if affects active work
3. Update [Milestones](milestones.md) if phase-related
