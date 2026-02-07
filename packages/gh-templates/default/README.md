# prez-lite Vocabulary Publisher

A static site for publishing SKOS vocabularies, powered by [prez-lite](https://github.com/hjohns/prez-lite).

## Quick Start

### 1. Create your repository from this template

Click "Use this template" on GitHub to create your own repository.

### 2. Add your vocabularies

Place your SKOS vocabulary TTL files in `public/data/vocabs/`:

```
public/data/vocabs/
├── my-vocabulary.ttl
└── another-vocab.ttl
```

### 3. Configure secrets

Add a GitHub repository secret named `PREZ_LITE_TOKEN` with a personal access token that has read access to the prez-lite repository.

1. Go to Settings > Secrets and variables > Actions
2. Click "New repository secret"
3. Name: `PREZ_LITE_TOKEN`
4. Value: Your GitHub personal access token

### 4. Deploy

Push to `main` branch. The GitHub Action will:
1. Process your vocabularies into multiple formats (TTL, JSON-LD, RDF/XML, CSV, HTML)
2. Build the static site
3. Deploy to GitHub Pages

## Local Development

### Prerequisites

- Node.js 22+
- pnpm 9+
- `GITHUB_TOKEN` environment variable (for private prez-lite access)

### Setup

```bash
# Set your token
export GITHUB_TOKEN=ghp_your_token_here

# Install dependencies
pnpm install

# Process vocabularies
pnpm process

# Start dev server
pnpm dev
```

### Commands

| Command | Description |
|---------|-------------|
| `pnpm process` | Process vocabularies (fetches data-processing from prez-lite) |
| `pnpm dev` | Start development server |
| `pnpm build` | Process vocabs + build for production |
| `pnpm generate` | Process vocabs + generate static site |
| `pnpm preview` | Preview production build |

## Project Structure

```
├── public/
│   ├── data/
│   │   ├── vocabs/          # Your source TTL vocabularies
│   │   ├── background/      # Optional: background label files
│   │   └── profiles.ttl     # Optional: custom SHACL profiles
│   └── export/              # Generated: processed vocabulary exports
├── assets/
│   └── css/
│       └── main.css         # Custom styles
├── scripts/
│   └── process-vocabs.js    # Local processing script
└── nuxt.config.ts           # Nuxt configuration (extends prez-lite)
```

## Customization

### Custom Profiles

Create `public/data/profiles.ttl` to customize how vocabularies are processed:

```turtle
@prefix prez: <https://prez.dev/> .
@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix skos: <http://www.w3.org/2004/02/skos/core#> .

<http://example.org/profiles/MyProfile>
    a prez:ObjectProfile ;
    prez:identifier "my-profile" ;
    sh:targetClass skos:ConceptScheme ;
    prez:labelSource skos:prefLabel ;
    prez:descriptionSource skos:definition .
```

### Custom Styles

Edit `assets/css/main.css` to customize the appearance.

### Background Labels

Add TTL files to `public/data/background/` to provide labels for external IRIs referenced in your vocabularies.

## License

MIT
