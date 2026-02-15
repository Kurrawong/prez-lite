# Reviewing

> Tasks awaiting human manual review and approval

---

### Export constraints.jsonld from SHACL validator
Export full SHACL constraint shapes as JSON-LD (`constraints.jsonld`) for future frontend validation. Includes `sh:or` flattening, cardinality, datatypes, classes, severity, messages. Output at `web/public/export/system/constraints.jsonld`.

**How to verify:**
- Run `pnpm build:vocabs` — check `web/public/export/system/constraints.jsonld` exists
- Verify `@graph` has entries for ConceptScheme, Concept, Collection, Organization, Person
- Verify `sh:or` flattening: `dateModified` has multiple datatypes
- Verify cardinality: `prefLabel` has `minCount: 1, maxCount: 1`
- Verify `sh:message` values appear as `description` fields
- Verify no blank-node/sequence paths in output (complex paths skipped)
- Also created `docs/5-technical/shacl-ui-evaluation.md` with library research findings
