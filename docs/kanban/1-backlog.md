# Backlog

> Unstarted tasks waiting to be prioritized

---

### Integrate VocPub validation into data processing and browser editing
Run SHACL validation (using GSWA's vocpub.ttl as reference) during `process-vocab` and on browser save; show a validity indicator on vocab pages with human-readable errors, expandable details, and links to VocPub documentation.

### Adopt test-driven development workflow
Update the sprint skill to incorporate TDD practices; audit existing features for test coverage; review and update existing tests so regressions are caught early when code changes.

### Implement incremental data deployments
Detect which vocabs have changed and only rebuild those exports, plus dependent assets (vocab list, search index, labels) — avoid full rebuild on every push while keeping everything consistent.

### Design collaborative editing presence (who's online)
Assess real-time presence system (avatars, editing indicators) similar to Google Docs; evaluate Cloudflare Durable Objects, Supabase Realtime, or similar for broadcasting edit state across clients of the same GitHub repo.

### Design edit-to-publish data lifecycle
Define the branching and staging strategy for data changes vs UI changes across both the base prez-lite project and child gh-template projects — covering dev/staging/production environments, when data rebuilds trigger, and how the two project types differ in their edit-to-publish flow.
