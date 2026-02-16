# Todo

> Prioritized tasks for current sprint, ready to start

---

## Sprint 13: Edit Mode Polish

**Goal:** Clear quick-win editing bugs and fill the core label/IRI editing gap.

---

### 1. Fix empty property display in edit mode (High)

**What:** When a property has no value, the "---" dash and "Add" button stack vertically. Clean up the layout so edit mode shows only the add button, and view/inline mode handles the dash appropriately.

**Requirements:**
- Full edit mode (ConceptForm): show only the "Add" button when value is empty (no "---" dash)
- Inline edit mode (InlineEditTable): show "---" in view state, swap to "Add" button when editing that row
- View mode (not editing): continue showing "---" as today

**Done criteria:**
- [ ] Empty properties in full edit mode show add button only, no dash
- [ ] Inline edit mode shows dash in view, add button when editing
- [ ] Non-edit view mode unchanged
- [ ] Build passes

---

### 2. Add loading state to sign-in flow (High)

**What:** The sign-in redirect logic already works (saves return path, navigates back after OAuth). But clicking sign in briefly renders the home page content before the redirect completes. Show a loading indicator instead.

**Requirements:**
- After clicking sign in, show a loading/spinner state instead of rendering page content
- The `loading` ref in `useGitHubAuth` is already set during `init()` — use it to gate page rendering
- Maintain loading state until the OAuth redirect completes and `navigateTo(returnPath)` fires

**Done criteria:**
- [ ] No home page flash during sign-in flow
- [ ] Loading indicator visible during OAuth redirect/callback
- [ ] Returns to original page after sign-in (already works)
- [ ] Build passes

---

### 3. Enable editing of concept label and IRI (Medium)

**What:** Users currently can't edit the prefLabel or IRI of a concept. Add editable support for these core fields.

**Requirements:**
- Make `skos:prefLabel` editable in the concept form (currently shown as heading, not in the editable property list)
- Allow IRI editing with validation (must be valid IRI, unique within scheme)
- IRI change should trigger `renameSubject()` to update all references
- Label change should update the tree view in real-time

**Done criteria:**
- [ ] prefLabel is editable in concept edit form
- [ ] IRI is editable with validation (valid IRI format, no duplicates)
- [ ] IRI rename updates all broader/narrower/inScheme references
- [ ] Tree view updates when label changes
- [ ] Undo/redo works for both operations
- [ ] Build passes
