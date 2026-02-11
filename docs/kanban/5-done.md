# Done

---

## Sprint 8: GitHub OAuth & Inline Editing

### ✅ GitHub OAuth integration via Cloudflare Worker
**Completed:** 2026-02-10

**Summary:** Full GitHub OAuth flow for inline TTL editing. Cloudflare Worker proxies token exchange (GitHub lacks CORS). Nonce-based CSRF protection. Token stored in localStorage, validated via GitHub `/user` API. Feature-gated: hidden when `githubClientId` is empty.

**Files Created:**
- `packages/github-auth-worker/` — CF Worker package (index.ts, wrangler.toml, package.json, tsconfig.json)
- `web/app/composables/useGitHubAuth.ts` — OAuth lifecycle composable
- `web/app/composables/useGitHubFile.ts` — GitHub Contents API wrapper
- `web/app/components/GitHubAuthButton.vue` — Header login/logout button
- `web/app/plugins/monaco-theme.client.ts` — Custom prez-dark/prez-light Monaco themes
- `docs/3-features/github-oauth-setup.md` — Setup guide

**Files Modified:**
- `web/nuxt.config.ts` — added githubClientId, githubAuthWorkerUrl to runtimeConfig
- `web/app/app.vue` — added GitHubAuthButton to header
- `web/app/pages/scheme.vue` — inline Monaco editor with toggle, direct GitHub API calls
- `web/app/pages/share/[vocab].vue` — inline editor using useGitHubFile composable
- `.github/workflows/deploy-aws.yml` — added GitHub OAuth env vars to build step

---

## Previous Sprints

Sprint 1-7 items archived to `9-archive.md`.

