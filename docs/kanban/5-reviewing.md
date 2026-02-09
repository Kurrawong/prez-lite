# Reviewing

> Tasks awaiting human manual review and approval

---

## 📦 Sample Data Fallback for Fresh Clones
**Review requested:** 2026-02-09

### What to Review
Build-step fallback that uses sample data when `web/public/data/vocabs/` is empty (e.g. fresh clone).

### Changes
- **`web/public/sample-data/`** — committed folder with `example-colors.ttl`, `profiles.ttl`, and empty `background/`
- **`package.json`** — new `build:ensure-data` script that copies sample-data into data/ if no vocabs found
- **`.gitignore`** — `web/public/data/` remains ignored (generated at build time)

### How to Test
1. Delete `web/public/data/` entirely
2. Run `pnpm build:ensure-data`
3. Verify `web/public/data/vocabs/example-colors.ttl`, `data/profiles.ttl`, and `data/background/` exist
4. Run `pnpm build:all-export` and confirm it completes successfully

---

## 🔄 Excessive HTTP Requests — Duplicate Fetches Across Application
**Review requested:** 2026-02-09

### What Was Done
Added in-memory request caching to all core data-fetching functions in `useVocabData.ts` to prevent duplicate HTTP requests when multiple composables call the same endpoints.

### Root Causes Found
1. **`fetchVocabMetadata()`** — called separately by `fetchSchemes()`, `useConcept`, `useScheme`, and `useShare`, each triggering a fresh `GET /export/_system/vocabularies/index.json`
2. **`fetchSchemes()`** — called by `useVocabs`, `useConcept`, `useScheme` independently
3. **`fetchLabels()`** — called by `useConcept` and `useScheme` independently
4. **`fetchListConcepts(slug)`** — called by `fetchConcepts()` in scheme page, then again by `findConcept()` when `ConceptPanel` opens
5. **`findConcept()`** — iterates ALL schemes calling `fetchConcepts` for each, which each call `fetchVocabMetadata` again

### Fix Applied
Added module-level caching with promise deduplication (same pattern as existing `fetchProfile` cache):
- `fetchVocabMetadata()` — singleton cache
- `fetchSchemes()` — singleton cache
- `fetchLabels()` — singleton cache
- `fetchListConcepts(slug)` — per-slug Map cache

Each function checks for cached result first, then for in-flight promise, preventing both duplicate requests and race conditions.

### Also Fixed: "Concept not found" flash on load
`useAsyncData` with `{ server: false }` starts with status `'idle'`, not `'pending'`. The template conditions only checked for `'pending'` as the loading state, so on initial render `'idle'` fell through to the error alerts — showing a red "Concept not found" or "Scheme not found" box for one frame before data loaded.

Fixed by treating `'idle'` as a loading state alongside `'pending'` in:
- `concept.vue` — skeleton shown for `'idle' || 'pending'`
- `scheme.vue` — skeleton and tree loading states include `'idle'`
- `ConceptPanel.vue` — `isLoading` computed includes both states; "not found" only shows when loading is definitively complete

### Files Modified
- `web/app/composables/useVocabData.ts` — added caching to 4 fetch functions
- `web/app/pages/concept.vue` — skeleton loader covers `'idle'` status
- `web/app/pages/scheme.vue` — skeleton loader covers `'idle'` status
- `web/app/components/ConceptPanel.vue` — skeleton loader covers `'idle'` status

### How to Test
1. `pnpm --filter web dev`
2. **Duplicate requests:** Open browser Network tab, navigate to a vocabulary — should see `index.json` fetched only once. Click concepts — no duplicate requests.
3. **Loading flash:** Navigate directly to `/concept?uri=...` — should see skeleton, never a red "Concept not found" flash
4. Navigate to `/scheme?uri=...` — should see skeleton, never a red "Scheme not found" flash
5. Click a concept in the hierarchy — ConceptPanel should show skeleton, not "Concept not found"
6. If a concept genuinely doesn't exist, the error message should still appear after loading completes
