---
title: SHACL UI / Form Generation — Library Evaluation
status: complete
updated: 2026-02-16
---

# SHACL UI / Form Generation — Library Evaluation

> Research into SHACL-driven form generation for vocabulary editing.

## Context

prez-lite's authoring mode needs form generation driven by SHACL shapes (cardinality, datatypes, widget selection). This document captures the evaluation of existing libraries and the recommended approach.

## Libraries Evaluated

### Kurrawong `shacl-ui` (Internal)

Vue 3 + TypeScript form editor maintained by Kurrawong.

**Capabilities:**
- Parses SHACL shapes to extract constraints and score widgets
- Uses DASH vocabulary for widget types (`dash:TextFieldEditor`, `dash:DatePickerEditor`, `dash:BooleanSelectEditor`, etc.)
- Tracks changes as RDF patches (deleted + added quads)
- Supports `sh:group` + `sh:order` for layout, `sh:minCount`/`sh:maxCount` for cardinality
- AutoComplete editors for IRI fields (local N3 store or remote SPARQL)

**Companion: `shacl-ui-widget-scoring`** — formalises widget selection as RDF vocabulary (`shui:`) where each `shui:Score` links a widget to conditions on data and shape; numeric scores determine precedence. The spec is data, not code.

**Portability assessment — cannot `npm install` directly because:**
- Core SHACL parsing entangled with `grapoi`, `rdf-ext`, `shacl-engine`, `@comunica/query-sparql`
- ~3–5 MB transitive dependencies
- Vue components use PrimeVue, not Nuxt UI
- No published npm package with clean API boundary

**Worth porting (small, reusable pieces):**
1. Widget scoring logic (~300 lines) — pure functions mapping RDF term + constraints to DASH widget types
2. Constraint extraction pattern — walks `sh:property` to build predicate → constraints map
3. DASH widget vocabulary — standard widget type IRIs as shared language between shapes and UI
4. Editor component pattern — each editor is 30–90 lines; Nuxt UI components serve as equivalent references

### @ulb-darmstadt/shacl-form (Third-Party)

Web component, actively maintained (v3.0.1).

**Assessment: Not recommended.** Integration cost too high for prez-lite's use case:
- Would lose GitHub-based read/save workflow (TTL via GitHub API, subject-block patching, minimal diffs)
- Would lose profile-driven property ordering (separate from validator shapes)
- Would lose custom field types (BroaderPicker with concept tree search, IRI picker)
- Would lose inline table editing mode and change summary / diff view before save
- Assumes it owns the full form lifecycle; prez-lite has a richer pipeline around that core

## Recommended Approach

### Path A: Keep Custom, Add SHACL-LD Export (Recommended)

- Export validator shapes as JSON-LD at build time (`constraints.jsonld`)
- Frontend loads it and extracts `sh:message` for descriptions, `sh:datatype` for widget hints, `sh:minCount`/`sh:maxCount` for validation
- Minimal change, keeps full control over form UX
- **Status: Implemented** — `constraints.jsonld` exported by data-processing pipeline

### Path B: Adopt shacl-ui as Form Engine (Future Option)

- Replace custom `ConceptForm`/`InlineEditTable` with shacl-ui components
- SHACL shapes drive both validation and form generation
- Add `dash:editor` hints to profiles or validator shapes for widget selection
- GitHub save workflow stays custom (shacl-ui outputs RDF patches → adapt to TTL subject-block patching)
- More work upfront but eliminates maintenance of custom form code
- Requires extracting shacl-ui core parsing into standalone N3.js-compatible package

## Implementation Status

| Step | Status |
|------|--------|
| Cardinality extraction (`parseValidatorCardinality`) | Done |
| Cardinality in profile.json (minCount/maxCount) | Done |
| UI enforcement (add/remove button guards) | Done |
| Full constraints export (`constraints.jsonld`) | Done |
| Frontend consumption of constraints.jsonld | Not started |
| DASH widget scoring integration | Not started |

## Key Design Decisions

**Dual sources of truth resolved:**
- `vocabs.ttl` (validator) — single source of truth for data constraints
- `profile.json` / `constraints.jsonld` — derived caches for frontend consumption
- Validator TTL is a build-time artifact, never ships to client directly

**Why not runtime SHACL parsing:**
- Would require N3.js + SHACL graph walking in the browser
- Unnecessary weight and complexity for a static-first architecture
- Build-time extraction keeps the frontend lean
