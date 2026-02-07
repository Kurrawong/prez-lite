---
title: JSON Data Contract
status: stable
updated: 2025-02-08
---

# JSON Data Contract

> Normalized JSON/NDJSON output format generated from TTL vocabulary files.

## Design Principles

- **SPARQL-free**: All data extracted via deterministic RDF parsing (N3.js)
- **Chunked for scale**: Large datasets split into manageable files
- **Predictable**: Same TTL input always produces same JSON output
- **Client-friendly**: Optimized for browser consumption

---

## Output Files

### 1. `schemes.json`

List of all concept schemes.

```json
{
  "schemes": [
    {
      "iri": "http://example.org/schemes/colors",
      "type": "ConceptScheme",
      "prefLabel": { "en": "Color Scheme" },
      "definition": { "en": "A vocabulary of colors" },
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
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `iri` | string | Yes | Scheme URI |
| `type` | string | Yes | Always "ConceptScheme" |
| `prefLabel` | object | No | Language-keyed preferred labels |
| `definition` | object | No | Language-keyed definitions |
| `created` | string | No | Creation date (ISO 8601) |
| `modified` | string | No | Last modified date |
| `creator` | array | No | Creator IRIs |
| `publisher` | array | No | Publisher IRIs |
| `topConcepts` | array | No | IRIs of top-level concepts |
| `conceptCount` | number | No | Total concepts in scheme |

---

### 2. `concepts/*.ndjson`

Concept data in newline-delimited JSON, one file per scheme.

**Naming:** `concepts/{scheme-slug}.ndjson`

```ndjson
{"iri":"http://example.org/colors/red","type":"Concept","prefLabel":{"en":"Red"},"broader":[],"narrower":["http://example.org/colors/dark-red"]}
{"iri":"http://example.org/colors/blue","type":"Concept","prefLabel":{"en":"Blue"},"broader":[],"narrower":[]}
```

**Fields per concept:**
| Field | Type | Description |
|-------|------|-------------|
| `iri` | string | Concept URI |
| `type` | string | Always "Concept" |
| `prefLabel` | object | Language-keyed preferred labels |
| `altLabel` | object | Language-keyed arrays of alt labels |
| `definition` | object | Language-keyed definitions |
| `notation` | string | Short notation/code |
| `inScheme` | array | Scheme IRIs |
| `topConceptOf` | array | Schemes where top concept |
| `broader` | array | Broader concept IRIs |
| `narrower` | array | Narrower concept IRIs |
| `related` | array | Related concept IRIs |
| `exactMatch` | array | Exact match IRIs |
| `closeMatch` | array | Close match IRIs |
| `broadMatch` | array | Broad match IRIs |
| `narrowMatch` | array | Narrow match IRIs |

---

### 3. `search-index.json`

Compact index for client-side search.

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

Uses default language only for compact size.

---

### 4. `labels.json`

IRI to label mappings for display.

```json
{
  "http://example.org/colors/red": "Red",
  "http://example.org/schemes/colors": "Color Scheme"
}
```

---

## Language Handling

- All language-tagged literals stored as objects keyed by language code
- Default language preference: `en` > `en-US` > first available
- Search index uses default language only
- Full concept data retains all languages

---

## IRI to Slug Conversion

For file naming:
1. Remove protocol (`http://`, `https://`)
2. Replace special characters with `-`
3. Lowercase
4. Truncate if needed

Example: `http://example.org/schemes/colors` → `example-org-schemes-colors`

---

## Chunking

| Data Type | Strategy |
|-----------|----------|
| Schemes | No chunking (typically <100) |
| Concepts | One file per scheme, max 10k per file |
| Search | All in one file |

---

## Validation

Generated JSON should:
- Be valid JSON/NDJSON syntax
- Have valid URIs for all IRIs
- Have valid BCP 47 language codes
- Reference only defined resources
