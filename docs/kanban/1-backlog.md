# Backlog

> Unstarted tasks waiting to be prioritized

---

### ✅ Integrate SHACL validation into data processing and browser
Generic SHACL validation using any validator files in `data/validators/`. Already implemented: `--validators` CLI flag, `rdf-validate-shacl`, validation badges on vocabs list and scheme pages, expandable error details, `--strict` mode.

### ✅ Fix sign-in redirect to return to current page
Already implemented in `useGitHubAuth` — saves return path to sessionStorage, navigates back after OAuth callback. Remaining UX issue (loading flash) tracked separately.

### ✅ Evaluate concept ordering in vocabularies
Research whether ordering of concepts within a vocabulary is important, possible, or necessary — and if so, what mechanism to use (e.g. `skos:notation`, `sh:order`, custom predicate). Analysis complete: alphabetical sufficient for most cases; notation-based sorting recommended as opt-in feature for classifications.

### ✅ Add new concept creation in edit mode
Users cannot add a new concept to a vocabulary. Provide a way to create a new concept (with label and parent) from the edit UI, inserting the necessary triples (rdf:type, skos:prefLabel, skos:inScheme, skos:broader/narrower).

### Enable editing of concept label and IRI
Users can't update the label when editing a concept. Add editable support for prefLabel in the edit form. IRI editing should only be allowed for newly created concepts (not existing ones), with validation for format and uniqueness.

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

### ✅ Show language changes clearly in edit diff
When editing a language tag (e.g. `@en` → `@en-AU`), the diff feedback only shows the text changed, not that the language tag itself changed.

### ✅ Fix history dropdown height shift on hover
Mousing over a history edit dropdown entry causes the row height to change when the undo icon appears — layout should remain stable.

### ✅ Add titles to diff and save changes dialogs
Both the diff popup and save changes popup have blank title areas — add descriptive titles.

### ✅ Make diff and save dialogs draggable
Both dialog boxes should be repositionable by dragging.

### Preserve concept context when switching edit modes
Switching between inline and full edit mode loses the currently selected concept context.

### Make concept detail panel resizable
The concept panel should be ~20% wider by default and user-resizable (wider or narrower), with the preference retained across sessions.

### Show error when invalid narrower concept selected
Picking an invalid item as a narrower concept sometimes silently does nothing — provide clear error feedback when the selection is invalid.

### Add tree selector with search for relationship picking
Replace the current dropdown for broader/narrower/related concept selection with a reusable tree+search picker, similar to the existing concept tree. Design for reuse across relationship types.

### Show mandatory field indicators in edit mode
Display a red asterisk (or similar) next to properties that require one or more values (`sh:minCount >= 1`) to clearly indicate mandatory fields.

### Design SHACL validation feedback in edit mode
Research and design how SHACL validator results should surface during editing — inline validation errors, field-level badges, save-time checks, etc.

### Design and implement SKOS collections support
Create, list, share, and manage SKOS collections within vocabularies. Covers: listing UX, data model, build pipeline for collection exports, search index integration, sharing assets, web component support, and collection management UI.
