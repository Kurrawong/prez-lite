# Next Assessment 02

## Summary
The goal is to make prez-lite easy to adopt for many organisations by splitting core app and tooling into a reusable repo while keeping organisation-specific vocabularies and configuration in a separate, minimal repo. A template-based "simple install" should cover most users, with an "advanced install" for teams that need full control of Nuxt pages and styles.

## Minimal org repo requirements
- store vocabularies in TTL format
- define label preferences and any vocab metadata overrides
- configure app branding (title, logo, description)
- add styling (fonts, colors) and optional page overrides
- build TTL to JSON for the static site
- deploy to a supported target (GH Pages, Azure Static Web Apps, AWS S3/CloudFront)

## Recommended split

### Repo A: `prez-lite` (core)
Responsibilities:
- Nuxt app source
- build scripts (TTL -> JSON, static site build)
- GitHub Actions workflows
- background label retrieval and manifest generation
- default themes and page templates
- docs and templates for adoption

Outputs:
- published npm package (optional) for simple install
- GH Action(s) that can be referenced by org repos
- example "starter" repo or template

### Repo B: org repo (consumer)
Responsibilities:
- vocabularies in TTL
- org-specific config and styling
- optional page overrides
- deployment config for preferred target

## Installation models

### 1) Simple installation (recommended default)
Use a template repo that consumes prebuilt actions/scripts from `prez-lite`.
Pros: minimal setup, consistent upgrades, few moving parts.
Cons: limited control unless overrides are supported via config and file overrides.

### 2) Advanced installation
Org owns a Nuxt app that depends on `prez-lite` as a base layer.
Pros: full control of pages and styling.
Cons: more complex, requires more Nuxt knowledge.

## Recommendations
- Provide a **template GitHub repo** as the primary onboarding path.
- Keep a **"simple install"** workflow that:
  - downloads/uses prez-lite build scripts
  - converts TTL -> JSON
  - builds and deploys the static site
- Provide a **"advanced install"** guide for teams needing custom Nuxt pages.
- Ship a **reference example** inside `prez-lite` that can serve as a test bed and as the seed for the template repo.
- Ensure GH Actions can be **reused from the core repo** via `uses: org/prez-lite/.github/workflows/...`.
- Document **supported deployment targets** and provide example workflows for each.

## Example layouts

### A) `prez-lite` core repo layout
```
prez-lite/
  app/                      # Nuxt app (core pages/components)
  app/pages/                # Default pages (home, search, about, etc.)
  app/styles/               # Default theme variables and base styles
  scripts/
    build-site.sh           # Build pipeline wrapper
    ttl-to-json.js          # Convert TTL to JSON
    labels-sync.js          # Background labels/manifest
  actions/
    build/                  # Reusable GH Action (optional)
  .github/
    workflows/
      build-static.yml      # Reusable workflow for org repos
      release.yml           # Publish action or package (optional)
  examples/
    starter/                # Example org repo structure
  docs/
    simple-install.md
    advanced-install.md
```

### B) Org repo layout (simple install)
```
org-vocab/
  vocab/                    # TTL files
  config/
    app.yml                 # title, logo, description
    labels.yml              # label preferences
  styles/
    theme.css               # overrides for base theme
  pages/                    # optional page overrides
    index.vue
    about.vue
  .github/
    workflows/
      deploy.yml            # uses prez-lite reusable workflow
  manifest.ttl              # optional or generated
  README.md
```

### C) Org repo layout (advanced install)
```
org-vocab/
  app/                      # full Nuxt app
    pages/
    components/
    styles/
  vocab/
  config/
  nuxt.config.ts            # extends prez-lite base
  package.json
  .github/workflows/
```

## Open questions to resolve
- Confirm whether prez-lite should be published as an npm package or as a reusable GH Action only.
- Decide the minimal config file format (YAML vs JSON) and validate schema.
- Decide how page overrides are injected in the simple install path.
- Agree on the required deployment targets and provide templates for each.

