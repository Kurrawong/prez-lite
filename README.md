# prez-lite

Lightweight static vocabulary publishing system. Converts RDF vocabularies (TTL) to static HTML sites deployable to GitHub Pages.

## Quick Start

```bash
# Install dependencies
pnpm install

# Add your TTL files to data/vocabs/

# Generate JSON from TTL
node scripts/build-data.js

# Build static site
cd web && pnpm generate

# Preview locally
cd web && pnpm preview
```

## Project Structure

```
prez-lite/
├── web/                    # Nuxt 4 static site
│   ├── app/                # Vue components and pages
│   └── public/data/        # Generated JSON (gitignored)
├── scripts/
│   └── build-data.js       # TTL → JSON generator
├── data/
│   └── vocabs/             # Your TTL vocabulary files
└── docs/                   # Additional documentation
```

## How It Works

1. Place SKOS vocabularies (TTL format) in `data/vocabs/`
2. Run `node scripts/build-data.js` to parse TTL and generate JSON
3. Run `cd web && pnpm generate` to build the static site
4. Deploy `web/.output/public/` to any static host

## Features

- No runtime SPARQL server required
- Client-side concept browsing with hierarchical tree view
- Full-text search across concepts
- Works with any SKOS-compliant vocabulary
- Deploys to GitHub Pages automatically

## Deploy to GitHub Pages

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin YOUR_REPO_URL
git push -u origin main
# Enable GitHub Pages in repo settings → Source: GitHub Actions
```

## Documentation

- **[docs/json-contract.md](docs/json-contract.md)** - JSON data format specification
- **[PLAN.md](PLAN.md)** - Development plan and next steps

## Example

An example color vocabulary (`data/vocabs/example-colors.ttl`) is included. Run the build commands above to see it in action.

## Technologies

- **Nuxt 4** - Static site generation
- **N3.js** - RDF parsing (no SPARQL)
- **pnpm** - Package management

## License

MIT
