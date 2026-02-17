# Done

---

## Sprint 14: Edit Dialog Polish

### ✅ Show language changes clearly in edit diff
**Completed:** 2026-02-17

**Summary:** Language tag changes now display clearly in save and history diffs. Added `formatObjectValue()` helper in `ttl-patch.ts` that appends `@lang` to literal values with language tags. Changes like `@en` → `@fr` are now visible instead of appearing as identical text.

**Files Modified:**
- `web/app/utils/ttl-patch.ts` — added `formatObjectValue()`, updated `buildChangeSummary()`
- `web/tests/unit/ttl-patch.test.ts` — 3 new tests (40/40 pass)

### ✅ Fix history dropdown height shift on hover
**Completed:** 2026-02-17

**Summary:** Changed the revert button in the changes dropdown from `hidden`/`inline-flex` display toggling to `opacity` toggling. Row height now stays stable on hover, matching the pattern used by the history dropdown's Diff/Browse buttons.

**Files Modified:**
- `web/app/components/EditToolbar.vue` — opacity-based toggling for revert button and count badge

### ✅ Add titles to diff and save changes dialogs
**Completed:** 2026-02-17

**Summary:** Added proper `#header` slots with descriptive titles to three UModals: "Save Changes", "Commit Diff", and "Change Detail". Removed duplicate inline titles from component bodies. Also removed the manual close button from VocabHistoryDiff (UModal's built-in close handles it).

**Files Modified:**
- `web/app/pages/scheme.vue` — added `#header` slots to three UModals
- `web/app/components/SaveConfirmModal.vue` — removed inline title
- `web/app/components/VocabHistoryDiff.vue` — removed inline title and close button

### ✅ Make diff and save dialogs draggable
**Completed:** 2026-02-17

**Summary:** Created `useDraggableModal` composable that makes UModal dialogs repositionable by dragging the header. Uses CSS `translate` property (independent of `transform`) so close animations aren't disrupted. Position resets on reopen. Applied to Save, Change Detail, and Commit Diff dialogs.

**Files Created:**
- `web/app/composables/useDraggableModal.ts`

**Files Modified:**
- `web/app/pages/scheme.vue` — wired drag handles to three modal headers

---

## Add New Concept Creation in Edit Mode

### ✅ Add new concept creation in edit mode
**Completed:** 2026-02-17

**Summary:** Users can now add new concepts from the edit UI via the "Add" button in the tree header. New concepts are created with `rdf:type`, `skos:prefLabel`, `skos:inScheme`, and optionally `skos:broader`/`skos:narrower` triples. After adding, the tree auto-expands ancestors to reveal the new node, selects it, and scrolls it into view. On page refresh with a `?concept=` URL param, the tree also expands to reveal the selected concept.

**Files Modified:**
- `web/app/components/ConceptTreeNode.vue` — added `expandToId` prop with recursive `hasDescendant()` check, auto-expand watchers, and `scrollIntoView` on target node
- `web/app/components/ConceptTree.vue` — added `expandToId` prop passthrough
- `web/app/pages/scheme.vue` — `expandToId` ref, set after `handleAddConcept()`, initial expand on page load when concept is in URL

---

## Fix Empty Property Display in Edit Mode

### ✅ Fix empty property display in edit mode
**Completed:** 2026-02-16

**Summary:** Removed the "---" dash from empty editable properties so only the "Add value" button shows. Readonly properties and non-editing inline rows still display the dash.

**Files Modified:**
- `web/app/components/ConceptForm.vue` — removed empty-state dash div (line 246)
- `web/app/components/InlineEditTable.vue` — removed empty-state dash div (line 249)

---

## Add Loading State to Sign-In Flow

### ✅ Add loading state to sign-in redirect
**Completed:** 2026-02-16

**Summary:** Eliminated the home page flash during OAuth sign-in redirect. An inline head script hides pre-rendered HTML instantly when `#gh_token=` is detected in the URL hash (before hydration). Vue hydrates with a spinner instead of `<NuxtPage />`, then `onMounted` restores visibility and runs `init()` which processes the token and redirects to the return path. Normal page loads are unaffected.

**Files Modified:**
- `web/app/app.vue` — added inline head script, OAuth callback detection via `import.meta.client`, spinner gate on `<NuxtPage />`
- `web/app/components/GitHubAuthButton.vue` — removed `onMounted(() => init())` (moved to app.vue)

---

## Export constraints.jsonld from SHACL Validator

### ✅ Export constraints.jsonld from SHACL validator
**Completed:** 2026-02-16

**Summary:** Exported full SHACL constraint shapes as JSON-LD (`constraints.jsonld`) for future frontend validation consumption. The build pipeline extracts shapes from `data/validators/vocabs.ttl`, flattens `sh:or` unions into datatype/class arrays, extracts cardinality, severity, and `sh:message` descriptions. Output covers 5 target classes (ConceptScheme, Concept, Collection, Organization, Person) with 14 property constraints total.

**Key files:**
- `web/public/export/system/constraints.jsonld` — exported constraints (6.8KB)
- `docs/5-technical/shacl-ui-evaluation.md` — library research findings

**Verified:** `sh:or` flattening (dateModified has 3 datatypes), cardinality (prefLabel min:1 max:1), `sh:message` as descriptions, no blank-node paths.

---

## SHACL Cardinality Enforcement in Edit Mode

### ✅ Enforce SHACL cardinality constraints in edit mode
**Completed:** 2026-02-15

**Summary:** The edit UI now respects `sh:minCount`/`sh:maxCount` from the SHACL validator shapes (`data/validators/vocabs.ttl`). At build time, `parseValidatorCardinality()` extracts cardinality constraints and merges them into `profile.json`. The frontend hides "Add value" when `maxCount` is reached and hides the remove button when at `minCount`. Properties not in the validator behave as before (unlimited).

**Key files:**
- `packages/data-processing/scripts/process-vocab.js` — `--validators` CLI arg, `parseValidatorCardinality()`, enriched `buildProfileJson()`
- `package.json` — `--validators data/validators` added to `build:vocabs`
- `web/app/composables/useEditMode.ts` — `minCount`/`maxCount` on `ProfilePropertyOrder` and `EditableProperty` types
- `web/app/components/ConceptForm.vue` — conditional `v-if` on add/remove buttons
- `web/app/components/InlineEditTable.vue` — conditional `v-if` on add/remove buttons

---

## Retrospective: Incremental Data Deployments

### ✅ Implement incremental data deployments
**Completed:** 2026-02-15 (retrospective — implemented across earlier commits)

**Summary:** The `process-data.yml` CI workflow already implements incremental vocab processing. It detects changed `.ttl` files via `git diff HEAD~1`, runs `process-vocab.js` only on those files, then regenerates global assets (vocab list, metadata, labels, search index). Manual dispatch triggers a full rebuild. At the current scale (3 vocabs, ~15s full rebuild) this is sufficient.

**Remaining future optimizations (when vocab count exceeds ~50):**
- Skip `build:labels` when `data/background/` unchanged
- Orphan cleanup for deleted vocab export directories
- Broader trigger paths (`data/background/**`, `data/config/**`)
- Local incremental build command

**Key files:**
- `.github/workflows/process-data.yml` — incremental detection, per-vocab processing, global asset regeneration

---

## Retrospective: SHACL Validation

### ✅ Integrate SHACL validation into data processing and browser
**Completed:** 2026-02-15 (retrospective — implemented across earlier commits)

**Summary:** Generic SHACL validation already fully implemented. The `generate-vocab-metadata.js` script accepts `--validators <dir>`, loads all `.ttl` SHACL shapes from that directory via `rdf-validate-shacl`, validates each vocab, and outputs results into `index.json`. The browser shows validation badges (green check / error count / warning count) on the vocabs list page and individual scheme pages with expandable error details. A `--strict` flag fails the build on violations. The build script is wired to `data/validators/` which contains a custom SHACL shapes file (`vocabs.ttl`).

**Key files:**
- `packages/data-processing/scripts/generate-vocab-metadata.js` — `loadValidators()`, `validateVocab()`, `--validators` CLI flag, `--strict` mode
- `data/validators/vocabs.ttl` — custom SHACL shapes
- `web/app/composables/useVocabData.ts` — `ValidationSummary`, `ValidationResult` types
- `web/app/pages/vocabs.vue` — validation badges in vocab list
- `web/app/pages/scheme.vue` — validation badge + expandable error details
- `package.json` — `build:vocab-metadata` passes `--validators data/validators`

---

## Sprint 12: Build Status & Vocab History

### ✅ Add build status polling after save
**Completed:** 2026-02-15

**Summary:** After saving edits, polls the GitHub Actions API (`process-data.yml` workflow) every 15s to show rebuild progress. Auto-dismisses on completion, clears caches so the page reflects updated exports. Safety timeout at 5 minutes.

**Files Created:**
- `web/app/composables/useBuildStatus.ts` — polling composable with `startPolling()`/`stopPolling()`

**Files Modified:**
- `web/app/pages/scheme.vue` — build status banner (info/success/error) below header, triggered after save

### ✅ Add vocab edit history with version browsing
**Completed:** 2026-02-15

**Summary:** History popover (clock icon) shows commit list with avatars, author, date, and commit message. Each commit has Diff and Browse actions. Diff opens a modal with Summary tab (human-readable subject/property changes) and TTL Diff tab (MonacoDiffEditor). Browse navigates to the same page with `?sha=` URL param for read-only historical viewing — tree, properties, and labels all rendered from the N3 store at that SHA. URL params drive all state (`edit`, `sha`, `concept`) with `router.push` for back/forward support.

**Files Created:**
- `web/app/composables/useVocabHistory.ts` — commit history, version content fetch, diff computation
- `web/app/components/VocabHistoryDiff.vue` — diff modal with Summary + TTL Diff tabs

**Files Modified:**
- `web/app/utils/ttl-patch.ts` — extracted standalone `buildChangeSummary()` function
- `web/app/composables/useEditMode.ts` — refactored `getChangeSummary()` to delegate to `buildChangeSummary()`
- `web/app/pages/scheme.vue` — history popover, URL-driven edit/history state, historical version rendering, build status banner, resolved history labels from N3 store

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
