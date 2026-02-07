# prez-lite Documentation

> A lightweight vocabulary browser for publishing SKOS vocabularies as static sites.

## Quick Links

| I want to... | Go to |
|--------------|-------|
| Understand the project | [Vision & Principles](1-vision/principles.md) |
| See business use cases | [Use Cases](1-vision/use-cases.md) |
| See the architecture | [Architecture](1-vision/architecture.md) |
| Browse all features | [Features Overview](3-features/README.md) |
| Check specifications | [Specification](2-specification/) |
| Check project status | [Roadmap](4-roadmap/milestones.md) |
| Set up development | [Technical Guide](5-technical/setup.md) |

---

## Project Status

```
[■■■■■■■■■■] Phase 1: Core Browser      ✅ Complete
[■■■■■■■■■░] Phase 2: Sharing           ✅ Complete
[■■■■■■■░░░] Phase 3: Authoring         🔄 In Progress (75%)
[■■■■■■■■■■] Phase 4: Data Processing   ✅ Complete
[░░░░░░░░░░] Phase 5: Catalogs          📋 Planned
```

**Overall: ~90% feature complete**

---

## Feature Map

```
┌─────────────────────────────────────────────────────────────────┐
│                      PREZ-LITE FEATURES                         │
├─────────────────────────────────────────────────────────────────┤
│  DATA PROCESSING    UI RENDERING        NAVIGATION              │
│  • TTL Parsing      • Vocabulary Cards  • Route Pages           │
│  • SHACL Profiles   • Concept Tree      • Query Params          │
│  • Label Resolution • Property Tables   • Breadcrumbs           │
│  • 9 Export Formats • Inline Panels     • URL Sync              │
│                                                                 │
│  SEARCH             SHARING             AUTHORING               │
│  • Orama Engine     • Download Formats  • Profile Helper        │
│  • Faceted Filters  • Web Components    • TTL Editor            │
│  • Pagination       • Embed Preview     • Validation            │
│                                                                 │
│  WEB COMPONENTS     CONTENT SYSTEM      DEPLOYMENT              │
│  • prez-list        • Markdown Pages    • Static SSG            │
│  • 4 display modes  • MDC Components    • GitHub Pages          │
│  • Multi-select     • Mermaid Diagrams  • Nuxt Layers           │
└─────────────────────────────────────────────────────────────────┘
```

See [Features Overview](3-features/README.md) for complete details.

---

## Documentation Structure

| Section | Purpose | Key Documents |
|---------|---------|---------------|
| [1-vision/](1-vision/) | Strategic direction | [Principles](1-vision/principles.md), [Use Cases](1-vision/use-cases.md), [Architecture](1-vision/architecture.md) |
| [2-specification/](2-specification/) | Normative specs | [JSON Contract](2-specification/json-contract.md), [Profiles](2-specification/profiles.md), [Data Processing](2-specification/data-processing.md) |
| [3-features/](3-features/) | Feature documentation | [Overview](3-features/README.md), [Browsing](3-features/vocabulary-browsing.md), [Search](3-features/search.md), [Sharing](3-features/sharing.md), [Authoring](3-features/authoring.md) |
| [4-roadmap/](4-roadmap/) | Planning & status | [Milestones](4-roadmap/milestones.md), [Changelog](4-roadmap/CHANGELOG.md), [Backlog](4-roadmap/backlog.md) |
| [5-technical/](5-technical/) | Implementation | [Setup](5-technical/setup.md), [Data Pipeline](5-technical/data-pipeline.md), [Performance](5-technical/performance.md) |
| [archive/](archive/) | Historical docs | Previous planning documents |

---

## Key Concepts

| Concept | Description |
|---------|-------------|
| **Static-First** | Complete static sites, no runtime SPARQL |
| **Standards-Based** | SKOS, DCAT, SHACL, Schema.org |
| **Profile-Driven** | Profiles define rendering and output |
| **9 Export Formats** | TTL, JSON-LD, RDF/XML, CSV, HTML + annotated variants |
| **Nuxt Layers** | Organizations extend via GitHub |

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| Framework | Nuxt 4 |
| UI | Nuxt UI v4 + Tailwind CSS v4 |
| RDF | N3.js |
| Search | Orama |
| Web Components | Lit |
| Data Processing | Node.js scripts |

---

## Getting Started

```bash
# Clone and install
git clone https://github.com/Kurrawong/prez-lite.git
cd prez-lite && pnpm install

# Start development
pnpm --filter web dev
```

See [Setup Guide](5-technical/setup.md) for details.
