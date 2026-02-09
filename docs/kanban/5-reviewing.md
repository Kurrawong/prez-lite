# Reviewing

> Tasks awaiting human manual review and approval

---

## Decouple Data Processing from Site Deployment

**What was done:**
- Split `package.json` build into `build:data` and `build:site` scripts
- Created `.github/workflows/process-data.yml` — processes data on sample-data changes or manual trigger, commits exports back to repo
- Refactored `.github/workflows/deploy-aws.yml` with `deploy-mode` input (`full` | `data-only`)
- Staged 55 MB of pre-built `web/public/export/` for commit

**How to verify:**
- [ ] `pnpm build:data` processes vocabs and regenerates exports
- [ ] `pnpm build:site` builds components + Nuxt generate (uses committed exports)
- [ ] `pnpm build` runs full pipeline (same result as before)
- [ ] Review `process-data.yml` workflow logic
- [ ] Review `deploy-aws.yml` deploy-mode input and both job paths

**Files modified:**
- `package.json` — added `build:data`, `build:site`
- `.github/workflows/deploy-aws.yml` — refactored with deploy-mode
- `.github/workflows/process-data.yml` — new

