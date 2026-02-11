---
title: Changelog
status: current
updated: 2025-02-08
---

# Changelog

> Version history and completed features.

## 2026-02-10

### Authoring — GitHub OAuth & Inline Editing
- GitHub OAuth flow via Cloudflare Worker (`@prez-lite/github-auth-worker`)
- Inline Monaco editor on scheme and share pages for authenticated users
- Custom prez-dark/prez-light Monaco themes matching site palette
- `useGitHubAuth` composable for auth lifecycle (login, logout, token validation)
- `GitHubAuthButton` header component with avatar and dropdown
- "Edit on GitHub" fallback links for unauthenticated users
- Feature-gated: all auth UI hidden when `githubClientId` env var is empty
- Setup guide: `docs/3-features/github-oauth-setup.md`

---

## 2026-02-09

### CI/CD
- Split build into `build:data` and `build:site` scripts
- Added `process-data.yml` workflow — processes vocabs and commits exports on sample-data changes
- Refactored `deploy-aws.yml` with `deploy-mode` input (`full` | `data-only`)
- Committed pre-built exports so CI deploys without re-processing data

---

## 2025-02-08

### Documentation
- Reorganized `/docs` folder with structured sections
- Created principles and architecture documents
- Added CLAUDE.md project configuration

### Profile Helper
- Added Profile Helper page at `/profile-helper`
- Monaco editor for TTL editing
- Interactive builder for profile configuration
- Client-side validation using SHACL parser

---

## 2025-02-06

### Data Pipeline
- Migrated to SHACL profile-based processing
- Updated prezmanifest integration
- Improved label resolution from background vocabularies

---

## 2025-02-05

### Share Pages
- Created `/share` index page with vocabulary listing
- Created `/share/[vocab]` pages with download options
- Added interactive code generator for web components
- Export formats: TTL, JSON, JSON-LD, RDF/XML, CSV

---

## 2025-02-03

### Content Pages
- Added Nuxt Content integration
- Created home page and about page
- MDC component support (callouts, tabs)
- Mermaid diagram support

### Navigation
- Updated navigation menu
- Fixed mobile menu visibility

### Search
- Query syncs to URL as `?q=<term>`
- Multi-select vocabulary filter
- Faceted sidebar with vocabulary counts
- Clear filter buttons

---

## 2025-02-02

### UI Improvements
- Changed theme from green to blue
- Government-style font
- Logo placement in banner
- Customizable footer

### Concept Page
- IRI displayed under heading
- Properties table on right side
- Hierarchy relationships on left
- Multivalue properties grouped

### Scheme Page
- Description clamped with "Show more"
- Concept tree with expand/collapse
- Inline concept panel on selection
- URL updates without page reload

### Vocabulary List
- Search and sorting
- Pagination with items-per-page
- Clickable cards with hover
- "No match" message

---

## 2025-02-01

### Core Browser
- Vocabulary listing page
- Scheme detail with concept tree
- Concept detail with properties
- Full-text search

### Technical
- Nuxt 4.3.0 with Nuxt UI v4
- TTL → JSON pipeline using N3.js
- Client-side data loading
- Dark mode support

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Complete |
| 🔄 | In Progress |
| ⚠️ | Needs Update |
| ❌ | Blocked |
