# CI/CD Workflows

Overview of all GitHub Actions workflows and composite actions in this repository.

## Workflow Map

```mermaid
flowchart LR
  push_main["Push to main"] --> release["Release"]
  push_main --> test["Test"]
  push_main --> proc_data["Process Data"]
  push_vocabs["Push data/vocabs/**"] --> proc_data

  pr["Pull request"] --> test
  pr --> commitlint["Commitlint"]

  dispatch["workflow_dispatch"] --> deploy_aws["Deploy AWS"]
  dispatch --> validate["Validate Vocabs"]
  dispatch --> ai_assess["AI Assess Vocabs"]
  dispatch --> labels["Get Background Labels"]
  dispatch --> proc_data

  wf_call["workflow_call"] --> build_site["Build Site"]
```

---

## Workflows

### Test

> Runs unit, component, integration, and E2E tests in parallel.

| | |
|---|---|
| **File** | `.github/workflows/test.yml` |
| **Trigger** | Auto: push to `main`, pull request to `main` |

```mermaid
flowchart LR
  trigger["Push / PR to main"] --> unit["Unit + Component"]
  trigger --> integration["Integration"]
  trigger --> e2e["E2E (Playwright)"]
  e2e --> artifact["Upload report"]
```

**Jobs** (all run concurrently):
- **unit-and-component** — `pnpm --filter @prez-lite/web test:unit`
- **integration** — `pnpm --filter @prez-lite/web test:integration`
- **e2e** — Installs Playwright Chromium, runs `test:e2e`, uploads report artifact (30 day retention)

---

### Commitlint

> Validates PR titles follow conventional commit format.

| | |
|---|---|
| **File** | `.github/workflows/commitlint.yml` |
| **Trigger** | Auto: PR opened, edited, synchronize, reopened |

```mermaid
flowchart LR
  pr["PR event"] --> check["Validate PR title"]
  check --> pass["feat: fix: docs: chore: ..."]
```

Uses `amannn/action-semantic-pull-request@v5`. Scope not required.

---

### Process Data

> Processes vocabulary TTL files into JSON exports. Supports incremental builds.

| | |
|---|---|
| **File** | `.github/workflows/process-data.yml` |
| **Trigger** | Auto: push to `main` when `data/vocabs/**` changes. Manual: full rebuild. |

```mermaid
flowchart TD
  trigger{"Trigger type?"} -->|Manual dispatch| full["Full rebuild\npnpm build:data"]
  trigger -->|Push to main| detect["Detect changed .ttl files"]
  detect -->|Files changed| incremental["Process changed vocabs only"]
  detect -->|No changes| skip["Skip"]
  incremental --> globals["Regenerate global assets\n(vocab list, metadata, labels, search)"]
  full --> commit["Commit + push exports"]
  globals --> commit
```

Checks out with `fetch-depth: 2` for diff detection. Writes to `web/public/export/`.

---

### Release

> Creates releases via Release Please (conventional commits).

| | |
|---|---|
| **File** | `.github/workflows/release.yml` |
| **Trigger** | Auto: push to `main` |

```mermaid
flowchart LR
  push["Push to main"] --> rp["Release Please"]
  rp -->|"Pending changes"| pr["Create/update release PR"]
  rp -->|"PR merged"| release["Create GitHub Release + tag"]
```

Uses `googleapis/release-please-action@v4`.

---

### Deploy AWS

> Deploys the site or data to S3 + CloudFront.

| | |
|---|---|
| **File** | `.github/workflows/deploy-aws.yml` |
| **Trigger** | Manual: `workflow_dispatch` with `deploy-mode` input |

```mermaid
flowchart TD
  dispatch["Manual trigger"] --> mode{"deploy-mode?"}
  mode -->|full| build["Build static site\npnpm build:site"]
  mode -->|data-only| data["Sync export/ to S3"]
  build --> sync_full["Sync .output/public/ to S3"]
  sync_full --> invalidate["Invalidate CloudFront"]
  data --> invalidate
```

Uses OIDC role assumption for AWS credentials. Requires `AWS_ROLE_ARN` secret and `DEV_BUCKET_NAME` var.

---

### Build Site (Reusable)

> Called by downstream gh-template repos to build and deploy to GitHub Pages.

| | |
|---|---|
| **File** | `.github/workflows/build-site.yml` |
| **Trigger** | `workflow_call` (reusable workflow) |
| **Inputs** | `prez-lite-version` (default: `main`), `node-version` (default: `22`) |

```mermaid
flowchart TD
  call["Template repo calls workflow"] --> fetch["Sparse-clone prez-lite\n(data-processing + shacl parser)"]
  fetch --> process["Process vocabularies\n+ generate metadata"]
  process --> generate["Build static site\npnpm generate"]
  generate --> upload["Upload pages artifact"]
  upload --> deploy["Deploy to GitHub Pages"]
```

Template repos don't bundle the pipeline — this workflow fetches it at build time.

---

### Validate Vocabularies

> Runs SHACL validation on all vocabularies and commits reports.

| | |
|---|---|
| **File** | `.github/workflows/validate-vocabs.yml` |
| **Trigger** | Manual: `workflow_dispatch` |

```mermaid
flowchart LR
  dispatch["Manual trigger"] --> validate["Run SHACL validation\nscripts/run-validation-tests.js"]
  validate --> commit["Commit reports to\ndata/validators/reports/"]
```

---

### AI Assess Vocabularies

> Runs SHACL validation then sends results to an AI worker for remediation reports.

| | |
|---|---|
| **File** | `.github/workflows/ai-assess-vocabs.yml` |
| **Trigger** | Manual: `workflow_dispatch` |

```mermaid
flowchart LR
  dispatch["Manual trigger"] --> validate["SHACL validation"]
  validate --> ai["AI assessment\n(Cloudflare Worker)"]
  ai --> commit["Commit *-ai-report.md\nto data/validators/reports/"]
```

Requires `AI_WORKER_URL` var and `AI_WORKER_KEY` secret.

---

### Get Background Labels

> Fetches labels from a SPARQL endpoint for use as background context.

| | |
|---|---|
| **File** | `.github/workflows/get-background-labels.yml` |
| **Trigger** | Manual: `workflow_dispatch` with optional `endpoint` input |

```mermaid
flowchart LR
  dispatch["Manual trigger"] --> fetch["Query SPARQL endpoint\nfor background labels"]
  fetch --> commit["Commit labels to\ndata/background/"]
```

Default endpoint: `http://demo.dev.kurrawong.ai/sparql`. Requires Python 3.12.

---

## Composite Actions

### Process Vocabularies Action

| | |
|---|---|
| **File** | `.github/actions/process-vocabs/action.yml` |
| **Type** | Composite action |

Encapsulates vocabulary processing for reuse. Accepts `source-dir` or `source-file`, `profiles`, `output-dir`, `background-dir`, and `type`. Outputs `files-processed` count.

```mermaid
flowchart LR
  input["TTL source + profiles"] --> setup["Setup Node + pnpm"]
  setup --> process["Run process-vocab.js"]
  process --> output["files-processed count"]
```

### Deploy Template (for gh-template repos)

| | |
|---|---|
| **File** | `.github/actions/process-vocabs/deploy.yml` |
| **Type** | Workflow template (not reusable — copied into template repos) |
| **Trigger** | Push to `main`/`master`, `workflow_dispatch` |

Self-contained GitHub Pages deploy for repos that have the pipeline locally (this repo or forks). Simpler alternative to the reusable `build-site.yml`.

---

## Trigger Summary

| Workflow | Push | PR | Manual | Called |
|----------|:----:|:--:|:------:|:------:|
| Test | main | main | | |
| Commitlint | | all | | |
| Process Data | `data/vocabs/**` | | yes | |
| Release | main | | | |
| Deploy AWS | | | yes | |
| Build Site | | | | yes |
| Validate Vocabs | | | yes | |
| AI Assess Vocabs | | | yes | |
| Get Background Labels | | | yes | |

## Secrets and Variables

| Name | Type | Used by |
|------|------|---------|
| `AWS_ROLE_ARN` | Secret | Deploy AWS |
| `AI_WORKER_KEY` | Secret | AI Assess |
| `AI_WORKER_URL` | Var | AI Assess |
| `DEV_BUCKET_NAME` | Var | Deploy AWS |
| `DEV_CDN_ID` | Var | Deploy AWS |
| `GH_REPO_SLUG` | Var | Deploy AWS |
| `GH_BRANCH` | Var | Deploy AWS |
| `GH_VOCAB_PATH` | Var | Deploy AWS |
| `GH_CLIENT_ID` | Var | Deploy AWS |
| `GH_AUTH_WORKER_URL` | Var | Deploy AWS |
