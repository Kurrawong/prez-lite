# Prez Lite Distribution Assessment

## Executive Summary

This document assesses options for structuring prez-lite to enable organizations to easily publish their vocabularies as static sites. The recommended approach uses **Nuxt Layers** combined with a **GitHub Template Repository**, providing both simplicity for basic users and flexibility for advanced customization.

---

## Current State

The current repo contains:
- Vocabulary TTL files (`data/vocabs/`)
- Build scripts (`scripts/build-data.js`)
- Nuxt web application (`web/`)
- GitHub Actions for deployment
- Resource cloning scripts

This monolithic structure works for development but doesn't scale for multi-organization use.

---

## Distribution Options Analysis

### Option 1: Nuxt Layers (Recommended)

**How it works:** Nuxt 3 supports "layers" - a way to extend a base Nuxt application. Organizations create a minimal Nuxt app that extends prez-lite as a layer.

**Pros:**
- Native Nuxt feature, well-documented
- Full override capability (pages, components, composables, styles)
- TypeScript support with proper types
- No build step for prez-lite itself - consumed directly
- Works with npm or git references

**Cons:**
- Requires basic Nuxt knowledge
- Slightly more setup than a pure template

**Example organization repo structure:**
```
my-vocabs/
├── data/
│   └── vocabs/           # Organization's TTL files
├── app/                  # Optional overrides
│   ├── pages/           # Override any page
│   │   └── index.vue    # Custom home page
│   └── components/      # Custom components
├── assets/
│   └── css/
│       └── custom.css   # Custom styles/colors
├── content/             # Custom markdown pages
│   └── about.md
├── public/
│   └── logo.svg         # Organization logo
├── app.config.ts        # Site configuration
├── nuxt.config.ts       # Extends prez-lite
├── package.json
└── .github/
    └── workflows/
        └── deploy.yml   # Uses reusable workflow
```

**nuxt.config.ts:**
```typescript
export default defineNuxtConfig({
  extends: ['github:Kurrawong/prez-lite/web'],
  // Or if published to npm:
  // extends: ['@kurrawong/prez-lite'],
})
```

---

### Option 2: GitHub Template Repository

**How it works:** A template repo that organizations clone/fork to create their own instance.

**Pros:**
- One-click setup via GitHub "Use this template"
- No npm publishing required
- Easy to understand for non-developers
- Full control from day one

**Cons:**
- No automatic updates from upstream
- Organizations must manually merge upstream changes
- Duplicates code across organizations

**Best for:** Organizations wanting complete independence or significant customization.

---

### Option 3: npm Package

**How it works:** Publish prez-lite as an npm package that organizations install.

**Pros:**
- Standard distribution method
- Semantic versioning for updates
- Works well with Nuxt layers

**Cons:**
- Requires npm account and publishing workflow
- More complex release process

**Recommendation:** Combine with Nuxt layers - publish to npm for stable releases while allowing git references for development.

---

### Option 4: GitHub Actions Only (Not Recommended)

**How it works:** Organizations only have TTL files; GitHub Actions pull prez-lite and build everything.

**Pros:**
- Minimal organization repo
- Always uses latest prez-lite

**Cons:**
- No local development
- Limited customization
- Slow CI builds
- Complex debugging

---

## Recommended Architecture

### Two-Repo Strategy

**Repo 1: `prez-lite` (This repo, restructured)**
```
prez-lite/
├── web/                          # Nuxt application (the layer)
│   ├── app/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── composables/
│   │   └── assets/
│   ├── nuxt.config.ts
│   └── package.json
├── scripts/
│   ├── build-data.js            # Data build script
│   └── fetch-labels.js          # Background labels fetcher
├── actions/                      # Reusable GitHub Actions
│   ├── build-data/
│   │   └── action.yml
│   └── deploy-static/
│       └── action.yml
├── template/                     # Template for new org repos
│   ├── data/vocabs/.gitkeep
│   ├── nuxt.config.ts
│   ├── app.config.ts
│   ├── package.json
│   └── .github/workflows/deploy.yml
├── example/                      # Working example (for testing)
│   ├── data/vocabs/
│   └── ... (minimal config)
└── docs/
    └── getting-started.md
```

**Repo 2: Organization Vocab Repo (from template)**
```
org-vocabularies/
├── data/
│   └── vocabs/
│       ├── vocab1.ttl
│       └── vocab2.ttl
├── app/                          # Optional overrides
│   └── pages/
│       └── index.vue            # Custom home page
├── content/
│   ├── index.md                 # Home page content
│   └── about.md                 # About page content
├── public/
│   └── logo.png
├── assets/
│   └── css/
│       └── theme.css            # Color overrides
├── prez-lite.config.ts          # Prez-lite specific config
├── app.config.ts                # Nuxt UI / runtime config
├── nuxt.config.ts
├── package.json
└── .github/
    └── workflows/
        └── deploy.yml
```

---

## Configuration System

### `prez-lite.config.ts` (Organization repo)
```typescript
export default {
  site: {
    name: 'GSWA Vocabularies',
    tagline: 'Geological Survey of Western Australia',
    logo: '/logo.png',
    footerText: 'Published by GSWA',
    footerLinks: [
      { label: 'GSWA', href: 'https://dmp.wa.gov.au/gswa' },
      { label: 'GitHub', href: 'https://github.com/Kurrawong/gswa-vocabs' }
    ]
  },
  labels: {
    preferredLanguages: ['en', 'en-AU'],
    // External label sources for resolution
    sources: [
      'https://linked.data.gov.au/def/reg-statuses',
      'https://www.w3.org/2004/02/skos/core'
    ]
  },
  build: {
    // Output directory for generated JSON
    outputDir: '.data',
    // Include/exclude patterns for TTL files
    include: ['data/vocabs/**/*.ttl'],
    exclude: ['**/test-*.ttl']
  }
}
```

### `app.config.ts` (Runtime theming)
```typescript
export default defineAppConfig({
  ui: {
    colors: {
      primary: 'blue',
      neutral: 'slate'
    }
  }
})
```

### `assets/css/theme.css` (Style overrides)
```css
:root {
  --ui-color-primary-500: #1e40af; /* Custom blue */
  --font-sans: 'Public Sans', system-ui, sans-serif;
}
```

---

## Reusable GitHub Actions

### `actions/build-data/action.yml`
```yaml
name: 'Build Prez Lite Data'
description: 'Convert TTL vocabularies to JSON for Prez Lite'
inputs:
  vocab-path:
    description: 'Path to vocabulary TTL files'
    default: 'data/vocabs'
  output-path:
    description: 'Output path for JSON files'
    default: '.data'
  labels-config:
    description: 'Path to labels configuration'
    default: 'prez-lite.config.ts'
runs:
  using: 'composite'
  steps:
    - uses: actions/setup-node@v4
      with:
        node-version: '20'
    - run: npx prez-lite-build --vocabs ${{ inputs.vocab-path }} --output ${{ inputs.output-path }}
      shell: bash
```

### Organization workflow using reusable action
```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build vocabulary data
        uses: Kurrawong/prez-lite/actions/build-data@main
        with:
          vocab-path: data/vocabs

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install and build
        run: |
          npm install
          npm run generate

      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: .output/public
```

---

## Deployment Options

### GitHub Pages (Default)
- Zero cost
- Automatic HTTPS
- Simple setup via GitHub Actions

### Azure Static Web Apps
```yaml
- name: Deploy to Azure
  uses: Azure/static-web-apps-deploy@v1
  with:
    azure_static_web_apps_api_token: ${{ secrets.AZURE_TOKEN }}
    app_location: '.output/public'
```

### AWS S3 + CloudFront
```yaml
- name: Deploy to S3
  uses: jakejarvis/s3-sync-action@master
  with:
    args: --delete
  env:
    AWS_S3_BUCKET: ${{ secrets.AWS_BUCKET }}
    SOURCE_DIR: '.output/public'
```

### Cloudflare Pages
```yaml
- name: Deploy to Cloudflare
  uses: cloudflare/pages-action@v1
  with:
    apiToken: ${{ secrets.CF_API_TOKEN }}
    accountId: ${{ secrets.CF_ACCOUNT_ID }}
    projectName: my-vocabs
    directory: .output/public
```

---

## Recommended Implementation Plan

### Phase 1: Restructure prez-lite repo
1. Move web app to be layer-compatible
2. Extract build scripts to standalone CLI tool
3. Create reusable GitHub Actions
4. Set up npm publishing workflow

### Phase 2: Create template system
1. Create `template/` directory with minimal starter
2. Document configuration options
3. Create `example/` directory for testing
4. Set up template sync workflow

### Phase 3: Documentation and testing
1. Write getting-started guide
2. Create video walkthrough
3. Test with 2-3 pilot organizations
4. Refine based on feedback

### Phase 4: Advanced features
1. CLI tool for scaffolding (`npx create-prez-lite`)
2. VS Code extension for vocabulary editing
3. Preview deployments for PRs
4. Automated vocabulary validation

---

## Comparison Summary

| Approach | Setup Complexity | Customization | Updates | Best For |
|----------|-----------------|---------------|---------|----------|
| Nuxt Layer + npm | Low | High | Automatic via npm | Most organizations |
| GitHub Template | Very Low | Full | Manual merge | Independent projects |
| Git submodule | Medium | Medium | Manual | Advanced users |
| Actions only | Very Low | None | Automatic | Simple publishing |

---

## Recommendation

**Use Nuxt Layers with GitHub Template:**

1. **Publish prez-lite to npm** as `@kurrawong/prez-lite`
2. **Create GitHub template repo** with minimal config that extends the npm package
3. **Provide reusable GitHub Actions** for common build/deploy tasks
4. **Support both simple and advanced** customization patterns

This approach:
- Enables one-click setup via "Use this template"
- Allows automatic updates via npm version bumps
- Supports full customization when needed
- Works with any deployment target
- Maintains a single source of truth for the core app

Organizations can start simple (just add TTL files and deploy) and progressively customize as needed (override pages, add components, change styles).

---

## Example: Minimal Organization Setup

**Total files needed for basic setup: 5**

```
my-vocabs/
├── data/vocabs/
│   └── my-vocab.ttl              # Their vocabulary
├── public/
│   └── logo.png                  # Their logo
├── prez-lite.config.ts           # Site name, etc.
├── nuxt.config.ts                # extends: ['@kurrawong/prez-lite']
├── package.json                  # dependencies
└── .github/workflows/deploy.yml  # Copy from template
```

**package.json:**
```json
{
  "name": "my-vocabs",
  "private": true,
  "scripts": {
    "dev": "nuxt dev",
    "build": "nuxt build",
    "generate": "nuxt generate"
  },
  "devDependencies": {
    "@kurrawong/prez-lite": "^1.0.0",
    "nuxt": "^3.14.0"
  }
}
```

**nuxt.config.ts:**
```typescript
export default defineNuxtConfig({
  extends: ['@kurrawong/prez-lite']
})
```

This is the absolute minimum an organization needs to publish their vocabularies.
