# Authoring Experience: Profile Helper & Vocabulary Editing

## Current Status

We have a basic Profile Helper at `/profile-helper` that allows building `prez:ObjectProfile` definitions. However, the UX needs refinement and several concepts are missing.

---

## Profile Helper UX Issues

### 1. Information Overload

**Problem:** Everything is on one page at once - metadata, target class, source predicates, generation flags, formats, templates. This is overwhelming for new users.

**Solution:** Consider a stepped/wizard approach or collapsible sections with progressive disclosure:

```
Step 1: Basics (identifier, title, target class)
Step 2: What to call things? (label sources)
Step 3: How to describe things? (description sources)
Step 4: What to generate? (flags)
Step 5: Output formats
Step 6: Advanced (templates, provenance)
```

### 2. Missing Contextual Help

**Problem:** Users don't understand *how* source predicates are used. Key questions:

- "Do I need different predicates for each target class?"
- "What order should predicates be in?"
- "What happens if a resource doesn't have the first predicate?"

**Explanation needed:**

> **Source Predicates** define where prez-lite looks for values, in priority order.
>
> For example, `prez:labelSource skos:prefLabel, dcterms:title, rdfs:label` means:
> 1. First, check for `skos:prefLabel`
> 2. If not found, check `dcterms:title`
> 3. If still not found, use `rdfs:label`
>
> The first match wins. Order matters.

Each target class typically has its own profile with appropriate source predicates. A `skos:ConceptScheme` might use `skos:prefLabel` for labels, while a `schema:DataCatalog` might prefer `schema:name`.

### 3. Predicate Picker Issues

**Problem:** When adding predicates:
- Can't see which namespace (skos vs dcterms) until after adding
- Human-readable labels used instead of property names
- No connection between "Preferred Label" in picker and `skos:prefLabel` that gets added

**Solution:**
- Show `prefix:localName` format prominently: `skos:prefLabel` (Preferred Label)
- Group by namespace with prefix visible
- Consider a two-column view: left shows available properties grouped by namespace, right shows selected properties with full IRIs

### 4. Reordering UX

**Problem:** Up/down arrows feel clunky for reordering source predicates.

**Solution:** Drag handles with visual drag indicators:
```
☰ skos:prefLabel
☰ dcterms:title
☰ rdfs:label
```

Use a sortable library (e.g., Vue Draggable, dnd-kit patterns).

---

## Missing Profile Concepts

### 1. Listing Profiles (`prez:ListingProfile`)

Prez distinguishes between:
- **Object Profile**: Renders individual resources (what we have)
- **Listing Profile**: Renders collections of resources (what we're missing)

A complete setup needs both:
```turtle
# Object profile - for viewing a single ConceptScheme
prez:SchemeObjectProfile a prez:ObjectProfile ;
    sh:targetClass skos:ConceptScheme .

# Listing profile - for viewing a list of ConceptSchemes
prez:SchemesListingProfile a prez:ListingProfile ;
    sh:targetClass skos:ConceptScheme .
```

The listing profile controls:
- What properties appear in list views
- How items are labelled/described in collection pages
- Pagination behavior

### 2. Multiple Profiles Per Target Class

Prez supports multiple profiles for the same class, selectable via content negotiation:
- **Default profile**: Used when no profile specified
- **Full profile**: All properties
- **Minimal profile**: Just labels and links
- **Custom profile**: Domain-specific views

We should support at least:
```
Default: prez:ConceptSchemeDefault
Full: prez:ConceptSchemeFull
```

The Profile Helper should clarify which profile type is being created.

### 3. Property Inclusion Logic

Beyond source predicates, Prez profiles support:

| Setting | Meaning |
|---------|---------|
| Default | Property must exist to be included |
| `sh:minCount 0` | Optional - include if present |
| `sh:maxCount 0` | Excluded - never include |

This becomes important for full vs minimal profiles.

### 4. Property Paths

Prez supports complex SHACL paths:
- **Sequence paths**: `sh:path (prov:qualifiedDerivation prov:hadRole)`
- **Inverse paths**: `sh:path [ sh:inversePath dcterms:hasPart ]`
- **Union paths**: Multiple alternatives via `sh:union`

For prez-lite, we probably only need direct paths, but should document this limitation.

---

## Vocabulary Editing Needs

The Profile Helper only creates profiles. The full vision includes **vocabulary editing** driven by profiles.

### Profile-Driven Forms

From a profile, generate editing forms:
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
- Language tag selector (en, en-AU, etc.)
- Ordered first in form
- Help text from sh:description

### Validation

Use the profile's SHACL shapes to validate vocabularies:
- Missing required properties
- Wrong datatypes
- Cardinality violations
- Show warnings vs errors

### Load/Save

Support loading TTL from:
- URL parameters: `/editor?vocab=/data/vocabs/my-vocab.ttl`
- File upload
- Paste TTL directly

Save options:
- Download TTL
- Copy to clipboard
- (Future) Save to repo

---

## Label Resolution

When editing/viewing vocabularies, we display IRIs that need human labels (predicates, classes, related concepts).

### Strategy

1. **Local labels first**: Check loaded vocab + background TTLs
2. **Cache lookup**: Check persistent cache (IndexedDB)
3. **Remote fallback**: Query SPARQL endpoint if cache miss
4. **Graceful degradation**: Show IRI if all else fails

### Build-Time vs Runtime

- **Build time**: Materialize labels via prezmanifest, store in `/data/background/`
- **Runtime**: Cache lookups, minimize remote queries

---

## Immediate Tasks

### Profile Helper Improvements

1. [ ] Add contextual help/descriptions for each section
2. [ ] Show `prefix:localName` in property picker
3. [ ] Replace up/down arrows with drag handles
4. [ ] Consider stepped wizard or collapsible sections
5. [ ] Add listing profile support
6. [ ] Support multiple profiles per target class (default/full)

### Documentation

1. [ ] Document URL generation strategy for static sites
2. [ ] Document profile structure and what each property does
3. [ ] Provide example profiles for common use cases

### Future (see Idea-Phase2.md)

- Full vocabulary editing with profile-driven forms
- Catalog/collection/item hierarchy support
- Non-vocabulary use cases (DCAT, schema.org)

---

## References

- [Prez Development Docs - Profiles](https://github.com/RDFLib/prez/blob/main/docs/development.md#profiles)
- [Idea-ProfileUI-Helper.md](./Idea-ProfileUI-Helper.md) - Original vision document
- [profiles.ttl](../web/public/data/profiles.ttl) - Current profile definitions
