# Todo

> Prioritized tasks for current sprint, ready to start

---

## 🔌 SPARQL-Backed Dynamic Web Component List
**Priority:** High
**Added:** 2026-02-09

### Task
Assess feasibility of a web component that displays SKOS concept hierarchies from a live SPARQL endpoint instead of static JSON. The component should lazily load top concepts, then fetch children on drill-down.

### Key Questions to Answer
1. **Extension vs separate component** — can the existing `prez-list` gain a `sparql-endpoint="<url>"` attribute, or does SPARQL mode warrant a new component?
2. **Query strategy** — what SPARQL queries are needed for top concepts, narrower concepts, and search?
3. **Performance** — lazy loading vs prefetching, caching, pagination
4. **Error handling** — CORS, endpoint availability, malformed responses
5. **API surface** — what attributes/properties does the user need to configure?

### Done Criteria
- [ ] Feasibility assessment documented (can it work, what are the constraints)
- [ ] Options analysis: extension to existing component vs new component, with pros/cons
- [ ] Recommended approach with rationale
- [ ] Example SPARQL queries for hierarchy traversal
- [ ] Key risks and mitigations identified
- [ ] Output: markdown report in `docs/5-technical/`

### Deliverables
- Analysis document in `docs/5-technical/sparql-web-component.md`
