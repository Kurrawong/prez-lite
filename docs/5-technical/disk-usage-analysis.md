---
title: Disk Usage Analysis
status: complete
date: 2026-02-09
---

# Disk Usage Analysis

> Estimating disk space requirements for prez-lite data processing at scale

## Current State

### Actual Measurements

**Environment:** `web/public/export/`

| Metric | Value |
|--------|-------|
| Total Size | 55 MB |
| Total Files | 2,894 |
| Vocabularies | 36 (excluding system) |
| Per-Concept Files | 2,529 |
| Total Concepts | ~2,529 (1:1 file mapping) |
| System Files | 11 MB |
| Vocab Data | 44 MB |

**Averages:**
- Per vocabulary: ~1.22 MB (44 MB / 36)
- Per concept file: 12 KB
- Concepts per vocab: ~70 (2,529 / 36)

---

## File Breakdown by Type

### Per Vocabulary

Generated for each vocabulary (36 vocabs):

| File Type | Typical Size | Total (36×) |
|-----------|--------------|-------------|
| `-turtle.ttl` | 37 KB | 1.3 MB |
| `-anot+turtle.ttl` | 32 KB | 1.2 MB |
| `-json+ld.json` | 68 KB | 2.4 MB |
| `-anot+ld+json.json` | 72 KB | 2.6 MB |
| `-list.json` | 21 KB | 756 KB |
| `-list.csv` | 17 KB | 612 KB |
| **Subtotal per vocab** | ~247 KB | **8.9 MB** |

### Per Concept

Generated for each concept (2,529 concepts):

| File Type | Typical Size | Total (2,529×) |
|-----------|--------------|-----------------|
| `{concept}-anot+ld+json.json` | 12 KB | 30.3 MB |

### System Files

Located in `export/system/`:

| File | Size | Purpose |
|------|------|---------|
| `vocabularies/index.json` | ~160 KB | Vocabulary catalog |
| `search/orama-index.json` | ~8 MB | Pre-built search index |
| `labels.json` | ~2.5 MB | Global label cache |
| `profile.json` | ~10 KB | Default field ordering |
| **Total** | **~11 MB** | System metadata |

---

## Projections for Scale

### Scenario 1: 100 Vocabularies, 100,000 Concepts

**Assumptions:**
- Average 1,000 concepts per vocabulary
- File sizes remain constant
- Current processing pipeline

**Calculations:**

| Component | Formula | Size |
|-----------|---------|------|
| Vocab-level files | 100 × 247 KB | 24.7 MB |
| Per-concept files | 100,000 × 12 KB | 1,200 MB |
| System files | Fixed overhead | 11 MB |
| **Total** | | **1,236 MB (1.21 GB)** |

**File count:** ~100,600 files

### Scenario 2: 1,000 Vocabularies, 1,000,000 Concepts

**Assumptions:**
- Average 1,000 concepts per vocabulary
- System files scale linearly

**Calculations:**

| Component | Formula | Size |
|-----------|---------|------|
| Vocab-level files | 1,000 × 247 KB | 247 MB |
| Per-concept files | 1,000,000 × 12 KB | 12,000 MB |
| System files | Estimated 10× | 110 MB |
| **Total** | | **12,357 MB (12.1 GB)** |

**File count:** ~1,006,000 files

### Scenario 3: Small Vocabularies (100 vocabs, 10k concepts)

**Assumptions:**
- Average 100 concepts per vocabulary
- Smaller, more focused vocabularies

**Calculations:**

| Component | Formula | Size |
|-----------|---------|------|
| Vocab-level files | 100 × 247 KB | 24.7 MB |
| Per-concept files | 10,000 × 12 KB | 120 MB |
| System files | Fixed overhead | 11 MB |
| **Total** | | **156 MB** |

**File count:** ~10,600 files

---

## Redundancy Analysis

### What Gets Duplicated?

#### 1. Scheme Context in Per-Concept Files

**Current:**
- Each concept file includes minimal scheme metadata (~1 KB of prez: annotations)
- For 1,000 concepts in one vocab: 1,000 × 1 KB = **1 MB of scheme context**

**Alternative:**
- Store scheme separately, concepts reference it
- Savings: ~1 MB per vocabulary with 1,000 concepts
- **Cost:** Extra HTTP request per concept page load

**Verdict:** ❌ **Not worth optimizing**
- 1 MB per vocab is negligible
- Self-contained rendering is valuable
- HTTP request overhead > 1 MB savings

#### 2. Vocabulary-Level Export Formats

**Current:**
- 6 formats per vocabulary (TTL, annotated TTL, JSON-LD, annotated JSON-LD, JSON list, CSV)
- ~247 KB total per vocabulary

**Rationale:**
- Different consumers need different formats:
  - **TTL:** RDF tools, SPARQL imports
  - **JSON-LD:** Linked data applications
  - **JSON list:** Web components (optimized)
  - **CSV:** Spreadsheets, data analysis

**Verdict:** ✅ **Necessary redundancy**
- Each format serves distinct use case
- 247 KB per vocab is minimal
- Alternative (on-demand generation) adds latency

#### 3. Property Labels/Descriptions

**Current:**
- Each per-concept file includes SKOS/DCTERMS predicate labels
- ~200 bytes per concept for predicate metadata

**For 1,000 concepts:**
- 1,000 × 200 bytes = **200 KB**

**Alternative:**
- Store predicate labels globally, concepts reference them
- Savings: ~200 KB per vocabulary

**Verdict:** ❌ **Not worth optimizing**
- 200 KB is trivial
- Self-contained files simplify rendering
- Would require extra data merging logic

### Total Redundancy

For 100 vocabs, 100,000 concepts:

| Type | Per Vocab | Total (100×) |
|------|-----------|--------------|
| Scheme context | 1 MB | 100 MB |
| Multiple formats | Necessary | N/A |
| Predicate labels | 200 KB | 20 MB |
| **Total** | ~1.2 MB | **~120 MB** |

**Percentage of total (1.21 GB):** ~10%

**Conclusion:** Redundancy is minimal and intentional for performance.

---

## Compression Analysis

### Gzip Compression Ratios

JSON/TTL text files compress very well:

| Format | Typical Size | Gzipped | Ratio |
|--------|--------------|---------|-------|
| JSON-LD vocab | 68 KB | 12 KB | 5.7× |
| TTL vocab | 37 KB | 8 KB | 4.6× |
| Per-concept JSON | 12 KB | 2.5 KB | 4.8× |
| List JSON | 21 KB | 5 KB | 4.2× |
| CSV | 17 KB | 4 KB | 4.3× |

### Compressed Projections

#### 100 Vocabs, 100,000 Concepts

| Component | Uncompressed | Gzipped | Savings |
|-----------|--------------|---------|---------|
| Vocab-level | 24.7 MB | 5 MB | 80% |
| Per-concept | 1,200 MB | 250 MB | 79% |
| System | 11 MB | 2.5 MB | 77% |
| **Total** | **1,236 MB** | **257.5 MB** | **79%** |

#### 1,000 Vocabs, 1,000,000 Concepts

| Component | Uncompressed | Gzipped | Savings |
|-----------|--------------|---------|---------|
| Vocab-level | 247 MB | 52 MB | 79% |
| Per-concept | 12,000 MB | 2,500 MB | 79% |
| System | 110 MB | 25 MB | 77% |
| **Total** | **12,357 MB** | **2,577 MB (2.5 GB)** | **79%** |

**Serving pre-gzipped files** reduces storage by ~80% and transfer by ~80%.

---

## Optimal Approaches by Scale

### Small Scale (<100 Vocabs, <10k Concepts)

**Current Approach:** ✅ **Optimal**

- Total size: ~160 MB (30 MB compressed)
- Static files work perfectly
- No optimization needed

**Recommendation:** Continue with current approach.

### Medium Scale (100-500 Vocabs, 10k-100k Concepts)

**Current Approach:** ✅ **Still Optimal**

- Total size: 1-6 GB (200 MB - 1.2 GB compressed)
- Static file serving is efficient
- CDN/edge caching handles traffic well

**Recommendation:**
1. ✅ Serve pre-gzipped files (`.json.gz`, `.ttl.gz`)
2. ✅ Use CDN with aggressive caching
3. ✅ Consider incremental builds (only process changed vocabs)

### Large Scale (>500 Vocabs, >100k Concepts)

**Current Approach:** ⚠️ **Consider Hybrid**

- Total size: >6 GB (>1.2 GB compressed)
- Static files still work but disk I/O increases
- Per-concept files dominate storage

**Recommended Optimizations:**

#### Option 1: On-Demand Generation with Cache

```
┌─────────────┐
│ Request     │ → Check cache → Return cached file
│ /concept/X  │       ↓
└─────────────┘   Generate → Cache → Return
```

**Benefits:**
- Only generate frequently accessed concepts
- Disk usage = cached files only (~10-20% of full export)
- Vocab-level files remain static

**Implementation:**
- Serverless function (Cloudflare Workers, Vercel)
- KV store for cache (R2, S3)
- Generate from stored TTL on cache miss

**Storage:**
- Source TTL: ~50 MB (1,000 vocabs)
- Cache: ~200 MB (hot concepts only)
- **Total: ~250 MB vs. 12 GB**

#### Option 2: Database Backend

```
┌─────────────┐
│ Request     │ → Query DB → Transform → Return JSON
└─────────────┘
```

**Benefits:**
- Sub-millisecond queries
- No pre-generation needed
- Full-text search built-in

**Implementation:**
- SQLite/PostgreSQL with full-text index
- API generates JSON on request
- Static files only for bulk downloads

**Storage:**
- Database: ~500 MB (1,000,000 concepts)
- Indexes: ~200 MB
- Static downloads: ~250 MB (compressed vocabs only)
- **Total: ~950 MB vs. 12 GB**

#### Option 3: Hybrid Static + Dynamic

**Static (always):**
- Vocab-level files (all 6 formats)
- System files (search index, catalog)
- Top 100 most-accessed concepts per vocab

**Dynamic (on-demand):**
- Remaining per-concept files
- Generated from stored TTL
- Cached aggressively

**Storage:**
- Static: ~500 MB
- Dynamic: Generated as needed
- **Effective: 500 MB vs. 12 GB**

---

## Machine-Readable Access Patterns

### Current: Static Files

**Advantages:**
- ✅ Simple HTTP GET requests
- ✅ Cacheable at every layer (browser, CDN, edge)
- ✅ No server logic needed
- ✅ Works on any static host (GitHub Pages, Netlify, Cloudflare Pages)

**Disadvantages:**
- ❌ Fixed at build time
- ❌ Full rebuild needed for updates
- ❌ Disk usage grows with concepts

### Alternative: API Endpoints

**Advantages:**
- ✅ Dynamic generation
- ✅ Query parameters for filtering
- ✅ Reduced storage
- ✅ Real-time updates

**Disadvantages:**
- ❌ Requires server/serverless functions
- ❌ More complex deployment
- ❌ Potential latency (unless cached)
- ❌ Cannot use free static hosting

### Hybrid Approach

**Static for:**
- Vocab-level exports (full downloads)
- System metadata (catalog, search index)
- Popular concepts (cached)

**API for:**
- On-demand concept generation
- Search/filter queries
- Real-time vocab updates

**Best of both worlds:**
- Static files for bulk downloads and caching
- Dynamic API for interactive queries
- Serverless functions only for uncached requests

---

## Recommendations by Use Case

### Academic/Research (Few Large Vocabs)

**Typical:** 10-50 vocabularies, 10k-50k concepts

**Recommendation:** ✅ **Current static approach**

- Total size: 120-600 MB (manageable)
- Infrequent updates (static is fine)
- Simple deployment (GitHub Pages)

### Government/Standards Body (Many Medium Vocabs)

**Typical:** 100-500 vocabularies, 50k-200k concepts

**Recommendation:** ✅ **Static + CDN + gzip**

- Total size: 600 MB - 2.4 GB (1.2 GB compressed)
- Monthly/quarterly updates (static is fine)
- Use CDN (Cloudflare, Netlify)
- Serve pre-gzipped files

### Enterprise/Multi-Org (Large Scale)

**Typical:** 500-1,000+ vocabularies, 200k-1M+ concepts

**Recommendation:** ⚠️ **Hybrid static + dynamic**

- Total size: 2.4 GB - 12 GB+ (consider optimization)
- Frequent updates (dynamic helps)
- Use serverless + cache for per-concept files
- Keep vocab-level files static for downloads

---

## Cost Analysis

### Static Hosting (Current Approach)

**100 Vocabs, 100,000 Concepts:**

| Provider | Storage (1.2 GB) | Bandwidth (100 GB/mo) | Total/mo |
|----------|------------------|-----------------------|----------|
| GitHub Pages | Free | Free | **$0** |
| Netlify | Free | Free (100 GB included) | **$0** |
| Cloudflare Pages | Free | Free (unlimited) | **$0** |
| Vercel | Free | Free (100 GB included) | **$0** |

**1,000 Vocabs, 1,000,000 Concepts:**

| Provider | Storage (12 GB) | Bandwidth (1 TB/mo) | Total/mo |
|----------|-----------------|---------------------|----------|
| GitHub Pages | Free | Free | **$0** |
| Netlify | $0 | ~$550 (overage) | **$550** |
| Cloudflare Pages | Free | Free (unlimited) | **$0** |
| S3 + CloudFront | $0.28 | $85 | **$85.28** |

### Hybrid Approach (Static + Serverless)

**1,000 Vocabs, 1,000,000 Concepts:**

| Component | Cost/mo |
|-----------|---------|
| R2 Storage (250 MB) | $0 |
| Cloudflare Workers (1M requests) | $0 |
| Cache bandwidth (1 TB) | $0 |
| **Total** | **$0** |

**At scale (10M requests/mo):**

| Component | Cost/mo |
|-----------|---------|
| R2 Storage (1 GB) | $0.02 |
| Cloudflare Workers (10M requests) | $0.50 |
| Cache bandwidth (10 TB) | $0 |
| **Total** | **$0.52** |

**Hybrid is dramatically cheaper at large scale.**

---

## Implementation Roadmap

### Phase 1: Optimize Current (Now)

**For current scale (36 vocabs, 2.5k concepts = 55 MB):**

✅ **No changes needed** - current approach is optimal.

### Phase 2: Enable Compression (When >100 Vocabs)

**When export exceeds 200 MB:**

1. Generate `.gz` versions during build
2. Configure static host to serve compressed files
3. Update documentation for CDN setup

**Effort:** Low (1-2 hours)
**Savings:** 80% bandwidth, 80% storage

### Phase 3: Incremental Builds (When >200 Vocabs)

**When builds take >5 minutes:**

1. Add vocabulary change detection
2. Only process modified TTL files
3. Cache processed outputs

**Effort:** Medium (1-2 days)
**Savings:** 90% build time for updates

### Phase 4: Hybrid Architecture (When >500 Vocabs)

**When export exceeds 5 GB:**

1. Keep vocab-level files static
2. Generate per-concept files on-demand
3. Add serverless cache layer (Cloudflare Workers + R2)

**Effort:** High (1-2 weeks)
**Savings:** 90% storage, infinite scale

---

## Conclusion

### Current State: Excellent

- **55 MB for 36 vocabs** - highly efficient
- **12 KB per concept** - minimal overhead
- **~10% redundancy** - intentional for performance

### Scaling Characteristics

| Scale | Size | Approach |
|-------|------|----------|
| <100 vocabs | <200 MB | ✅ Static (current) |
| 100-500 vocabs | 200 MB - 6 GB | ✅ Static + CDN + gzip |
| 500-1,000 vocabs | 6-12 GB | ⚠️ Consider hybrid |
| 1,000+ vocabs | >12 GB | 🔄 Hybrid static + dynamic |

### Key Insights

1. **Redundancy is minimal** (~10%) and serves performance goals
2. **Compression is highly effective** (79% reduction)
3. **Static files work well up to 500 vocabs**
4. **Hybrid approach scales infinitely** with minimal cost

### Immediate Actions

✅ **None required** - current architecture is sound for current scale.

### Future Actions

**When export > 200 MB:**
1. Enable gzip compression
2. Use CDN with aggressive caching

**When export > 5 GB:**
3. Implement hybrid static + serverless architecture
4. On-demand concept file generation with cache

---

## Related Documentation

- [Export Format Audit](./export-format-audit.md) - Analysis of export strategy
- [Data Pipeline](./data-pipeline.md) - Processing pipeline overview
- [Deployment](./deployment.md) - Hosting and CDN configuration
