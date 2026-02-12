# Validation Report: brands.ttl

**Source:** `data/vocabs/brands.ttl`
**Validator:** `data/validators/vocabs.ttl` (Suncorp Vocab Validator v1.0)
**Date:** 2026-02-12
**Status:** Non-conformant

## Summary

| Metric | Value |
|--------|-------|
| Conforms | No |
| Total violations | 16 |
| Warnings | 0 |
| Concepts in file | 11 |
| Collections in file | 2 |

## Violations by Category

### 1. Each Concept MUST have a temporal coverage indicated with the schema:temporalCoverage predicate pointing to a schema:startTime or schema:endTime or both date values x (11 violations)

**Severity:** Violation
**Shape:** `https://data.suncorp.com.au/def/suncorp-vocab-validator/temporalCoverageDates`

**Affected nodes:**
- `http://pid.suncorp.com.au/def/brand/aami`
- `http://pid.suncorp.com.au/def/brand/gio`
- `http://pid.suncorp.com.au/def/brand/suncorp`
- `http://pid.suncorp.com.au/def/brand/apia`
- `http://pid.suncorp.com.au/def/brand/bingle`
- `http://pid.suncorp.com.au/def/brand/shannons`
- `http://pid.suncorp.com.au/def/brand/cil`
- `http://pid.suncorp.com.au/def/brand/essentials`
- `http://pid.suncorp.com.au/def/brand/aainz`
- `http://pid.suncorp.com.au/def/brand/ctp`
- `http://pid.suncorp.com.au/def/brand/terri-scheer`

### 2. Requirement 2.1.4, 2.2.1 or 2.3.1 Each vocabulary and Concept MUST have exactly one definition indicated using skos:definition predicate pointing to a textual literal value (1 violation)

**Severity:** Violation
**Path:** `skos:definition`
**Shape:** `https://data.suncorp.com.au/def/suncorp-vocab-validator/definition-redux`

**Affected nodes:**
- `http://pid.suncorp.com.au/def/brand`

### 3. Requirement 2.1.4, 2.2.1 or 2.3.1 Each vocabulary and Concept MUST have exactly one preferred label indicated using the skos:prefLabel pointing to a textual literal value (1 violation)

**Severity:** Violation
**Path:** `skos:prefLabel`
**Shape:** `https://data.suncorp.com.au/def/suncorp-vocab-validator/prefLabel-redux`

**Affected nodes:**
- `http://pid.suncorp.com.au/def/brand`

### 4. Requirement 2.15 - created date - violated (1 violation)

**Severity:** Violation
**Path:** `schema:dateCreated`
**Shape:** `https://data.suncorp.com.au/def/suncorp-vocab-validator/created`

**Affected nodes:**
- `http://pid.suncorp.com.au/def/brand`

### 5. Requirement 2.15 - modified date - violated (1 violation)

**Severity:** Violation
**Path:** `schema:dateModified`
**Shape:** `https://data.suncorp.com.au/def/suncorp-vocab-validator/modified`

**Affected nodes:**
- `http://pid.suncorp.com.au/def/brand`

### 6. Requirement 2.1.6 Each vocabulary MUST have at least one creator, indicated using schema:creator, which MUST be an IRI indicating an instances of schema:Person or schema:Organization (1 violation)

**Severity:** Violation
**Path:** `schema:creator`
**Shape:** `https://data.suncorp.com.au/def/suncorp-vocab-validator/creator`

**Affected nodes:**
- `http://pid.suncorp.com.au/def/brand`

## Recommendations

See the corresponding `*-ai-report.md` for detailed remediation guidance, or review the test fixtures in `data/validators/tests/` for examples of valid and invalid patterns.
