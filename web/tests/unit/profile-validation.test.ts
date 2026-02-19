import { describe, it, expect } from 'vitest'
import { useProfileValidation } from '~/composables/useProfileValidation'

// ============================================================================
// Test TTL snippets
// ============================================================================

const VALID_PROFILE = `
@prefix prof: <http://www.w3.org/ns/dx/prof/> .
@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix dcterms: <http://purl.org/dc/terms/> .
@prefix skos: <http://www.w3.org/2004/02/skos/core#> .
@prefix prez: <https://prez.dev/> .
@prefix altr-ext: <http://www.w3.org/ns/dx/connegp/altr-ext#> .

<http://example.com/profile/test>
    a prof:Profile ;
    dcterms:identifier "test" ;
    dcterms:title "Test Profile" ;
    sh:targetClass skos:Concept ;
    altr-ext:hasResourceFormat "text/turtle" ;
    prez:generateLabel true ;
    prez:generateDescription true ;
    prez:generateLink true ;
    prez:linkTemplate "/vocabs/{id}" ;
    prez:labelSource skos:prefLabel ;
    prez:descriptionSource skos:definition .
`

const MISSING_TARGET_CLASS = `
@prefix prof: <http://www.w3.org/ns/dx/prof/> .
@prefix dcterms: <http://purl.org/dc/terms/> .
@prefix prez: <https://prez.dev/> .
@prefix skos: <http://www.w3.org/2004/02/skos/core#> .

<http://example.com/profile/no-class>
    a prof:Profile ;
    dcterms:identifier "no-class" ;
    dcterms:title "No Class Profile" ;
    prez:generateLabel true ;
    prez:labelSource skos:prefLabel .
`

const MISSING_LABEL_SOURCES = `
@prefix prof: <http://www.w3.org/ns/dx/prof/> .
@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix dcterms: <http://purl.org/dc/terms/> .
@prefix skos: <http://www.w3.org/2004/02/skos/core#> .
@prefix prez: <https://prez.dev/> .

<http://example.com/profile/no-labels>
    a prof:Profile ;
    dcterms:identifier "no-labels" ;
    dcterms:title "No Labels Profile" ;
    sh:targetClass skos:Concept ;
    prez:generateLabel true .
`

const NO_GENERATION_FLAGS = `
@prefix prof: <http://www.w3.org/ns/dx/prof/> .
@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix dcterms: <http://purl.org/dc/terms/> .
@prefix skos: <http://www.w3.org/2004/02/skos/core#> .
@prefix prez: <https://prez.dev/> .

<http://example.com/profile/no-flags>
    a prof:Profile ;
    dcterms:identifier "no-flags" ;
    dcterms:title "No Flags Profile" ;
    sh:targetClass skos:Concept ;
    prez:labelSource skos:prefLabel .
`

const DESCRIPTION_WITHOUT_SOURCE = `
@prefix prof: <http://www.w3.org/ns/dx/prof/> .
@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix dcterms: <http://purl.org/dc/terms/> .
@prefix skos: <http://www.w3.org/2004/02/skos/core#> .
@prefix prez: <https://prez.dev/> .

<http://example.com/profile/desc-no-source>
    a prof:Profile ;
    dcterms:identifier "desc-no-source" ;
    sh:targetClass skos:Concept ;
    prez:generateLabel true ;
    prez:generateDescription true ;
    prez:labelSource skos:prefLabel .
`

// ============================================================================
// Tests
// ============================================================================

describe('useProfileValidation', () => {
  function validate(ttl: string) {
    const { validate } = useProfileValidation()
    return validate(ttl)
  }

  describe('empty/invalid input', () => {
    it('returns info message for empty content', () => {
      const result = validate('')
      expect(result.valid).toBe(false)
      expect(result.messages).toHaveLength(1)
      expect(result.messages[0]!.level).toBe('info')
      expect(result.messages[0]!.message).toContain('No content')
    })

    it('returns info message for whitespace-only content', () => {
      const result = validate('   \n\t  ')
      expect(result.valid).toBe(false)
    })

    it('returns parse error for invalid TTL', () => {
      const result = validate('this is { not valid }')
      expect(result.valid).toBe(false)
      expect(result.parseError).toBeTruthy()
      expect(result.messages.some(m => m.level === 'error')).toBe(true)
    })
  })

  describe('no profiles found', () => {
    it('warns when TTL has no prof:Profile', () => {
      const result = validate(`
        @prefix skos: <http://www.w3.org/2004/02/skos/core#> .
        <http://example.com/a> a skos:Concept .
      `)
      expect(result.valid).toBe(false)
      expect(result.messages.some(m => m.message.includes('No prof:Profile found'))).toBe(true)
    })
  })

  describe('valid profile', () => {
    it('passes with all required properties', () => {
      const result = validate(VALID_PROFILE)
      expect(result.valid).toBe(true)
      expect(result.profile).not.toBeNull()
      expect(result.profile!.identifier).toBe('test')
    })
  })

  describe('missing required properties', () => {
    it('warns on missing target class', () => {
      const result = validate(MISSING_TARGET_CLASS)
      expect(result.valid).toBe(false)
      expect(result.messages.some(m => m.message.includes('Missing target class'))).toBe(true)
    })

    it('warns on missing label sources', () => {
      const result = validate(MISSING_LABEL_SOURCES)
      expect(result.valid).toBe(false)
      expect(result.messages.some(m => m.message.includes('No label sources'))).toBe(true)
    })

    it('warns on missing description source when generateDescription is true', () => {
      const result = validate(DESCRIPTION_WITHOUT_SOURCE)
      expect(result.valid).toBe(false)
      expect(result.messages.some(m => m.message.includes('No description sources'))).toBe(true)
    })
  })

  describe('info-level messages', () => {
    it('notes missing generation flags', () => {
      const result = validate(NO_GENERATION_FLAGS)
      expect(result.messages.some(m => m.message.includes('No generation flags'))).toBe(true)
    })

    it('notes missing output formats', () => {
      // NO_GENERATION_FLAGS also has no formats
      const result = validate(NO_GENERATION_FLAGS)
      expect(result.messages.some(m => m.message.includes('No output formats'))).toBe(true)
    })

    it('notes missing link template when generateLink is true', () => {
      const ttl = `
        @prefix prof: <http://www.w3.org/ns/dx/prof/> .
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix dcterms: <http://purl.org/dc/terms/> .
        @prefix skos: <http://www.w3.org/2004/02/skos/core#> .
        @prefix prez: <https://prez.dev/> .
        <http://example.com/profile/x> a prof:Profile ;
            dcterms:identifier "x" ;
            sh:targetClass skos:Concept ;
            prez:generateLink true ;
            prez:labelSource skos:prefLabel .
      `
      const result = validate(ttl)
      expect(result.messages.some(m => m.message.includes('Missing link template'))).toBe(true)
    })

    it('notes missing members template when generateMembers is true', () => {
      const ttl = `
        @prefix prof: <http://www.w3.org/ns/dx/prof/> .
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        @prefix dcterms: <http://purl.org/dc/terms/> .
        @prefix skos: <http://www.w3.org/2004/02/skos/core#> .
        @prefix prez: <https://prez.dev/> .
        <http://example.com/profile/x> a prof:Profile ;
            dcterms:identifier "x" ;
            sh:targetClass skos:Concept ;
            prez:generateMembers true ;
            prez:labelSource skos:prefLabel .
      `
      const result = validate(ttl)
      expect(result.messages.some(m => m.message.includes('Missing members template'))).toBe(true)
    })
  })

  describe('result shape', () => {
    it('includes parsed profile on success', () => {
      const result = validate(VALID_PROFILE)
      expect(result.profile).not.toBeNull()
      expect(result.profile!.targetClass).toBe('http://www.w3.org/2004/02/skos/core#Concept')
    })

    it('includes null profile on parse error', () => {
      const result = validate('invalid {')
      expect(result.profile).toBeNull()
      expect(result.parseError).toBeTruthy()
    })

    it('valid is false when warnings exist, even without errors', () => {
      const result = validate(MISSING_TARGET_CLASS)
      const hasErrors = result.messages.some(m => m.level === 'error')
      const hasWarnings = result.messages.some(m => m.level === 'warning')
      expect(hasErrors).toBe(false)
      expect(hasWarnings).toBe(true)
      expect(result.valid).toBe(false)
    })
  })
})
