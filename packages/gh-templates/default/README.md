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

### 4. Configure variables (optional)

You can set repository variables to control the build. Go to Settings > Secrets and variables > Actions > Variables tab.

| Variable | Description | Default |
|----------|-------------|---------|
| `PREZ_LITE_VERSION` | prez-lite version/tag to use (e.g. `v0.2.0`) | `main` |
| `PREZ_LITE_REPO` | prez-lite repository (if using a fork) | `hjohns/prez-lite` |

Pinning to a release tag (e.g. `v0.2.0`) is recommended for production stability.

### 5. Deploy

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

### Web Component Styling

Web components automatically match your system's color scheme (light/dark mode) and can be customized using CSS custom properties.

#### Theme Control

Control the component theme with the `theme` attribute:

```html
<!-- Auto: follows system preference (default) -->
<prez-vocab-select vocab="my-vocab"></prez-vocab-select>

<!-- Force light mode -->
<prez-vocab-select vocab="my-vocab" theme="light"></prez-vocab-select>

<!-- Force dark mode -->
<prez-vocab-select vocab="my-vocab" theme="dark"></prez-vocab-select>
```

#### Custom Colors

Override colors using inline styles with CSS custom properties:

```html
<prez-vocab-select
  vocab="my-vocab"
  style="--prez-bg: #0c4a6e; --prez-text: #e0f2fe; --prez-primary: #38bdf8">
</prez-vocab-select>
```

#### Available CSS Variables

| Variable | Description | Light Default | Dark Default |
|----------|-------------|---------------|--------------|
| `--prez-bg` | Main background | `#ffffff` | `#1f2937` |
| `--prez-text` | Primary text | `#374151` | `#f3f4f6` |
| `--prez-border` | Default borders | `#d1d5db` | `#4b5563` |
| `--prez-primary` | Primary/brand color | `#3b82f6` | `#60a5fa` |
| `--prez-selected-bg` | Selected items | `#dbeafe` | `#2563eb` |
| `--prez-hover-bg` | Hover states | `#f3f4f6` | `#374151` |

#### Color Presets

**Ocean Blue (Dark)**
```html
style="--prez-bg: #0c4a6e; --prez-text: #e0f2fe; --prez-border: #0369a1; --prez-primary: #38bdf8; --prez-selected-bg: #0284c7; --prez-hover-bg: #075985"
```

**Forest Green (Dark)**
```html
style="--prez-bg: #064e3b; --prez-text: #d1fae5; --prez-border: #047857; --prez-primary: #34d399; --prez-selected-bg: #059669; --prez-hover-bg: #065f46"
```

**Purple Haze (Dark)**
```html
style="--prez-bg: #4c1d95; --prez-text: #ede9fe; --prez-border: #6d28d9; --prez-primary: #a78bfa; --prez-selected-bg: #7c3aed; --prez-hover-bg: #5b21b6"
```

**Sunset Orange (Dark)**
```html
style="--prez-bg: #7c2d12; --prez-text: #fed7aa; --prez-border: #c2410c; --prez-primary: #fb923c; --prez-selected-bg: #ea580c; --prez-hover-bg: #9a3412"
```

**Slate Gray (Dark)**
```html
style="--prez-bg: #1e293b; --prez-text: #e2e8f0; --prez-border: #475569; --prez-primary: #94a3b8; --prez-selected-bg: #334155; --prez-hover-bg: #0f172a"
```

**Rose Pink (Dark)**
```html
style="--prez-bg: #881337; --prez-text: #fce7f3; --prez-border: #be123c; --prez-primary: #fb7185; --prez-selected-bg: #e11d48; --prez-hover-bg: #9f1239"
```

#### Complete Example

```html
<!DOCTYPE html>
<html>
<head>
  <script src="https://your-site.com/web-components/prez-lite.min.js" type="module"></script>
</head>
<body>
  <!-- Ocean Blue themed dropdown -->
  <prez-vocab-select
    vocab="my-vocab"
    display="dropdown"
    search="true"
    theme="dark"
    style="--prez-bg: #0c4a6e; --prez-text: #e0f2fe; --prez-border: #0369a1; --prez-primary: #38bdf8; --prez-selected-bg: #0284c7; --prez-hover-bg: #075985">
  </prez-vocab-select>
</body>
</html>
```

**Note:** Inline styles override CSS variables, allowing component-specific customization even when dark mode defaults are active.

### SPARQL Endpoint Mode

Connect the web component directly to a live SPARQL endpoint instead of static files:

```html
<prez-list
  sparql-endpoint="https://vocabs.example.org/sparql"
  vocab-iri="https://example.org/vocab/my-vocabulary"
  search
></prez-list>
```

The component lazily loads narrower concepts on expand and queries the endpoint for search. The SPARQL endpoint must support CORS. See the [sharing documentation](https://github.com/hjohns/prez-lite/blob/main/docs/3-features/sharing.md) for full SPARQL configuration options.

### Background Labels

Add TTL files to `public/data/background/` to provide labels for external IRIs referenced in your vocabularies.

## Deployment

### CORS Policy

Vocabulary exports and web components are configured for **open access** by default, following semantic web principles of open data sharing.

**Configuration file:** `public/_headers` (already included)

**Supported platforms:**
- ✅ **Netlify** - Automatic (uses `_headers`)
- ✅ **Cloudflare Pages** - Automatic (uses `_headers`)
- ✅ **Vercel** - Add `vercel.json` (see below)
- ⚠️ **GitHub Pages** - Limited (no custom headers support)
- ✅ **Self-hosted** - Configure Nginx/Apache (see below)

### Platform-Specific Setup

#### Netlify / Cloudflare Pages
No additional setup required. The `public/_headers` file is automatically used.

#### Vercel
Create `vercel.json` in project root:
```json
{
  "headers": [
    {
      "source": "/export/(.*)",
      "headers": [
        { "key": "Access-Control-Allow-Origin", "value": "*" }
      ]
    },
    {
      "source": "/web-components/(.*)",
      "headers": [
        { "key": "Access-Control-Allow-Origin", "value": "*" }
      ]
    }
  ]
}
```

#### GitHub Pages
- ⚠️ Does not support custom CORS headers
- Web component `<script>` includes work (browser default)
- `fetch()` calls from other domains may be blocked
- **Recommendation:** Use Cloudflare Pages instead for better CORS support

#### Self-hosted (Nginx)
Add to server config:
```nginx
location /export/ {
    add_header Access-Control-Allow-Origin *;
}
location /web-components/ {
    add_header Access-Control-Allow-Origin *;
}
```

#### Self-hosted (Apache)
The `public/.htaccess` file (if created) will handle CORS:
```apache
<FilesMatch "\.(ttl|json|jsonld|rdf|xml|csv|js)$">
    Header set Access-Control-Allow-Origin "*"
</FilesMatch>
```

### Restricting Access

If you need to restrict vocabulary access to specific domains:

1. Edit `public/_headers`:
   ```
   /export/*
     Access-Control-Allow-Origin: https://yourdomain.com
   ```

2. Or use environment-based configuration in your deployment platform

## License

MIT
