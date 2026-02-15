# Concept Ordering in SKOS Vocabularies

**Status:** ✅ Complete
**Date:** 2026-02-16
**Context:** Analyzing ordering mechanisms for prez-lite vocabulary browser

## Summary

SKOS provides explicit ordering support through `skos:OrderedCollection`, but in practice most vocabularies rely on implicit ordering through notations or alphabetical prefLabel sorting. Current prez-lite implementation (alphabetical by prefLabel) is sufficient for the majority of use cases, though notation-based ordering would benefit classification systems.

## SKOS Standard Ordering Mechanisms

### skos:OrderedCollection

The [SKOS specification](https://www.w3.org/TR/skos-reference/) defines `skos:OrderedCollection` for explicit concept ordering:

- Uses `skos:memberList` property with an RDF List (`rdf:List`)
- Both grouping and ordering are meaningful
- Intended for node labels in thesauri and situations where concept order conveys information
- Provides ordered lists where "the ordering of a set of concepts is meaningful or provides some useful information"

**Reality Check:** Despite being part of the spec since 2009, `skos:OrderedCollection` has very low adoption. Most SKOS vocabularies do not use it.

### skos:notation

[Notation](https://www.w3.org/TR/skos-primer/) is designed for human-readable codes, not primarily for ordering:

- Lexical codes (e.g., "T58.5", "303.4833", "A0000") that uniquely identify concepts within a scheme
- Bridge to existing classification systems (library catalogs, industry codes)
- Not necessarily recognizable as natural language
- Commonly used in hierarchical classification schemes

**Common Pattern:** Classifications use structured notation (e.g., "A0000" → "A0100" → "A0110") that implies a natural sort order, even though that's not notation's primary purpose.

## Current prez-lite Implementation

**Current behavior:**
- All concepts sorted alphabetically by `prefLabel` at every hierarchy level
- `skos:notation` is captured in data pipeline and included in exports/search
- No explicit ordering mechanism supported

**Code locations:**
- `/packages/data-processing/scripts/process-vocab.js` line 174: notation extracted
- `/web/app/pages/scheme.vue` lines 187, 210, 214: alphabetical sorting by prefLabel
- `/web/app/composables/useSearch.ts`: notation searchable but not used for ordering

## Use Case Analysis

### When Alphabetical is Sufficient

**Most thesauri and controlled vocabularies** (70%+ of SKOS use cases):
- Subject headings
- Keywords/tags
- Taxonomies without numeric structure
- Domain-specific terminologies

Alphabetical sorting by prefLabel provides:
- Predictable navigation
- Easy scanning
- Language-aware ordering (localeCompare)
- No maintenance burden

### When Notation-Based Ordering is Better

**Classification systems with structured codes** (20-25% of SKOS use cases):
- Industry classifications (ANZIC, NAICS, NACE)
- Library classifications (Dewey, UDC)
- Statistical classifications
- Administrative code lists

Example from ANZIC2006 in prez-lite:
```json
{
  "notation": "A0000",
  "prefLabel": "Agriculture, Forestry and Fishing"
}
```

Natural order: A0000 → B0000 → C0000 (Divisions), then A0100 → A0200 (Subdivisions), etc.

Alphabetical by prefLabel breaks this structure, making navigation counterintuitive for users familiar with the classification codes.

### When Custom Drag-and-Drop is Needed

**Edge cases** (<5% of vocabularies):
- Ordered lists (e.g., workflow stages, maturity levels)
- Ranked priorities
- Step-by-step procedures

These are rare in SKOS because:
1. `skos:OrderedCollection` exists but is rarely used
2. Order-dependent concepts often use different standards (BPMN, OWL-Time)
3. Maintenance overhead is high

## Recommendations

### 1. Keep Alphabetical as Default ✅

**Rationale:** Works for majority of vocabularies, requires zero configuration, language-aware.

**No change needed** to current implementation.

### 2. Add Optional Notation-Based Ordering 📋

**Rationale:** Significant benefit for 20-25% of vocabularies (classifications), low implementation cost.

**Implementation approach:**
- Add profile-level configuration flag: `prez:sortByNotation` (boolean)
- Fallback chain: notation → prefLabel → IRI
- Apply to tree navigation, concept tables, exports

**Code changes required:**
- Profile schema: add sort preference field
- `scheme.vue`: conditional sort logic
- `useSearch.ts`: honor sort preference in results
- Web components: pass sort config via attribute

**Estimated effort:** 4-6 hours

### 3. Defer Drag-and-Drop Custom Ordering ⏸️

**Rationale:** Low demand, high complexity, can be added later if needed.

**Concerns:**
- Requires persistent storage (conflicts with static-first principle)
- Non-standard (would need custom predicate or sh:order)
- Ordering information not easily portable across systems
- Would need `skos:OrderedCollection` conversion for interoperability

**Verdict:** Wait for user demand before implementing.

## Decision

**Recommended path forward:**

1. Document current alphabetical behavior (this analysis)
2. Add notation-based sorting as opt-in profile feature (Priority: Medium)
3. Monitor user feedback for ordering edge cases
4. Revisit custom ordering only if specific use cases emerge

## References

- [SKOS Reference](https://www.w3.org/TR/skos-reference/) - OrderedCollection specification
- [SKOS Primer](https://www.w3.org/TR/skos-primer/) - Notation use cases
- [CSIRO SKOS Best Practices](https://csiro-enviro-informatics.github.io/info-engineering/skos-bp.html) - Hierarchical organization
- [XKOS Extension](https://rdf-vocabulary.ddialliance.org/xkos.html) - Classification-specific properties (notationPattern)

## Related Files

- `/docs/kanban/1-backlog.md` - Original ordering research task
- `/packages/data-processing/scripts/process-vocab.js` - Notation extraction
- `/web/app/pages/scheme.vue` - Tree rendering and sorting
- `/docs/2-specification/profiles.md` - Profile configuration spec
