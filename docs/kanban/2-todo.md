# Todo

> Prioritized tasks for current sprint, ready to start

---

### Evaluate feasibility of edit mode on existing vocab pages
**Priority:** High

**Requirements:**
- Analyse how the current vocab/concept browse UI can support an edit mode
- Determine data loading strategy for round-trip TTL editing
- Evaluate: source TTL + background + profile vs annotated TTL exports vs data adapter pattern
- Consider how to show all profile-defined properties (including empty ones) in edit mode
- Consider inline add/edit/delete of concepts

**Done Criteria:**
- [ ] Written analysis document covering all approaches with pros/cons
- [ ] Clear recommendation for data loading strategy
- [ ] Identified what existing code can be reused vs what's new
- [ ] Architectural sketch of the edit-mode data flow
