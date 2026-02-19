---
title: Use Cases
status: current
updated: 2025-02-08
---

# Use Cases

> Business scenarios and user stories for prez-lite.

## Target Users

### Primary: Vocabulary Publishers

Organizations that maintain controlled vocabularies and need to:
- Publish vocabularies for public access
- Provide machine-readable exports for data integration
- Enable discovery and browsing without infrastructure costs
- Maintain standards compliance (SKOS, VocPub)

**Examples:**
- Government agencies (geological surveys, environmental agencies)
- Standards bodies
- Research institutions
- Industry consortia

### Secondary: Data Integrators

Developers and analysts who need to:
- Consume published vocabularies in applications
- Embed vocabulary selection widgets in forms
- Link data to standardized terms
- Download vocabularies for local processing

### Tertiary: Domain Experts

Subject matter experts who need to:
- Browse and understand vocabulary content
- Find appropriate terms for classification
- Explore relationships between concepts
- Share specific concepts with colleagues

---

## Core Use Cases

### UC1: Publish Vocabulary Website

**Actor:** Vocabulary Publisher
**Goal:** Make vocabularies accessible via a public website

**Scenario:**
1. Publisher has SKOS vocabularies in Turtle format
2. Publisher configures prez-lite with vocabulary files
3. Build process generates static website
4. Website deployed to GitHub Pages (or other host)
5. Public users can browse vocabularies

**Value:** Zero-cost, maintenance-free vocabulary publishing

---

### UC2: Browse Vocabulary Hierarchy

**Actor:** Domain Expert
**Goal:** Understand vocabulary structure and find relevant concepts

**Scenario:**
1. User visits vocabulary listing page
2. User selects a vocabulary of interest
3. User explores concept tree, expanding branches
4. User clicks concept to see details
5. User follows relationships to related concepts

**Value:** Intuitive exploration without RDF knowledge

---

### UC3: Search Across Vocabularies

**Actor:** Data Integrator
**Goal:** Find concepts matching a term or description

**Scenario:**
1. User enters search term
2. System returns matching concepts across all vocabularies
3. User filters by vocabulary or publisher
4. User selects result to view concept detail
5. User copies IRI for use in data

**Value:** Fast discovery across large vocabulary collections

---

### UC4: Download Vocabulary Export

**Actor:** Data Integrator
**Goal:** Obtain vocabulary in machine-readable format

**Scenario:**
1. User navigates to share page
2. User selects vocabulary
3. User chooses export format (TTL, JSON-LD, CSV, etc.)
4. User downloads file
5. User imports into triplestore or application

**Value:** Standard formats for system integration

---

### UC5: Embed Vocabulary Widget

**Actor:** Application Developer
**Goal:** Add vocabulary selection to web application

**Scenario:**
1. Developer visits share page
2. Developer configures widget options (display mode, search)
3. Developer copies embed code
4. Developer adds to application HTML
5. End users can select concepts from vocabulary

**Value:** Reusable components without rebuilding logic

---

### UC6: Share Concept Link

**Actor:** Domain Expert
**Goal:** Share specific concept with colleague

**Scenario:**
1. User browses to concept of interest
2. User copies URL from browser
3. User sends URL to colleague
4. Colleague opens link directly to concept
5. Colleague sees full concept details

**Value:** Deep-linkable, shareable vocabulary content

---

### UC7: Configure Vocabulary Display

**Actor:** Vocabulary Publisher
**Goal:** Control which properties appear and how

**Scenario:**
1. Publisher opens Profile Helper
2. Publisher selects target class (ConceptScheme, Concept)
3. Publisher configures label/description sources
4. Publisher exports profile as Turtle
5. Profile applied during next build

**Value:** Customizable presentation without code changes

---

## Advanced Use Cases

### UC8: Multi-Organization Deployment

**Actor:** Consortium Coordinator
**Goal:** Publish vocabularies from multiple organizations

**Scenario:**
1. Multiple organizations contribute vocabularies
2. Vocabularies aggregated in central repository
3. prez-lite builds unified website
4. Users can filter by organization/publisher
5. Each organization retains ownership of content

**Value:** Federated vocabulary publishing

---

### UC9: Vocabulary Versioning

**Actor:** Vocabulary Manager
**Goal:** Publish new vocabulary version while preserving history

**Scenario:**
1. Manager updates vocabulary with new concepts
2. Manager increments version in metadata
3. Build process generates updated exports
4. Previous version remains accessible
5. Users can access current and historical versions

**Value:** Version control with continuity

---

### UC10: Custom Branding

**Actor:** Organization Administrator
**Goal:** Apply organization branding to vocabulary site

**Scenario:**
1. Admin extends prez-lite via Nuxt layers
2. Admin customizes colors, logo, footer
3. Admin adds organization-specific content pages
4. Build produces branded site
5. Site matches organization identity

**Value:** White-label vocabulary publishing

---

## Business Benefits

### For Publishers

| Benefit | Description |
|---------|-------------|
| **Zero Infrastructure** | No servers, databases, or SPARQL endpoints |
| **Low Cost** | Free hosting on GitHub Pages |
| **Standards Compliance** | VocPub, SKOS, DCAT out of the box |
| **Maintenance-Free** | Static sites don't need patching |

### For Integrators

| Benefit | Description |
|---------|-------------|
| **Multiple Formats** | 9 export formats for any system |
| **Embeddable Widgets** | Drop-in components for applications |
| **Stable URLs** | Reliable IRI-based access |
| **No Rate Limits** | Static content, unlimited requests |

### For Users

| Benefit | Description |
|---------|-------------|
| **Fast Loading** | Pre-generated pages, CDN-ready |
| **Mobile Friendly** | Responsive design |
| **Shareable Links** | Deep links to any concept |
| **No Login Required** | Public access by default |

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Page load time | < 2 seconds |
| Search response | < 500ms |
| Export availability | 100% (static files) |
| Vocabulary coverage | All SKOS/VocPub compliant vocabs |
| Format support | 9 export formats |
