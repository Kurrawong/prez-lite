# Backlog

> Unstarted tasks waiting to be prioritized

---

### ✅ Research GitHub TTL editing approach
Evaluate options for letting authenticated GitHub users edit TTL files in the web UI. **Done:** Phased approach recommended — Edit on GitHub links (zero effort), PAT-based in-app editing (no server), OAuth via Cloudflare Worker (good UX). See `docs/5-technical/github-editing-feasibility.md`.

### Implement TTL file viewer/editor UI
Add a page to select and view TTL files from the data folder. Unauthenticated users can view and edit locally but cannot save. Use a code editor component (e.g. CodeMirror or simple textarea MVP).

### Implement GitHub save and rebuild trigger
Authenticated users can commit edited TTL files back to the repo via GitHub API. Saving triggers a rebuild via `workflow_dispatch` or push-to-main. Depends on research task for auth approach.

### Add "Edit on GitHub" links to vocab/concept pages
Link to `https://github.com/{owner}/{repo}/edit/main/{path}` from vocab and concept pages. Zero infrastructure, immediate value. (Phase 0 from feasibility study.)

