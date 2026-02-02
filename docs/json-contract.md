# JSON Data Contract

This document defines the normalized JSON/NDJSON output format generated from TTL vocabulary files.

## Design Principles

- **SPARQL-free**: All data is extracted via deterministic RDF parsing (N3.js)
- **Chunked for scale**: Large datasets split into manageable files
- **Predictable**: Same TTL input always produces same JSON output
- **Client-friendly**: Optimized for browser consumption and client-side rendering

## Output Files

### 1. `schemes.json`

List of all concept schemes in the vocabularies.

```json
{
  "schemes": [
    {
      "iri": "http://example.org/schemes/colors",
      "type": "ConceptScheme",
      "prefLabel": {
        "en": "Color Scheme"
      },
      "definition": {
        "en": "A vocabulary of colors"
      },
      "created": "2024-01-15",
      "modified": "2024-03-20",
      "creator": ["http://example.org/agents/alice"],
      "publisher": ["http://example.org/orgs/example"],
      "topConcepts": [
        "http://example.org/colors/red",
        "http://example.org/colors/blue"
      ],
      "conceptCount": 42
    }
  ]
}
```

**Fields:**
- `iri` (string, required): Scheme URI
- `type` (string): Always "ConceptScheme"
- `prefLabel` (object): Language-keyed preferred labels
- `definition` (object): Language-keyed definitions
- `created` (string): Creation date (ISO 8601)
- `modified` (string): Last modified date
- `creator` (array): Creator IRIs
- `publisher` (array): Publisher IRIs
- `topConcepts` (array): IRIs of top-level concepts
- `conceptCount` (number): Total concepts in this scheme

### 2. `concepts/*.ndjson`

Concept data split into chunked NDJSON files (newline-delimited JSON). Each line is a complete concept record.

**Chunking strategy:**
- One file per scheme: `concepts/{scheme-slug}.ndjson`
- For large schemes (>10k concepts): `concepts/{scheme-slug}-{chunk-index}.ndjson`

```ndjson
{"iri":"http://example.org/colors/red","type":"Concept","prefLabel":{"en":"Red"},"altLabel":{"en":["Crimson","Scarlet"]},"definition":{"en":"The color at the long wavelength end of the visible spectrum"},"notation":"RED","inScheme":["http://example.org/schemes/colors"],"topConceptOf":["http://example.org/schemes/colors"],"broader":[],"narrower":["http://example.org/colors/dark-red","http://example.org/colors/light-red"],"related":["http://example.org/colors/orange"],"exactMatch":[],"closeMatch":[],"broadMatch":[],"narrowMatch":[]}
{"iri":"http://example.org/colors/blue","type":"Concept","prefLabel":{"en":"Blue"},"altLabel":{},"definition":{"en":"The color of the clear sky"},"notation":"BLUE","inScheme":["http://example.org/schemes/colors"],"topConceptOf":["http://example.org/schemes/colors"],"broader":[],"narrower":["http://example.org/colors/navy","http://example.org/colors/sky-blue"],"related":["http://example.org/colors/purple"],"exactMatch":[],"closeMatch":[],"broadMatch":[],"narrowMatch":[]}
```

**Fields per concept:**
- `iri` (string, required): Concept URI
- `type` (string): Always "Concept"
- `prefLabel` (object): Language-keyed preferred labels
- `altLabel` (object): Language-keyed arrays of alternative labels
- `definition` (object): Language-keyed definitions
- `notation` (string): Short notation/code
- `inScheme` (array): IRIs of schemes this concept belongs to
- `topConceptOf` (array): IRIs of schemes where this is a top concept
- `broader` (array): IRIs of broader concepts
- `narrower` (array): IRIs of narrower concepts
- `related` (array): IRIs of related concepts
- `exactMatch` (array): IRIs of exact matches (SKOS mapping)
- `closeMatch` (array): IRIs of close matches
- `broadMatch` (array): IRIs of broad matches
- `narrowMatch` (array): IRIs of narrow matches

### 3. `collections.json`

Concept collections (if present in vocabularies).

```json
{
  "collections": [
    {
      "iri": "http://example.org/collections/warm-colors",
      "type": "Collection",
      "prefLabel": {
        "en": "Warm Colors"
      },
      "definition": {
        "en": "Colors associated with warmth"
      },
      "members": [
        "http://example.org/colors/red",
        "http://example.org/colors/orange",
        "http://example.org/colors/yellow"
      ]
    }
  ]
}
```

**Fields:**
- `iri` (string, required): Collection URI
- `type` (string): Always "Collection"
- `prefLabel` (object): Language-keyed preferred labels
- `definition` (object): Language-keyed definitions
- `members` (array): IRIs of member concepts

### 4. `search-index.json`

Compact search index for client-side search (using Fuse.js or similar).

```json
{
  "concepts": [
    {
      "iri": "http://example.org/colors/red",
      "prefLabel": "Red",
      "altLabels": ["Crimson", "Scarlet"],
      "notation": "RED",
      "scheme": "http://example.org/schemes/colors",
      "schemeLabel": "Color Scheme"
    }
  ]
}
```

**Fields (minimal for search):**
- `iri` (string): Concept URI
- `prefLabel` (string): Preferred label (default language)
- `altLabels` (array): Alternative labels (default language)
- `notation` (string): Notation/code
- `scheme` (string): Primary scheme IRI
- `schemeLabel` (string): Scheme label for display

## Language Handling

- All language-tagged literals are stored as objects keyed by language code
- Default language preference: `en` > `en-US` > first available
- Search index uses default language only for simplicity
- Full concept data retains all languages

## IRI to Slug Conversion

For file naming and URL generation:
- Remove protocol: `http://` or `https://`
- Replace special chars with `-`
- Lowercase
- Truncate if needed

Example: `http://example.org/schemes/colors` → `example-org-schemes-colors`

## Chunking Thresholds

- Schemes: no chunking (typically <100 schemes)
- Concepts per file: 10,000 concepts max
- Search index: all concepts in one file (optimized for browser loading)

## Validation

Generated JSON should validate against:
- Valid JSON/NDJSON syntax
- All IRIs are valid URIs
- All references (inScheme, broader, narrower) point to defined resources
- Language codes follow BCP 47

## Extension Points

For custom properties beyond VocPub/SKOS core:
- Add to concept/scheme objects with namespaced keys
- Example: `"dcterms:provenance": "..."`
