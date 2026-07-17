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
│   ├── sites/             # Client site implementations (separate repos, gitignored)
│   ├── gh-templates/      # GitHub template repositories
│   │   └── default/       # Standard vocabulary template (subtree sync)
│   └── examples/          # Example data and configurations
├── sample-data/           # Fallback sample vocabs (used when data/ is empty)
├── docs/                  # Project documentation
├── scripts/               # Build utilities (deploy, sync, labels, validation)
└── resources/             # Static resources
```

## Important: Child Repos in the Monorepo

**Client sites** (`packages/sites/*`) are **separate git repositories** checked out within the prez-lite monorepo for convenience. They are **not part of the main prez-lite project**.

**Template sources** (`packages/gh-templates/*`) are part of the main prez-lite repository and are mirrored to public GitHub template repositories using `git subtree`. The default template publishes to `Kurrawong/prez-lite-template-default`.

- Each directory under `packages/sites/` has its own `.git` directory and remote
- Template source directories under `packages/gh-templates/` do not have their own `.git` directories
- Site repos are listed in `.gitignore` so changes don't affect the main prez-lite repo
- Always work with site repos in-place — never clone them elsewhere

**Before cloning a child site:**
1. Check if it already exists in `packages/sites/`
2. If it exists, navigate to that directory and work with it directly
3. Only clone separately if you need it outside the monorepo structure

This arrangement allows convenient side-by-side development while keeping site repositories independent and template sources versioned with prez-lite.

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

Each site under `packages/sites/` is its own repo — commit and push directly from within the site directory.

## Template Repository (`packages/gh-templates/default/`)

- **Not in pnpm workspace** — has its own `package.json` and `node_modules/`
- Source directory tracked by this repo
- Public GitHub template repo: `Kurrawong/prez-lite-template-default`
- Sync to/from the public template with `scripts/sync-template-push.sh` and `scripts/sync-template-pull.sh`

```bash
cd packages/gh-templates/default
pnpm install        # independent install
pnpm process        # regenerate vocab exports (auto-detects monorepo)
pnpm dev            # start dev server

# From repo root, publish source changes to the public template repo
./scripts/sync-template-push.sh main
```

## Important Principles

1. **Static-First**: No runtime SPARQL dependencies
2. **Standards-Based**: SKOS, DCAT, SHACL, Schema.org
3. **Profile-Driven**: Profiles control all rendering/output
4. **Progressive**: Start simple, add complexity as needed

## PR and Commit Conventions

- PR titles must use **lowercase** conventional commit format: `type: description`
- Valid types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`
- Do not include "Generated with Claude Code" in PRs, commits, comments, or issues

## Widget Development Checklist

When adding a new `EditableProperty['fieldType']` to `useEditMode.ts` (or a new render branch in `InlineEditTable.vue` / `ConceptForm.vue`):

1. **Lifecycle check** — verify the full happy *and* edge path before commit: add → edit value → clear value → add a second value → remove → save → reload from GitHub. Walking only the "does it render" path misses the bugs that ship.
2. **Validation parity** — add a matching rule in `validateSubject` the moment the new field type is introduced. e.g. an IRI-typed field must reject empty / non-IRI values; a date field must reject malformed dates. Validation rules and field types travel together.
3. **Defensive serialisation** — `serializeWithPatch` and `serializeToTTL` must refuse to emit invalid quads (empty `NamedNode`s, malformed URIs, literals without required language tags). Audit these functions when introducing a new value-shape.
4. **Unit tests in the same PR** — cover at minimum: (a) widget dispatch from a representative profile shape (`getPropertiesForSubject` picks the right `fieldType`), (b) full mutation cycle (`addValue` → `updateValue('')` → store state), and (c) the resulting TTL is valid (no empty-IRI quads, no broken literals).
5. **Profile parser parity** — every new SHACL constraint the widget consumes (e.g. `sh:nodeKind`, `sh:hasValue`) must be extracted in `web/app/utils/shacl-profile-parser.ts` *and* emitted by `packages/data-processing/scripts/process-vocab.js`. Without both, the constraint silently disappears between `profiles.ttl` and the running app.

## Don't Forget

- Update docs when changing features
- Add changelog entries for user-visible changes
- Keep specs in sync with implementation
- Archive old docs rather than deleting
