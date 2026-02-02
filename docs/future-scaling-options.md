# Future Scaling Options

This document outlines scaling approaches for `prez-lite` as vocabulary sizes grow.
Options are listed from simplest to most scalable.

## Option A: Static JSON with Full Client Load (current)

**Summary:** Generate all JSON at build time and load full datasets in the browser.

**How it works**
- TTL → JSON at build time.
- Client fetches `schemes.json`, `concepts/{scheme}.ndjson`, `search-index.json`.
- UI builds tree and search fully in memory.

**Pros**
- Simple to implement and maintain.
- No runtime services required.
- Works well for small to medium datasets.

**Cons**
- Browser memory and parse limits.
- Search index size grows quickly.
- Large schemes exceed current 10k chunk cap.

**Best for**
- Small org vocabularies.
- < 10k concepts per scheme.

## Option B: Static JSON + Chunked Loading

**Summary:** Keep static hosting but split concept and search data into chunks.

**How it works**
- Generate `concepts/{scheme}/manifest.json` listing chunk files.
- Client loads top concepts first, loads more on expand or paging.
- Split `search-index.json` into shards (by scheme, alpha, or hash).

**Pros**
- Still static hosting.
- Big reduction in initial payload.
- Scales to much larger datasets.

**Cons**
- More complex client logic.
- Requires manifest and chunk discovery.
- Tree and search need lazy-loading changes.

**Best for**
- 50k–200k concepts total.
- Organizations wanting static hosting only.

## Option C: Static Pre-rendered Concept Pages

**Summary:** Generate HTML for each concept during build.

**How it works**
- Build static pages for `/concept/{slug}` from JSON.
- Search uses a light index to link to pages.
- Concept pages load minimal JSON on demand.

**Pros**
- Fast page loads, SEO friendly.
- Reduces client memory footprint.
- Works on any static host.

**Cons**
- Build time increases substantially.
- Large output size (many files).
- Requires stable slugs and routing.

**Best for**
- Public vocabularies where SEO matters.
- Stable datasets with infrequent changes.

## Option D: Hybrid Static + Serverless Search

**Summary:** Keep static site but move search and filtering to a serverless endpoint.

**How it works**
- Static site for scheme and concept pages.
- Search queries call a serverless API.
- API can use an indexed data store (e.g., SQLite, DuckDB, or JSON shards).

**Pros**
- Scales search without heavy client payload.
- Better search latency and relevance.
- Still low-ops.

**Cons**
- Requires a hosted function or API.
- More moving parts and deployment complexity.

**Best for**
- Large datasets where search is critical.
- Teams willing to run minimal backend.

## Option E: In-JS Oxigraph Runtime

**Summary:** Run Oxigraph in JS at runtime to serve queries.

**How it works**
- Load TTL into Oxigraph on app start.
- Replace JSON fetch with Oxigraph query API.
- Keep Nuxt UI and pages.

**Pros**
- Query flexibility.
- Richer SPARQL-like features.

**Cons**
- Heavy client runtime footprint.
- Load time for large datasets.
- Still limited by browser memory.

**Best for**
- Medium datasets needing richer query semantics.
- Offline or local deployments.

## Option F: Data Catalog + Client-Side Spatial Search (static)

**Summary:** Extend the static JSON approach to publish dataset catalogs and support basic spatial filtering in the browser.

**How it works**
- Generate catalog JSON (datasets, services, distributions) at build time.
- Include spatial metadata per record: `bbox`, `centroid`, `geohash` or `quadkey`.
- Build a sharded spatial index (by geohash prefix or tile).
- Client loads only relevant shards for the current map view and filters locally.

**Pros**
- Still static hosting.
- Supports simple spatial filters (bbox, point-in-bbox).
- Works well for modest catalog sizes.

**Cons**
- Client-side spatial filtering has practical limits.
- Larger catalogs need sharded indexes to avoid big payloads.
- Complex geometry queries (polygon intersections, buffers) are heavy in browser.

**Best for**
- Small to medium data catalogs (hundreds to a few thousand records).
- Organizations needing lightweight spatial browse without a backend.

**Scaling notes**
- For 10k+ records, require sharded spatial indexes and lazy loading.
- For 100k+ records or complex spatial queries, use Option D (serverless search) with spatial indexing.

## Recommended Path

1. **Short term:** Option B (chunked static JSON).
2. **Medium term:** Option C (pre-rendered pages) for SEO and speed.
3. **Large scale:** Option D (serverless search) if datasets exceed client limits.

## Decision Checklist

- Expected total concepts?  
- SEO requirements?  
- Hosting constraints (static-only vs serverless allowed)?  
- Build time budget?  
- Search feature depth required?
