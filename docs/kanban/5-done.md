# Done

---

## Sprint 4: Performance & UX Fixes - ALL COMPLETE (2026-02-09)

### ✅ Sample Data Fallback for Fresh Clones
**Completed:** 2026-02-09

**Summary:** Build-step fallback that copies sample data into `web/public/data/` when no vocabularies exist (e.g. fresh clone), so `pnpm build` works out of the box.

**Files Modified:**
- `web/public/sample-data/` — committed sample data
- `package.json` — `build:ensure-data` script
- `.gitignore` — `web/public/data/` remains ignored

---

### ✅ AWS S3 + CloudFront Deployment GitHub Action
**Completed:** 2026-02-09

**Summary:** GitHub Actions workflow for deploying to AWS S3 with CloudFront cache invalidation. Manual trigger, OIDC auth, graceful CDN skip.

**Files Created:**
- `.github/workflows/deploy-aws.yml`

---

### ✅ Excessive HTTP Requests — Duplicate Fetches Across Application
**Completed:** 2026-02-09

**Summary:** Added in-memory request caching to all core data-fetching functions to prevent duplicate HTTP requests when multiple composables call the same endpoints. Also fixed "Concept not found" flash on page load caused by `useAsyncData` `'idle'` status not being treated as a loading state.

**Root causes fixed:**
- `fetchVocabMetadata()`, `fetchSchemes()`, `fetchLabels()` — singleton caches
- `fetchListConcepts(slug)` — per-slug Map cache
- `concept.vue`, `scheme.vue`, `ConceptPanel.vue` — `'idle'` status treated as loading

**Files Modified:**
- `web/app/composables/useVocabData.ts`
- `web/app/pages/concept.vue`
- `web/app/pages/scheme.vue`
- `web/app/components/ConceptPanel.vue`

---

## Previous Sprints

Sprint 1-3 items archived to `9-archive.md`.
