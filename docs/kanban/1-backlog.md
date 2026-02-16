# Backlog

> Unstarted tasks waiting to be prioritized

---

### ✅ Integrate SHACL validation into data processing and browser
Generic SHACL validation using any validator files in `data/validators/`. Already implemented: `--validators` CLI flag, `rdf-validate-shacl`, validation badges on vocabs list and scheme pages, expandable error details, `--strict` mode.

### ✅ Fix sign-in redirect to return to current page
Already implemented in `useGitHubAuth` — saves return path to sessionStorage, navigates back after OAuth callback. Remaining UX issue (loading flash) tracked separately.

### ✅ Evaluate concept ordering in vocabularies
Research whether ordering of concepts within a vocabulary is important, possible, or necessary — and if so, what mechanism to use (e.g. `skos:notation`, `sh:order`, custom predicate). Analysis complete: alphabetical sufficient for most cases; notation-based sorting recommended as opt-in feature for classifications.

### 🎯 Enable editing of concept label and IRI
Users can't update the label or IRI when editing a concept. Add editable support for these core fields in the edit form, with appropriate validation.

### Add concept move/reparent capability
Provide an intuitive way to move a concept from one parent node to another in the hierarchy — e.g. a move button or drag-and-drop, updating `skos:broader`/`skos:narrower` relationships.

### Redesign edit mode chrome (toolbar, save, panels)
Replace the bottom save banner with a more intuitive UX: top ribbon when logged in, edit mode toggle, save button on changes, toggle panels for change summary, TTL diffs, and history. The history icon is too easy to miss.

### Add simplified/expert view toggle for properties
Hide RDF-specific properties (like `hasTopConcept`, `inScheme`) behind an "expert" toggle, showing a friendlier default view for non-RDF users. Derived properties should not be editable in simple mode.

### Adopt test-driven development workflow
Update the sprint skill to incorporate TDD practices; audit existing features for test coverage; review and update existing tests so regressions are caught early when code changes.

### ✅ Implement incremental data deployments
Detect which vocabs have changed and only rebuild those exports, plus dependent assets (vocab list, search index, labels) — avoid full rebuild on every push while keeping everything consistent.

**Future optimizations (when vocab count exceeds ~50):**
- Skip `build:labels` in CI when `data/background/` hasn't changed (~1-2s saving)
- Orphan cleanup: remove `web/public/export/vocabs/{name}/` when source `.ttl` is deleted
- Add `data/background/**` and `data/config/**` to workflow trigger paths (changes there require full rebuild)
- Local `pnpm build:data:incremental` command using git status to detect changed vocabs

### ✅ Export constraints.jsonld from SHACL validator
Export full SHACL shapes as JSON-LD for frontend validation consumption. Includes `sh:or` flattening, cardinality, datatypes, classes, severity, messages. Also documented shacl-ui library evaluation.

### ✅ Enforce SHACL cardinality constraints in edit mode
Extract `sh:minCount`/`sh:maxCount` from `data/validators/vocabs.ttl` at build time, merge into `profile.json`, and use in the edit UI to control add/remove button visibility.

### Design collaborative editing presence (who's online)
Assess real-time presence system (avatars, editing indicators) similar to Google Docs; evaluate Cloudflare Durable Objects, Supabase Realtime, or similar for broadcasting edit state across clients of the same GitHub repo.

### ✅ Add build status polling after save
Poll GitHub Actions API after saving edits to show rebuild progress; auto-dismiss on completion and clear caches.

### ✅ Add vocab edit history with version browsing
History popover showing commit list (author, date, message); diff view between versions; browse any historical version read-only via URL param.

### Design edit-to-publish data lifecycle
Define the branching and staging strategy for data changes vs UI changes across both the base prez-lite project and child gh-template projects — covering dev/staging/production environments, when data rebuilds trigger, and how the two project types differ in their edit-to-publish flow. Includes approval workflow design: staging branch vs user branches, PR-based approve/reject/comment on pending changes, and a user-friendly UX for non-Git users. Document potential flows.

### ✅ Fix empty property display in edit mode
When a property has no value, the "---" dash and "Add" button appear on separate lines. In full edit mode, show only the add button (no dash). In inline edit mode, show the dash but swap to the add button when editing that field.

### ✅ Add loading state to sign-in redirect
Clicking sign in briefly renders the home page before redirecting back to the original page. Show a loading indicator during the OAuth flow instead of flashing the home page content.

### Configure default IRI base pattern for vocabs and concepts
Define a configurable IRI template (e.g. `https://linked.data.gov.au/pid/gswa/{vocab-id}/{concept-id}`) so new vocabs and concepts auto-generate IRIs following an org's PID pattern. Determine where to configure (manifest.ttl, app.config, profile?) and how it drives IRI generation in the edit UI.
