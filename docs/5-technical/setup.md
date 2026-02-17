---
title: Setup Guide
status: current
updated: 2025-02-08
---

# Setup Guide

> Two paths: contribute to prez-lite or deploy your own vocabulary site.

## Choose Your Path

| I want to... | Go to |
|--------------|-------|
| **Deploy my own vocabulary site** | [User Setup](#user-setup-deploying-your-own-site) |
| **Contribute to prez-lite** | [Developer Setup](#developer-setup-contributing-to-prez-lite) |

---

## User Setup: Deploying Your Own Site

The recommended way to use prez-lite is via **GitHub Template**.

### How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                    YOUR REPOSITORY                               │
│  (created from gh-template)                                      │
├─────────────────────────────────────────────────────────────────┤
│  data/vocabs/           Your TTL vocabularies                   │
│  content/               Your custom pages                        │
│  app.config.ts          Your branding/config                     │
│  nuxt.config.ts         extends: github:Kurrawong/prez-lite     │
│                                                                 │
│  .github/workflows/     Build + Deploy actions                   │
│     └── deploy.yml      Calls prez-lite data processing        │
└───────────────────────────┬─────────────────────────────────────┘
                            │ extends
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              PREZ-LITE (github:Kurrawong/prez-lite)             │
│  Pages, components, composables, styling                         │
└─────────────────────────────────────────────────────────────────┘
```

### Benefits

| Benefit | Description |
|---------|-------------|
| **Autonomy** | Your repo, your data, your static assets |
| **Quick Start** | One-click template, minimal config |
| **Automatic Updates** | Get prez-lite improvements via layer |
| **Custom Branding** | Override any page, component, or style |
| **Your Domain** | Serve from your own domain |
| **Your Web Components** | Built components serve from your site |

### Step 1: Create Repository from Template

1. Go to [prez-lite-template](https://github.com/Kurrawong/prez-lite-template) *(coming soon)*
2. Click "Use this template"
3. Name your repository
4. Clone locally

### Step 2: Add Your Vocabularies

Place TTL files in `data/vocabs/`:

```
your-repo/
├── data/
│   └── vocabs/
│       ├── my-vocabulary.ttl
│       └── another-vocab.ttl
```

### Step 3: Configure Your Site

Edit `app.config.ts`:

```typescript
export default defineAppConfig({
  site: {
    name: 'My Vocabulary Server',
    tagline: 'Published SKOS vocabularies',
    logo: '/logo.png',
    footerText: '© 2025 My Organization'
  }
})
```

### Step 4: Deploy

The GitHub Action handles everything:
1. Processes your TTL vocabularies
2. Generates all export formats
3. Builds the static site
4. Deploys to your chosen host

#### Deployment Targets

| Target | Config |
|--------|--------|
| GitHub Pages | Default, zero config |
| Azure Static Web Apps | Set `AZURE_STATIC_WEB_APPS_API_TOKEN` |
| AWS S3 + CloudFront | Set AWS credentials |
| Cloudflare Pages | Connect repo in dashboard |

### Customization

#### Override Pages

Create files in `app/pages/` to override:

```
your-repo/
├── app/
│   └── pages/
│       └── index.vue    # Custom home page
```

#### Custom Styles

Edit `assets/css/theme.css`:

```css
:root {
  --color-primary: #1e40af;
  --font-sans: 'Inter', sans-serif;
}
```

#### Custom Content

Add markdown in `content/`:

```
your-repo/
├── content/
│   ├── about.md
│   └── guidelines.md
```

---

## Developer Setup: Contributing to prez-lite

For contributing to the prez-lite project itself.

### Prerequisites

- Node.js 22+
- pnpm 9+
- Git

### Clone and Install

```bash
git clone https://github.com/Kurrawong/prez-lite.git
cd prez-lite
pnpm install
```

### Project Structure

```
prez-lite/
├── web/                          # Nuxt 4 application
│   ├── app/
│   │   ├── pages/                # Route pages
│   │   ├── components/           # Vue components
│   │   ├── composables/          # Data utilities
│   │   └── utils/                # Utilities including SHACL parser
│   ├── content/                  # Markdown content
│   ├── public/                   # Static assets
│   └── nuxt.config.ts
│
├── packages/
│   ├── data-processing/          # TTL → JSON pipeline
│   │   └── scripts/              # Processing scripts
│   ├── web-components/           # Lit web components
│   └── gh-templates/             # GitHub template repositories
│       └── default/              # Standard vocabulary template
│
├── docs/                         # Documentation
└── pnpm-workspace.yaml           # Monorepo config
```

### Workspace Packages

| Package | Path | Purpose |
|---------|------|---------|
| `@prez-lite/web` | `web/` | Main Nuxt application |
| `@prez-lite/data-processing` | `packages/data-processing/` | Vocabulary processing pipeline |
| `@prez-lite/web-components` | `packages/web-components/` | Embeddable Lit components |

### GitHub Templates

Templates for user repositories live outside the workspace:

```
packages/gh-templates/
├── default/              # Standard vocabulary site
├── catalog/              # Vocabularies + data catalogs (planned)
└── spatial/              # Vocabularies + maps (planned)
```

These are standalone Nuxt apps that extend prez-lite, not workspace members.

### Commands

#### Web Application

```bash
# Development server
pnpm --filter web dev

# Type checking
pnpm --filter web nuxt typecheck

# Generate static site
pnpm --filter web generate

# Preview static site
pnpm --filter web preview
```

#### Data Processing

```bash
# Process all example vocabularies
pnpm --filter data-processing process:all

# Process specific vocabulary
pnpm --filter data-processing process:ga:vocab

# Run tests
pnpm --filter data-processing test
```

#### Web Components

```bash
# Build components
pnpm --filter web-components build

# Development mode
pnpm --filter web-components dev
```

---

## Key Technologies

### SHACL Profile Parsing

prez-lite uses a custom SHACL parser (`web/app/utils/shacl-profile-parser.ts`) built on **N3.js**.

**Capabilities:**
- Parse `prof:Profile` definitions
- Extract `sh:NodeShape` with `sh:targetClass`
- Process `sh:property` for property paths
- Handle `prez:*` annotations for generation flags
- Support `altr-ext:*` for content negotiation

**Usage:**

```typescript
import { parseProfilesContent } from '~/utils/shacl-profile-parser'

const profiles = await parseProfilesContent(ttlContent)
// Returns: ParsedProfile[]
```

### Data Processing Pipeline

The `@prez-lite/data-processing` package transforms TTL into web-ready formats.

**Scripts:**

| Script | Purpose |
|--------|---------|
| `process-vocab.js` | Main pipeline orchestrator |
| `generate-vocab-metadata.js` | Extract scheme metadata |
| `generate-search-index.js` | Build Orama search index |
| `generate-labels.js` | Extract label cache |

**Dependencies:**
- `n3` - RDF parsing
- `jsonld` - JSON-LD serialization
- `@orama/orama` - Search indexing
- `@fast-csv/format` - CSV generation

### RDF Libraries

| Library | Purpose | Location |
|---------|---------|----------|
| **N3.js** | Parse/serialize RDF | Both web and data-processing |
| **JSON-LD** | JSON-LD processing | data-processing |

prez-lite does NOT use a separate SHACL validation library - it implements focused parsing for profile extraction.

---

## Template Variants

Templates live in `packages/gh-templates/`:

| Template | Path | Use Case | Status |
|----------|------|----------|--------|
| **default** | `gh-templates/default/` | Standard vocabulary site | Available |
| **catalog** | `gh-templates/catalog/` | Vocabularies + Data catalogs | Planned |
| **spatial** | `gh-templates/spatial/` | Vocabularies + Maps | Planned |

Each template is a standalone Nuxt project that:
- Extends prez-lite via `github:Kurrawong/prez-lite`
- Has its own `pnpm-workspace.yaml` (not part of main workspace)
- Includes GitHub Actions for build/deploy
- Can be used as a GitHub template repository

---

## Configuration Reference

### `nuxt.config.ts` (User Repo)

```typescript
export default defineNuxtConfig({
  // Extend prez-lite
  extends: ['github:Kurrawong/prez-lite'],

  // Or pin to version
  extends: ['github:Kurrawong/prez-lite#v1.0.0'],
})
```

### `app.config.ts`

```typescript
export default defineAppConfig({
  site: {
    name: 'My Vocabularies',
    tagline: 'SKOS vocabulary publishing',
    logo: '/logo.png',
    footerText: '© 2025',
    footerLinks: [
      { label: 'GitHub', url: 'https://github.com/...' }
    ]
  }
})
```

### Environment Variables

| Variable | Purpose | Where |
|----------|---------|-------|
| `GIGET_AUTH` | GitHub token for private repos | CI/CD |
| `AZURE_STATIC_WEB_APPS_API_TOKEN` | Azure deployment | CI/CD |
| `AWS_ACCESS_KEY_ID` | AWS deployment | CI/CD |

---

## Troubleshooting

### Monaco Editor Not Loading

Restart dev server after fresh install:
```bash
pnpm --filter web dev
```

### Missing Data

If pages show no data:
1. Check `web/public/export/` exists
2. Run data processing scripts
3. Or use sample data fallback

To keep local changes under `web/public/export/` from being committed (folder is updated by the Process Data GitHub Action), run `./scripts/skip-export-worktree.sh` once after clone. See `scripts/README.md`.

### Layer Not Resolving

Check `GIGET_AUTH` token if using private repos:
```bash
export GIGET_AUTH=ghp_your_token_here
pnpm nuxt dev
```

---

## Next Steps

| For Users | For Contributors |
|-----------|------------------|
| [Use Cases](../1-vision/use-cases.md) | [Architecture](../1-vision/architecture.md) |
| [Features Overview](../3-features/README.md) | [Data Pipeline](data-pipeline.md) |
| | [Performance](performance.md) |
