---
title: Profile Helper
description: Build and validate prez:ObjectProfile definitions
navigation: false
---

# Profile Helper

An interactive tool for building and validating `prez:ObjectProfile` definitions for vocabulary processing.

[Open Profile Helper →](/profile-helper)

---

## Features

### Visual Builder

Build profiles using a form-based interface:

- Select target class from common options (SKOS, Schema.org)
- Choose source predicates for labels, descriptions, and provenance
- Toggle generation flags with one click
- Configure output formats with default selection

### TTL Editor

Edit profile definitions directly with:

- Syntax highlighting for Turtle format
- Real-time validation
- Parse error detection

### Live Validation

Get immediate feedback on your profile:

- Required property checks
- Source predicate recommendations
- Generation flag consistency warnings

---

## What is an Object Profile?

A `prez:ObjectProfile` defines how Prez processes and annotates a specific type of RDF resource. Each profile includes:

| Property | Purpose |
|----------|---------|
| `sh:targetClass` | The RDF class this profile applies to |
| `prez:labelSource` | Predicates to use for labels (in priority order) |
| `prez:descriptionSource` | Predicates to use for descriptions |
| `prez:generate*` | Which annotations to generate |
| `altr-ext:hasResourceFormat` | Supported output formats |
| `prez:linkTemplate` | URL pattern for resource links |

[Learn more in the Authoring Guide →](/authoring)
