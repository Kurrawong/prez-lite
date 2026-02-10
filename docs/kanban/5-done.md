# Done

---

## Sprint 7: Export Cleanup & Share Page Fixes

### ✅ Trim concept data from vocab-level exports
**Completed:** 2026-02-10

**Summary:** Removed concept data from vocab-level export stores (turtle, JSON-LD, RDF/XML, annotated variants). Added `sh:property` shapes to ConceptScheme profiles. Created HTML-specific store so HTML pages remain self-contained. Fixed share page download links (`format.extension` → `format.id` lookup). Removed `-list.json`/`-list.csv` duplicates, aligned web component to fetch `-concepts.json`.

**Files Modified:**
- `web/public/data/profiles.ttl` — added sh:property shapes + new prefixes
- `web/public/sample-data/profiles.ttl` — same
- `packages/gh-templates/default/public/data/profiles.ttl` — same
- `packages/data-processing/scripts/process-vocab.js` — removed concept data from stores, HTML-only store, removed -list duplicates
- `packages/web-components/src/utils/base-url.ts` — `-list.json` → `-concepts.json`
- `web/app/composables/useShare.ts` — id-only lookup
- `web/app/pages/share/[vocab].vue` — `format.id`, better labels
- `web/app/pages/share/index.vue` — `format.id`

### ✅ Add export format preview on share pages
**Completed:** 2026-02-10

**Summary:** Added preview system on both vocab and concept share pages with Source/Rendered view mode toggle. Vocab page: each format has Preview button with mode-specific rendering — HTML shows iframe (Rendered), JSON/JSON-LD show expandable tree (Tree), CSV shows sortable table (Table), all show raw source (Source). Concept page: Source/Tree toggle for annotated JSON-LD. Created recursive `ShareJsonTreeNode` component for JSON tree rendering. Truncation limit increased to 200KB.

**Files Modified:**
- `web/app/pages/share/[vocab].vue` — preview state, view modes, CSV parser, JSON tree, HTML iframe, CSV table
- `web/app/pages/share/concept.vue` — Source/Tree toggle, JSON tree view
- `web/app/components/share/JsonTreeNode.vue` — new recursive JSON tree component

### ✅ Fix comma-separated literal display formatting
**Completed:** 2026-02-10

**Summary:** Multi-valued literal properties (e.g. altLabels) rendered vertically because each value was wrapped in `class="flex"` (block-level). Split rendering: literals with datatype badges keep `flex justify-between`, plain literals use inline `<span>`. Both top-level and nested value contexts fixed.

**Files Modified:**
- `web/app/components/RichMetadataTable.vue` — inline rendering for plain literals, flex only for datatype badge rows

---

## Previous Sprints

Sprint 1-6 items archived to `9-archive.md`.

