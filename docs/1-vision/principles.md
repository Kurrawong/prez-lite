---
title: Principles
status: current
updated: 2025-02-08
---

# Principles

> Core philosophies and design tenets guiding prez-lite development.

## Core Philosophy

### 1. Static-First

Generate complete static sites. No runtime dependencies on SPARQL endpoints or databases.

- TTL vocabularies processed at build time
- JSON and HTML generated for all content
- Deploys to GitHub Pages (zero-cost hosting)
- Works offline after initial load

### 2. Standards-Based

Build on established standards. Don't invent new formats.

| Standard | Purpose |
|----------|---------|
| SKOS | Vocabulary structure (concepts, schemes, relationships) |
| DCAT | Dataset and catalog metadata |
| SHACL | Profile definitions and validation |
| Schema.org | General metadata |
| prof: | Profile declarations |

### 3. Profile-Driven

Profiles define everything: what properties to include, how to render, what formats to output.

- `prez:ObjectProfile` - Renders individual resources
- `prez:ListingProfile` - Renders collections of resources
- Profiles specify label sources, description sources, generation flags
- Custom profiles for domain-specific views

### 4. Progressive Enhancement

Start simple, add features progressively.

```
Phase 1: Vocabulary browser (view, search, navigate)
Phase 2: Sharing (export, embed, web components)
Phase 3: Authoring (profile helper, vocabulary editing)
Phase 4: Beyond vocabularies (catalogs, DCAT, generic items)
```

### 5. Developer Experience

Clear contracts, predictable outputs, easy customization.

- JSON data contract documented
- Profile system documented
- Nuxt layer extension for organizations
- Override any page, component, or composable

---

## Technology Choices

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Framework | Nuxt 4 | SSG, TypeScript, Vue ecosystem |
| Styling | Tailwind CSS v4 + Nuxt UI v4 | Rapid UI development |
| RDF Processing | N3.js | Browser-compatible RDF parsing |
| Web Components | Lit | Framework-agnostic embeds |
| Build | pnpm + Vite | Fast, efficient builds |

---

## Distribution Model

Organizations use prez-lite via **Nuxt Layers**:

```typescript
// organization's nuxt.config.ts
export default defineNuxtConfig({
  extends: ['github:Kurrawong/prez-lite']
})
```

Benefits:
- No npm publishing required
- Automatic updates from main branch
- Can override any part of the system
- Version pinning via git tags

---

## Design Decisions

### Query Parameter Routing

URLs use query parameters for IRIs:
- `/scheme?uri=http://...`
- `/concept?uri=http://...`

Rationale:
- Cleaner than URL-encoding full IRIs
- Standard practice for linked data browsers
- Works well with complex IRI structures

### Client-Side Data Loading

Concept data loads dynamically in browser:
- Reduces static build size
- Enables chunked loading for large vocabularies
- Search index loaded on demand

Trade-off: SEO for individual concepts (can add pre-rendering later).

### Monorepo Structure

```
prez-lite/
├── web/                    # Nuxt application
├── packages/
│   └── web-components/     # Lit web components
└── scripts/                # Build scripts
```

Enables:
- Separate versioning of web components
- Shared utilities across packages
- Independent testing and publishing
