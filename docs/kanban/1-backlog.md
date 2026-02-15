# Backlog

> Unstarted tasks waiting to be prioritized

---

### ✅ Integrate SHACL validation into data processing and browser
Generic SHACL validation using any validator files in `data/validators/`. Already implemented: `--validators` CLI flag, `rdf-validate-shacl`, validation badges on vocabs list and scheme pages, expandable error details, `--strict` mode.

### Adopt test-driven development workflow
Update the sprint skill to incorporate TDD practices; audit existing features for test coverage; review and update existing tests so regressions are caught early when code changes.

### ✅ Implement incremental data deployments
Detect which vocabs have changed and only rebuild those exports, plus dependent assets (vocab list, search index, labels) — avoid full rebuild on every push while keeping everything consistent.

**Future optimizations (when vocab count exceeds ~50):**
- Skip `build:labels` in CI when `data/background/` hasn't changed (~1-2s saving)
- Orphan cleanup: remove `web/public/export/vocabs/{name}/` when source `.ttl` is deleted
- Add `data/background/**` and `data/config/**` to workflow trigger paths (changes there require full rebuild)
- Local `pnpm build:data:incremental` command using git status to detect changed vocabs

### ✅ Enforce SHACL cardinality constraints in edit mode
Extract `sh:minCount`/`sh:maxCount` from `data/validators/vocabs.ttl` at build time, merge into `profile.json`, and use in the edit UI to control add/remove button visibility.

### Design collaborative editing presence (who's online)
Assess real-time presence system (avatars, editing indicators) similar to Google Docs; evaluate Cloudflare Durable Objects, Supabase Realtime, or similar for broadcasting edit state across clients of the same GitHub repo.

### ✅ Add build status polling after save
Poll GitHub Actions API after saving edits to show rebuild progress; auto-dismiss on completion and clear caches.

### ✅ Add vocab edit history with version browsing
History popover showing commit list (author, date, message); diff view between versions; browse any historical version read-only via URL param.

### Design edit-to-publish data lifecycle
Define the branching and staging strategy for data changes vs UI changes across both the base prez-lite project and child gh-template projects — covering dev/staging/production environments, when data rebuilds trigger, and how the two project types differ in their edit-to-publish flow.
