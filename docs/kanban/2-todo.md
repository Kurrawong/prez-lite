# Todo

> Prioritized tasks for current sprint, ready to start

---

## Sprint 14: Edit Dialog Polish

**Goal:** Fix dialog/popup UX issues in edit mode — language diff display, dropdown stability, dialog titles, draggable dialogs.

---

### 1. Show language changes clearly in edit diff (High)

**What:** When editing a language tag (e.g. `@en` → `@en-AU`), the diff feedback only shows text changed, not the language tag difference.

**Requirements:**
- The change summary / diff display should clearly show when a language tag has changed
- Show the old and new language tags explicitly (not just the text value)
- Applies to both the save changes dialog and the history diff view

**Done criteria:**
- [ ] Language tag changes are visually distinct in diff/change summary
- [ ] Works in save dialog and history diff
- [ ] Build passes

---

### 2. Fix history dropdown height shift on hover (High)

**What:** Mousing over entries in the history edit dropdown causes the row height to jump when the undo icon appears.

**Requirements:**
- The undo icon space should be reserved even when hidden (fixed height rows)
- No layout shift on hover

**Done criteria:**
- [ ] History dropdown rows maintain stable height on hover
- [ ] Undo icon appears without shifting layout
- [ ] Build passes

---

### 3. Add titles to diff and save changes dialogs (Medium)

**What:** Both the diff popup and save changes popup have blank title areas.

**Requirements:**
- Add descriptive title to the diff dialog (e.g. "Changes" or "Review Changes")
- Add descriptive title to the save changes dialog (e.g. "Save Changes")
- Titles should be concise and informative

**Done criteria:**
- [ ] Diff dialog has a visible, descriptive title
- [ ] Save changes dialog has a visible, descriptive title
- [ ] Build passes

---

### 4. Make diff and save dialogs draggable (Medium)

**What:** Both dialog boxes should be repositionable by dragging the title bar.

**Requirements:**
- User can drag the dialog by its header/title area
- Dialog stays within viewport bounds
- Position resets on close/reopen

**Done criteria:**
- [ ] Both dialogs are draggable by title bar
- [ ] Dialogs stay within viewport
- [ ] Build passes
