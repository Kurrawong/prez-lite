# Todo

> Prioritized tasks for current sprint, ready to start

---

## Sprint 12: VocPub Validation

### Integrate VocPub validation into data processing and browser editing

**Priority:** High

**Requirements:**
- Add SHACL validation library to data-processing package
- Include VocPub SHACL shapes (GSWA's vocpub.ttl or equivalent)
- Validate each vocabulary during `process-vocab` pipeline
- Expose validation results in vocab metadata (index.json)
- Show validity indicator on vocab pages in the browser
- Display human-readable validation errors with expandable details
- Optionally validate on browser save (inline editor)

**Done Criteria:**
- [ ] SHACL validation library installed and working
- [ ] VocPub shapes sourced and integrated
- [ ] `process-vocab` validates each vocab and reports results
- [ ] Validation results included in exported metadata
- [ ] Vocab pages show validity status (pass/fail/warnings)
- [ ] Validation errors shown with human-readable messages
- [ ] Build passes with validation integrated
