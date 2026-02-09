# Reviewing

> Tasks awaiting human manual review and approval

---

## 📦 Sample Data Fallback for Fresh Clones
**Review requested:** 2026-02-09

### What to Review
Build-step fallback that uses sample data when `web/public/data/vocabs/` is empty (e.g. fresh clone).

### Changes
- **`web/public/sample-data/`** — committed folder with `example-colors.ttl`, `profiles.ttl`, and empty `background/`
- **`package.json`** — new `build:ensure-data` script that copies sample-data into data/ if no vocabs found
- **`.gitignore`** — `web/public/data/` remains ignored (generated at build time)

### How to Test
1. Delete `web/public/data/` entirely
2. Run `pnpm build:ensure-data`
3. Verify `web/public/data/vocabs/example-colors.ttl`, `data/profiles.ttl`, and `data/background/` exist
4. Run `pnpm build:all-export` and confirm it completes successfully

---

## 🚀 AWS S3 + CloudFront Deployment GitHub Action
**Review requested:** 2026-02-09

### What to Review
New GitHub Actions workflow for deploying to AWS S3 with CloudFront cache invalidation.

### Changes
- **`.github/workflows/deploy-aws.yml`** (new) — manual deployment workflow

### Key Design Decisions
- **Manual trigger only** (`workflow_dispatch`) — no auto-deploy on push
- **OIDC auth** — no long-lived AWS credentials, uses `id-token: write` + role assumption
- **Same build pipeline** as GitHub Pages workflow (`pnpm build`)
- **Graceful CDN skip** — CloudFront invalidation only runs if `CDN_ID` variable is set
- **Single job** — no need for separate build/deploy since there's no artifact handoff

### Repository Configuration Required
| Type | Name | Purpose |
|------|------|---------|
| Secret | `AWS_ROLE_ARN` | IAM role ARN for OIDC federation |
| Variable | `BUCKET_NAME` | S3 bucket name |
| Variable | `CDN_ID` | CloudFront distribution ID (optional) |

### How to Test
1. Review `.github/workflows/deploy-aws.yml`
2. Verify build step uses `pnpm build` (matches root package.json)
3. Verify S3 sync targets `web/.output/public/` (matches Nuxt generate output)
4. Confirm OIDC auth pattern matches your AWS setup
5. Deploy manually via Actions tab after configuring secrets/variables
