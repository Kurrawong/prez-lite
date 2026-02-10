# Sprints

> Sprint planning, tracking, and retrospectives

---

## ✅ Completed Sprint: Sprint 7 - Export Cleanup & Share Page Fixes

**Duration:** 2026-02-10
**Goal:** Trim bloated vocab exports, fix share page download links, improve export preview UX
**Status:** ✅ **COMPLETE** — All items approved

### Sprint Outcomes

**Completed: 4 tasks (100%)**

1. ✅ **Trim concept data from vocab-level exports** (High)
   - Removed concept data from annotated & simplified stores
   - Added `sh:property` shapes to ConceptScheme profiles
   - HTML-specific store keeps pages self-contained
   - Fixed share page download links (`format.id` lookup)
   - Removed `-list.json`/`-list.csv` duplicates

2. ✅ **Fix comma-separated literal display formatting** (Medium)
   - Split rendering: plain literals inline, datatype badge rows use flex
   - Fixed both top-level and nested value contexts

3. ✅ **Add missing export files to share page** (Medium)
   - Resolved: duplicate files removed, all 8 formats correctly linked

4. ✅ **Add export format preview on share pages** (Medium)
   - Two-panel layout: preview left, download list right
   - Source/Rendered view modes (HTML iframe, JSON tree, CSV table)
   - Recursive `ShareJsonTreeNode` component
   - Auto-loads annotated Turtle on page load
   - JSON pretty-printing for minified content
   - Reordered formats: annotated first

### Sprint Velocity
- **Planned:** 4 tasks
- **Completed:** 4 tasks
- **Success Rate:** 100%

### Key Achievements
- Vocab export files significantly smaller (no concept data)
- Share page fully functional with correct download links
- Rich preview system with format-specific rendering
- Integrated two-panel export UI

---

## ✅ Completed Sprint: Sprint 6 - Labels, Data Types & Concept Sharing

**Duration:** 2026-02-09
**Goal:** Fix label resolution, add datatype badges, create concept share page, improve share page navigation
**Status:** ✅ **COMPLETE** — All items approved

### Sprint Outcomes

**Completed: 4 tasks (100%)**

1. ✅ **Fix background label resolution on concept and vocab pages** (High)
   - Exports were stale — regenerated with `pnpm build:data`
   - `labels.json` populated with 3,658 entries
   - Predicate labels now show human-readable names

2. ✅ **Show data type badges on property values** (Medium)
   - Linked badges with external link icon on RHS of literal values
   - Added XSD datatype labels to background vocabularies
   - Files: `annotated-properties.ts`, `RichMetadataTable.vue`, `prez-vocab-labels.ttl`

3. ✅ **Add dedicated concept share page** (Medium)
   - New page at `/share/concept?vocab={slug}&uri={iri}`
   - Concept info, annotated JSON-LD download, properties, quick reference
   - Share button on concept page updated to link here

4. ✅ **Improve navigation on share pages** (Low)
   - Replaced ad-hoc nav links with UBreadcrumb on all share pages
   - Hierarchy: Vocabularies → Vocab → Concept → Share

### Sprint Velocity
- **Planned:** 4 tasks
- **Completed:** 4 tasks
- **Success Rate:** 100%

### Key Achievements
- Predicate labels resolved from background vocabularies across all pages
- Datatype badges link directly to XSD type definitions
- Concept-level sharing with dedicated share page
- Consistent breadcrumb navigation across all share pages

---

## ✅ Completed Sprint: Sprint 5 - CI/CD & Data Pipeline

**Duration:** 2026-02-09
**Goal:** Decouple data processing from site deployment so CI uses committed exports instead of rebuilding from scratch
**Status:** ✅ **COMPLETE** — All items approved

### Sprint Outcomes

**Completed: 1 task (100%)**

1. ✅ **Decouple Data Processing from Site Deployment**
   - Split `package.json` build into `build:data` and `build:site`
   - New `process-data.yml` workflow: processes data on sample-data changes, commits exports back
   - Refactored `deploy-aws.yml` with `deploy-mode` input (`full` | `data-only`)
   - Committed 55 MB of pre-built exports to `web/public/export/`

### Sprint Velocity
- **Planned:** 1 task
- **Completed:** 1 task
- **Success Rate:** 100%

### Key Achievements
- CI no longer depends on data processing — deploys use committed exports
- Data-only deploys possible (sync exports to S3 without full rebuild)
- Data regeneration automated via `process-data.yml` on sample-data changes

---

## ✅ Completed Sprint: Sprint 4 - Performance & UX Fixes

**Duration:** 2026-02-09
**Goal:** Fix excessive HTTP requests, loading state flash, deployment, and fresh-clone experience
**Status:** ✅ **COMPLETE** — All items approved

### Sprint Outcomes

**Completed: 3 tasks (100%)**

1. ✅ **Sample Data Fallback for Fresh Clones**
   - `build:ensure-data` script copies sample data when no vocabs present
   - Fresh clones can now build without manual data setup

2. ✅ **AWS S3 + CloudFront Deployment GitHub Action**
   - Manual-trigger workflow with OIDC auth
   - Graceful CDN invalidation skip

3. ✅ **Excessive HTTP Requests + Loading State Flash**
   - Added in-memory caching to 4 fetch functions (`fetchVocabMetadata`, `fetchSchemes`, `fetchLabels`, `fetchListConcepts`)
   - Fixed "Concept not found" / "Scheme not found" flash caused by `useAsyncData` `'idle'` status not being treated as loading
   - Files: `useVocabData.ts`, `concept.vue`, `scheme.vue`, `ConceptPanel.vue`

### Sprint Velocity
- **Planned:** 3 tasks
- **Completed:** 3 tasks
- **Success Rate:** 100%

### Key Achievements
- Eliminated duplicate HTTP requests across all composables
- Clean skeleton loading on all pages (no error flash)
- Out-of-box build experience for fresh clones
- AWS deployment option added

---

## ✅ Completed Sprint: Sprint 3 - SPARQL Dynamic Component

**Duration:** 2026-02-09
**Goal:** Add live SPARQL endpoint support to prez-list web component
**Status:** ✅ **COMPLETE** — All items approved

### Sprint Outcomes

**Completed: 3 tasks (100%)**

1. ✅ **SPARQL Feasibility Assessment**
   - Evaluated 3 approaches, recommended extending existing component
   - Output: `docs/5-technical/sparql-web-component.md`

2. ✅ **SPARQL Endpoint Support Implementation**
   - `sparql-fetch.ts` — query builder with profile-driven predicate resolution
   - `base-element.ts` — 6 new attributes, SPARQL loading path, lazy `loadChildren()`
   - `list.ts` — async expand with loading spinners, debounced server-side search
   - Playground SPARQL toggle with config panel and live preview
   - CSP updated for `connect-src https:`
   - Bundle: ~78KB raw / ~18.5KB gzipped

3. ✅ **Style Options in Playground**
   - Interactive CSS custom property controls with live preview
   - Color pickers for 6 variables, code generation, reset

### Sprint Velocity
- **Planned:** 3 tasks
- **Completed:** 3 tasks
- **Success Rate:** 100%

### Key Achievements
- ✅ Live SPARQL endpoint querying from static web component
- ✅ Lazy loading of narrower concepts on tree expand
- ✅ Server-side search with 300ms debounce
- ✅ Profile-driven predicates via COALESCE fallback chain
- ✅ Interactive playground with SPARQL config and style controls

---

## ✅ Completed Sprint: Sprint 2 - Security Remediation

**Duration:** 2026-02-09 (1 day sprint)
**Goal:** Fix all HIGH and MEDIUM severity security issues identified in audit
**Status:** ✅ **COMPLETE** - All items approved

### Sprint Outcomes

**Completed: 7 tasks (100%)**

#### High Severity Security Fixes (3 tasks)
1. ✅ **Fixed unsafe innerHTML in Mermaid plugin** (CVSS 7.3)
   - Replaced innerHTML with DOMParser for safe SVG insertion
   - Prevents XSS attacks via malicious diagrams
   - File: `web/app/plugins/mermaid.client.ts`

2. ✅ **Replaced deprecated encoding functions** (CVSS 6.5)
   - Replaced escape/unescape with TextEncoder/TextDecoder
   - Modern, secure encoding for Mermaid code storage
   - File: `web/app/plugins/mermaid.client.ts`

3. ✅ **Fixed ReDoS vulnerability** (CVSS 6.8)
   - Added pattern validation and timeout detection
   - Prevents Regular Expression Denial of Service
   - File: `packages/data-processing/scripts/generate-vocab-metadata.js`

#### Medium Severity Security Fixes (3 tasks)
4. ✅ **Added path traversal protection** (CVSS 5.9)
   - Enhanced resolveCliPath() with validation in 5 scripts
   - Prevents reading/writing outside working directory
   - Files: All data processing scripts

5. ✅ **Added Content Security Policy** (CVSS 5.3)
   - Comprehensive CSP + security headers
   - Defense-in-depth against XSS
   - Files: `nuxt.config.ts`, `_headers` files (3 locations)

6. ✅ **Added shell input validation** (CVSS 5.0)
   - URL validation prevents command injection
   - File: `scripts/fetch-labels.sh`

#### Documentation (1 task)
7. ✅ **Created comprehensive workflow documentation**
   - Complete task lifecycle guide
   - Kanban system documentation
   - Sprint management process
   - File: `docs/kanban/WORKFLOW.md`

### Sprint Velocity
- **Planned:** 7 tasks
- **Completed:** 7 tasks
- **Success Rate:** 100%
- **Review Time:** Same day approval

### Key Achievements
- ✅ All HIGH severity security issues resolved (3/3)
- ✅ All MEDIUM severity security issues resolved (3/3)
- ✅ Security audit executive summary updated
- ✅ 100% build success rate
- ✅ Zero CSP violations after fixes
- ✅ Complete workflow documentation created

### Security Impact
**Before Sprint 2:**
- 🔴 2 Critical issues (tokens - verified safe)
- 🟠 3 High severity issues
- 🟡 3 Medium severity issues
- 🟢 3 Low severity issues

**After Sprint 2:**
- 🔴 0 Critical issues
- 🟠 0 High severity issues ✅
- 🟡 0 Medium severity issues ✅
- 🟢 3 Low severity issues (remaining)

**Overall Assessment:** 🟢 **SECURE** - All critical and high-risk vulnerabilities addressed

### Files Modified
- **Security Fixes:** 14 files
- **Documentation:** 6 kanban files + 1 workflow guide
- **Build Success:** 100%

### Issues Encountered & Resolved
**CSP Breaking Site:**
- Initial CSP blocked Nuxt inline hydration scripts
- Fixed by adding 'unsafe-inline' (required for SSG)
- Standard practice for static site generators

**Workflow Implementation:**
- Retroactively applied new workflow to Sprint 1
- Created proper reviewing stage
- Sprint documentation now in place

### Lessons Learned
**What Went Well:**
- Security fixes implemented systematically
- All builds passed on first attempt
- Clear documentation of each fix
- Proper review stage implemented
- User approval obtained same day

**What to Improve:**
- Could have caught CSP issue in testing earlier
- Workflow should be documented before starting project
- Consider automated security scanning in CI/CD

### Retrospective Notes
Sprint 2 successfully addressed all immediate security concerns identified in Sprint 1 audit. The project is now in a secure state with comprehensive security headers, input validation, and safe rendering practices. Remaining LOW severity issues can be addressed in future sprints as time allows.

---

## ✅ Completed Sprint: Sprint 1 - Web Components & Analysis

**Duration:** 2026-02-08 to 2026-02-09 (2 days)
**Goal:** Complete web component theming, style customization, and data processing analysis

### Sprint Outcomes

**Completed: 8 tasks**

#### Web Components (4 tasks)
1. ✅ **Renamed dist file** (prez-vocab → prez-lite)
   - Changed build script and all references
   - Updated: `packages/web-components/vite.config.ts`, template files

2. ✅ **Auto dark/light mode** + theme property enhancement
   - System preference detection with `prefers-color-scheme`
   - Added `theme` property: auto (default), light, dark
   - 18 CSS custom properties defined
   - Parent theme sync (Nuxt UI integration)
   - Bundle impact: +3.46 kB (+0.54 kB gzipped)

3. ✅ **Interactive style customization playground**
   - Live preview with color pickers (6 color variables)
   - 6 ready-to-use presets (Ocean Blue, Forest Green, etc.)
   - Code generation for inline styles
   - Dark mode support

4. ✅ **Template customization documentation**
   - Comprehensive styling guide in template README
   - Theme control examples
   - CSS custom properties table
   - Color preset examples

#### Data Processing Analysis (3 tasks)
5. ✅ **Export format audit**
   - Documented dual-export strategy
   - Self-contained rendering approach
   - ~10% intentional redundancy (for performance)
   - 100k concepts = 613MB projection
   - Output: `docs/5-technical/export-format-audit.md`

6. ✅ **Disk usage analysis**
   - Current: 55 MB (36 vocabs, 2,529 concepts)
   - Projected 100k: 1.2 GB (257 MB gzipped)
   - Projected 1M: 12.1 GB (2.5 GB gzipped)
   - 79% gzip compression savings
   - Hybrid architecture recommendations
   - Output: `docs/5-technical/disk-usage-analysis.md`

7. ✅ **Naming conventions review**
   - 6 issues documented and analyzed
   - OGC Records API, DCAT, IANA comparison
   - Standards alignment matrix
   - Implementation roadmap with priorities
   - Output: `docs/5-technical/export-naming-conventions.md`

#### Security (1 task)
8. ✅ **Comprehensive security audit**
   - Full codebase analysis (web app, data processing, components)
   - 13 issues found (2 critical, 3 high, 3 medium, 3 low, 2 positive)
   - CVSS scores assigned to all vulnerabilities
   - Remediation code provided
   - Output: `docs/5-technical/security-audit.md`

### Sprint Velocity
- **Planned:** 8 tasks (1 cancelled as redundant)
- **Completed:** 8 tasks
- **Success Rate:** 100%

### Key Achievements
- ✅ Complete theme customization system for web components
- ✅ Four comprehensive technical analysis documents
- ✅ Security issues identified and prioritized
- ✅ 100% completion of original backlog

### Issues Found (Sprint 2 Backlog)
Security audit identified urgent fixes needed:
- 3 HIGH severity issues
- 3 MEDIUM severity issues
- Total remediation time: ~5.5 hours

### Files Modified
**Sprint 1 Statistics:**
- **Files Modified:** 29
- **Documentation Created:** 7 reports
- **Build Success Rate:** 100%
- **Bundle Size:** 65.79 kB (15.59 kB gzipped)

### Lessons Learned
- Security audits should happen earlier in development
- Theme customization via CSS variables works well for web components
- Analysis tasks benefit from structured templates (tables, matrices)
- Dashboard metrics help track progress visually

### Retrospective Notes
**What Went Well:**
- Systematic progression through backlog
- Clear documentation of all analysis work
- Iterative bug fixes based on testing
- Comprehensive security review

**What to Improve:**
- Use proper review stage before marking done
- Update sprints.md during sprint (not after)
- Mark backlog status as work progresses
- Define done criteria upfront in todo phase

---

## Sprint Planning Template

### Sprint N: [Sprint Name]
**Duration:** YYYY-MM-DD to YYYY-MM-DD
**Goal:** [Primary objective]

**Planned Tasks:**
- 🎯 Task 1
- 🎯 Task 2

**Progress:**
- Track in dashboard.md
- Update as tasks move through workflow

**Notes:**
- Document decisions, blockers, discoveries
