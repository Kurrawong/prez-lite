---
title: Authoring Features
status: draft
updated: 2025-02-08
---

# Authoring Features

> Profile building and vocabulary editing tools.

## Overview

prez-lite provides authoring tools for:
1. **Profile Helper** - Build `prez:ObjectProfile` definitions
2. **Vocabulary Editing** - Edit vocabularies via profile-driven forms (planned)

---

## Profile Helper

### Current Features

Located at `/profile-helper`, the Profile Helper provides:

- **Monaco Editor**: TTL editing with syntax highlighting
- **Interactive Builder**: Form-based profile configuration
- **Live Preview**: Generated TTL updates in real-time
- **Validation**: Client-side validation using SHACL parser
- **Mode Toggle**: Switch between Builder and Editor views

### Builder Sections

| Section | Purpose |
|---------|---------|
| Profile Metadata | IRI, identifier, title, description |
| Target Class | Select the RDF class to profile |
| Source Predicates | Configure label, description, provenance sources |
| Generation Flags | Toggle prez:generate* annotations |
| Output Formats | Select supported export formats |
| Link Templates | Configure prez:linkTemplate, prez:membersTemplate |

### Validation

The helper validates:
- Required fields (identifier, target class)
- TTL syntax when in Editor mode
- Profile structure and completeness

---

## Known UX Issues

### 1. Information Overload

**Problem:** All sections visible at once can overwhelm new users.

**Proposed Solution:** Stepped wizard or collapsible sections:
```
Step 1: Basics (identifier, title, target class)
Step 2: Label/Description sources
Step 3: Generation flags
Step 4: Output formats
Step 5: Advanced (templates, provenance)
```

### 2. Missing Contextual Help

**Problem:** Users don't understand how source predicates work.

**Explanation needed:**
> Source predicates define where prez-lite looks for values, in priority order.
> For example, `skos:prefLabel, dcterms:title, rdfs:label` means:
> 1. First, check for `skos:prefLabel`
> 2. If not found, check `dcterms:title`
> 3. If still not found, use `rdfs:label`

### 3. Predicate Picker Issues

**Problem:** Can't see namespace until after adding.

**Solution:** Show `prefix:localName` format prominently:
- `skos:prefLabel` (Preferred Label)
- Group by namespace with prefix visible

### 4. Reordering UX

**Problem:** Up/down arrows feel clunky.

**Solution:** Drag handles with visual indicators:
```
☰ skos:prefLabel
☰ dcterms:title
☰ rdfs:label
```

---

## Missing Profile Concepts

### Listing Profiles

Prez distinguishes:
- **Object Profile**: Renders individual resources
- **Listing Profile**: Renders collections of resources

A complete setup needs both:
```turtle
# For viewing a single ConceptScheme
prez:SchemeObjectProfile a prez:ObjectProfile ;
    sh:targetClass skos:ConceptScheme .

# For viewing a list of ConceptSchemes
prez:SchemesListingProfile a prez:ListingProfile ;
    sh:targetClass skos:ConceptScheme ;
    prez:defaultPageSize 20 .
```

### Multiple Profiles per Class

Support for:
- **Default profile**: Used when none specified
- **Full profile**: All properties
- **Minimal profile**: Just labels and links
- **Custom profile**: Domain-specific views

### Property Inclusion Logic

Beyond source predicates:
| Setting | Meaning |
|---------|---------|
| Default | Property must exist to be included |
| `sh:minCount 0` | Optional - include if present |
| `sh:maxCount 0` | Excluded - never include |

---

## Vocabulary Editing (Planned)

### Profile-Driven Forms

Generate editing forms from profiles:
```turtle
sh:property [
    sh:path skos:prefLabel ;
    sh:minCount 1 ;
    sh:datatype rdf:langString ;
    sh:name "Preferred Label" ;
    sh:description "The main label for this concept" ;
    sh:order 1 ;
] ;
```

Becomes:
- Required text input
- Language tag selector
- Ordered first in form
- Help text from sh:description

### Validation

Use SHACL shapes to validate:
- Missing required properties
- Wrong datatypes
- Cardinality violations
- Show warnings vs errors

### Load/Save

Load TTL from:
- URL parameters: `/editor?vocab=/data/vocabs/my-vocab.ttl`
- File upload
- Paste TTL directly

Save options:
- Download TTL
- Copy to clipboard
- (Future) Save to repo

---

## Label Resolution

When editing, IRIs need human labels.

### Strategy

1. **Local labels first**: Check loaded vocab + background TTLs
2. **Cache lookup**: Check IndexedDB cache
3. **Remote fallback**: Query if cache miss
4. **Graceful degradation**: Show IRI if all fails

### Build-Time vs Runtime

- **Build time**: Materialize labels in `/data/labels.json`
- **Runtime**: Cache lookups, minimize remote queries

---

## Immediate Tasks

1. [ ] Add contextual help for each section
2. [ ] Show `prefix:localName` in property picker
3. [ ] Replace up/down arrows with drag handles
4. [ ] Consider stepped wizard approach
5. [ ] Add listing profile support
6. [ ] Support multiple profiles per target class
