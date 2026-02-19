---
title: Milestones
status: current
updated: 2025-02-08
---

# Milestones

> Major releases and goals for prez-lite.

## Phase 1: Core Browser ✅

*Completed: February 2025*

The foundation: a working vocabulary browser with search and navigation.

- [x] Vocabulary listing with cards/table views
- [x] Scheme detail with concept tree
- [x] Concept detail with properties, relationships, mappings
- [x] Full-text search (Orama engine)
- [x] Faceted filtering (vocabulary, publisher)
- [x] Content pages via Nuxt Content
- [x] Dark mode support
- [x] Responsive design

## Phase 2: Sharing ✅

*Completed: February 2025*

Machine-readable exports and embeddable components.

- [x] 9 export formats (TTL, JSON-LD, RDF/XML, CSV, HTML, annotated variants)
- [x] Share pages with downloads and preview
- [x] `<prez-list>` web component with 4 display modes
- [x] Interactive embed code generator
- [x] Export manifest and API access
- [x] Pre-built search index

## Phase 3: Authoring 🔄

*In Progress: February 2025*

Profile editing and vocabulary authoring tools.

- [x] Profile Helper page with builder/editor modes
- [x] Real-time validation
- [x] Source predicate management
- [x] Generation flags configuration
- [ ] UX improvements (drag-drop, contextual help)
- [ ] Listing profile support
- [ ] Vocabulary editing with profile-driven forms

## Phase 4: Data Processing ✅

*Completed: February 2025*

Robust build pipeline for vocabulary processing.

- [x] Multi-script processing pipeline
- [x] SHACL profile-driven extraction
- [x] Background label resolution
- [x] Search index generation (Orama)
- [x] Multi-format export generation
- [x] Per-vocabulary metadata and profiles

## Phase 5: Beyond Vocabularies 📋

*Planned: 2025*

Support the full Prez data model.

- [ ] Multi-catalog support
- [ ] DCAT dataset rendering
- [ ] Generic item rendering
- [ ] Catalog management UI
- [ ] URL restructure for catalogs

---

## Feature Completion

| Category | Status |
|----------|--------|
| Vocabulary Browsing | 95% |
| Search | 100% |
| Sharing & Export | 95% |
| Profile System | 75% |
| Data Processing | 100% |
| Content System | 85% |
| **Overall** | **~90%** |

---

## Current Focus

**Profile Helper UX** - Improving the authoring experience:
- Drag-drop property reordering
- Namespace visibility in property picker
- Contextual help and descriptions
- Stepped wizard approach

---

## Future Ideas 💡

- **Mapping visualization** - Show SKOS mappings between vocabularies
- **Spatial/geographic features** - Map-based browsing
- **Custom widgets system** - Pluggable property renderers
- **Collaborative editing** - Multi-user vocabulary authoring
- **Version history** - Track vocabulary changes
- **Import from SPARQL** - Fetch from existing endpoints

---

## Success Criteria

### Complete When:
- [x] Organizations can deploy with minimal config
- [x] All 9 export formats work correctly
- [x] Web components work in any HTML page
- [x] Share page provides working code snippets
- [x] Search is fast and accurate
- [ ] Profile Helper supports all profile features
