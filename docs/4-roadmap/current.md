---
title: Current Work
status: current
updated: 2025-02-08
---

# Current Work

> Active development focus.

## Current Phase: Sharing & Authoring

We're working on two parallel tracks:

### Track 1: Sharing Features (Phase 2)

**Status:** 50% complete

| Task | Status |
|------|--------|
| Export formats (5 types) | ✅ Done |
| Share page UI | ✅ Done |
| Interactive code generator | ✅ Done |
| Web components bundle | 🔄 In Progress |
| GitHub Action for exports | 📋 Planned |

**Current focus:** Completing web component suite (select, tree, autocomplete).

### Track 2: Authoring Features (Phase 3)

**Status:** 10% complete

| Task | Status |
|------|--------|
| Profile Helper page | ✅ Done (basic) |
| Profile validation | ✅ Done |
| UX improvements | 📋 Planned |
| Listing profiles | 📋 Planned |
| Vocabulary editing | 📋 Planned |

**Current focus:** Profile Helper UX improvements per `Idea-Authoring.md`.

---

## Immediate Tasks

### Profile Helper UX
1. [ ] Add contextual help/descriptions for each section
2. [ ] Show `prefix:localName` in property picker
3. [ ] Replace up/down arrows with drag handles
4. [ ] Consider stepped wizard or collapsible sections

### Documentation
1. [x] Reorganize docs folder structure
2. [x] Create principles document
3. [x] Create architecture document
4. [ ] Document profile system fully
5. [ ] Document URL generation strategy

### Web Components
1. [ ] Complete `prez-select` component
2. [ ] Complete `prez-tree` component
3. [ ] Complete `prez-autocomplete` component
4. [ ] Update bundle in `public/web-components/`

---

## Blocked Items

None currently.

---

## Recent Decisions

| Decision | Rationale |
|----------|-----------|
| Monaco for TTL editing | Syntax highlighting, familiar editor |
| SHACL for profiles | Standard, validation-ready |
| Lit for web components | Framework-agnostic, small bundle |
| pnpm monorepo | Fast installs, workspace support |

---

## Questions to Resolve

1. **Profile Helper scope**: How much of Prez's profile system do we implement?
   - Full SHACL property paths?
   - Content negotiation by profile?
   - Runtime profile switching?

2. **Web component distribution**: CDN or self-hosted only?

3. **Listing profiles**: When to implement? Block on Phase 2 completion?

---

## Links

- [Milestones](milestones.md) - Full phase breakdown
- [Backlog](backlog.md) - Future work items
- [Changelog](CHANGELOG.md) - What's been done
