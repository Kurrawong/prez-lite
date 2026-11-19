# prez-lite

A lightweight vocabulary publishing platform that converts SKOS vocabularies (TTL) into browsable static websites.

## Quick Start

```bash
# Install dependencies
pnpm install

# Add your TTL files to data/vocabs/

# Process vocabularies (TTL → JSON exports, search index, metadata)
pnpm build:all-export

# Start dev server
pnpm --filter web dev

# Build static site
pnpm --filter web generate
```

## Docker

Run a vocabulary site without installing Node. Mount a folder laid out like `data/` (only `vocabs/*.ttl` is required) and open <http://localhost:8080>:

```bash
docker run -p 8080:8080 -v "$PWD/data:/data:ro" ghcr.io/kurrawong/prez-lite:latest
```

Or bake your vocabularies into your own image:

```dockerfile
FROM ghcr.io/kurrawong/prez-lite:latest
COPY vocabs/ /data/vocabs/
RUN prez-lite-process   # optional: process at build time
```

`docker compose up` serves this repo's `data/` directory. Images are published to GHCR: `latest` from `main`, plus a version tag for each release. See [docs/5-technical/docker.md](docs/5-technical/docker.md) for configuration, Compose, and building from source.

## Project Structure

```
prez-lite/
├── .github/
│   ├── actions/               # Composite actions for CI/CD
│   └── workflows/             # Internal + reusable workflows (site-*.yml)
├── data/
│   ├── vocabs/                # TTL vocabulary source files
│   ├── config/profiles.ttl    # SHACL profile configuration
│   ├── background/            # Background label TTL files
│   └── validators/            # SHACL validation shapes
├── web/                       # Nuxt 4 application (base layer)
│   ├── app/                   # Vue components, pages, composables
│   ├── content/               # Nuxt Content markdown pages
│   ├── public/                # Static assets (export/ is generated)
│   └── tests/                 # Vitest unit, component, integration tests
├── packages/
│   ├── data-processing/       # TTL → JSON pipeline (N3.js, SHACL profiles)
│   ├── web-components/        # Lit-based embeddable components
│   ├── github-auth-worker/    # Cloudflare Worker for GitHub OAuth
│   ├── sites/                 # Client site implementations (Nuxt layers)
│   ├── gh-templates/          # GitHub template repositories
│   └── examples/              # Example data and configurations
├── sample-data/               # Fallback vocabs (used when data/ is empty)
├── scripts/                   # Build and deploy utilities
├── docker/                    # Container image: nginx config, entrypoint, prez-lite-process
├── docs/                      # Project documentation
└── resources/                 # Static resources
```

## How It Works

1. Place SKOS vocabularies (TTL format) in `data/vocabs/`
2. Run `pnpm build:all-export` to process TTL into JSON, build search index, and generate metadata
3. Run `pnpm --filter web generate` to build the static site
4. Deploy `web/.output/public/` to any static host

## Features

- **Static-first** - No runtime SPARQL server required
- **Vocabulary browsing** - Hierarchical tree view with concept detail panels
- **Full-text search** - Client-side search across all vocabularies and concepts
- **Multiple export formats** - TTL, JSON-LD, RDF/XML, CSV, HTML
- **Embeddable web components** - Drop-in `<prez-lite>` component for any website
- **Inline editing** - Edit vocabularies directly in the browser via GitHub OAuth
- **Profile-driven** - SHACL profiles control rendering and output
- **Reusable CI/CD** - GitHub Actions workflows usable by client repos

## Client Sites

Client repositories extend prez-lite as a Nuxt layer, customising branding, content, and configuration while inheriting all base functionality. See `packages/sites/` for examples.

Start a new vocabulary site from the public template:

```bash
gh repo create my-vocabs --template Kurrawong/prez-lite-template-default --public --clone
```

```bash
# Run a client site locally
cd packages/sites/suncorp-vpp
pnpm install && pnpm dev
```

## Build Commands

```bash
pnpm build:all-export          # Full pipeline: clean, process, metadata, search
pnpm build:vocabs              # Process vocab TTL files only
pnpm build:vocab-metadata      # Generate vocabulary metadata index
pnpm build:search              # Generate search index
pnpm build:labels              # Generate background labels JSON
```

## Testing

```bash
pnpm --filter @prez-lite/web test:unit         # Unit + component tests
pnpm --filter @prez-lite/web test:integration  # Integration tests
```

## Technologies

- **Nuxt 4** - Static site generation (Vue 3, Nuxt UI v4, Tailwind CSS)
- **N3.js** - RDF parsing
- **Lit** - Web components
- **Vitest** - Testing
- **pnpm** - Package management (monorepo)

## Documentation

See the `docs/` directory for detailed documentation on architecture, specifications, features, and roadmap.

## License

BSD 3-Clause
