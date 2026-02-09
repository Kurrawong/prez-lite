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
├── web/                    # Nuxt 4 application
│   ├── app/               # Vue components, pages, composables
│   ├── content/           # Nuxt Content markdown pages
│   └── public/            # Static assets, exports
├── packages/
│   ├── data-processing/   # TTL → JSON pipeline
│   ├── web-components/    # Lit-based embeddable components
│   └── gh-templates/      # GitHub template repositories
│       ├── default/       # Standard vocabulary template
│       ├── catalog/       # Vocab + catalogs (planned)
│       └── spatial/       # Vocab + maps (planned)
├── docs/                  # Project documentation
└── scripts/               # Build utilities
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

## Testing Commands

```bash
# Development
pnpm --filter web dev

# Build static site
pnpm --filter web generate

# Type check
pnpm --filter web nuxt typecheck

# Process vocabularies
pnpm --filter data-processing process
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
