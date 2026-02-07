# Documentation Structure Proposal

## Current State Assessment

The `/docs` folder contains 17 markdown files that evolved organically during development. Issues:

| Problem | Examples |
|---------|----------|
| **Duplicated content** | `proposal.md` vs `Idea-Share-Proposal.md` (same feature, different versions) |
| **Unclear status** | Which docs are current vs historical? |
| **No hierarchy** | Everything flat in one folder |
| **Mixed concerns** | Strategic vision mixed with technical specs mixed with implementation plans |
| **Naming inconsistency** | `Next-*.md`, `Idea-*.md`, `PLAN.md`, lowercase `json-contract.md` |

---

## Proposed Structure

```
docs/
├── README.md                    # Documentation index with navigation
│
├── 1-vision/                    # Strategic & Product Direction
│   ├── principles.md           # Core philosophies & design tenets
│   ├── standards.md            # Standards we follow (SKOS, DCAT, SHACL, etc.)
│   ├── use-cases.md            # Business scenarios & user stories
│   └── architecture.md         # High-level system design
│
├── 2-specification/             # What We're Building (Normative)
│   ├── data-model.md           # Catalog/Collection/Item hierarchy
│   ├── profiles.md             # Profile system specification
│   ├── url-structure.md        # URL patterns & routing
│   ├── json-contract.md        # Data format specification
│   └── web-components.md       # Component API specification
│
├── 3-features/                  # Feature Documentation
│   ├── vocabulary-browser.md   # Core vocab browsing
│   ├── search.md               # Search functionality
│   ├── sharing.md              # Export & embed features
│   ├── authoring.md            # Profile/vocab editing (future)
│   └── profile-helper.md       # Profile builder tool
│
├── 4-roadmap/                   # Planning & Status
│   ├── CHANGELOG.md            # Version history
│   ├── milestones.md           # Major releases & goals
│   ├── current.md              # Active sprint/phase
│   ├── backlog.md              # Prioritized future work
│   └── decisions.md            # ADRs (Architecture Decision Records)
│
├── 5-technical/                 # Implementation Details
│   ├── setup.md                # Getting started
│   ├── data-pipeline.md        # Build process
│   ├── deployment.md           # GitHub Pages, Azure, etc.
│   ├── performance.md          # Scaling options
│   └── contributing.md         # Developer guide
│
└── archive/                     # Historical documents
    ├── 2025-01-proposal.md     # Original proposal
    ├── 2025-02-assessments/    # Next-Assessment-*.md files
    └── ...
```

---

## Content Migration Map

| Current File | Destination | Action |
|--------------|-------------|--------|
| `PLAN.md` | `1-vision/architecture.md` | Merge with high-level view |
| `proposal.md` | `archive/2025-01-proposal.md` | Archive (superseded) |
| `Next.md` | `archive/2025-02-assessments/` | Archive |
| `Next-Assessment-01.md` | `archive/2025-02-assessments/` | Archive |
| `Next-Assessment-02.md` | `archive/2025-02-assessments/` | Archive |
| `Next-Plan.md` | `4-roadmap/milestones.md` | Extract milestones, archive details |
| `Done.md` | `4-roadmap/CHANGELOG.md` | Convert to changelog format |
| `json-contract.md` | `2-specification/json-contract.md` | Keep, add status header |
| `Idea-Share.md` | `archive/` | Archive (superseded) |
| `Idea-Share-Proposal.md` | `3-features/sharing.md` | Condense to current spec |
| `Idea-ProfileUI-Helper.md` | `3-features/profile-helper.md` | Merge with Authoring |
| `Idea-Authoring.md` | `3-features/authoring.md` | Keep as feature doc |
| `Idea-Phase2.md` | `4-roadmap/backlog.md` | Extract items to backlog |
| `FrontendMigrationPlan.md` | `5-technical/data-pipeline.md` | Update to current state |
| `DataProcessingTransition.md` | `5-technical/data-pipeline.md` | Merge with above |
| `future-scaling-options.md` | `5-technical/performance.md` | Keep as reference |
| `prerender-guide.md` | `5-technical/performance.md` | Merge with above |

---

## Document Template

Each document should have a standard header:

```markdown
---
title: Feature Name
status: draft | current | stable | deprecated
updated: 2025-02-08
owner: @hjohns
---

# Feature Name

> One-line summary of what this document covers.

## Status

| Aspect | State |
|--------|-------|
| Design | ✅ Complete |
| Implementation | 🔄 In Progress |
| Documentation | ⚠️ Needs Update |
| Tests | ❌ Not Started |

## Overview

Brief description...
```

---

## Navigation: docs/README.md

```markdown
# prez-lite Documentation

> A lightweight vocabulary browser for publishing SKOS vocabularies as static sites.

## Quick Links

| I want to... | Go to |
|--------------|-------|
| Understand the project | [Vision & Principles](1-vision/principles.md) |
| See what's supported | [Specification](2-specification/) |
| Learn about features | [Features](3-features/) |
| Check project status | [Roadmap](4-roadmap/current.md) |
| Set up development | [Technical Guide](5-technical/setup.md) |

## Project Status

```
[■■■■■■■■░░] Phase 1: Core Browser (80%)
[■■■■░░░░░░] Phase 2: Sharing (40%)
[░░░░░░░░░░] Phase 3: Authoring (0%)
[░░░░░░░░░░] Phase 4: Catalogs (0%)
```

## Recent Changes

- **2025-02-08**: Added Profile Helper page
- **2025-02-06**: Data pipeline migration to SHACL profiles
- **2025-02-03**: Share pages implementation

[View full changelog →](4-roadmap/CHANGELOG.md)
```

---

## Website Integration

### Option A: Docs as Nuxt Content (Recommended)

Move docs into `web/content/docs/` to leverage existing Nuxt Content infrastructure:

```
web/content/
├── index.md              # Home page
├── vocabs.md             # Vocab listing
├── share.md              # Share feature
├── docs/                 # Project documentation
│   ├── index.md          # Docs home
│   ├── vision/
│   │   ├── principles.md
│   │   └── ...
│   ├── specification/
│   ├── features/
│   ├── roadmap/
│   └── technical/
```

**Benefits:**
- Rendered with same theme as main site
- MDC components available (callouts, tabs, etc.)
- Automatic navigation generation
- Search included

**Routes:**
- `/docs` - Documentation index
- `/docs/vision/principles` - Principles page
- `/docs/roadmap/current` - Current status

### Option B: Separate Docs Site

Keep `/docs` as markdown files, render with VitePress or similar:

```
/docs site → docs.example.org
/main site → example.org
```

**When to choose:** If docs need different branding or external contributors.

---

## Claude Project Configuration

Create `CLAUDE.md` at project root to guide AI assistants:

```markdown
# prez-lite Project Guide

## Documentation Structure

All documentation lives in `/docs` organized by concern:
- `1-vision/` - Why we're building this
- `2-specification/` - What we're building
- `3-features/` - How features work
- `4-roadmap/` - Status and planning
- `5-technical/` - How to build/deploy

## Documentation Maintenance

When making changes:
1. Update relevant feature doc in `3-features/`
2. If completing a milestone, update `4-roadmap/current.md`
3. Add entry to `4-roadmap/CHANGELOG.md`
4. If spec changes, update `2-specification/`

## Status Tracking

Use these status indicators in documents:
- ✅ Complete
- 🔄 In Progress
- ⚠️ Needs Update
- ❌ Not Started
- 📋 Planned

## Key Files

- Current work: `docs/4-roadmap/current.md`
- Backlog: `docs/4-roadmap/backlog.md`
- Changelog: `docs/4-roadmap/CHANGELOG.md`
```

---

## Principles Document Outline

`docs/1-vision/principles.md`:

```markdown
# Principles

## Core Philosophy

### 1. Static-First
Generate complete static sites. No runtime dependencies on SPARQL endpoints or databases.

### 2. Standards-Based
Build on established standards: SKOS, DCAT, SHACL, Schema.org. Don't invent new formats.

### 3. Profile-Driven
Profiles define everything: what properties to include, how to render, what formats to output.

### 4. Progressive Enhancement
Start simple (vocabulary browser), add features progressively (sharing, authoring, catalogs).

### 5. Developer Experience
Clear contracts, predictable outputs, easy customization.

## Standards We Follow

| Standard | Purpose |
|----------|---------|
| SKOS | Vocabulary structure |
| DCAT | Dataset/catalog metadata |
| SHACL | Profile definitions |
| Schema.org | General metadata |
| prof: | Profile declarations |

## Technology Choices

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Framework | Nuxt 4 | SSG, TypeScript, Vue ecosystem |
| Styling | Tailwind + Nuxt UI | Rapid UI development |
| RDF Processing | N3.js | Browser-compatible RDF |
| Web Components | Lit | Framework-agnostic embeds |
```

---

## Milestones Visualization

`docs/4-roadmap/milestones.md`:

```markdown
# Milestones

## Phase 1: Core Browser ✅
*Completed February 2025*

- [x] Vocabulary listing page
- [x] Scheme detail view
- [x] Concept detail with hierarchy
- [x] Full-text search
- [x] Content pages (About, etc.)

## Phase 2: Sharing 🔄
*In Progress*

- [x] Export formats (TTL, JSON, JSON-LD, RDF/XML, CSV)
- [x] Share page with downloads
- [x] Web components (prez-list)
- [ ] Interactive embed builder
- [ ] GitHub Action for exports

## Phase 3: Authoring 📋
*Planned Q2 2025*

- [ ] Profile Helper improvements
- [ ] Listing profiles support
- [ ] Vocabulary editing (profile-driven forms)
- [ ] Validation feedback

## Phase 4: Beyond Vocabularies 📋
*Planned Q3 2025*

- [ ] Multi-catalog support
- [ ] DCAT datasets
- [ ] Generic item rendering
- [ ] Collection types beyond SKOS

## Future Ideas 💡

- Mapping visualization
- Spatial/geographic features
- Custom widgets system
- Collaborative editing
```

---

## Implementation Plan

### Step 1: Create Structure (1 hour)
```bash
mkdir -p docs/{1-vision,2-specification,3-features,4-roadmap,5-technical,archive}
```

### Step 2: Migrate Content (2-3 hours)
- Move files according to migration map
- Add status headers
- Remove duplicates

### Step 3: Create Index (30 min)
- Write `docs/README.md`
- Link to all sections

### Step 4: Add to Website (Optional, 1 hour)
- Move to `web/content/docs/`
- Add navigation
- Style docs pages

### Step 5: Claude Configuration (15 min)
- Create `CLAUDE.md`
- Add maintenance instructions

---

## Open Questions

1. **Versioning**: Should we version docs with releases?
2. **External Contributors**: Do we need contributor-friendly docs?
3. **Translations**: Any i18n requirements?
4. **API Docs**: Generate from code or write manually?
