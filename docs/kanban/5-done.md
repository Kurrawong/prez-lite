# Done

---

## Sprint 11: Blank Node Display

### ✅ Handle blank nodes in edit mode
**Completed:** 2026-02-11

**Summary:** Fixed blank node properties (e.g. `prov:qualifiedAttribution` with nested `prov:agent` and `prov:hadRole`) displaying raw `_:n3-xxx` IDs in edit mode. Added `'blank-node'` type to `EditableValue`, blank node detection in `quadValuesForPredicate()`, and structured nested property extraction using profile-driven ordering. Both `ConceptForm.vue` and `InlineEditTable.vue` now render blank nodes as nested card layouts showing their inner properties with resolved labels.

**Files Modified:**
- `web/app/composables/useEditMode.ts` — added `EditableNestedProperty` interface, `'blank-node'` type, `extractBlankNodeProperties()` and `quadToEditableValue()` helpers
- `web/app/components/ConceptForm.vue` — blank node rendering in readonly template
- `web/app/components/InlineEditTable.vue` — blank node rendering in read-only display

---

## Sprint 9: Layout Extraction & CI Infrastructure

### ✅ Evaluate feasibility of edit mode on existing vocab pages
**Completed:** 2026-02-11

**Summary:** Analysis of how the vocab/concept browse UI can support inline editing. Evaluated three data loading strategies (source TTL, annotated exports, data adapter pattern). Recommended the data adapter approach. Output: `docs/5-technical/edit-mode-feasibility.md`.

### ✅ Extract header/footer into overridable layout components
**Completed:** 2026-02-11

**Summary:** Extracted monolithic `app.vue` into composable parts for gh-template layer overrides. Created `SiteHeader.vue` and `SiteFooter.vue` with slots, `useSiteConfig` and `useNavigation` composables, `default.vue` layout, and moved site config to `app.config.ts`.

**Files Created:**
- `web/app/components/SiteHeader.vue` — header with branding/navigation/actions/mobile-navigation slots
- `web/app/components/SiteFooter.vue` — footer with brand/links/copyright/attribution slots
- `web/app/composables/useSiteConfig.ts` — typed accessor for site app config
- `web/app/composables/useNavigation.ts` — content-driven nav links
- `web/app/layouts/default.vue` — default layout composing header + main + footer

**Files Modified:**
- `web/app.config.ts` — added `site` key with branding config
- `web/app/app.vue` — simplified to UApp > NuxtLayout > NuxtPage shell

### ✅ Add reusable build-site workflow for gh-template repos
**Completed:** 2026-02-11

**Summary:** Created callable workflow that handles full downstream build pipeline: fetch data-processing (with workspace dep patching), process vocabs, generate system metadata (vocab index, labels, search), build Nuxt, deploy to GitHub Pages. Template deploy.yml reduced from 132 lines to 20.

**Files Created:**
- `.github/workflows/build-site.yml` — reusable workflow with `workflow_call` trigger

**Files Modified:**
- `packages/gh-templates/default/.github/workflows/deploy.yml` — calls reusable workflow
- `packages/gh-templates/default/nuxt.config.ts` — version pinning via `PREZ_LITE_VERSION` env var
- `packages/gh-templates/default/README.md` — documents repo variables

### ✅ Add release-please for automated versioning
**Completed:** 2026-02-11

**Summary:** Conventional commit-based release automation. On push to main, release-please analyses commits and creates/updates a release PR with version bump + CHANGELOG. Merging the PR creates a GitHub release + tag. Starts from v0.1.0.

**Files Created:**
- `.github/workflows/release.yml` — release-please workflow
- `release-please-config.json` — config (node type, extra-files for version sync)
- `.release-please-manifest.json` — version tracker (0.1.0)

### ✅ Add commitlint CI check for PR titles
**Completed:** 2026-02-11

**Summary:** GitHub Action validates PR titles against conventional commit format (feat/fix/docs/chore/etc). Zero npm dependencies — uses `action-semantic-pull-request`. Ready for branch protection when PRs become required.

**Files Created:**
- `.github/workflows/commitlint.yml` — PR title validation

---

## Sprint 10: Infrastructure & Data Hygiene

### ✅ Fix SPA route handling on AWS deployment
**Completed:** 2026-02-11

**Summary:** Created CloudFront Function (`scripts/aws/url-rewrite.js`) for SSG URL rewriting — rewrites bare paths like `/scheme` to `/scheme/index.html`. Kept as reference code for Terraform integration rather than workflow automation.

**Files Created:**
- `scripts/aws/url-rewrite.js` — CloudFront Function for SSG URL rewriting

### ✅ Move source data from web/public/data to top-level /data
**Completed:** 2026-02-11

**Summary:** Migrated source TTL data from `web/public/data/` to `/data/` and sample data from `web/public/sample-data/` to `/sample-data/`. Updated all build scripts, CI workflows, data-processing example docs, gh-template paths, and content pages. Removed legacy `/data/` URL fallbacks from `useVocabData.ts`. Exports remain at `web/public/export/`.

**Files Moved:**
- `web/public/data/` → `data/` (vocabs, background, profiles, manifest)
- `web/public/sample-data/` → `sample-data/`
- `packages/gh-templates/default/public/data/` → `packages/gh-templates/default/data/`

**Files Modified:**
- `package.json` — all build script paths updated
- `scripts/fetch-labels.sh` — DATA_DIR path
- `.github/workflows/build-site.yml` — `public/data/` → `data/`
- `.github/workflows/get-background-labels.yml` — git add path
- `packages/data-processing/scripts/process-rdf.js` — default backgroundDir
- `packages/data-processing/scripts/generate-labels.js` — example paths
- `packages/data-processing/scripts/generate-vocablist.js` — example paths
- `packages/data-processing/scripts/generate-vocab-metadata.js` — example paths
- `packages/data-processing/scripts/process-vocab.js` — example paths
- `packages/data-processing/README.md` — example paths
- `packages/gh-templates/default/scripts/process-vocabs.js` — all paths
- `packages/gh-templates/default/README.md` — all paths
- `web/app/composables/useVocabData.ts` — removed legacy `/data/` fallbacks
- `web/content/authoring.md` — directory structure and workflow paths
- `.gitignore` — updated comment
- `README.md` — updated project structure diagram

### ✅ Restructure export directory layout
**Completed:** 2026-02-11

**Summary:** Renamed `export/_system/` to `export/system/` and moved vocab exports under `export/vocabs/` for cleaner separation. Added `--systemDir` CLI parameter to `process-vocab.js`. Updated all composables, workflows, web components, gh-template scripts, CORS headers, and docs.

**Files Modified:**
- `packages/data-processing/scripts/process-vocab.js` — added `--systemDir` parameter
- `packages/data-processing/scripts/generate-search-index.js` — `vocabs/` subdirectory detection
- `package.json` — `--outputBase` and `--systemDir` paths
- `web/app/composables/useVocabData.ts` — `_system/` → `system/`, vocab paths under `vocabs/`
- `web/app/composables/useShare.ts` — vocab export paths
- `web/app/composables/useSearch.ts` — search index path
- `web/app/composables/useEditMode.ts` — profile fetch path
- `web/app/utils/annotated-properties.ts` — profile and vocab paths
- `packages/web-components/src/utils/base-url.ts` — vocab URL path
- `.github/workflows/build-site.yml` — `--outputBase` and `--systemDir`
- `packages/gh-templates/default/scripts/process-vocabs.js` — all export paths
- `web/public/_headers` — CORS rules
- `packages/gh-templates/default/public/_headers` — CORS rules

### ✅ Make catalog.ttl a transient build artifact
**Completed:** 2026-02-11

**Summary:** Renamed `vocablist-source-catalog.ttl` to `catalog.ttl`, replaced GSWA-specific defaults with generic ones, and moved it from committed source to a transient build artifact in `.cache/` (gitignored). Eliminates stale label concerns since the catalog is regenerated fresh on every build.

**Files Modified:**
- `packages/data-processing/scripts/generate-vocablist.js` — generic defaults, mkdir for output dir
- `package.json` — output to `.cache/catalog.ttl`
- `.gitignore` — `.cache/` directory

**Files Removed:**
- `data/catalog.ttl` — no longer committed
- `sample-data/catalog.ttl` — no longer committed

### ✅ Move profiles.ttl to data/config/
**Completed:** 2026-02-11

**Summary:** Moved `data/profiles.ttl` to `data/config/profiles.ttl` for cleaner data directory structure. Left `data/validators/` and `data/manifest.ttl` in place intentionally.

**Files Moved:**
- `data/profiles.ttl` → `data/config/profiles.ttl`
- `sample-data/profiles.ttl` → `sample-data/config/profiles.ttl`
- `packages/gh-templates/default/data/profiles.ttl` → `packages/gh-templates/default/data/config/profiles.ttl`

**Files Modified:**
- `package.json` — `--profiles` path
- `.github/workflows/build-site.yml` — profiles path
- `packages/gh-templates/default/scripts/process-vocabs.js` — `PROFILES_FILE` path
- `web/content/authoring.md` — directory structure diagram
- `README.md` — project structure

### ✅ Fix web component 404 after export restructure
**Completed:** 2026-02-11

**Summary:** Web component `base-url.ts` was still using old `/export/${vocab}/` path. Updated to `/export/vocabs/${vocab}/` and rebuilt bundle.

**Files Modified:**
- `packages/web-components/src/utils/base-url.ts` — vocab URL path

### ✅ Park search configuration as future TTL idea
**Completed:** 2026-02-11

**Summary:** Assessed search indexing configuration (currently hardcoded in `generate-search-index.js`). Documented as a parked idea for future extraction into a TTL configuration file at `data/config/search.ttl`.

**Files Modified:**
- `docs/parked.md` — added "Externalise search configuration as TTL" section

---

## Previous Sprints

Sprint 1-8 items archived to `9-archive.md`.
