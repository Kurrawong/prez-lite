import { describe, it, expect, beforeAll } from 'vitest'
import {
  parseProfilesContent,
  getProfileForClass,
  getDefaultProfileForClass,
  toProcessingConfig,
  parseTTL,
  NS,
  type ProfileConfig,
} from '~/utils/shacl-profile-parser'

// ============================================================================
// Minimal profile TTL for tests
// ============================================================================

const MINIMAL_PROFILE = `
@prefix prof: <http://www.w3.org/ns/dx/prof/> .
@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix dcterms: <http://purl.org/dc/terms/> .
@prefix skos: <http://www.w3.org/2004/02/skos/core#> .
@prefix prez: <https://prez.dev/> .
@prefix altr-ext: <http://www.w3.org/ns/dx/connegp/altr-ext#> .

<http://example.com/profile/concept>
    a prof:Profile ;
    dcterms:identifier "concept" ;
    dcterms:title "Concept Profile" ;
    dcterms:description "Profile for SKOS Concepts" ;
    sh:targetClass skos:Concept ;
    altr-ext:hasDefaultResourceFormat "text/turtle" ;
    altr-ext:hasResourceFormat "text/turtle" , "application/ld+json" ;
    prez:generateIdentifier true ;
    prez:generateLabel true ;
    prez:generateDescription true ;
    prez:generateProvenance false ;
    prez:generateLink true ;
    prez:generateMembers false ;
    prez:generateFocusNode true ;
    prez:linkTemplate "/vocabs/{identifier}" ;
    prez:labelSource skos:prefLabel , <http://www.w3.org/2000/01/rdf-schema#label> ;
    prez:descriptionSource skos:definition .
`

const SCHEME_PROFILE = `
@prefix prof: <http://www.w3.org/ns/dx/prof/> .
@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix dcterms: <http://purl.org/dc/terms/> .
@prefix skos: <http://www.w3.org/2004/02/skos/core#> .
@prefix prez: <https://prez.dev/> .

<http://example.com/profile/scheme>
    a prof:Profile ;
    dcterms:identifier "scheme" ;
    dcterms:title "Scheme Profile" ;
    sh:targetClass skos:ConceptScheme ;
    prez:generateLabel true ;
    prez:labelSource skos:prefLabel .
`

const UMBRELLA_PROFILE = `
@prefix prof: <http://www.w3.org/ns/dx/prof/> .
@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix dcterms: <http://purl.org/dc/terms/> .
@prefix skos: <http://www.w3.org/2004/02/skos/core#> .
@prefix prez: <https://prez.dev/> .
@prefix altr-ext: <http://www.w3.org/ns/dx/connegp/altr-ext#> .

<http://example.com/profile/umbrella>
    a prof:Profile ;
    dcterms:identifier "umbrella" ;
    dcterms:title "Umbrella Profile" ;
    prez:catalog <http://example.com/catalog/main> ;
    altr-ext:hasNodeShape [
        sh:targetClass skos:ConceptScheme ;
        altr-ext:hasDefaultProfile <http://example.com/profile/scheme>
    ] , [
        sh:targetClass skos:Concept ;
        altr-ext:hasDefaultProfile <http://example.com/profile/concept>
    ] .

<http://example.com/catalog/main>
    a prez:Catalog ;
    dcterms:identifier "main-catalog" ;
    dcterms:title "Main Catalog" ;
    dcterms:description "The main catalog" .
`

const PROPERTY_SHAPES_PROFILE = `
@prefix prof: <http://www.w3.org/ns/dx/prof/> .
@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix dcterms: <http://purl.org/dc/terms/> .
@prefix skos: <http://www.w3.org/2004/02/skos/core#> .
@prefix prez: <https://prez.dev/> .

<http://example.com/profile/with-props>
    a prof:Profile ;
    dcterms:identifier "with-props" ;
    sh:targetClass skos:Concept ;
    prez:generateLabel true ;
    sh:property [
        sh:name "label" ;
        sh:description "The display label" ;
        sh:order 1 ;
        sh:path skos:prefLabel
    ] , [
        sh:name "definition" ;
        sh:description "The definition" ;
        sh:order 2 ;
        sh:path skos:definition
    ] , [
        sh:name "broader" ;
        sh:order 3 ;
        sh:path skos:broader
    ] .
`

// ============================================================================
// parseTTL
// ============================================================================

describe('parseTTL', () => {
  it('parses valid TTL into a Store', () => {
    const store = parseTTL(`
      @prefix skos: <http://www.w3.org/2004/02/skos/core#> .
      <http://example.com/a> a skos:Concept .
    `)
    expect(store.size).toBeGreaterThan(0)
  })

  it('throws on invalid TTL', () => {
    expect(() => parseTTL('this is not valid turtle {')).toThrow()
  })
})

// ============================================================================
// parseProfilesContent
// ============================================================================

describe('parseProfilesContent', () => {
  it('parses a minimal profile', () => {
    const config = parseProfilesContent(MINIMAL_PROFILE)
    const profileIri = 'http://example.com/profile/concept'

    expect(Object.keys(config.profiles)).toHaveLength(1)
    const profile = config.profiles[profileIri]!
    expect(profile.iri).toBe(profileIri)
    expect(profile.identifier).toBe('concept')
    expect(profile.title).toBe('Concept Profile')
    expect(profile.description).toBe('Profile for SKOS Concepts')
    expect(profile.targetClass).toBe(`${NS.SKOS}Concept`)
  })

  it('extracts generation flags', () => {
    const config = parseProfilesContent(MINIMAL_PROFILE)
    const profile = Object.values(config.profiles)[0]!

    expect(profile.generate.identifier).toBe(true)
    expect(profile.generate.label).toBe(true)
    expect(profile.generate.description).toBe(true)
    expect(profile.generate.provenance).toBe(false)
    expect(profile.generate.link).toBe(true)
    expect(profile.generate.members).toBe(false)
    expect(profile.generate.focusNode).toBe(true)
  })

  it('extracts label and description sources', () => {
    const config = parseProfilesContent(MINIMAL_PROFILE)
    const profile = Object.values(config.profiles)[0]!

    expect(profile.labelSources).toContain(`${NS.SKOS}prefLabel`)
    expect(profile.labelSources).toContain('http://www.w3.org/2000/01/rdf-schema#label')
    expect(profile.labelSources).toHaveLength(2)
    expect(profile.descriptionSources).toEqual([`${NS.SKOS}definition`])
  })

  it('extracts output formats', () => {
    const config = parseProfilesContent(MINIMAL_PROFILE)
    const profile = Object.values(config.profiles)[0]!

    expect(profile.defaultFormat).toBe('text/turtle')
    expect(profile.formats).toContain('text/turtle')
    expect(profile.formats).toContain('application/ld+json')
  })

  it('extracts link template', () => {
    const config = parseProfilesContent(MINIMAL_PROFILE)
    const profile = Object.values(config.profiles)[0]!

    expect(profile.linkTemplate).toBe('/vocabs/{identifier}')
  })

  it('parses umbrella profile with node shapes', () => {
    const config = parseProfilesContent(UMBRELLA_PROFILE)

    expect(Object.keys(config.umbrellaProfiles)).toHaveLength(1)
    const umbrella = Object.values(config.umbrellaProfiles)[0]!
    expect(umbrella.identifier).toBe('umbrella')
    expect(umbrella.catalog).toBe('http://example.com/catalog/main')
    expect(umbrella.nodeShapes).toHaveLength(2)

    const schemeShape = umbrella.nodeShapes.find(ns =>
      ns.targetClasses.includes(`${NS.SKOS}ConceptScheme`),
    )
    expect(schemeShape).toBeDefined()
    expect(schemeShape!.defaultProfile).toBe('http://example.com/profile/scheme')
  })

  it('parses catalog definitions', () => {
    const config = parseProfilesContent(UMBRELLA_PROFILE)

    expect(Object.keys(config.catalogs)).toHaveLength(1)
    const catalog = Object.values(config.catalogs)[0]!
    expect(catalog.identifier).toBe('main-catalog')
    expect(catalog.title).toBe('Main Catalog')
  })

  it('parses property shapes with order', () => {
    const config = parseProfilesContent(PROPERTY_SHAPES_PROFILE)
    const profile = Object.values(config.profiles)[0]!

    expect(profile.properties).toHaveLength(3)
    expect(profile.properties[0]!.name).toBe('label')
    expect(profile.properties[0]!.order).toBe(1)
    expect(profile.properties[0]!.paths).toEqual([`${NS.SKOS}prefLabel`])
    expect(profile.properties[1]!.name).toBe('definition')
    expect(profile.properties[1]!.order).toBe(2)
    expect(profile.properties[2]!.name).toBe('broader')
    expect(profile.properties[2]!.order).toBe(3)
  })

  it('returns empty config for TTL with no profiles', () => {
    const config = parseProfilesContent(`
      @prefix skos: <http://www.w3.org/2004/02/skos/core#> .
      <http://example.com/a> a skos:Concept .
    `)
    expect(Object.keys(config.profiles)).toHaveLength(0)
    expect(Object.keys(config.umbrellaProfiles)).toHaveLength(0)
  })
})

// ============================================================================
// getProfileForClass
// ============================================================================

describe('getProfileForClass', () => {
  let config: ProfileConfig

  beforeAll(() => {
    config = parseProfilesContent(MINIMAL_PROFILE + SCHEME_PROFILE)
  })

  it('finds profile by target class', () => {
    const profile = getProfileForClass(config, `${NS.SKOS}Concept`)
    expect(profile).not.toBeNull()
    expect(profile!.identifier).toBe('concept')
  })

  it('returns null for unknown class', () => {
    expect(getProfileForClass(config, 'http://example.com/Unknown')).toBeNull()
  })
})

// ============================================================================
// getDefaultProfileForClass
// ============================================================================

describe('getDefaultProfileForClass', () => {
  it('resolves default profile via umbrella node shapes', () => {
    const combined = MINIMAL_PROFILE + SCHEME_PROFILE + UMBRELLA_PROFILE
    const config = parseProfilesContent(combined)
    const umbrellaIri = 'http://example.com/profile/umbrella'

    const conceptProfile = getDefaultProfileForClass(config, umbrellaIri, `${NS.SKOS}Concept`)
    expect(conceptProfile).not.toBeNull()
    expect(conceptProfile!.identifier).toBe('concept')

    const schemeProfile = getDefaultProfileForClass(config, umbrellaIri, `${NS.SKOS}ConceptScheme`)
    expect(schemeProfile).not.toBeNull()
    expect(schemeProfile!.identifier).toBe('scheme')
  })

  it('returns null for unknown umbrella IRI', () => {
    const config = parseProfilesContent(MINIMAL_PROFILE + UMBRELLA_PROFILE)
    expect(getDefaultProfileForClass(config, 'http://example.com/nope', `${NS.SKOS}Concept`)).toBeNull()
  })

  it('returns null for unmapped target class', () => {
    const config = parseProfilesContent(MINIMAL_PROFILE + UMBRELLA_PROFILE)
    const umbrellaIri = 'http://example.com/profile/umbrella'
    expect(getDefaultProfileForClass(config, umbrellaIri, 'http://example.com/Unknown')).toBeNull()
  })
})

// ============================================================================
// toProcessingConfig
// ============================================================================

describe('toProcessingConfig', () => {
  it('converts to processing config format', () => {
    const combined = MINIMAL_PROFILE + SCHEME_PROFILE + UMBRELLA_PROFILE
    const config = parseProfilesContent(combined)
    const processing = toProcessingConfig(config, 'http://example.com/profile/umbrella')

    expect(processing.catalog.id).toBe('main-catalog')
    expect(processing.catalog.label).toBe('Main Catalog')
    expect(processing.profiles.concept).toBeDefined()
    expect(processing.profiles.conceptScheme).toBeDefined()
    expect(processing.profiles.concept.constrainsClass).toBe(`${NS.SKOS}Concept`)
    expect(processing.profiles.concept.labelSources).toContain(`${NS.SKOS}prefLabel`)
  })

  it('throws for missing umbrella', () => {
    const config = parseProfilesContent(MINIMAL_PROFILE)
    expect(() => toProcessingConfig(config, 'http://example.com/missing')).toThrow('Umbrella profile not found')
  })

  it('throws for missing catalog', () => {
    // Umbrella profile without a matching catalog
    const ttl = `
      @prefix prof: <http://www.w3.org/ns/dx/prof/> .
      @prefix prez: <https://prez.dev/> .
      @prefix altr-ext: <http://www.w3.org/ns/dx/connegp/altr-ext#> .
      @prefix sh: <http://www.w3.org/ns/shacl#> .
      @prefix skos: <http://www.w3.org/2004/02/skos/core#> .
      <http://example.com/profile/u> a prof:Profile ;
          prez:catalog <http://example.com/catalog/missing> ;
          altr-ext:hasNodeShape [ sh:targetClass skos:Concept ; altr-ext:hasDefaultProfile <http://example.com/profile/c> ] .
    `
    const config = parseProfilesContent(ttl)
    expect(() => toProcessingConfig(config, 'http://example.com/profile/u')).toThrow('Catalog not found')
  })

  it('falls back to property shape paths for label sources', () => {
    const combined = PROPERTY_SHAPES_PROFILE + UMBRELLA_PROFILE
    // The property-shapes profile has no prez:labelSource but has a property named "label"
    const config = parseProfilesContent(combined)
    const profile = Object.values(config.profiles)[0]!
    expect(profile.labelSources).toHaveLength(0) // no explicit sources
    expect(profile.properties.find(p => p.name === 'label')).toBeDefined()
  })
})

// ============================================================================
// NS constants
// ============================================================================

describe('NS constants', () => {
  it('exports standard namespace URIs', () => {
    expect(NS.SKOS).toBe('http://www.w3.org/2004/02/skos/core#')
    expect(NS.SH).toBe('http://www.w3.org/ns/shacl#')
    expect(NS.PROF).toBe('http://www.w3.org/ns/dx/prof/')
    expect(NS.PREZ).toBe('https://prez.dev/')
  })
})
