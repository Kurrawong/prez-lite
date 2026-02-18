# Backlog

> Unstarted tasks waiting to be prioritized

---

### ✅ Integrate SHACL validation into data processing and browser
Generic SHACL validation using any validator files in `data/validators/`. Already implemented: `--validators` CLI flag, `rdf-validate-shacl`, validation badges on vocabs list and scheme pages, expandable error details, `--strict` mode.

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

### Design edit-to-publish data lifecycle
Define the branching and staging strategy for data changes vs UI changes across both the base prez-lite project and child gh-template projects — covering dev/staging/production environments, when data rebuilds trigger, and how the two project types differ in their edit-to-publish flow. Includes approval workflow design: staging branch vs user branches, PR-based approve/reject/comment on pending changes, and a user-friendly UX for non-Git users. Document potential flows.

### Configure default IRI base pattern for vocabs and concepts
Define a configurable IRI template (e.g. `https://linked.data.gov.au/pid/gswa/{vocab-id}/{concept-id}`) so new vocabs and concepts auto-generate IRIs following an org's PID pattern. Determine where to configure (manifest.ttl, app.config, profile?) and how it drives IRI generation in the edit UI.

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

### Set up gh-template/default as a testable standalone application
Make the `packages/gh-templates/default/` template a fully functional, independently deployable application checked into `hjohns/prez-lite-template-default`. Covers several sub-tasks:

1. **Data isolation** — Ensure the template does NOT inherit the base layer's `web/public/export/` directory during build. Add a build step (Nuxt hook or script) that strips the parent layer's data/export folders so only the template's own vocabulary data is served.
2. **Update stale paths** — The template still uses pre-Sprint 10 paths (`export/_system/` instead of `export/system/`, flat vocab dirs instead of `export/vocabs/`). Align `process-vocabs.js` and any hardcoded paths with current conventions.
3. **Secrets hygiene** — The `.env` file contains a real GitHub PAT. Ensure `.env` is gitignored, `.env.example` documents required vars without real values, and README explains setup.
4. **Separate repo setup** — Initialize `hjohns/prez-lite-template-default`, set up git subtree (or similar) to sync `packages/gh-templates/default/` to the separate repo while allowing independent commits in both.
5. **Local development workflow** — Document how to run the template locally against the monorepo's `web/` layer, and how to develop/commit changes in both projects independently.
6. **Verify template builds and runs** — End-to-end test: install, process vocabs, generate static site, verify pages render correctly with only template data (no base layer data leaking through).
7. **Skill or CLAUDE.md guidance** — Add working instructions for the dual-repo workflow so future sessions handle template work correctly (e.g. which directory to commit from, how to sync, layer conventions).
