# Pre-rendering Concepts (Upgrade Path A)

This guide explains how to add full HTML pre-rendering for concept pages once the base system (client-side rendering) is stable.

## Current Implementation (B)

Currently, `prez-lite` uses **client-side rendering** for concept pages:
- Nuxt generates static HTML for scheme listing and scheme detail pages
- Concept detail pages load JSON dynamically in the browser
- Search is client-side using the search index

## Upgrade to Pre-rendering (A)

To pre-render every concept as a static HTML page:

### 1. Add Pre-render Script

Create `scripts/prerender-concepts.js`:

```javascript
import { readFile, writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

const DATA_DIR = './data/generated'
const PAGES_DIR = './pages/concepts/generated'

async function main() {
  const schemes = JSON.parse(await readFile(join(DATA_DIR, 'schemes.json'), 'utf-8'))
  
  await mkdir(PAGES_DIR, { recursive: true })
  
  for (const scheme of schemes.schemes) {
    // Read concept NDJSON files for this scheme
    // Generate .vue pages or use Nuxt's route generation
  }
}

main()
```

### 2. Update Nuxt Config

Add route generation to `nuxt.config.ts`:

```typescript
export default defineNuxtConfig({
  // ... existing config
  
  nitro: {
    prerender: {
      routes: async () => {
        // Read schemes.json and concept files
        // Return array of routes to pre-render
        const routes = ['/']
        
        const schemes = await readSchemesFromJSON()
        for (const scheme of schemes) {
          routes.push(`/schemes/${encodeURIComponent(scheme.iri)}`)
          
          const concepts = await readConceptsForScheme(scheme.iri)
          for (const concept of concepts) {
            routes.push(`/concepts/${encodeURIComponent(concept.iri)}`)
          }
        }
        
        return routes
      }
    }
  }
})
```

### 3. Add to Build Script

Update `package.json`:

```json
{
  "scripts": {
    "build:data": "node scripts/build-data.js",
    "build:prerender": "node scripts/prerender-concepts.js",
    "build:site": "nuxt generate",
    "build": "npm run build:data && npm run build:prerender && npm run build:site"
  }
}
```

### 4. Performance Considerations

For medium-scale vocabularies (5k-50k concepts):

**Memory management:**
- Process concepts in batches of 1000
- Clear caches between batches
- Use streaming where possible

**Build time:**
- Expect 1-5 seconds per 1000 concepts
- Use GitHub Actions caching for node_modules
- Consider incremental builds (only changed vocabs)

**File system:**
- Organize concept pages in subdirectories by scheme
- Example: `/concepts/scheme-slug/concept-slug/index.html`

### 5. Chunking Strategy

For large schemes:

```javascript
// Split into subdirectories by first letter or numeric range
const slug = iriToSlug(concept.iri)
const subdir = slug[0] // a-z, 0-9
const path = `/concepts/${schemeSlug}/${subdir}/${slug}/`
```

### 6. Update GitHub Actions

Modify `.github/workflows/deploy.yml`:

```yaml
- name: Pre-render concept pages
  run: npm run build:prerender
```

## Trade-offs

| Aspect | Client-side (B) | Pre-rendered (A) |
|--------|----------------|------------------|
| Build time | Fast (seconds) | Slower (minutes) |
| SEO | Good for schemes, limited for concepts | Excellent for all pages |
| Initial page load | Fast | Very fast |
| Runtime JS needed | Yes | Minimal |
| Hosting cost | Minimal | Larger (more files) |
| Incremental updates | Easy | Requires rebuild |

## When to Use Pre-rendering

Use pre-rendering (A) when:
- SEO is critical for individual concepts
- You need deep-linkable, cache-friendly concept URLs
- Build time is acceptable (typically <10 min for 50k concepts)
- You have stable vocabularies (infrequent updates)

Stick with client-side (B) when:
- Vocabularies change frequently
- Build time is a concern
- Hosting has file count limits
- Interactive search/filtering is more important than SEO

## Hybrid Approach

You can also combine both:
- Pre-render top concepts and scheme pages (A)
- Client-render all other concepts (B)
- Use `nuxt.config.ts` routes filter to select which concepts to pre-render

```typescript
prerender: {
  routes: async () => {
    const routes = await getSchemeRoutes()
    const topConceptRoutes = await getTopConceptRoutes()
    // Only pre-render top-level concepts
    return [...routes, ...topConceptRoutes]
  }
}
```

## Testing Pre-rendering

1. Build locally: `npm run build`
2. Check `.output/public/` for generated HTML files
3. Serve locally: `npm run preview`
4. Verify concept pages load without JavaScript
5. Check build time and output size

## Resources

- [Nuxt Static Site Generation](https://nuxt.com/docs/getting-started/deployment#static-hosting)
- [Nuxt Pre-rendering Routes](https://nuxt.com/docs/getting-started/prerendering)
