# prez-lite Project Guide

> A lightweight vocabulary browser for publishing SKOS vocabularies as static sites.

## Project Overview

prez-lite generates static websites from SKOS vocabulary files (TTL format), featuring:
- Vocabulary browsing with hierarchical navigation
- Full-text search across concepts
- Multiple export formats (TTL, JSON, JSON-LD, RDF/XML, CSV)
- Embeddable web components
- Profile-driven configuration (SHACL)

## Repository Structure

```
prez-lite/
├── .github/
│   ├── actions/           # Composite actions (fetch-prez-lite-tools, process-vocabs)
│   └── workflows/         # CI/CD workflows (build, deploy, test, validate)
│       ├── *.yml          # Internal workflows (build-site, deploy-aws, test, etc.)
│       └── site-*.yml     # Reusable workflows for client repos
├── data/                  # Vocabulary source data
│   ├── vocabs/            # TTL vocabulary files
│   ├── config/            # SHACL profiles configuration
│   ├── background/        # Background label TTL files
│   └── validators/        # SHACL validation shapes
├── web/                   # Nuxt 4 application (base layer)
│   ├── app/               # Vue components, pages, composables, app.config
│   ├── content/           # Nuxt Content markdown pages
│   ├── public/            # Static assets (export/ is generated, gitignored)
│   └── tests/             # Vitest unit, component, integration, e2e tests
├── packages/
│   ├── data-processing/   # TTL → JSON pipeline (N3.js, SHACL profiles)
│   ├── web-components/    # Lit-based embeddable components (prez-lite.min.js)
│   ├── github-auth-worker/# Cloudflare Worker for GitHub OAuth (inline editing)
│   ├── sites/             # Client site implementations
│   │   └── suncorp-vpp/   # Suncorp VPP (extends web/ as Nuxt layer)
│   ├── gh-templates/      # GitHub template repositories
│   │   └── default/       # Standard vocabulary template (subtree sync)
│   └── examples/          # Example data and configurations
├── sample-data/           # Fallback sample vocabs (used when data/ is empty)
├── docs/                  # Project documentation
├── scripts/               # Build utilities (deploy, sync, labels, validation)
└── resources/             # Static resources
```

## Documentation Structure

Documentation in `/docs` is organized by concern:

| Folder | Purpose |
|--------|---------|
| `1-vision/` | Principles, standards, architecture |
| `2-specification/` | Normative specs (data model, profiles, APIs) |
| `3-features/` | Feature documentation |
| `4-roadmap/` | Status, milestones, changelog, backlog |
| `5-technical/` | Setup, deployment, performance |
| `archive/` | Historical documents |

## Documentation Maintenance

**When completing a feature:**
1. Update the feature doc in `docs/3-features/`
2. Add entry to `docs/4-roadmap/CHANGELOG.md`
3. Update `docs/4-roadmap/current.md` if milestone completed

**When changing specifications:**
1. Update the relevant spec in `docs/2-specification/`
2. Note the change in the spec's changelog section
3. Check if other docs reference the changed spec

**When planning new work:**
1. Add to `docs/4-roadmap/backlog.md` with priority
2. Create an `Idea-*.md` file only for exploratory design
3. Move to `docs/3-features/` once design is stable

## Status Indicators

Use these in document headers and inline:

| Symbol | Meaning |
|--------|---------|
| ✅ | Complete |
| 🔄 | In Progress |
| ⚠️ | Needs Update |
| ❌ | Not Started |
| 📋 | Planned |
| 💡 | Future Idea |

## Key Files to Update

| When... | Update... |
|---------|-----------|
| Feature complete | `docs/4-roadmap/CHANGELOG.md` |
| Starting new phase | `docs/4-roadmap/current.md` |
| Bug fix or small change | Commit message only |
| API/spec change | `docs/2-specification/` + changelog |
| New idea documented | Create `Idea-*.md`, later migrate |

## Code Conventions

### Vue/Nuxt
- Composition API with `<script setup>`
- TypeScript strict mode
- Nuxt UI v4 components
- Tailwind CSS for styling

### Data Processing
- N3.js for RDF parsing
- SHACL profiles drive all configuration
- Output JSON follows `docs/2-specification/json-contract.md`

### Web Components
- Lit library
- Single bundled file (`prez-lite.min.js`)
- Autonomous (fetch own data)

## Current Focus

**Phase 3: Authoring** (In Progress)
- Phase 1 Core Browser: ✅ Complete
- Phase 2 Sharing: ✅ Complete
- Phase 4 Data Processing: ✅ Complete
- Profile Helper: 🔄 In Progress (UX improvements)

**Overall: ~90% feature complete**

See `docs/4-roadmap/milestones.md` for detailed status.

## Commands

```bash
# Development
pnpm --filter web dev                          # Start Nuxt dev server (port 3123)

# Process vocabulary data (TTL → JSON exports)
pnpm build:all-export                          # Full pipeline: clean, process, metadata, search index
pnpm build:vocabs                              # Process vocab TTL files only
pnpm build:vocab-metadata                      # Generate vocabulary metadata index
pnpm build:search                              # Generate search index

# Build & deploy
pnpm --filter web generate                     # Build static site
pnpm --filter @prez-lite/web-components build  # Build web components bundle

# Testing
pnpm --filter @prez-lite/web test:unit         # Run unit + component tests
pnpm --filter @prez-lite/web test:integration  # Run integration tests

# Type check
pnpm --filter web nuxt typecheck
```

## Reusable Workflows

The `site-*.yml` workflows in `.github/workflows/` are reusable by client repos (e.g. `suncorp-vpp`). They use composite actions in `.github/actions/` to clone prez-lite tools. The repo must be public for cross-repo workflow access.

## Client Sites (`packages/sites/`)

Client sites extend `web/` as a Nuxt layer, overriding components, content, and config:
- `nuxt.config.ts` auto-detects monorepo vs standalone (GitHub layer)
- `app/app.config.ts` overrides site name, branding, breadcrumb behavior
- `app/components/` overrides SiteHeader, SiteFooter, etc.
- Caller workflows in `.github/workflows/` invoke prez-lite's reusable workflows
- `public/export/` is gitignored — CI regenerates it

## Template Repository (`packages/gh-templates/default/`)

- **Not in pnpm workspace** — has its own `package.json` and `node_modules/`
- Synced to `Kurrawong/prez-lite-template-default` via git subtree

```bash
cd packages/gh-templates/default
pnpm install        # independent install
pnpm process        # regenerate vocab exports (auto-detects monorepo)
pnpm dev            # start dev server

# Subtree sync
./scripts/sync-template-push.sh   # push to prez-lite-template-default
./scripts/sync-template-pull.sh   # pull changes back (squashed)
```

## Important Principles

1. **Static-First**: No runtime SPARQL dependencies
2. **Standards-Based**: SKOS, DCAT, SHACL, Schema.org
3. **Profile-Driven**: Profiles control all rendering/output
4. **Progressive**: Start simple, add complexity as needed

## Don't Forget

- Update docs when changing features
- Add changelog entries for user-visible changes
- Keep specs in sync with implementation
- Archive old docs rather than deleting
