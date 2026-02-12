# Validation Report: alteration-form.ttl

**Source:** `data/vocabs/alteration-form.ttl`
**Validator:** `data/validators/vocabs.ttl` (Suncorp Vocab Validator v1.0)
**Date:** 2026-02-12
**Status:** Non-conformant

## Summary

| Metric | Value |
|--------|-------|
| Conforms | No |
| Total violations | 27 |
| Warnings | 0 |
| Concepts in file | 24 |
| Collections in file | 0 |

## Violations by Category

### 1. Each Concept MUST have a temporal coverage indicated with the schema:temporalCoverage predicate pointing to a schema:startTime or schema:endTime or both date values x (24 violations)

**Severity:** Violation
**Shape:** `https://data.suncorp.com.au/def/suncorp-vocab-validator/temporalCoverageDates`

**Affected nodes:**
- `https://linked.data.gov.au/def/alteration-form/banding-controlled`
- `https://linked.data.gov.au/def/alteration-form/layer-controlled`
- `https://linked.data.gov.au/def/alteration-form/bedding-controlled`
- `https://linked.data.gov.au/def/alteration-form/breccia-vein`
- `https://linked.data.gov.au/def/alteration-form/hydrothermal-breccia-controlled`
- `https://linked.data.gov.au/def/alteration-form/fault-breccia`
- `https://linked.data.gov.au/def/alteration-form/fault-controlled`
- `https://linked.data.gov.au/def/alteration-form/foliation-controlled`
- `https://linked.data.gov.au/def/alteration-form/structure-controlled`
- `https://linked.data.gov.au/def/alteration-form/pervasive`
- `https://linked.data.gov.au/def/alteration-form/selectively-non-pervasive`
- `https://linked.data.gov.au/def/alteration-form/selective`
- `https://linked.data.gov.au/def/alteration-form/selectively-pervasive`
- `https://linked.data.gov.au/def/alteration-form/shear-zone-controlled`
- `https://linked.data.gov.au/def/alteration-form/unaltered`
- `https://linked.data.gov.au/def/alteration-form/unconformity-related`
- `https://linked.data.gov.au/def/alteration-form/vein-controlled`
- `https://linked.data.gov.au/def/alteration-form/vug-controlled`
- `https://linked.data.gov.au/def/alteration-form/zoned-central`
- `https://linked.data.gov.au/def/alteration-form/zoned`
- `https://linked.data.gov.au/def/alteration-form/zoned-inner`
- `https://linked.data.gov.au/def/alteration-form/zoned-outer`
- `https://linked.data.gov.au/def/alteration-form/fracture-controlled`
- `https://linked.data.gov.au/def/alteration-form/non-pervasive`

### 2. Requirement 2.1.4, 2.2.1 or 2.3.1 Each vocabulary and Concept MUST have exactly one definition indicated using skos:definition predicate pointing to a textual literal value (1 violation)

**Severity:** Violation
**Path:** `skos:definition`
**Shape:** `https://data.suncorp.com.au/def/suncorp-vocab-validator/definition-redux`

**Affected nodes:**
- `https://linked.data.gov.au/def/alteration-form`

### 3. Requirement 2.1.4, 2.2.1 or 2.3.1 Each vocabulary and Concept MUST have exactly one preferred label indicated using the skos:prefLabel pointing to a textual literal value (1 violation)

**Severity:** Violation
**Path:** `skos:prefLabel`
**Shape:** `https://data.suncorp.com.au/def/suncorp-vocab-validator/prefLabel-redux`

**Affected nodes:**
- `https://linked.data.gov.au/def/alteration-form`

### 4. Requirement 2.1.6 Each vocabulary MUST have at least one creator, indicated using schema:creator, which MUST be an IRI indicating an instances of schema:Person or schema:Organization (1 violation)

**Severity:** Violation
**Path:** `schema:creator`
**Shape:** `https://data.suncorp.com.au/def/suncorp-vocab-validator/creator`

**Affected nodes:**
- `https://linked.data.gov.au/def/alteration-form`

## Recommendations

See the corresponding `*-ai-report.md` for detailed remediation guidance, or review the test fixtures in `data/validators/tests/` for examples of valid and invalid patterns.
