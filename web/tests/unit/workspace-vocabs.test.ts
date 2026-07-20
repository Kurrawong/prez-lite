import { describe, it, expect } from 'vitest'
import { planVocabMerge } from '~/composables/useWorkspaceVocabs'
import type { VocabMetadata } from '~/composables/useVocabData'

const vocab = (slug: string): VocabMetadata => ({
  iri: `https://example.org/${slug}`,
  slug,
  prefLabel: slug,
  conceptCount: 1,
})

describe('planVocabMerge', () => {
  it('keeps index vocabs whose TTL is on the branch', () => {
    const { published, needStubs, dropped } = planVocabMerge(
      [vocab('A'), vocab('B')],
      ['A', 'B'],
    )
    expect(published.map(v => v.slug)).toEqual(['A', 'B'])
    expect(needStubs).toEqual([])
    expect(dropped).toEqual([])
  })

  it('flags branch-only vocabs as needing stubs (new vocab awaiting deploy)', () => {
    const { published, needStubs } = planVocabMerge(
      [vocab('A')],
      ['A', 'TESTVOCAB', 'Newvocab'],
    )
    expect(published.map(v => v.slug)).toEqual(['A'])
    expect(needStubs).toEqual(['TESTVOCAB', 'Newvocab'])
  })

  it('drops index vocabs removed on the branch (removed in staging)', () => {
    const { published, dropped } = planVocabMerge(
      [vocab('A'), vocab('Gone')],
      ['A'],
    )
    expect(published.map(v => v.slug)).toEqual(['A'])
    expect(dropped).toEqual(['Gone'])
  })

  it('handles an empty index (fresh site) — everything is a stub', () => {
    const { published, needStubs, dropped } = planVocabMerge([], ['A', 'B'])
    expect(published).toEqual([])
    expect(needStubs).toEqual(['A', 'B'])
    expect(dropped).toEqual([])
  })

  it('handles an empty branch — everything is dropped', () => {
    const { published, needStubs, dropped } = planVocabMerge([vocab('A')], [])
    expect(published).toEqual([])
    expect(needStubs).toEqual([])
    expect(dropped).toEqual(['A'])
  })
})
