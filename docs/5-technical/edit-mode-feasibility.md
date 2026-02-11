# Edit Mode Feasibility Analysis

**Status:** Complete
**Date:** 2026-02-10
**Task:** Evaluate feasibility of edit mode on existing vocab pages

---

## 1. Current Browse-Mode Data Flow

The vocabulary browse page (`scheme.vue`) loads data through three parallel fetches:

```
URL: /scheme?uri=<IRI>&concept=<IRI>
         │
         ▼
    useScheme(uri)
    ├── fetchSchemes()     → /export/system/vocabularies/index.json
    ├── fetchConcepts()    → /export/{slug}/{slug}-concepts.json
    └── fetchLabels()      → /export/system/labels.json
         │
         ▼
    Tree Building (computed)
    ├── Build narrowerMap from concept.broader[]
    ├── Find top concepts (topConceptOf / no broader)
    └── Recursively build TreeItem{ id, label, children }
         │
         ▼
    ConceptTree + ConceptPanel
    ├── Click tree node → URL query param update
    ├── useConcept(uri) → findConcept() from cached concepts
    └── useAnnotatedProperties(slug, uri) → JSON-LD + profile.json
         │
         ▼
    RichMetadataTable renders RenderedProperty[]
```

**Key data structures:**

| Structure | Source | Purpose |
|-----------|--------|---------|
| `Concept` | `-concepts.json` | Full SKOS properties (prefLabel, broader, narrower, etc.) |
| `TreeItem` | Computed from Concept[] | `{ id, label, children }` for tree rendering |
| `RenderedProperty` | Annotated JSON-LD + profile.json | Profile-ordered properties with labels |
| `LabelsIndex` | `labels.json` | External IRI → label lookup |

**What the browse mode does NOT load:**
- The source TTL file itself
- Properties not present in the data (empty profile fields are skipped)
- Inverse relationships (only forward references stored)

---

## 2. What Changes for Edit Mode

### 2a. Data Requirements

| Requirement | Browse Mode | Edit Mode |
|-------------|-------------|-----------|
| All profile properties (incl. empty) | Only those with values | All ordered properties shown |
| Editable values | Read-only display | Input fields with validation |
| Broader selection | IRI links | Multi-select from concept tree |
| Add/delete concepts | Not supported | Tree manipulation + form |
| Save back to TTL | Not supported | N3 Store → Turtle serialization |
| Background labels | Via labels.json | Via background TTL or labels.json |

### 2b. UI Components Needed

1. **Edit toggle** on scheme.vue — switch between browse/edit modes
2. **Property form** — replace RichMetadataTable with editable form fields
3. **Concept CRUD** — add/rename/delete concepts in tree
4. **Broader picker** — tree-based multi-select for `skos:broader`
5. **Save/discard controls** — serialize N3 Store back to TTL
6. **Dirty state tracking** — warn on unsaved changes

### 2c. Profile-Driven Empty Properties

Currently `extractProperties()` in `annotated-properties.ts` skips properties with no values. For edit mode, the function needs a mode flag to include all ordered properties from `profile.json`:

```typescript
// Current (browse): skip empty
if (!rawValues?.length) continue;

// Edit mode: include ordered properties even if empty
if (!rawValues?.length && !isEditMode) continue;
// When empty + edit mode: push RenderedProperty with values: []
```

This is a small change — the profile already defines the full property list with ordering.

---

## 3. Data Loading Strategies Evaluated

### Strategy A: Source TTL + Background Labels + Profile

**How it works:**
1. Fetch the source `.ttl` file for the vocabulary
2. Parse into an N3 Store (client-side)
3. Load `standard-vocab-labels.ttl` (~4KB) for predicate labels
4. Load `profile.json` for property ordering
5. Extract quads per-concept for form display
6. On save: serialize modified N3 Store back to Turtle

**Pros:**
- Lossless round-trip (source TTL is the canonical format)
- N3.js works in browser (~30KB gzipped)
- Clean separation: source store for editing, background store for labels
- Stateless enrichment — `getLabelFromBackground()` is ~50 lines of pure logic
- Already proven pattern (process-vocab.js does exactly this server-side)

**Cons:**
- Must load full TTL file upfront (could be large for big vocabs)
- Must implement quad → form field mapping (new code)
- Background labels need bundling or separate fetch
- No existing browser-side TTL writer (N3.Writer exists but needs wiring)

**Estimated effort:** Medium — reuse N3.js patterns from data-processing, new form mapping layer

### Strategy B: Annotated TTL/JSON-LD Exports

**How it works:**
1. Fetch `{slug}-anot+ld+json.json` (scheme-level) and per-concept annotated files
2. Display using existing `extractProperties()` pipeline
3. Edit values in JSON-LD structure
4. Serialize back to annotated format, then strip prez:* annotations for source TTL

**Pros:**
- Already loaded in browse mode (no additional fetch for display)
- Labels/descriptions pre-resolved (no background store needed)
- `extractProperties()` already handles all property types

**Cons:**
- **Lossy at concept level** — scheme export strips individual concept data; concept exports are per-file
- Annotated format adds prez:* triples that must be stripped on save
- Round-trip fidelity issues — serializing from JSON-LD back to source TTL may lose ordering, prefixes, comments
- More complex save path (strip annotations → rebuild source TTL)
- Would need to reconcile edits across multiple files

**Verdict:** Not recommended — lossy format, complex save path

### Strategy C: Data Adapter Pattern (Mirror Enrichment Pipeline)

**How it works:**
1. Port key functions from `process-vocab.js` to browser-compatible module
2. Run the enrichment pipeline client-side: `parseTTL → collectIRIs → enrichFromBackground → display`
3. Edit on the enriched store
4. On save: extract only source quads (strip prez:* namespace)

**Pros:**
- Full parity with the build pipeline
- Profile-driven from end to end
- Could share code between build and browser

**Cons:**
- Significant porting effort (~200 lines of enrichment logic + N3 dependencies)
- Overkill for edit mode — we don't need all enrichment features (HTML generation, CSV, per-concept files)
- Adds complexity without clear benefit over Strategy A
- Larger bundle (full pipeline vs minimal TTL parse/write)

**Verdict:** Overengineered for the use case

---

## 4. Recommendation

### Use Strategy A: Source TTL + Background Labels + Profile

**Rationale:**
- Cleanest data path: read source TTL → edit → write source TTL
- N3.js is already a dependency (data-processing package)
- Background labels are tiny (~4KB for standard predicates)
- Profile.json already exists and drives property ordering
- Aligns with the existing GitHub TTL editing feature (Sprint 8 added Monaco editing of raw TTL — this extends it with structured forms)

**Key design decision:** Edit mode operates on a **separate data path** from browse mode. Browse continues using the pre-processed JSON exports. Edit mode loads the source TTL into an N3 Store for structured manipulation.

---

## 5. What Existing Code Can Be Reused vs What's New

### Reusable (as-is or with minor changes)

| Component | File | Reuse |
|-----------|------|-------|
| Tree building | `useScheme.ts` | Tree structure for broader picker |
| Profile ordering | `profile.json` + `annotated-properties.ts` | Property list and ordering |
| SHACL parsing | `shacl-profile-parser.ts` | Profile → property shapes |
| Label resolution | `useVocabData.ts` (resolveLabel) | External IRI labels |
| Concept data types | `useVocabData.ts` (Concept interface) | Type definitions |
| TTL parsing | N3.js (already in deps) | Parse source TTL in browser |
| ConceptTree + Node | Vue components | Browse tree (extend with edit actions) |

### Reusable with modification

| Component | Change Needed |
|-----------|---------------|
| `extractProperties()` | Add `editMode` flag to include empty ordered properties |
| `RichMetadataTable.vue` | Fork or extend with editable variant |
| `ConceptPanel.vue` | Add edit/save toggle, form mode |
| `scheme.vue` | Add edit mode state, concept CRUD controls |
| `useScheme.ts` | Add reactive concept mutations for tree updates |

### New Code Required

| Component | Description | Est. Size |
|-----------|-------------|-----------|
| `useEditMode.ts` | Composable: load source TTL → N3 Store, track dirty state, save | ~200 lines |
| `ConceptForm.vue` | Profile-driven form with inputs for each property type | ~300 lines |
| `BroaderPicker.vue` | Tree-based multi-select for broader concept selection | ~100 lines |
| `ttl-browser.ts` | Browser-friendly N3 Store ↔ form field mapping | ~150 lines |
| Background labels bundle | Pre-merged standard-vocab-labels as importable module | ~4KB |

**Estimated new code: ~750 lines** plus modifications to ~5 existing files.

---

## 6. Architectural Sketch: Edit-Mode Data Flow

```
┌─────────────────────────────────────────────────────────┐
│ scheme.vue (edit mode)                                  │
│                                                         │
│  ┌─────────────┐        ┌──────────────────────┐       │
│  │ ConceptTree  │ select │ ConceptForm          │       │
│  │ (+ CRUD)    │───────▶│ (profile-driven)     │       │
│  │             │        │                      │       │
│  │ [+ Add]     │        │ prefLabel: [input]   │       │
│  │ [× Delete]  │        │ altLabel:  [chips]   │       │
│  │ [↕ Move]    │        │ definition:[text]    │       │
│  └──────┬──────┘        │ broader:   [picker]  │       │
│         │               │ notation:  [input]   │       │
│         │               │ ...empty fields...   │       │
│         │               │                      │       │
│         │               │ [Save] [Discard]     │       │
│         │               └──────────┬───────────┘       │
│         │                          │                    │
│         ▼                          ▼                    │
│  ┌─────────────────────────────────────────────┐       │
│  │ useEditMode()                               │       │
│  │                                             │       │
│  │  sourceStore: N3.Store  ◀── parse(ttl)      │       │
│  │  backgroundStore: N3.Store  ◀── labels.ttl  │       │
│  │  profile: PropertyOrder[]  ◀── profile.json │       │
│  │  dirty: Ref<boolean>                        │       │
│  │                                             │       │
│  │  getConcept(iri) → form fields from quads   │       │
│  │  setConcept(iri, fields) → update quads     │       │
│  │  addConcept(iri) → new quads + tree update  │       │
│  │  deleteConcept(iri) → remove quads          │       │
│  │  serialize() → Turtle string                │       │
│  └─────────────────────────────────────────────┘       │
│                          │                              │
│                          ▼                              │
│                   Save to Git / Download                │
└─────────────────────────────────────────────────────────┘
```

**Data flow on edit:**
1. User clicks concept in tree → `getConcept(iri)` extracts quads from N3 Store
2. Form fields populated from quads, ordered by profile.json
3. Empty profile properties shown with placeholder inputs
4. User edits → `setConcept(iri, fields)` updates quads in store
5. Tree re-derives from modified store (broader changes reflect immediately)
6. On save → `serialize()` writes N3 Store to Turtle string → push to Git or download

**Bidirectional relations:** When `broader` changes on concept A, the inverse `narrower` on concept B is updated automatically by the composable. The tree rebuilds reactively from the store state.

---

## 7. Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Large TTL files slow to parse in browser | UI freeze on load | Web Worker for parsing; show loading state |
| N3.Writer output differs from original formatting | Diff noise in Git | Accept — semantic equivalence is sufficient |
| Concurrent edits (multi-user) | Data loss | Out of scope for v1; Git branching handles this |
| Profile mismatch between build/edit | Wrong fields shown | Both paths read same `profile.json` |
| Complex nested properties (prov:qualifiedAttribution) | Hard to edit | Start with flat properties; add nested forms later |

---

## 8. Phasing Suggestion

**Phase 1 — Read source TTL in browser, display as form**
- `useEditMode.ts` with N3.js parsing
- Profile-driven form fields (including empty)
- Read-only first, validate data round-trip

**Phase 2 — Edit and save concept properties**
- Editable form fields with type-appropriate inputs
- Dirty state tracking
- Serialize back to TTL

**Phase 3 — Tree manipulation (add/delete/move concepts)**
- Concept CRUD with bidirectional relation updates
- Broader picker component

**Phase 4 — Persistence (Git integration)**
- Save TTL to GitHub via existing OAuth flow
- Re-run data-processing pipeline after save
