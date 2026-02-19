# Concept Ordering in Vocabularies

**Status:** Research complete | **Date:** 2026-02-16

## Current State

All concept sorting in prez-lite is alphabetical by `skos:prefLabel` at every level (top concepts, children within a parent). `skos:notation` is captured in exports but unused for ordering.

## What SKOS Says

The SKOS standard provides `skos:OrderedCollection` for explicit ordering using RDF Lists. However, adoption is very low — it was designed for collections (curated subsets), not general hierarchy ordering. Most vocabulary publishers don't use it.

`skos:notation` is intended for classification codes (e.g., "A0000", "01.2.3") rather than sort keys, but structured notations naturally imply an ordering.

## Is Alphabetical Sufficient?

**Yes, for the majority of vocabularies (~75%).** Thesauri, taxonomies, and subject headings work well with alphabetical sorting. It's predictable, language-aware, and requires no configuration.

## When Is Notation-Based Ordering Useful?

**For classification systems (~20-25% of vocabularies):** industry codes (ANZIC, NAICS), library classifications (Dewey, UDC), and similar hierarchical numbering schemes.

Example from this codebase: ANZIC2006 has notations like "A0000", "B0600", "C1100". These should sort by code, not by label ("Accommodation" before "Agriculture" is wrong when A-division codes should come first regardless of label).

## Should Custom Drag-and-Drop Ordering Be Supported?

**No.** This serves <5% of use cases, conflicts with the static-first architecture (needs persistent storage for sort order), and adds significant complexity. Defer unless actual users request it.

## Recommendation

| Approach | Priority | Effort |
|----------|----------|--------|
| Keep alphabetical as default | Current | Done |
| Add opt-in notation-based sorting | Medium | ~4-6 hours |
| Custom drag-and-drop ordering | Defer | High |

### Notation Sorting Implementation

Add a profile flag (e.g., `prez:sortByNotation true`) that changes the sort comparator from `prefLabel.localeCompare()` to `notation.localeCompare()` with numeric-aware collation. This affects:

- `useScheme.ts` — static tree building
- `useEditMode.ts` — edit mode tree building
- Web components `list.ts` — component tree building

The `Intl.Collator` with `{ numeric: true }` handles mixed alphanumeric codes correctly (e.g., "A2" before "A10").
