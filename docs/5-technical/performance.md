---
title: Performance & Scaling
status: current
updated: 2025-02-08
---

# Performance & Scaling

> Options for handling larger vocabulary datasets.

## Current Approach

**Static JSON with Full Client Load**

- TTL → JSON at build time
- Client fetches `schemes.json`, `concepts/*.ndjson`, `search-index.json`
- UI builds tree and search fully in memory

**Pros:**
- Simple to implement and maintain
- No runtime services required
- Works well for small to medium datasets

**Limits:**
- Browser memory constraints
- Search index size grows quickly
- Large schemes may exceed chunk limits

**Best for:** < 10k concepts per scheme

---

## Scaling Options

### Option A: Chunked Loading

**Summary:** Keep static hosting but split data into chunks.

**How it works:**
- Generate manifest listing chunk files
- Client loads top concepts first
- Load more on expand or paging
- Split search index into shards

**Pros:**
- Still static hosting
- Big reduction in initial payload
- Scales to larger datasets

**Cons:**
- More complex client logic
- Tree and search need lazy-loading

**Best for:** 50k–200k concepts total

---

### Option B: Pre-rendered Concept Pages

**Summary:** Generate HTML for each concept during build.

**How it works:**
- Build static pages for `/concept/{slug}`
- Search links to pages
- Minimal JSON on demand

**Pros:**
- Fast page loads, SEO friendly
- Reduces client memory
- Works on any static host

**Cons:**
- Build time increases
- Large output size (many files)
- Requires stable slugs

**Best for:** Public vocabularies where SEO matters

#### Implementation

Add to `nuxt.config.ts`:

```typescript
nitro: {
  prerender: {
    routes: async () => {
      const routes = ['/']
      const schemes = await readSchemesFromJSON()
      for (const scheme of schemes) {
        routes.push(`/scheme?uri=${encodeURIComponent(scheme.iri)}`)
        const concepts = await readConceptsForScheme(scheme.iri)
        for (const concept of concepts) {
          routes.push(`/concept?uri=${encodeURIComponent(concept.iri)}`)
        }
      }
      return routes
    }
  }
}
```

---

### Option C: Serverless Search

**Summary:** Keep static site but move search to serverless endpoint.

**How it works:**
- Static site for scheme and concept pages
- Search queries call serverless API
- API uses indexed data store (SQLite, DuckDB)

**Pros:**
- Scales search without heavy client
- Better search latency and relevance
- Still low-ops

**Cons:**
- Requires hosted function
- More deployment complexity

**Best for:** Large datasets where search is critical

---

### Option D: In-Browser RDF

**Summary:** Run Oxigraph in browser at runtime.

**How it works:**
- Load TTL into Oxigraph on app start
- Replace JSON fetch with query API
- Keep Nuxt UI and pages

**Pros:**
- Query flexibility
- Richer SPARQL-like features

**Cons:**
- Heavy client runtime
- Load time for large datasets
- Browser memory limits

**Best for:** Medium datasets needing rich queries

---

## Recommended Path

| Phase | Approach | Scale |
|-------|----------|-------|
| Short term | Chunked static JSON | 50k concepts |
| Medium term | Pre-rendered pages | 100k concepts |
| Large scale | Serverless search | 500k+ concepts |

---

## Performance Checklist

### Build Time

- [ ] Batch process concepts (1000 at a time)
- [ ] Clear caches between batches
- [ ] Use streaming where possible
- [ ] Consider incremental builds

### Client

- [ ] Lazy-load concept tree branches
- [ ] Virtualize long lists
- [ ] Debounce search input
- [ ] Cache fetched data

### Hosting

- [ ] Enable gzip/brotli compression
- [ ] Set appropriate cache headers
- [ ] Use CDN for static assets

---

## Measurements

### What to Track

| Metric | Target |
|--------|--------|
| Initial load | < 3s |
| Search response | < 500ms |
| Tree expand | < 200ms |
| Concept page load | < 1s |

### Tools

- Lighthouse (Core Web Vitals)
- Browser DevTools Network tab
- Bundle analyzer (`nuxt analyze`)

---

## Decision Checklist

When choosing a scaling approach:

1. **Expected total concepts?**
2. **SEO requirements?**
3. **Hosting constraints?** (static-only vs serverless)
4. **Build time budget?**
5. **Search feature depth required?**
