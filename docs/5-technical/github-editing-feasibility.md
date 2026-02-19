# GitHub TTL Editing — Feasibility Analysis

**Status:** ✅ Complete
**Date:** 2026-02-10

---

## Summary

Users need to edit TTL vocabulary files in the browser and save changes back to GitHub. This analysis evaluates approaches for a static site (Nuxt SSG) with no backend server.

**Recommendation:** Phased approach — start with "Edit on GitHub" links (zero effort), add PAT-based in-app editing (no server), then layer on OAuth via a Cloudflare Worker for proper UX.

---

## Key Finding: GitHub API Works from the Browser

`api.github.com` returns `Access-Control-Allow-Origin: *`, so all file CRUD operations work client-side via Octokit.js once you have a token. The blocker is **getting the token** — GitHub's OAuth token exchange endpoint (`github.com/login/oauth/access_token`) has **no CORS support**.

---

## Authentication Options

### Option A: OAuth + Cloudflare Worker Proxy (Recommended for Production)

Standard "Login with GitHub" flow. User is redirected to GitHub, authorizes the app, returns with a code. A tiny Cloudflare Worker (~63 lines) exchanges the code for a token using the `client_secret`.

| Aspect | Detail |
|--------|--------|
| Infrastructure | 1 Cloudflare Worker (free tier: 100k req/day) |
| Secrets | `client_id` + `client_secret` stored in Worker |
| Token storage | `localStorage` on client |
| UX | Standard one-click GitHub login |
| Security | Good — secret never exposed; CSRF via `state` param |

Reference implementation: [gr2m/cloudflare-worker-github-oauth-login](https://github.com/gr2m/cloudflare-worker-github-oauth-login)

### Option B: Personal Access Token (MVP, Zero Infrastructure)

User creates a fine-grained PAT on GitHub (scoped to `contents: write` on the repo), pastes it into the app. Stored in `localStorage`.

| Aspect | Detail |
|--------|--------|
| Infrastructure | None |
| UX | Clunky — user must create token on GitHub settings |
| Security | Token in localStorage; fine-grained PATs limit blast radius |
| Complexity | Trivial (~50 lines) |

Suitable for power users and proving the editing flow.

### Option C: GitHub Edit URL (Zero Code)

Link directly to `https://github.com/{owner}/{repo}/edit/main/{path}`. User edits in GitHub's web editor and commits.

| Aspect | Detail |
|--------|--------|
| Infrastructure | None |
| Code | One `<a>` tag per page |
| UX | Leaves the site; no TTL-aware tooling |

Should be implemented regardless — it's the fallback for all other approaches.

### Ruled Out

- **OAuth Device Flow** — `github.com/login/device/code` has no CORS. Needs a proxy anyway, so no simpler than Option A.
- **OAuth PKCE** — GitHub announced PKCE (July 2025) but still requires `client_secret` and token exchange still lacks CORS. Not viable as of Feb 2026.

---

## Triggering Rebuilds

Commits via the GitHub API are real Git commits. If the existing CI triggers on `push` to `main`, no additional work is needed. Alternatively, `workflow_dispatch` can be called from `api.github.com` (CORS-enabled) with the same token.

**Recommendation:** Use push-triggered CI. Zero additional code.

---

## Existing Solutions

| Project | Fit for prez-lite |
|---------|------------------|
| Decap CMS / Sveltia CMS | OAuth pattern is reusable, but CMS is Markdown-focused, not TTL |
| Prose.io | Markdown-only, hosted service |
| Keystatic | Schema-driven, not arbitrary file formats |
| GitHub Web Editor | Zero setup, adequate fallback |

None solve TTL editing out of the box. Best approach: reuse the OAuth Worker pattern with a custom editor.

---

## Recommended Phased Approach

### Phase 0: "Edit on GitHub" Links (Today)

Add links to vocab/concept pages:
```
https://github.com/{owner}/{repo}/edit/main/web/public/sample-data/{file}.ttl
```
Works immediately with existing CI. Zero code.

### Phase 1: PAT-Based In-App Editor (No Server)

- User pastes a fine-grained PAT into settings
- Store in `localStorage`, validate against GitHub API (`GET /user`)
- Read TTL files via `GET /repos/.../contents/...`
- Present in-app editor (textarea or CodeMirror)
- Write back via `PUT /repos/.../contents/...` (requires file SHA)
- Push-triggered CI rebuilds the site
- Unauthenticated users can view/edit locally but Save is disabled

### Phase 2: OAuth Login (Cloudflare Worker)

- Deploy 63-line Cloudflare Worker for token exchange
- Register GitHub OAuth App (client_id + client_secret)
- Replace PAT paste with "Login with GitHub" button
- Rest of the architecture unchanged

---

## Infrastructure Summary

| Phase | Server Component | Effort | UX |
|-------|-----------------|--------|-----|
| 0 — Edit on GitHub | None | ~5 lines | Adequate |
| 1 — PAT + Octokit | None | ~200 lines | Power users |
| 2 — OAuth + Worker | 1 CF Worker (63 lines) | ~500 lines total | Standard login |
