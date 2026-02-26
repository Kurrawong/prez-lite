import { describe, it, expect } from 'vitest'
import { parseWorkspacesTTL } from '../../../packages/data-processing/scripts/generate-workspaces.js'

describe('parseWorkspacesTTL', () => {
  const sampleTTL = `
@prefix prez: <https://prez.dev/> .

<workspaces> a prez:WorkspaceConfig ;
    prez:workspace [
        prez:slug "staging" ;
        prez:label "Staging" ;
        prez:description "For vocabulary authors" ;
        prez:icon "i-heroicons-pencil-square" ;
        prez:refreshFrom "main"
    ] , [
        prez:slug "dev" ;
        prez:label "Development" ;
        prez:description "For system changes" ;
        prez:icon "i-heroicons-code-bracket" ;
        prez:refreshFrom "main"
    ] , [
        prez:slug "sandbox" ;
        prez:label "Sandbox" ;
        prez:description "Playground" ;
        prez:refreshFrom "staging"
    ] .
`

  it('parses all workspace definitions', () => {
    const result = parseWorkspacesTTL(sampleTTL)
    expect(result).toHaveLength(3)
  })

  it('extracts all properties correctly', () => {
    const result = parseWorkspacesTTL(sampleTTL)
    const staging = result.find((w: { slug: string }) => w.slug === 'staging')
    expect(staging).toBeDefined()
    expect(staging.label).toBe('Staging')
    expect(staging.description).toBe('For vocabulary authors')
    expect(staging.icon).toBe('i-heroicons-pencil-square')
    expect(staging.refreshFrom).toBe('main')
  })

  it('handles missing icon gracefully', () => {
    const result = parseWorkspacesTTL(sampleTTL)
    const sandbox = result.find((w: { slug: string }) => w.slug === 'sandbox')
    expect(sandbox).toBeDefined()
    expect(sandbox.icon).toBeUndefined()
  })

  it('returns empty array for empty TTL', () => {
    const result = parseWorkspacesTTL('')
    expect(result).toEqual([])
  })

  it('returns empty array for TTL with no workspace definitions', () => {
    const noWorkspaces = `
@prefix prez: <https://prez.dev/> .
<something> a prez:SomethingElse .
`
    const result = parseWorkspacesTTL(noWorkspaces)
    expect(result).toEqual([])
  })

  it('skips blank nodes without a slug', () => {
    const noSlug = `
@prefix prez: <https://prez.dev/> .
<workspaces> a prez:WorkspaceConfig ;
    prez:workspace [
        prez:label "No Slug" ;
        prez:description "Missing slug"
    ] .
`
    const result = parseWorkspacesTTL(noSlug)
    expect(result).toEqual([])
  })

  it('defaults refreshFrom to main when not specified', () => {
    const noRefresh = `
@prefix prez: <https://prez.dev/> .
<workspaces> prez:workspace [
    prez:slug "test" ;
    prez:label "Test"
] .
`
    const result = parseWorkspacesTTL(noRefresh)
    expect(result).toHaveLength(1)
    expect(result[0].refreshFrom).toBe('main')
  })
})
