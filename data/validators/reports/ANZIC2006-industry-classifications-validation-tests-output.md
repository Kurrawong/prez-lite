# Validation Test Results: ANZIC2006-industry-classifications

**Validator:** `data/validators/vocabs.ttl` (Suncorp Vocab Validator v1.0)
**Test directory:** `data/validators/tests/`
**Date:** 2026-02-12

## Summary

| Test file | Expected | Actual | Violations | Status |
|-----------|----------|--------|------------|--------|
| `ANZIC2006-industry-classifications-invalid-01.ttl` | Non-conformant | Non-conformant | 1 | PASS |
| `ANZIC2006-industry-classifications-invalid-02.ttl` | Non-conformant | Non-conformant | 1 | PASS |
| `ANZIC2006-industry-classifications-invalid-03.ttl` | Non-conformant | Non-conformant | 1 | PASS |
| `ANZIC2006-industry-classifications-invalid-04.ttl` | Non-conformant | Non-conformant | 1 | PASS |
| `ANZIC2006-industry-classifications-invalid-05.ttl` | Non-conformant | Non-conformant | 2 | PASS |
| `ANZIC2006-industry-classifications-invalid-06.ttl` | Non-conformant | Non-conformant | 1 | PASS |
| `ANZIC2006-industry-classifications-valid-01.ttl` | Conforms | Conforms | 0 | PASS |
| `ANZIC2006-industry-classifications-valid-02.ttl` | Conforms | Conforms | 0 | PASS |

**Result: 8/8 tests passed**

---

## Test Details

### invalid-01: INVALID: New concept replaces an existing concept but is missing schema:creator. icat:A0111 uses dcterms:replaces to rep

**File:** `ANZIC2006-industry-classifications-invalid-01.ttl`
**Description:** INVALID: New concept replaces an existing concept but is missing schema:creator. icat:A0111 uses dcterms:replaces to replace icat:A0110, but does not declare a schema:creator. The :revisionAuthor shape requires any subject of dcterms:replaces or prov:wasRevisionOf to have exactly one schema:creator.

**Result:** Non-conformant (1 violation, 0 warnings)

| Severity | Focus Node | Shape | Message |
|----------|-----------|-------|---------|
| Violation | `http://linked.data.gov.au/def/anzsic-2006/A0111` | `n3-13` | Each Concept that replaces or is a revision of another MUST indicate a creator with schema:creator pointing to a Person or an Organisation |

---

### invalid-02: INVALID: Replaced concept missing temporal coverage entirely. icat:A0111 replaces icat:A0110, but icat:A0110 has had its

**File:** `ANZIC2006-industry-classifications-invalid-02.ttl`
**Description:** INVALID: Replaced concept missing temporal coverage entirely. icat:A0111 replaces icat:A0110, but icat:A0110 has had its schema:temporalCoverage removed (should have startTime + endTime). INVALID: temporal coverage removed

**Result:** Non-conformant (1 violation, 0 warnings)

| Severity | Focus Node | Shape | Message |
|----------|-----------|-------|---------|
| Violation | `http://linked.data.gov.au/def/anzsic-2006/A0110` | `https://data.suncorp.com.au/def/suncorp-vocab-validator/temporalCoverageDates` | Each Concept MUST have a temporal coverage indicated with the schema:temporalCoverage predicate pointing to a schema:startTime or schema:endTime or both date values x |

---

### invalid-03: INVALID: ConceptScheme missing schema:dateModified after concept addition. A new concept icat:A0111 was added but the sc

**File:** `ANZIC2006-industry-classifications-invalid-03.ttl`
**Description:** INVALID: ConceptScheme missing schema:dateModified after concept addition. A new concept icat:A0111 was added but the scheme's dateModified was removed. INVALID: dateModified removed

**Result:** Non-conformant (1 violation, 0 warnings)

| Severity | Focus Node | Shape | Message |
|----------|-----------|-------|---------|
| Violation | `http://linked.data.gov.au/def/anzsic-2006` | `https://data.suncorp.com.au/def/suncorp-vocab-validator/modified` | Requirement 2.15 - modified date - violated |

---

### invalid-04: INVALID: ConceptScheme missing schema:dateCreated. INVALID: dateCreated removed

**File:** `ANZIC2006-industry-classifications-invalid-04.ttl`
**Description:** INVALID: ConceptScheme missing schema:dateCreated. INVALID: dateCreated removed

**Result:** Non-conformant (1 violation, 0 warnings)

| Severity | Focus Node | Shape | Message |
|----------|-----------|-------|---------|
| Violation | `http://linked.data.gov.au/def/anzsic-2006` | `https://data.suncorp.com.au/def/suncorp-vocab-validator/created` | Requirement 2.15 - created date - violated |

---

### invalid-05: INVALID: Concept icat:A0100 missing skos:inScheme. INVALID: inScheme removed

**File:** `ANZIC2006-industry-classifications-invalid-05.ttl`
**Description:** INVALID: Concept icat:A0100 missing skos:inScheme. INVALID: inScheme removed

**Result:** Non-conformant (2 violations, 0 warnings)

| Severity | Focus Node | Shape | Message |
|----------|-----------|-------|---------|
| Violation | `http://linked.data.gov.au/def/anzsic-2006/A0100` | `n3-0` | Requirement 2.1.8 All Concept instances within a Concept Scheme MUST be contained in a single term hierarchy using skos:hasTopConcept / skos:topConceptOf predicates indicating the broadest Concepts in the vocabulary and then skos:broader and/or skos:narrower predicates for all non-broadest Concepts in a hierarchy that contains no cycles |
| Violation | `http://linked.data.gov.au/def/anzsic-2006/A0100` | `n3-5` | Requirement 2.3.3 Each Concept in a vocabulary MUST indicate that it appears within that vocabulary's hierarchy of Concepts either directly by use of the skos:topConceptOf predicate indicating the vocabulary or indirectly by use of one or more skos:broader / skos:narrower predicates placing the Concept within a chain of other Concepts, the top concept of which uses the skos:topConceptOf predicate to indicate the vocabulary |

---

### invalid-06: INVALID: Concept icat:A0100 missing schema:temporalCoverage. INVALID: temporalCoverage removed

**File:** `ANZIC2006-industry-classifications-invalid-06.ttl`
**Description:** INVALID: Concept icat:A0100 missing schema:temporalCoverage. INVALID: temporalCoverage removed

**Result:** Non-conformant (1 violation, 0 warnings)

| Severity | Focus Node | Shape | Message |
|----------|-----------|-------|---------|
| Violation | `http://linked.data.gov.au/def/anzsic-2006/A0100` | `https://data.suncorp.com.au/def/suncorp-vocab-validator/temporalCoverageDates` | Each Concept MUST have a temporal coverage indicated with the schema:temporalCoverage predicate pointing to a schema:startTime or schema:endTime or both date values x |

---

### valid-01: Valid ANZSIC test file Minimal conformant subset with 4 concepts. This file should PASS validation.

**File:** `ANZIC2006-industry-classifications-valid-01.ttl`
**Description:** Valid ANZSIC test file Minimal conformant subset with 4 concepts. This file should PASS validation.

**Result:** Conforms (0 violations, 0 warnings)

---

### valid-02: Valid ANZSIC test file with concept replacement. icat:A0111 properly replaces icat:A0110 with dcterms:replaces, schema:c

**File:** `ANZIC2006-industry-classifications-valid-02.ttl`
**Description:** Valid ANZSIC test file with concept replacement. icat:A0111 properly replaces icat:A0110 with dcterms:replaces, schema:creator, and correct temporal coverage on both concepts. This file should PASS validation.

**Result:** Conforms (0 violations, 0 warnings)
