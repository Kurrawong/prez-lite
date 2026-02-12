# Validation Test Results: brands

**Validator:** `data/validators/vocabs.ttl` (Suncorp Vocab Validator v1.0)
**Test directory:** `data/validators/tests/`
**Date:** 2026-02-12

## Summary

| Test file | Expected | Actual | Violations | Status |
|-----------|----------|--------|------------|--------|
| `brands-invalid-01.ttl` | Non-conformant | Non-conformant | 1 | PASS |
| `brands-invalid-02.ttl` | Non-conformant | Non-conformant | 1 | PASS |
| `brands-invalid-03.ttl` | Non-conformant | Non-conformant | 1 | PASS |
| `brands-invalid-04.ttl` | Non-conformant | Non-conformant | 1 | PASS |
| `brands-invalid-05.ttl` | Non-conformant | Non-conformant | 1 | PASS |
| `brands-invalid-06.ttl` | Non-conformant | Non-conformant | 1 | PASS |
| `brands-invalid-07.ttl` | Non-conformant | Non-conformant | 1 | PASS |
| `brands-invalid-08.ttl` | Non-conformant | Non-conformant | 1 | PASS |
| `brands-invalid-09.ttl` | Non-conformant | Non-conformant | 1 | PASS |
| `brands-invalid-10.ttl` | Non-conformant | Non-conformant | 1 | PASS |
| `brands-invalid-11.ttl` | Non-conformant | Non-conformant | 2 | PASS |
| `brands-invalid-12.ttl` | Non-conformant | Non-conformant | 1 | PASS |
| `brands-invalid-13.ttl` | Non-conformant | Non-conformant | 1 | PASS |
| `brands-invalid-14.ttl` | Non-conformant | Non-conformant | 1 | PASS |
| `brands-invalid-15.ttl` | Non-conformant | Non-conformant | 1 | PASS |
| `brands-invalid-16.ttl` | Non-conformant | Non-conformant | 1 | PASS |
| `brands-invalid-17.ttl` | Non-conformant | Non-conformant | 1 | PASS |
| `brands-invalid-18.ttl` | Non-conformant | Non-conformant | 1 | PASS |
| `brands-valid-01.ttl` | Conforms | Conforms | 0 | PASS |
| `brands-valid-02.ttl` | Conforms | Conforms | 0 | PASS |
| `brands-valid-03.ttl` | Conforms | Conforms | 0 | PASS |
| `brands-valid-04.ttl` | Conforms | Conforms | 0 | PASS |

**Result: 22/22 tests passed**

---

## Test Details

### invalid-01: INVALID: New concept replaces an existing concept but is missing schema:creator. :gio-v2 uses dcterms:replaces to replac

**File:** `brands-invalid-01.ttl`
**Description:** INVALID: New concept replaces an existing concept but is missing schema:creator. :gio-v2 uses dcterms:replaces to replace :gio, but does not declare a schema:creator. The :revisionAuthor shape requires any subject of dcterms:replaces or prov:wasRevisionOf to have exactly one schema:creator pointing to a schema:Person or schema:Organization. Expected violation: "Each Concept that replaces or is a revision of another

**Result:** Non-conformant (1 violation, 0 warnings)

| Severity | Focus Node | Shape | Message |
|----------|-----------|-------|---------|
| Violation | `http://pid.suncorp.com.au/def/brand/gio-v2` | `n3-13` | Each Concept that replaces or is a revision of another MUST indicate a creator with schema:creator pointing to a Person or an Organisation |

---

### invalid-02: INVALID: A new concept replaces an existing concept but the replaced concept's temporal coverage has not been updated — 

**File:** `brands-invalid-02.ttl`
**Description:** INVALID: A new concept replaces an existing concept but the replaced concept's temporal coverage has not been updated — it is missing schema:endTime. :gio-v2 replaces :gio with dcterms:replaces. The new concept has schema:temporalCoverage with schema:startTime of 2026-02-12. However, the replaced concept :gio has had its schema:temporalCoverage removed entirely (simulating the omission of adding schema:endTime).

**Result:** Non-conformant (1 violation, 0 warnings)

| Severity | Focus Node | Shape | Message |
|----------|-----------|-------|---------|
| Violation | `http://pid.suncorp.com.au/def/brand/gio` | `https://data.suncorp.com.au/def/suncorp-vocab-validator/temporalCoverageDates` | Each Concept MUST have a temporal coverage indicated with the schema:temporalCoverage predicate pointing to a schema:startTime or schema:endTime or both date values x |

---

### invalid-03: INVALID: A concept has been added to the vocabulary but the ConceptScheme's schema:dateModified has not been updated. Th

**File:** `brands-invalid-03.ttl`
**Description:** INVALID: A concept has been added to the vocabulary but the ConceptScheme's schema:dateModified has not been updated. The ConceptScheme should have schema:dateModified of "2026-02-12" (when :bingle was added) but it has been removed entirely, simulating the editor forgetting to update it. Expected violation: "Requirement 2.15 - modified date - violated"

**Result:** Non-conformant (1 violation, 0 warnings)

| Severity | Focus Node | Shape | Message |
|----------|-----------|-------|---------|
| Violation | `http://pid.suncorp.com.au/def/brand` | `https://data.suncorp.com.au/def/suncorp-vocab-validator/modified` | Requirement 2.15 - modified date - violated |

---

### invalid-04: INVALID: ConceptScheme missing schema:dateCreated.

**File:** `brands-invalid-04.ttl`
**Description:** INVALID: ConceptScheme missing schema:dateCreated.

**Result:** Non-conformant (1 violation, 0 warnings)

| Severity | Focus Node | Shape | Message |
|----------|-----------|-------|---------|
| Violation | `http://pid.suncorp.com.au/def/brand` | `https://data.suncorp.com.au/def/suncorp-vocab-validator/created` | Requirement 2.15 - created date - violated |

---

### invalid-05: INVALID: ConceptScheme missing skos:prefLabel.

**File:** `brands-invalid-05.ttl`
**Description:** INVALID: ConceptScheme missing skos:prefLabel.

**Result:** Non-conformant (1 violation, 0 warnings)

| Severity | Focus Node | Shape | Message |
|----------|-----------|-------|---------|
| Violation | `http://pid.suncorp.com.au/def/brand` | `https://data.suncorp.com.au/def/suncorp-vocab-validator/prefLabel-redux` | Requirement 2.1.4, 2.2.1 or 2.3.1 Each vocabulary and Concept MUST have exactly one preferred label indicated using the skos:prefLabel pointing to a textual literal value |

---

### invalid-06: INVALID: ConceptScheme missing skos:definition.

**File:** `brands-invalid-06.ttl`
**Description:** INVALID: ConceptScheme missing skos:definition.

**Result:** Non-conformant (1 violation, 0 warnings)

| Severity | Focus Node | Shape | Message |
|----------|-----------|-------|---------|
| Violation | `http://pid.suncorp.com.au/def/brand` | `https://data.suncorp.com.au/def/suncorp-vocab-validator/definition-redux` | Requirement 2.1.4, 2.2.1 or 2.3.1 Each vocabulary and Concept MUST have exactly one definition indicated using skos:definition predicate pointing to a textual literal value |

---

### invalid-07: INVALID: ConceptScheme missing skos:hasTopConcept.

**File:** `brands-invalid-07.ttl`
**Description:** INVALID: ConceptScheme missing skos:hasTopConcept.

**Result:** Non-conformant (1 violation, 0 warnings)

| Severity | Focus Node | Shape | Message |
|----------|-----------|-------|---------|
| Violation | `http://pid.suncorp.com.au/def/brand` | `n3-1` | Requirement 2.1.9 Each vocabulary's Concept Scheme MUST link to at least one Concept within the vocabulary with the skos:hasTopConcept predicate |

---

### invalid-08: INVALID: ConceptScheme prefLabel uses rdf:langString instead of xsd:string. The @en language tag produces rdf:langString

**File:** `brands-invalid-08.ttl`
**Description:** INVALID: ConceptScheme prefLabel uses rdf:langString instead of xsd:string. The @en language tag produces rdf:langString; the validator requires xsd:string.

**Result:** Non-conformant (1 violation, 0 warnings)

| Severity | Focus Node | Shape | Message |
|----------|-----------|-------|---------|
| Violation | `http://pid.suncorp.com.au/def/brand` | `https://data.suncorp.com.au/def/suncorp-vocab-validator/prefLabel-redux` | Requirement 2.1.4, 2.2.1 or 2.3.1 Each vocabulary and Concept MUST have exactly one preferred label indicated using the skos:prefLabel pointing to a textual literal value |

---

### invalid-09: INVALID: ConceptScheme missing schema:creator.

**File:** `brands-invalid-09.ttl`
**Description:** INVALID: ConceptScheme missing schema:creator.

**Result:** Non-conformant (1 violation, 0 warnings)

| Severity | Focus Node | Shape | Message |
|----------|-----------|-------|---------|
| Violation | `http://pid.suncorp.com.au/def/brand` | `https://data.suncorp.com.au/def/suncorp-vocab-validator/creator` | Requirement 2.1.6 Each vocabulary MUST have at least one creator, indicated using schema:creator, which MUST be an IRI indicating an instances of schema:Person or schema:Organization |

---

### invalid-10: INVALID: ConceptScheme definition uses rdf:langString instead of xsd:string. The @en language tag produces rdf:langStrin

**File:** `brands-invalid-10.ttl`
**Description:** INVALID: ConceptScheme definition uses rdf:langString instead of xsd:string. The @en language tag produces rdf:langString; the validator requires xsd:string.

**Result:** Non-conformant (1 violation, 0 warnings)

| Severity | Focus Node | Shape | Message |
|----------|-----------|-------|---------|
| Violation | `http://pid.suncorp.com.au/def/brand` | `https://data.suncorp.com.au/def/suncorp-vocab-validator/definition-redux` | Requirement 2.1.4, 2.2.1 or 2.3.1 Each vocabulary and Concept MUST have exactly one definition indicated using skos:definition predicate pointing to a textual literal value |

---

### invalid-11: INVALID: Concept :gio missing skos:inScheme. contained in a single term hierarchy..." AND "Requirement 2.3.3 Each Concep

**File:** `brands-invalid-11.ttl`
**Description:** INVALID: Concept :gio missing skos:inScheme. contained in a single term hierarchy..." AND "Requirement 2.3.3 Each Concept in a vocabulary MUST indicate that it appears..."

**Result:** Non-conformant (2 violations, 0 warnings)

| Severity | Focus Node | Shape | Message |
|----------|-----------|-------|---------|
| Violation | `http://pid.suncorp.com.au/def/brand/gio` | `n3-0` | Requirement 2.1.8 All Concept instances within a Concept Scheme MUST be contained in a single term hierarchy using skos:hasTopConcept / skos:topConceptOf predicates indicating the broadest Concepts in the vocabulary and then skos:broader and/or skos:narrower predicates for all non-broadest Concepts in a hierarchy that contains no cycles |
| Violation | `http://pid.suncorp.com.au/def/brand/gio` | `n3-5` | Requirement 2.3.3 Each Concept in a vocabulary MUST indicate that it appears within that vocabulary's hierarchy of Concepts either directly by use of the skos:topConceptOf predicate indicating the vocabulary or indirectly by use of one or more skos:broader / skos:narrower predicates placing the Concept within a chain of other Concepts, the top concept of which uses the skos:topConceptOf predicate to indicate the vocabulary |

---

### invalid-12: INVALID: Concept :gio missing schema:temporalCoverage entirely. schema:temporalCoverage predicate..."

**File:** `brands-invalid-12.ttl`
**Description:** INVALID: Concept :gio missing schema:temporalCoverage entirely. schema:temporalCoverage predicate..."

**Result:** Non-conformant (1 violation, 0 warnings)

| Severity | Focus Node | Shape | Message |
|----------|-----------|-------|---------|
| Violation | `http://pid.suncorp.com.au/def/brand/gio` | `https://data.suncorp.com.au/def/suncorp-vocab-validator/temporalCoverageDates` | Each Concept MUST have a temporal coverage indicated with the schema:temporalCoverage predicate pointing to a schema:startTime or schema:endTime or both date values x |

---

### invalid-13: INVALID: Concept :gio has two rdfs:isDefinedBy values. The shape allows at most 1.

**File:** `brands-invalid-13.ttl`
**Description:** INVALID: Concept :gio has two rdfs:isDefinedBy values. The shape allows at most 1.

**Result:** Non-conformant (1 violation, 0 warnings)

| Severity | Focus Node | Shape | Message |
|----------|-----------|-------|---------|
| Violation | `http://pid.suncorp.com.au/def/brand/gio` | `n3-4` | More than 1 values |

---

### invalid-14: INVALID: Collection missing skos:member.

**File:** `brands-invalid-14.ttl`
**Description:** INVALID: Collection missing skos:member.

**Result:** Non-conformant (1 violation, 0 warnings)

| Severity | Focus Node | Shape | Message |
|----------|-----------|-------|---------|
| Violation | `https://linked.data.gov.au/def/mass-brands` | `n3-3` | Requirement 2.2.4 A Collection MUST indicate at least one Concept instance that is within the collection with use of the skos:member predicate. The Concept need not be defined by the Concept Scheme that defines the Collection |

---

### invalid-15: INVALID: Collection missing skos:inScheme. Note: This shape has sh:severity sh:Warning in the validator. within the voca

**File:** `brands-invalid-15.ttl`
**Description:** INVALID: Collection missing skos:inScheme. Note: This shape has sh:severity sh:Warning in the validator. within the vocabulary by use of the skos:inScheme predicate..."

**Result:** Non-conformant (1 violation, 0 warnings)

| Severity | Focus Node | Shape | Message |
|----------|-----------|-------|---------|
| Violation | `https://linked.data.gov.au/def/mass-brands` | `n3-2` | Requirement 2.2.3 A Collection exists within a vocabulary SHOULD indicate that it is within the vocabulary by use of the skos:inScheme predicate. If it is defined for the first time in the vocabulary, it SHOULD also indicate this with the rdfs:isDefinedBy predicate |

---

### invalid-16: INVALID: Organization missing schema:name.

**File:** `brands-invalid-16.ttl`
**Description:** INVALID: Organization missing schema:name.

**Result:** Non-conformant (1 violation, 0 warnings)

| Severity | Focus Node | Shape | Message |
|----------|-----------|-------|---------|
| Violation | `https://linked.data.gov.au/org/suncorp` | `n3-6` | Requirement 2.4.2 Each Agent MUST give exactly one name with the schema:name predicate indicating a literal text value |

---

### invalid-17: INVALID: Organization missing schema:url.

**File:** `brands-invalid-17.ttl`
**Description:** INVALID: Organization missing schema:url.

**Result:** Non-conformant (1 violation, 0 warnings)

| Severity | Focus Node | Shape | Message |
|----------|-----------|-------|---------|
| Violation | `https://linked.data.gov.au/org/suncorp` | `n3-7` | Requirement 2.4.3 Each Agent MUST indicate either a schema:url (for organizations) or a schema:email (for people) predicate with a URL or email value. This error message is for Organizations |

---

### invalid-18: INVALID: Person missing schema:email. or a schema:email (for people)..."

**File:** `brands-invalid-18.ttl`
**Description:** INVALID: Person missing schema:email. or a schema:email (for people)..."

**Result:** Non-conformant (1 violation, 0 warnings)

| Severity | Focus Node | Shape | Message |
|----------|-----------|-------|---------|
| Violation | `https://data.suncorp.com.au/person/test-editor` | `n3-8` | Requirement 2.4.3 Each Agent MUST indicate either a schema:url (for organizations) or a schema:email (for people) predicate with a URL or email value. This error message is for Persons |

---

### valid-01: Valid brands test file Minimal conformant vocabulary with 3 concepts. This file should PASS validation.

**File:** `brands-valid-01.ttl`
**Description:** Valid brands test file Minimal conformant vocabulary with 3 concepts. This file should PASS validation.

**Result:** Conforms (0 violations, 0 warnings)

---

### valid-02: Valid brands test file with concept replacement. :gio-v2 properly replaces :gio with dcterms:replaces, schema:creator, a

**File:** `brands-valid-02.ttl`
**Description:** Valid brands test file with concept replacement. :gio-v2 properly replaces :gio with dcterms:replaces, schema:creator, and correct temporal coverage on both concepts. This file should PASS validation.

**Result:** Conforms (0 violations, 0 warnings)

---

### valid-03: Valid brands test file with a collection. Includes a skos:Collection with prefLabel, definition, inScheme, and members. 

**File:** `brands-valid-03.ttl`
**Description:** Valid brands test file with a collection. Includes a skos:Collection with prefLabel, definition, inScheme, and members. This file should PASS validation.

**Result:** Conforms (0 violations, 0 warnings)

---

### valid-04: Valid brands test file with a Person creator. Uses schema:Person instead of schema:Organization as scheme creator. This 

**File:** `brands-valid-04.ttl`
**Description:** Valid brands test file with a Person creator. Uses schema:Person instead of schema:Organization as scheme creator. This file should PASS validation.

**Result:** Conforms (0 violations, 0 warnings)
