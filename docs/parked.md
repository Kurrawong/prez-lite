# Parked Ideas

Ideas worth pursuing later but not yet prioritised.

## Cloudflare Pages deploy target for gh-template sites

Each template-derived repo could deploy to Cloudflare Pages instead of GitHub Pages, getting a free `<project>.pages.dev` subdomain with proper CORS header support (via `_headers` file already in the template).

**Approach:** Separate build from deploy in the reusable workflow. The current `build-site.yml` handles both — refactor so it builds + uploads an artifact, then callers choose a deploy step (GitHub Pages or Cloudflare via `wrangler`). Provide an alternative `deploy-cloudflare.yml` reusable workflow or a `deploy-target` input.

**Why Cloudflare over GitHub Pages:**
- Custom response headers (`_headers` file) — already in the template
- Better CORS support for web component embedding and export fetching
- Free subdomain, unlimited bandwidth, free SSL
- 500 builds/month on free plan, 20k files per project

**Prerequisite:** Publish `@prez-lite/data-processing` to npm (eliminates the sparse checkout hack and simplifies any CI pipeline, not just GitHub Actions).

## Publish data-processing as npm package

Extract `@prez-lite/data-processing` as a standalone npm package (GitHub Packages or public npm). Eliminates the sparse-checkout + patching dance in the reusable workflow and `process-vocabs.js`. Enables `npx @prez-lite/data-processing process --sourceDir ...` for downstream users. Version pinning comes free via semver.

**Requires:** Remove the `@prez-lite/web` workspace dependency (bundle `shacl-profile-parser` into the package or make it a shared dep).

## Externalise search configuration as TTL

Search indexing is currently hardcoded in `generate-search-index.js` — indexed fields, boost weights, facets, stemming, and stop words are all baked in. Extract this into a TTL configuration file at `data/config/search.ttl` so it can be managed alongside profiles and validators using the same SHACL/RDF tooling. Would allow downstream sites to tune search behaviour (field weights, additional facets, excluded vocabs) without forking the pipeline.
