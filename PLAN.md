# prez-lite Development Plan

## Project Overview

Lightweight static vocabulary publishing system that:
- Converts RDF vocabularies (TTL format) to static HTML sites
- Uses **no runtime SPARQL server** or triplestore
- Deploys to **GitHub Pages** (zero-cost hosting)
- Generates JSON from TTL at build time
- Client-side concept rendering with JSON data

## Current Structure

```
prez-lite/
├── web/                    # Nuxt 4 static site
│   ├── app/
│   │   ├── pages/          # Route pages (query param routing)
│   │   ├── composables/    # Data loading utilities
│   │   ├── assets/css/     # Tailwind CSS
│   │   └── app.vue         # Root layout with UApp
│   ├── public/data/        # Generated JSON (gitignored)
│   └── nuxt.config.ts
├── scripts/
│   └── build-data.js       # TTL → JSON generator (N3.js)
├── data/
│   └── vocabs/             # Source TTL files
├── docs/                   # Documentation
└── pnpm-workspace.yaml     # Monorepo config
```

## UI & Styling

- **Nuxt UI v4** - Component library (Table, Tree, Card, Badge, etc.)
- **Tailwind CSS v4** - Utility-first CSS
- **Query param routing**: `/scheme?uri=...` and `/concept?uri=...`
- **Dark mode** - Built-in color mode toggle

## Pages

| Route | Description |
|-------|-------------|
| `/` | Vocabulary listing with cards |
| `/scheme?uri=...` | Scheme detail with metadata table and concept tree |
| `/concept?uri=...` | Concept detail with properties, relationships, mappings |
| `/search` | Full-text search across all concepts |

## What's Working

- **Nuxt 4.3.0** with Nuxt UI v4 static site generation
- **TTL → JSON pipeline** using N3.js (SPARQL-free)
- **Professional UI** with semantic colors, dark mode, tables
- **Concept tree** using UTree component
- **Metadata tables** using UTable component
- **Client-side data loading** from static JSON
- **nuxt-skills** installed for AI assistance

## Build Commands

```bash
# Install dependencies
pnpm install

# Generate JSON from TTL
node scripts/build-data.js

# Build static site
cd web && pnpm generate

# Preview locally
cd web && pnpm preview
```

## Build Pipeline

```
data/vocabs/*.ttl
        ↓
  scripts/build-data.js (N3.js)
        ↓
  web/public/data/
    ├── schemes.json
    ├── concepts/*.ndjson
    └── search-index.json
        ↓
  pnpm generate (Nuxt)
        ↓
  web/.output/public/  → Deploy to GitHub Pages
```

## Next Steps

### Immediate
1. **Test in browser** - Verify client-side hydration works
2. **Fix Tree display** - May need custom slot for concept links
3. **Test with real vocabulary** - GSWA or other production data

### Soon
4. **GitHub Actions** - Update workflow if needed
5. **Improve concept labels** - Show proper labels in relationships
6. **Better loading states** - Skeleton loaders already added

### Later
7. **Pre-rendering option** - Generate individual concept pages for SEO
8. **Search improvements** - Fuzzy matching with Fuse.js
9. **Export formats** - Download TTL/RDF-XML per concept

## Technical Notes

### Why Nuxt UI v4?
- Built on Tailwind CSS v4
- Ready-to-use components (Table, Tree, Card, etc.)
- Semantic color system
- Dark mode built-in
- Professional appearance

### Why query param routing?
- Cleaner URLs: `/concept?uri=http://...` vs `/concepts/http%3A%2F%2F...`
- Works better with IRI parameters
- Standard practice for linked data browsers

### Data Format
- `schemes.json`: Array of ConceptScheme objects
- `concepts/<slug>.ndjson`: Newline-delimited JSON per scheme
- `search-index.json`: Flat list for client-side search
