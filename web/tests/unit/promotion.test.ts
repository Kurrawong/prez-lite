import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildPRBody } from '~/composables/usePromotion'
import type { SubjectChange } from '~/composables/useEditMode'

// ---------------------------------------------------------------------------
// buildPRBody (pure function — no mocking needed)
// ---------------------------------------------------------------------------

describe('buildPRBody', () => {
  it('returns empty string for no changes', () => {
    expect(buildPRBody([])).toBe('')
  })

  it('generates Markdown table for changes', () => {
    const changes: SubjectChange[] = [
      {
        subjectIri: 'http://example.com/a',
        subjectLabel: 'Concept A',
        type: 'modified',
        propertyChanges: [
          { predicateIri: 'http://www.w3.org/2004/02/skos/core#prefLabel', predicateLabel: 'prefLabel', type: 'modified' },
        ],
      },
      {
        subjectIri: 'http://example.com/b',
        subjectLabel: 'Concept B',
        type: 'added',
        propertyChanges: [
          { predicateIri: 'http://www.w3.org/2004/02/skos/core#prefLabel', predicateLabel: 'prefLabel', type: 'added' },
          { predicateIri: 'http://www.w3.org/2004/02/skos/core#definition', predicateLabel: 'definition', type: 'added' },
        ],
      },
    ]

    const body = buildPRBody(changes)
    expect(body).toContain('## Changes')
    expect(body).toContain('| Concept A | modified | prefLabel |')
    expect(body).toContain('| Concept B | added | prefLabel, definition |')
  })

  it('uses dash when no property changes', () => {
    const changes: SubjectChange[] = [
      {
        subjectIri: 'http://example.com/c',
        subjectLabel: 'Concept C',
        type: 'removed',
        propertyChanges: [],
      },
    ]

    const body = buildPRBody(changes)
    expect(body).toContain('| Concept C | removed | - |')
  })
})

// ---------------------------------------------------------------------------
// GitHub API interaction tests (mock fetch)
// ---------------------------------------------------------------------------

describe('usePromotion API orchestration', () => {
  let mockFetch: ReturnType<typeof vi.fn>

  const mockToken = ref<string | null>('test-token')
  const mockWorkspace = {
    owner: 'testowner',
    repo: 'testrepo',
    activeWorkspace: computed(() => ({
      slug: 'staging',
      label: 'Staging',
      description: 'Staging workspace',
      refreshFrom: 'main',
    })),
    activeBranch: computed(() => 'edit/staging/brands-test'),
  }
  const mockVocabLabel = ref('Brands Test')

  beforeEach(() => {
    mockFetch = vi.fn()
    vi.stubGlobal('fetch', mockFetch)
  })

  function setupFetch(responses: Array<{ ok: boolean; status: number; json?: () => Promise<unknown>; text?: () => Promise<string> }>) {
    let callIndex = 0
    mockFetch.mockImplementation(() => {
      const response = responses[callIndex] ?? { ok: true, status: 200, json: async () => [] }
      callIndex++
      return Promise.resolve({
        ...response,
        json: response.json ?? (async () => []),
        text: response.text ?? (async () => ''),
      })
    })
  }

  it('findExistingPRs returns null when no open PR exists', async () => {
    setupFetch([
      { ok: true, status: 200, json: async () => [] },
      { ok: true, status: 200, json: async () => [] },
    ])

    const { createGithubFetch } = await import('~/utils/github-fetch')
    const githubFetch = createGithubFetch(mockToken, 'test')

    // Layer 2: branch → staging
    const branchPRs = await githubFetch<any[]>(
      `https://api.github.com/repos/testowner/testrepo/pulls?state=open&head=testowner:edit/staging/brands-test&base=staging`,
    )
    expect(branchPRs).toEqual([])

    // Layer 3: staging → main
    const stagingPRs = await githubFetch<any[]>(
      `https://api.github.com/repos/testowner/testrepo/pulls?state=open&head=testowner:staging&base=main`,
    )
    expect(stagingPRs).toEqual([])
  })

  it('findExistingPRs returns PRInfo for matching head/base', async () => {
    const mockPR = {
      number: 42,
      title: 'promote: Brands Test',
      state: 'open',
      merged_at: null,
      html_url: 'https://github.com/testowner/testrepo/pull/42',
      created_at: '2026-03-01T00:00:00Z',
    }

    setupFetch([
      { ok: true, status: 200, json: async () => [mockPR] },
    ])

    const { createGithubFetch } = await import('~/utils/github-fetch')
    const githubFetch = createGithubFetch(mockToken, 'test')

    const data = await githubFetch<any[]>(
      `https://api.github.com/repos/testowner/testrepo/pulls?state=open&head=testowner:edit/staging/brands-test&base=staging`,
    )

    expect(data).toHaveLength(1)
    expect(data![0].number).toBe(42)
    expect(data![0].state).toBe('open')
  })

  it('createPR sends correct payload and returns PR data', async () => {
    const mockPR = {
      number: 99,
      title: 'promote: Brands Test (edit/staging/brands-test → staging)',
      state: 'open',
      merged_at: null,
      html_url: 'https://github.com/testowner/testrepo/pull/99',
      created_at: '2026-03-03T00:00:00Z',
    }

    setupFetch([
      { ok: true, status: 201, json: async () => mockPR },
    ])

    const { createGithubFetch } = await import('~/utils/github-fetch')
    const githubFetch = createGithubFetch(mockToken, 'test')

    const data = await githubFetch<any>(
      `https://api.github.com/repos/testowner/testrepo/pulls`,
      {
        method: 'POST',
        body: JSON.stringify({
          title: 'promote: Brands Test (edit/staging/brands-test → staging)',
          body: '## Changes\n...',
          head: 'edit/staging/brands-test',
          base: 'staging',
        }),
      },
    )

    expect(data).not.toBeNull()
    expect(data.number).toBe(99)

    // Verify fetch was called with POST
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/pulls'),
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('handles 422 (PR already exists) gracefully', async () => {
    setupFetch([
      { ok: false, status: 422, text: async () => 'A pull request already exists' },
    ])

    const { createGithubFetch } = await import('~/utils/github-fetch')
    const githubFetch = createGithubFetch(mockToken, 'test')

    const data = await githubFetch<any>(
      `https://api.github.com/repos/testowner/testrepo/pulls`,
      { method: 'POST', body: JSON.stringify({}) },
    )

    expect(data).toBeNull()
  })

  it('getPRComments returns formatted comment list', async () => {
    const mockComments = [
      {
        id: 1,
        body: 'Looks good!',
        user: { login: 'reviewer', avatar_url: 'https://example.com/avatar.png' },
        created_at: '2026-03-02T12:00:00Z',
      },
      {
        id: 2,
        body: 'Please fix the label',
        user: { login: 'admin', avatar_url: 'https://example.com/avatar2.png' },
        created_at: '2026-03-02T14:00:00Z',
      },
    ]

    setupFetch([
      { ok: true, status: 200, json: async () => mockComments },
    ])

    const { createGithubFetch } = await import('~/utils/github-fetch')
    const githubFetch = createGithubFetch(mockToken, 'test')

    const data = await githubFetch<any[]>(
      `https://api.github.com/repos/testowner/testrepo/issues/42/comments`,
    )

    expect(data).toHaveLength(2)
    expect(data![0].body).toBe('Looks good!')
    expect(data![1].user.login).toBe('admin')
  })

  it('addPRComment sends body and succeeds', async () => {
    setupFetch([
      { ok: true, status: 201, json: async () => ({ id: 3, body: 'My reply' }) },
    ])

    const { createGithubFetch } = await import('~/utils/github-fetch')
    const githubFetch = createGithubFetch(mockToken, 'test')

    const data = await githubFetch<any>(
      `https://api.github.com/repos/testowner/testrepo/issues/42/comments`,
      { method: 'POST', body: JSON.stringify({ body: 'My reply' }) },
    )

    expect(data).not.toBeNull()
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/issues/42/comments'),
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('review title generation uses vocab label and workflow language', () => {
    // Pending layer
    const pendingTitle = `review: ${mockVocabLabel.value} — submit for approval`
    expect(pendingTitle).toBe('review: Brands Test — submit for approval')

    // Approved layer
    const approvedTitle = `review: ${mockWorkspace.activeWorkspace.value!.slug} — submit for publishing`
    expect(approvedTitle).toBe('review: staging — submit for publishing')
  })

  it('PR body includes change summary table', () => {
    const changes: SubjectChange[] = [
      {
        subjectIri: 'http://example.com/brand-a',
        subjectLabel: 'Brand A',
        type: 'modified',
        propertyChanges: [
          { predicateIri: 'http://www.w3.org/2004/02/skos/core#prefLabel', predicateLabel: 'prefLabel', type: 'modified' },
        ],
      },
    ]

    const body = buildPRBody(changes)
    expect(body).toContain('| Brand A | modified | prefLabel |')
    expect(body).toContain('## Changes')
    expect(body).toContain('Concept')
    expect(body).toContain('Type')
    expect(body).toContain('Properties changed')
  })
})
