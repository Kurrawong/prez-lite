# Data Processing Transition

This document describes the transition from the legacy vocabulary export pipeline to the new SHACL-driven `packages/data-processing` pipeline.

## Summary

The prez-lite project has introduced a new vocabulary processing system based on SHACL profiles. This system generates standardized export formats with Prez-compatible annotations, replacing the previous ad-hoc export scripts.

## What Changed

### Archived Legacy Structure

The previous data and export folders have been moved to `web/public/archive/`:

| Old Location | New Location |
|--------------|--------------|
| `web/public/data/` | `web/public/archive/data/` |
| `web/public/export/vocabs/` | `web/public/archive/vocabs/` |

These archived folders contain the legacy format outputs (JSON, NDJSON, CSV, etc.) that the current web application still uses.

### New Source of Truth

The new pipeline is located in `packages/data-processing/` and uses:

- **Source vocabularies**: `web/public/data/vocabs/*.ttl` - SKOS vocabulary TTL files
- **SHACL profile**: `web/public/data/profiles.ttl` - defines output formats, label sources, and Prez annotations
- **Background labels**: `data/background/*.ttl` - external reference labels (agents, statuses, etc.)
- **Output directory**: `web/public/export/<vocab-name>/` - per-vocabulary export folders

### New Output Structure

The export directory (`web/public/export/`) contains:

- **`_system/`** - System-level assets shared across all vocabularies
  - `profile.json` - Field ordering metadata from SHACL profile
  - `vocabularies/` - Vocabulary catalog listing (all ConceptSchemes)
- **Per-vocab folders** (`<vocab-name>/`) - Each vocabulary gets its own subdirectory

Each per-vocab folder contains these files:

| File | Description |
|------|-------------|
| `*-anot+turtle.ttl` | Annotated Turtle with `prez:label`, `prez:description`, `prez:link`, etc. |
| `*-anot+ld+json.json` | Annotated JSON-LD (same annotations as above) |
| `*-turtle.ttl` | Simplified Turtle (scheme metadata + concept hierarchy) |
| `*-json+ld.json` | Standard JSON-LD |
| `*-rdf.xml` | RDF/XML format |
| `*-list.json` | Concept list as JSON (IRI, prefLabel, broader) |
| `*-list.csv` | Concept list as CSV |
| `*-page.html` | Standalone HTML page (Bulma dark theme) |

## How to Run

### Local Development

```bash
# Process all vocabs in web/public/data/vocabs/ → web/public/export/
pnpm build:vocabs

# Generate vocabulary listing (catalog of all vocabs) → web/public/export/vocablist/
pnpm build:vocablist
```

The `build:vocablist` command:
1. Scans `web/public/data/vocabs/` for ConceptScheme IRIs and labels
2. Generates `web/public/data/vocablist-source-catalog.ttl` (a `schema:DataCatalog`)
3. Processes it with the `OGCDataCatalogProfile` to produce listing outputs

### CI/CD

The GitHub Actions deploy workflow runs `pnpm build:vocabs` before generating the static site, ensuring exports are included in the published artifact.

## SHACL Profile Configuration

The profile at `web/public/data/profiles.ttl` controls:

- **Output formats**: Which serializations to generate (configured via `altr-ext:hasResourceFormat`)
- **Label sources**: Priority order for `prez:label` (e.g., `skos:prefLabel`, `dcterms:title`, `rdfs:label`)
- **Description sources**: Priority order for `prez:description` (e.g., `skos:definition`, `dcterms:description`)
- **Prez annotations**: Which annotations to generate (`prez:generateLabel`, `prez:generateLink`, etc.)
- **Catalog metadata**: Associated catalog IRI and identifier

See `packages/data-processing/README.md` for full profile configuration options.

## Background Labels

External IRIs referenced in vocabularies (publishers, statuses, related concepts, predicates) need labels for the annotated outputs. These are sourced from `web/public/data/background/*.ttl`.

**Important**: Labels are fetched from authoritative sources via prezmanifest, not manually edited.

### Fetching Labels with prezmanifest

Use the `pm label` command to discover and fetch missing labels:

```bash
# Find IRIs without labels
pm label iris manifest.ttl

# Fetch labels from a SPARQL endpoint (outputs to stdout)
pm label rdf manifest.ttl http://demo.dev.kurrawong.ai/sparql > background/fetched-labels.ttl
```

Or use the convenience script:

```bash
./scripts/fetch-labels.sh --endpoint http://demo.dev.kurrawong.ai/sparql
```

### Label Sources

The SPARQL endpoint should contain labels for:
- Standard vocabulary predicates (SKOS, RDFS, Schema.org, DCTerms, etc.)
- Organization/agent IRIs
- Status values
- Related external concepts

Kurrawong's demo endpoint (`http://demo.dev.kurrawong.ai/sparql`) contains a broad semantic background dataset suitable for most vocabularies.

## Compatibility Notes

### Current Web Application

The existing prez-lite web application still relies on the legacy data pipeline:

- `scripts/build-data.js` → produces `web/public/data/{schemes.json, concepts/*.ndjson, labels.json, search-index.json}`
- `scripts/export-vocabs.js` → produces exports in the archived format

These scripts read from `data/vocabs/` (the repo-root vocabs folder) and are unchanged.

### Future Integration

The new `packages/data-processing` outputs are intended for future integration with the main prez-lite web application. The annotated formats (`*-anot+turtle.ttl`, `*-anot+ld+json.json`) contain the same Prez predicates that a live Prez API would return, enabling:

- Static file serving as a Prez API replacement
- Consistent rendering using `profile.json` field ordering
- HTML pages generated from annotated assets

### Migration Path

1. **Phase 1 (current)**: Both pipelines run in parallel; new exports land in `web/public/export/`
2. **Phase 2**: Web application updated to consume new export structure
3. **Phase 3**: Legacy `scripts/build-data.js` and `scripts/export-vocabs.js` deprecated

## Related Documentation

- [`packages/data-processing/README.md`](../packages/data-processing/README.md) - Full pipeline documentation
- [`scripts/README.md`](../scripts/README.md) - Legacy scripts documentation
- [`.github/actions/process-vocabs/action.yml`](../.github/actions/process-vocabs/action.yml) - Reusable GitHub Action
