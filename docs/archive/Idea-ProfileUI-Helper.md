# Profile UI Helper

## Overview

A web-based UI for creating and editing vocabulary profiles and vocabularies using a profile-first approach. The profile acts as both a specification (what a valid vocab looks like) and a configuration (what gets processed/output).

## Core Concept: Profile-First Workflow

Instead of asking users abstract questions about vocabulary standards, we guide them through building or selecting a profile that encodes all their decisions:

```
Step 1: "What do you want to call things?"
        → prez:labelSource skos:prefLabel, dcterms:title, rdfs:label ;

Step 2: "How do you want to describe things?"
        → prez:descriptionSource skos:definition, dcterms:description ;

Step 3: "Do you need provenance tracking?"
        → prez:generateProvenance true/false ;
        → prez:provenanceSource dcterms:provenance ; (or prov:qualifiedAttribution)

Step 4: "What output formats do you need?"
        → altr-ext:hasResourceFormat "text/turtle", "application/ld+json" ;
```

## Use Cases

### 1. New Vocabulary Creation
- User selects or creates a profile
- Profile defines what metadata fields are required/optional
- UI generates a form based on the profile's SHACL shapes
- User fills in the form to create concepts
- TTL is generated conforming to the profile

### 2. Edit Existing Vocabulary
- Load an existing vocab TTL file
- Load its associated profile TTL (or infer/select one)
- UI presents the vocab data in editable form
- Validate changes against the profile
- Export updated TTL

### 3. Edit Profile Definition
- Load an existing profile TTL
- Modify source predicates, generation flags, output formats
- Preview what a vocab conforming to this profile would look like
- Export updated profile TTL

## URL-Based Asset Loading

The editor should support loading TTL files via URL parameters, pointing to static assets:

```
# Load a vocabulary for editing
/editor?vocab=/data/vocabs/my-vocab.ttl

# Load a vocabulary with a specific profile
/editor?vocab=/data/vocabs/my-vocab.ttl&profile=/data/profiles/vocpub.ttl

# Create new vocab with a profile template
/editor?profile=/data/profiles/ga-vocabs.ttl&new=true

# Edit a profile itself
/editor?editProfile=/data/profiles/custom.ttl
```

## Static Asset Requirements

For the editor to work with TTL files, they need to be accessible:

### Option A: Public Folder
Place TTL files in `web/public/data/`:
```
web/public/
  data/
    vocabs/
      my-vocab.ttl
    profiles/
      ga-vocabs.ttl
      gswa-vocabs.ttl
```

Accessible at: `https://site.com/data/vocabs/my-vocab.ttl`

### Option B: API Route
Create an API endpoint that serves TTL files:
```typescript
// server/api/vocab/[...path].get.ts
export default defineEventHandler(async (event) => {
  const path = getRouterParam(event, 'path');
  // Load and return TTL content
});
```

### Option C: External URLs
Support loading from any URL (CORS permitting):
```
/editor?vocab=https://example.org/vocab.ttl
```

## Profile as Template

The profile should fully specify what a conforming vocabulary looks like:

```turtle
prez:GAVocabProfile a prof:Profile, sh:NodeShape ;
    sh:targetClass skos:ConceptScheme ;
    
    # Required properties (for validation and form generation)
    sh:property [
        sh:path skos:prefLabel ;
        sh:minCount 1 ;
        sh:datatype rdf:langString ;
        sh:name "Label" ;
        sh:description "The preferred name for this vocabulary" ;
        sh:order 1 ;
    ] ;
    sh:property [
        sh:path skos:definition ;
        sh:minCount 1 ;
        sh:datatype rdf:langString ;
        sh:name "Definition" ;
        sh:description "A clear description of what this vocabulary covers" ;
        sh:order 2 ;
    ] ;
    sh:property [
        sh:path dcterms:created ;
        sh:maxCount 1 ;
        sh:datatype xsd:date ;
        sh:name "Date Created" ;
        sh:order 3 ;
    ] ;
    
    # Optional but recommended (sh:severity sh:Warning)
    sh:property [
        sh:path dcterms:creator ;
        sh:name "Creator" ;
        sh:description "The organization or person who created this vocabulary" ;
        sh:severity sh:Warning ;
        sh:order 4 ;
    ] ;
    
    # Generation configuration
    prez:labelSource skos:prefLabel, dcterms:title ;
    prez:descriptionSource skos:definition, dcterms:description ;
    prez:generateIdentifier true ;
    prez:generateLink true ;
```

## UI Components

### Profile Editor
- Drag-and-drop predicate selection from common vocabularies (SKOS, DCTerms, Schema.org, PROV-O)
- Toggle required/optional for each property
- Set cardinality constraints
- Preview the resulting SHACL shape
- Export as profile.ttl

### Vocabulary Editor
- Form-based editing driven by profile shapes
- Real-time validation against profile
- Concept hierarchy tree view
- Broader/narrower relationship builder
- TTL preview pane
- Import/export TTL

### Profile Selector
- Gallery of common profiles (VocPub, GA style, GSWA style)
- Compare profiles side-by-side
- Fork and customize existing profiles

## Technical Implementation

### Parser Integration
Reuse `shacl-profile-parser.js` to:
- Parse profile TTL into configuration
- Extract sh:property shapes for form generation
- Validate vocab TTL against profile shapes

### Label Resolution (Background Labels)

Editing vocabularies means we often display IRIs that *should* have human-friendly labels (classes, predicates, roles, statuses, agents, related concepts, etc.). To make this work across many vocabulary sources (not just GA/GSWA), use a **two-stage label strategy**:

#### 1) Runtime (UI) fallback lookup + caching
- **Goal**: If an IRI has no label in the currently loaded graphs (source vocab + local background TTLs), do an on-demand lookup.
- **Source**: Query a SPARQL endpoint that contains a broad “semantic background” dataset (Kurrawong’s demo endpoint is documented for prezmanifest usage as `http://demo.dev.kurrawong.ai/sparql`).
- **Caching**:
  - In-memory cache for the current session
  - Persistent cache (IndexedDB/localStorage) with TTL so revisits don’t re-query
- **Failure-safe**: If the endpoint is down / blocked (e.g. mixed-content `http` from an `https` UI), degrade gracefully by showing the IRI. If mixed-content is a problem, use an app-side proxy route.

Example query pattern (single IRI, pick best label/description):

```sparql
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
PREFIX dcterms: <http://purl.org/dc/terms/>
PREFIX schema: <https://schema.org/>

SELECT ?label ?labelPred ?desc ?descPred WHERE {
  VALUES ?s { <IRI_TO_LABEL> }
  OPTIONAL { VALUES ?labelPred { skos:prefLabel rdfs:label dcterms:title schema:name } ?s ?labelPred ?label }
  OPTIONAL { VALUES ?descPred  { skos:definition dcterms:description schema:description } ?s ?descPred  ?desc  }
}
```

#### 2) Build-time materialisation using prezmanifest
- **Goal**: Produce deterministic builds and support offline editing/preview by writing labels into local TTL(s).
- **Mechanism**: Run prezmanifest labelling against the manifest and a SPARQL endpoint, then store the resulting label TTL in the project (and/or register it in the manifest as an “incomplete labels” resource).
- **Outcome**: The editor and processing pipeline can resolve most labels locally; the runtime lookup becomes a rare fallback.

Example build step:

```bash
pm label rdf data/manifest.ttl http://demo.dev.kurrawong.ai/sparql > data/background/semantic-background-labels.ttl
```

### Form Generation
From SHACL shapes, generate form fields:
- `sh:datatype xsd:date` → Date picker
- `sh:datatype rdf:langString` → Text input with language tag selector
- `sh:datatype xsd:anyURI` → URL input with validation
- `sh:minCount 1` → Required field marker
- `sh:maxCount 1` → Single value (not repeatable)
- `sh:in (...)` → Dropdown/select from list

### State Management
```typescript
interface EditorState {
  vocab: {
    iri: string;
    store: N3.Store;
    modified: boolean;
  };
  profile: {
    iri: string;
    config: ProfileConfig;
  };
  validation: {
    errors: ValidationError[];
    warnings: ValidationWarning[];
  };
}
```

## Future Enhancements

1. **Collaborative Editing** - Multiple users editing the same vocab
2. **Version Control** - Git-like history for vocab changes
3. **Validation Service** - Real-time SHACL validation as you type
4. **Import from CSV** - Bulk import concepts from spreadsheets
5. **AI Assistance** - Suggest definitions, detect duplicates, propose hierarchies
6. **Profile Marketplace** - Share and discover community profiles

## Related Files

- `packages/data-processing/scripts/shacl-profile-parser.js` - SHACL profile parsing
- `packages/data-processing/examples/ga-vocab-ref/profiles.ttl` - Example profile definition
- `packages/data-processing/scripts/process-vocab.js` - Processing pipeline
