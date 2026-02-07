# Prez Lite Implementation Plan

## Overview

This plan combines two key initiatives:
1. **Distribution Model** - Enable organizations to use prez-lite via Nuxt Layers (GitHub reference)
2. **Sharing Features** - Machine-readable exports and embeddable web components

**Key Decisions:**
- Use **GitHub repo reference** for Nuxt layers (simpler than npm publishing)
- **Pre-build web components** in prez-lite repo (organizations don't build them)
- Create **GitHub template repo** for one-click organization setup

**Distribution Strategy:** ✅ VALIDATED
- `extends: ['github:Kurrawong/prez-lite']` (root-level extends)
- Nuxt app moved to repo root (no subfolder) to avoid dependency isolation issues
- Subdirectory extends (`github:org/repo/subfolder`) has native module compilation issues

**Notes for Private Repos:**
- Private repos require `GIGET_AUTH=<token>` environment variable
- GitHub rate limiting can cause 404 errors - use auth token in CI

---

## Target Architecture

### Prez Lite Repo (This Repo)

```
prez-lite/
├── app/                              # Nuxt app (at root for layer extends)
│   ├── pages/
│   │   ├── index.vue
│   │   ├── vocabs.vue
│   │   ├── scheme.vue
│   │   ├── concept.vue
│   │   ├── search.vue
│   │   └── share/                   # NEW: Share pages
│   │       ├── index.vue            # Share overview
│   │       └── [vocab].vue          # Individual vocab share
│   ├── components/
│   └── composables/
├── public/
│   ├── export/                      # NEW: Generated at build
│   │   └── vocabs/
│   │       └── [vocab-name]/
│   │           ├── [vocab].ttl
│   │           ├── [vocab].json
│   │           ├── [vocab].jsonld
│   │           ├── [vocab].rdf
│   │           └── [vocab].csv
│   └── web-components/              # NEW: Pre-built components
│       ├── prez-vocab.min.js
│       ├── prez-vocab.min.css
│       └── README.md
├── content/                         # Markdown content
├── nuxt.config.ts
├── package.json
│
├── packages/
│   └── web-components/              # NEW: Web component source
│       ├── src/
│       │   ├── vocab-select.ts
│       │   ├── vocab-tree.ts
│       │   ├── vocab-list.ts
│       │   └── vocab-autocomplete.ts
│       ├── vite.config.ts
│       └── package.json
│
├── scripts/
│   ├── build-data.js                # Existing
│   ├── export-vocabs.js             # NEW: Generate export formats
│   └── build-web-components.js      # NEW: Build & copy to public/
│
├── data/                            # Source TTL vocabularies
│   └── vocabs/
│
├── docs/                            # Documentation
│   ├── getting-started.md
    ├── customization.md
    └── sharing.md
```

### Organization Repo (From Template)

```
org-vocabularies/
├── data/vocabs/
│   ├── vocab-one.ttl
│   └── vocab-two.ttl
├── content/                          # Optional: Custom pages
│   ├── index.md
│   └── about.md
├── app/                              # Optional: Override pages
│   └── pages/
│       └── index.vue
├── public/
│   └── logo.png
├── assets/css/
│   └── theme.css                     # Optional: Custom colors
├── app.config.ts                     # Site config
├── nuxt.config.ts                    # extends: github:Kurrawong/prez-lite/web
├── package.json
└── .github/workflows/deploy.yml
```

**Organization nuxt.config.ts:**
```typescript
export default defineNuxtConfig({
  extends: ['github:Kurrawong/prez-lite/web']
})
```

---

## Implementation Phases

### Phase 1: Restructure for Layers (Week 1)

**Goal:** Validate GitHub subdirectory extends and make prez-lite/web work as a Nuxt layer.

**Tasks:**

1.0 **FIRST: Validate GitHub subdirectory extends** ⚠️ BLOCKING
- [ ] Create minimal test repo outside prez-lite
- [ ] Test `extends: ['github:Kurrawong/prez-lite/web']` locally with `nuxt dev`
- [ ] Test `nuxt generate` (static build)
- [ ] Test deployment to GitHub Pages
- [ ] Document any issues encountered

**If subdirectory extends fails**, evaluate alternatives:
1. Move `web/` contents to repo root (restructure prez-lite)
2. Publish as npm package `@kurrawong/prez-lite`
3. Use git submodules (less ideal)

**Test checklist:**
```bash
# Create test repo
mkdir test-prez-org && cd test-prez-org
pnpm init
pnpm add -D nuxt

# Create minimal nuxt.config.ts
cat > nuxt.config.ts << 'EOF'
export default defineNuxtConfig({
  extends: ['github:Kurrawong/prez-lite/web']
})
EOF

# Test
pnpm nuxt dev      # Does it start?
pnpm nuxt generate # Does it build?
```

1.1 **Verify layer compatibility** (after 1.0 passes)
- [ ] Ensure all paths are relative (no hardcoded paths)
- [ ] Verify components, composables, pages are auto-imported
- [ ] Test page overrides work (org can replace index.vue)

1.2 **Create app.config.ts defaults**
- [ ] Move site config from app.vue to app.config.ts
- [ ] Define default values that orgs can override
- [ ] Support: name, logo, tagline, footerText, footerLinks, navLinks

1.3 **Update app.vue to use config**
```typescript
// app.vue reads from app.config
const appConfig = useAppConfig()
const siteConfig = appConfig.site ?? defaultSiteConfig
```

1.4 **Create template directory**
- [ ] Minimal nuxt.config.ts with extends
- [ ] Default app.config.ts
- [ ] Sample content files
- [ ] Deploy workflow

**Deliverables:**
- [ ] ✅ Validated GitHub subdirectory extends (or documented alternative)
- [ ] Layer-compatible web/ directory
- [ ] template/ directory with starter files
- [ ] Documentation: getting-started.md

---

### Phase 2: Export Formats (Week 2)

**Goal:** Generate machine-readable vocabulary exports at build time.

**Tasks:**

2.1 **Create export script** (`scripts/export-vocabs.js`)
```javascript
// Input: data/vocabs/*.ttl
// Output: public/export/vocabs/[name]/[name].[format]

const formats = ['ttl', 'json', 'jsonld', 'rdf', 'csv']

async function exportVocab(ttlPath, outputDir) {
  const quads = await parseTurtle(ttlPath)

  // Copy original TTL
  await copyFile(ttlPath, `${outputDir}/${name}.ttl`)

  // Generate JSON (for web components)
  await writeJson(`${outputDir}/${name}.json`, toJson(quads))

  // Generate JSON-LD
  await writeJson(`${outputDir}/${name}.jsonld`, await toJsonLd(quads))

  // Generate RDF/XML
  await writeFile(`${outputDir}/${name}.rdf`, toRdfXml(quads))

  // Generate CSV
  await writeCsv(`${outputDir}/${name}.csv`, toCsv(quads))
}
```

2.2 **Add dependencies**
```json
{
  "devDependencies": {
    "n3": "^1.17.0",
    "jsonld": "^8.3.0",
    "fast-csv": "^5.0.0"
  }
}
```

2.3 **Generate manifest** (`public/export/vocabs/index.json`)
```json
{
  "generated": "2024-02-03T10:00:00Z",
  "vocabularies": [
    {
      "id": "alteration-types",
      "iri": "https://...",
      "title": "Alteration Types",
      "conceptCount": 42,
      "formats": {
        "ttl": "/export/vocabs/alteration-types/alteration-types.ttl",
        "json": "/export/vocabs/alteration-types/alteration-types.json"
      }
    }
  ]
}
```

2.4 **Integrate into build**
```json
{
  "scripts": {
    "build:data": "node scripts/build-data.js && node scripts/export-vocabs.js",
    "generate": "pnpm build:data && nuxt generate"
  }
}
```

**Deliverables:**
- [ ] scripts/export-vocabs.js
- [ ] Export manifest generation
- [ ] 5 format exports per vocabulary

---

### Phase 3: Web Components (Week 3-4)

**Goal:** Build embeddable web components using Lit, pre-bundled in prez-lite.

**Tasks:**

3.1 **Set up web components package**
```
packages/web-components/
├── src/
│   ├── components/
│   │   ├── vocab-select.ts
│   │   ├── vocab-tree.ts
│   │   ├── vocab-list.ts
│   │   └── vocab-autocomplete.ts
│   ├── utils/
│   │   ├── fetch-vocab.ts
│   │   └── styles.ts
│   └── index.ts
├── vite.config.ts
├── package.json
└── tsconfig.json
```

3.2 **Implement core components**

**vocab-select.ts:**
```typescript
import { LitElement, html, css } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'

@customElement('prez-vocab-select')
export class PrezVocabSelect extends LitElement {
  @property() vocab = ''
  @property({ attribute: 'base-url' }) baseUrl = ''
  @property({ attribute: 'vocab-url' }) vocabUrl = ''
  @property({ type: Boolean }) multiple = false
  @property({ type: Boolean }) searchable = false
  @property() value = ''

  @state() private concepts: Concept[] = []
  @state() private loading = true
  @state() private open = false

  // ... implementation
}
```

3.3 **Build configuration** (`vite.config.ts`)
```typescript
export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'PrezVocab',
      formats: ['es', 'iife'],
      fileName: (format) => `prez-vocab.${format === 'iife' ? 'min' : 'esm'}.js`
    },
    rollupOptions: {
      external: [], // Bundle everything
    }
  }
})
```

3.4 **Copy to public on build**
```javascript
// scripts/build-web-components.js
import { execSync } from 'child_process'
import { copyFileSync } from 'fs'

// Build components
execSync('pnpm --filter @prez-lite/web-components build')

// Copy to web/public/web-components/
copyFileSync(
  'packages/web-components/dist/prez-vocab.min.js',
  'web/public/web-components/prez-vocab.min.js'
)
```

3.5 **Component features**
- [ ] Fetch vocab JSON from URL
- [ ] Auto-detect `base-url` from script source (no config needed for simple cases)
- [ ] Support explicit `base-url` for cross-origin or bundled scenarios
- [ ] Support direct `vocab-url` to bypass all resolution
- [ ] Keyboard navigation
- [ ] ARIA accessibility
- [ ] CSS custom properties for theming
- [ ] Events: prez-change, prez-load, prez-error

**Deliverables:**
- [ ] 4 web components (select, tree, list, autocomplete)
- [ ] Pre-built bundle in web/public/web-components/
- [ ] Component README with usage examples

---

### Phase 4: Share Pages (Week 5)

**Goal:** Create share pages for discovering and using vocabulary exports.

**Tasks:**

4.1 **Create share index page** (`web/app/pages/share/index.vue`)
- List all vocabularies
- Show available formats with download links
- Quick embed code snippets
- Search/filter vocabularies

4.2 **Create vocabulary share page** (`web/app/pages/share/[vocab].vue`)
- Full vocabulary metadata
- Download buttons for each format
- Interactive code generator
- Live preview of web component
- Copy-to-clipboard for all code snippets

4.3 **Code generator component**
```vue
<ShareCodeGenerator
  :vocab="currentVocab"
  :base-url="siteUrl"
/>
```
Features:
- Component type selector (select, tree, list)
- Attribute toggles (searchable, multiple, etc.)
- Real-time code preview
- Syntax highlighted output

4.4 **Live preview component**
```vue
<SharePreview
  :code="generatedCode"
/>
```
- Sandboxed iframe
- Updates as options change
- Error handling

4.5 **Add navigation link**
- Add "Share" to nav menu
- Link from scheme page to share page

**Deliverables:**
- [ ] /share page
- [ ] /share/[vocab] dynamic pages
- [ ] Code generator with live preview
- [ ] Documentation for sharing

---

### Phase 5: GitHub Actions & Template (Week 6)

**Goal:** Create reusable actions and finalize organization template.

**Tasks:**

5.1 **Create build-data action** (`actions/build-data/action.yml`)
```yaml
name: 'Build Prez Lite Data'
description: 'Build vocabulary data and exports'
inputs:
  vocab-path:
    default: 'data/vocabs'
  output-path:
    default: 'public/data'
runs:
  using: 'composite'
  steps:
    - name: Setup Node
      uses: actions/setup-node@v4
      with:
        node-version: '22'  # Required for native sqlite
    - name: Install prez-lite scripts
      run: npm install n3
      shell: bash
    - name: Run build
      run: |
        curl -sL https://raw.githubusercontent.com/Kurrawong/prez-lite/main/scripts/build-data.js | node
      shell: bash
```

5.2 **Create deploy action** (`actions/deploy/action.yml`)
```yaml
name: 'Deploy Prez Lite'
description: 'Build and deploy to GitHub Pages'
runs:
  using: 'composite'
  steps:
    - uses: Kurrawong/prez-lite/actions/build-data@main
    - run: npm install && npm run generate
      shell: bash
    - uses: peaceiris/actions-gh-pages@v3
      with:
        github_token: ${{ github.token }}
        publish_dir: .output/public
```

5.3 **Include sample vocabulary data**
- [ ] Create minimal sample vocab TTL (`data/sample/example-vocab.ttl`)
- [ ] Generate sample data to `public/data/sample/` (committed, not gitignored)
- [ ] Update composables to fall back to sample data if org data not found
- [ ] Orgs see working example immediately, then add their own vocabs

5.4 **Document icon package requirements**
- [ ] Add `@iconify-json/heroicons` and `@iconify-json/lucide` as peerDependencies
- [ ] Document in getting-started.md that orgs must install icon packages
- [ ] Or bundle icons in the layer (increases size but zero-config)

5.5 **Finalize template**
- [ ] Minimal package.json with required dependencies
- [ ] Working nuxt.config.ts with compatibilityDate
- [ ] Sample content files
- [ ] Deploy workflow using actions
- [ ] README with setup instructions

5.4 **Create example directory**
- [ ] Working example with test vocab
- [ ] Used for CI testing
- [ ] Demonstrates customization options

**Deliverables:**
- [ ] Reusable GitHub Actions
- [ ] Complete template/ directory
- [ ] Working example/ directory
- [ ] Template README

---

### Phase 6: Documentation & Testing (Week 7)

**Goal:** Complete documentation and test with pilot organizations.

**Tasks:**

6.1 **Documentation**
- [ ] Getting Started guide
- [ ] Customization guide (pages, styles, config)
- [ ] Sharing guide (exports, web components)
- [ ] API reference for web components
- [ ] Deployment options (GitHub Pages, Azure, AWS, Cloudflare)

6.2 **Testing**
- [ ] Test layer extension from external repo
- [ ] Test all export formats
- [ ] Test web components in React, Vue, Angular, plain HTML
- [ ] Cross-browser testing (Chrome, Firefox, Safari, Edge)
- [ ] Accessibility audit

6.3 **Pilot testing**
- [ ] Deploy with 1-2 real vocabularies
- [ ] Gather feedback
- [ ] Iterate on pain points

**Deliverables:**
- [ ] Complete docs/ directory
- [ ] Passing CI tests
- [ ] Pilot deployment

---

## Technical Notes

### Nuxt Layer Configuration

For layers via GitHub, Nuxt clones the repo at build time:
```typescript
// nuxt.config.ts in organization repo
export default defineNuxtConfig({
  extends: [
    'github:Kurrawong/prez-lite/web',        // Latest main
    'github:Kurrawong/prez-lite/web#v1.0.0', // Specific tag
    'github:Kurrawong/prez-lite/web#develop' // Specific branch
  ]
})
```

The layer provides:
- All pages (can be overridden by org)
- All components (can be overridden)
- All composables (can be overridden)
- CSS/assets (can be extended)
- public/ files including web-components/

### Web Component Bundle Strategy

Web components are:
1. Built once in prez-lite repo
2. Output to `web/public/web-components/`
3. Served statically from each prez-lite instance
4. Organizations get them automatically via the layer

Benefits:
- No build step for organizations
- Consistent component versions
- Small bundle (~15KB gzipped)
- Works cross-origin (CORS configured)

### Export Generation

Exports are generated per-organization at their build time:
1. Organization's GitHub Action runs build-data
2. Scripts read TTL from data/vocabs/
3. JSON, JSON-LD, RDF/XML, CSV generated
4. Output to public/export/vocabs/
5. Included in static site output

---

## Timeline Summary

| Phase | Duration | Key Milestone |
|-------|----------|---------------|
| 1. Restructure | 1 week | Layer working from external repo |
| 2. Exports | 1 week | 5 formats generating |
| 3. Web Components | 2 weeks | 4 components bundled |
| 4. Share Pages | 1 week | Share UI complete |
| 5. Actions & Template | 1 week | Template ready for use |
| 6. Docs & Testing | 1 week | Pilot deployed |
| **Total** | **7 weeks** | **v1.0 Release** |

---

## Success Criteria

- [ ] Organization can deploy vocabularies with 5 files
- [ ] All 5 export formats work correctly
- [ ] Web components work in any HTML page
- [ ] Share page provides working code snippets
- [ ] GitHub Actions work for build/deploy
- [ ] Documentation covers all use cases
- [ ] Pilot organization successfully deployed

---

## Next Actions

1. **BLOCKING - Validate first:** Test `github:Kurrawong/prez-lite/web` subdirectory extends
   - Create external test repo
   - Test `nuxt dev`, `nuxt generate`, GitHub Pages deploy
   - If fails: evaluate npm package or repo restructure alternatives
2. **After validation passes:** Set up app.config.ts for site configuration
3. **This week:** Create template/ directory structure
4. **Next week:** Begin export script development
