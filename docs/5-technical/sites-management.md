---
title: Sites Management
status: complete
updated: 2026-03-23
---

# Sites Management

> How to create, configure, and manage client site instances in the prez-lite monorepo.

## How Sites Work

Each client site is an **independent git repository** that extends prez-lite's `web/` layer via Nuxt layers. Sites live at `packages/sites/{name}/` within the monorepo for convenient co-development, but are fully standalone — they have their own `.git`, `package.json`, `pnpm-lock.yaml`, and CI/CD workflows.

The root `.gitignore` excludes `packages/sites/` entirely, so site changes never pollute the main prez-lite repo.

### Nuxt Layer Auto-Detection

Every site's `nuxt.config.ts` auto-detects its context:

- **Monorepo (local dev):** Resolves `../../../web` relative path → uses local `web/` layer directly
- **Standalone (CI/deployed):** Falls back to `github:Kurrawong/prez-lite/web#main` (or pinned version via `PREZ_LITE_VERSION`)

This means the same site repo works identically in both contexts with zero config changes.

### What Sites Override

Sites inherit everything from `web/` and selectively override:

| What | How |
|------|-----|
| Branding | `app/app.config.ts` — site name, colors, tagline, footer |
| Components | `app/components/` — SiteHeader, SiteFooter, etc. |
| Styles | `app/assets/css/main.css` |
| Content pages | `content/` — markdown pages (index, about, etc.) |
| Head metadata | `nuxt.config.ts` — title, favicon |
| Vocabularies | `data/vocabs/` — TTL source files |
| Profiles | `data/config/profiles.ttl` — SHACL rendering profiles |

---

## Creating a New Site

### Option A: From the GitHub Template

Use when starting a brand-new vocabulary site.

1. Create a new GitHub repo from the `Kurrawong/prez-lite-template-default` template (or use `gh repo create` with `--template`)
   ```bash
   gh repo create Org/new-site --template Kurrawong/prez-lite-template-default --public
   ```
2. Clone into the monorepo:
   ```bash
   cd packages/sites
   git clone git@github.com:Org/new-site.git
   cd new-site
   pnpm install
   ```
3. Add vocabulary TTL files to `data/vocabs/`
4. Process and run:
   ```bash
   pnpm process    # TTL → JSON exports
   pnpm dev        # Start dev server
   ```

### Option B: From an Existing Vocab-Only Repo

Use when a repo already has vocabulary data but no prez-lite site structure.

1. Clone the existing repo into the monorepo:
   ```bash
   cd packages/sites
   git clone git@github.com:Org/existing-vocab-repo.git
   cd existing-vocab-repo
   ```
2. Copy the template scaffold from `packages/gh-templates/default/`, excluding vocab data (keep existing):
   ```bash
   # From the existing-vocab-repo directory
   TEMPLATE=../../gh-templates/default

   # Copy site scaffold
   cp $TEMPLATE/nuxt.config.ts .
   cp $TEMPLATE/package.json .
   cp $TEMPLATE/pnpm-workspace.yaml .
   cp -r $TEMPLATE/app .
   cp -r $TEMPLATE/content .
   cp -r $TEMPLATE/scripts .
   cp -r $TEMPLATE/.github .
   cp $TEMPLATE/.gitignore .

   # Ensure config/export dirs exist
   mkdir -p data/config public/export
   ```
3. Copy profiles if none exist:
   ```bash
   cp $TEMPLATE/data/config/profiles.ttl data/config/profiles.ttl
   ```
4. **Configure paths** if vocabs/labels are not in the default locations (`data/vocabs`, `data/background`):
   - **Local processing:** Create a `.env` file with path overrides:
     ```
     VOCAB_SOURCE_DIR=vocabularies
     VOCAB_BACKGROUND_DIR=.
     ```
   - **CI workflows:** Pass path inputs when calling reusable workflows (see [CI/CD Workflows](#cicd-workflows))
5. Update `package.json` — set the `name` field
6. Install, process, run:
   ```bash
   pnpm install
   pnpm process
   pnpm dev
   ```
6. Commit the scaffold to the repo

### Option C: Via Conversation

When initiating a site through a chat session, follow Option A or B above depending on whether the repo already exists. The key steps are always: clone into `packages/sites/`, ensure scaffold exists, install, process, dev.

---

## Configuring a New Site

### 1. Branding (`app/app.config.ts`)

```typescript
export default defineAppConfig({
  ui: {
    colors: { primary: 'teal', neutral: 'slate' },
  },
  site: {
    name: 'My Vocabularies',
    icon: 'i-heroicons-book-open',
    tagline: 'Vocabulary Publishing Platform',
    footerText: 'Organisation Name',
    footerLinks: [{ label: 'About', href: '/about' }],
    siteHeaderBreadcrumbs: true,
  },
})
```

### 2. Components (optional)

Override `SiteHeader.vue` and `SiteFooter.vue` in `app/components/` for custom branding. Use an existing site (e.g. `packages/sites/suncorp-vpp/app/components/`) as a reference.

### 3. Content pages

Edit markdown in `content/` — at minimum update `index.md` (home page) and `about.md`.

### 4. Head metadata (`nuxt.config.ts`)

Update the `app.head.title` and favicon in `nuxt.config.ts`. The layer extension and hook config should be kept as-is from the template.

### 5. Auth Worker Allowed Origins

If the site needs inline editing (GitHub OAuth), add the site's deployed URL to the auth worker's allowed origins:

- **Local config:** Edit `packages/github-auth-worker/wrangler.toml` → `ALLOWED_ORIGINS` (comma-separated list)
- **Production:** Update `ALLOWED_ORIGINS` in the Cloudflare Worker dashboard (Settings → Variables)

Both localhost and production URLs need to be present. Example:
```toml
ALLOWED_ORIGINS = "http://localhost:3123,https://new-site.app.dev.kurrawong.ai"
```

After updating, redeploy the worker:
```bash
cd packages/github-auth-worker
npx wrangler deploy
```

See `docs/3-features/github-oauth-setup.md` for full OAuth setup details.

---

## CI/CD Workflows

Sites call prez-lite's reusable workflows. Copy the workflow files from the template (`.github/workflows/`) and configure GitHub repo variables and secrets.

### Required GitHub Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `PREZ_LITE_VERSION` | Pin prez-lite version | `main` or a commit SHA |
| `DEV_BUCKET_NAME` | S3 bucket for deployment | `my-site-bucket` |
| `DEV_CDN_ID` | CloudFront distribution ID | `E1234567890` |

### Required GitHub Secrets

| Secret | Purpose |
|--------|---------|
| `AWS_ROLE_ARN` | OIDC role for S3/CloudFront access |

### Optional Variables (for inline editing)

| Variable | Purpose |
|----------|---------|
| `GH_CLIENT_ID` | GitHub App OAuth client ID |
| `GH_AUTH_WORKER_URL` | Cloudflare Worker URL |
| `GH_REPO` | Target repo (`Org/repo-name`) |
| `GH_BRANCH` | Target branch (usually `main`) |
| `GH_VOCAB_PATH` | Vocab directory path (usually `data/vocabs`) |

### Workflow Files

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `deploy-aws.yml` | Manual | Build + deploy to S3/CloudFront |
| `process-data.yml` | Push to main (*.ttl changes) | Incremental vocab processing |
| `validate-vocabs.yml` | Manual | SHACL validation |
| `get-background-labels.yml` | Manual | Fetch labels from SPARQL endpoint |

### Custom Directory Paths

All reusable workflows accept optional path inputs (defaults match the standard layout):

| Input | Default | Purpose |
|-------|---------|---------|
| `vocab-source-dir` | `data/vocabs` | Vocabulary TTL source directory |
| `background-dir` | `data/background` | Background label TTL directory |
| `config-dir` | `data/config` | Profiles and config directory |
| `validators-dir` | `data/validators` | SHACL validation shapes directory |

Example for a repo with vocabs in `vocabularies/`:
```yaml
jobs:
  process:
    uses: Kurrawong/prez-lite/.github/workflows/site-process-data.yml@main
    with:
      vocab-source-dir: vocabularies
```

---

## Data Processing

### Local (monorepo)

```bash
pnpm process    # Runs scripts/process-vocabs.js
```

The script auto-detects the monorepo and uses `packages/data-processing` directly.

### CI/Standalone

Reusable workflows use the `fetch-prez-lite-tools` composite action to sparse-clone prez-lite's data-processing pipeline at build time.

### Output

Processing generates `public/export/` (gitignored):

```
public/export/
├── vocabs/{name}/          # Per-vocab exports (ttl, json, jsonld, rdf, csv)
└── system/
    ├── vocabularies/index.json   # Vocab metadata index
    ├── labels.json               # Background labels
    └── search/                   # Full-text search index
```

---

## Working with Sites in the Monorepo

### Key Rules

1. **Always check if a site already exists** in `packages/sites/` before cloning
2. **Work in-place** — never clone a site elsewhere; the monorepo path enables local layer detection
3. **Commit from within the site directory** — each site has its own `.git`
4. **Sites are not in the pnpm workspace** for build purposes — they have their own `pnpm-workspace.yaml` with just `'.'`
5. **`public/export/` is gitignored** — CI regenerates it; run `pnpm process` locally

### Development

```bash
cd packages/sites/{name}
pnpm dev                     # Uses local web/ layer automatically
```

### Deploying

Push to the site's own remote. CI workflows handle processing and deployment:

```bash
cd packages/sites/{name}
git add -A && git commit -m "feat: add new vocabulary"
git push origin main
```

---

## Checklist: New Site Setup

- [ ] Repo created (from template or existing)
- [ ] Cloned to `packages/sites/{name}/`
- [ ] `pnpm install` completed
- [ ] Vocabularies added to `data/vocabs/`
- [ ] `app/app.config.ts` customised (name, colors, footer)
- [ ] `content/index.md` and `content/about.md` updated
- [ ] `nuxt.config.ts` head title set
- [ ] `pnpm process && pnpm dev` works locally
- [ ] GitHub repo variables configured (PREZ_LITE_VERSION, DEV_BUCKET_NAME, etc.)
- [ ] GitHub repo secrets configured (AWS_ROLE_ARN)
- [ ] Auth worker `ALLOWED_ORIGINS` updated (if inline editing needed)
- [ ] Workflows tested (process-data, deploy-aws)
