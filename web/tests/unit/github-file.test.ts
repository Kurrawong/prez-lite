/**
 * GitHub File Contract Integration Test
 *
 * Tests useGitHubFile composable with mocked fetch.
 * Verifies the API contract: base64 decode on load, encode + SHA on save.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock useGitHubAuth before importing the composable
const mockToken = ref('mock-gh-token')
vi.mock('~/composables/useGitHubAuth', () => ({
  useGitHubAuth: () => ({ token: mockToken }),
}))

// Import after mocking
const { useGitHubFile } = await import('~/composables/useGitHubFile')

// ============================================================================
// Helpers
// ============================================================================

function encodeBase64(text: string): string {
  return btoa(
    Array.from(new TextEncoder().encode(text), b => String.fromCharCode(b)).join(''),
  )
}

function createMockFetch(responses: Array<{ status: number; body: unknown }>) {
  let callIndex = 0
  return vi.fn(async () => {
    const resp = responses[callIndex++] ?? { status: 500, body: { message: 'No more responses' } }
    return {
      ok: resp.status >= 200 && resp.status < 300,
      status: resp.status,
      json: async () => resp.body,
    }
  })
}

// ============================================================================
// Tests
// ============================================================================

describe('useGitHubFile', () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
    mockToken.value = 'mock-gh-token'
  })

  describe('load()', () => {
    it('decodes base64 content and stores SHA', async () => {
      const ttlContent = '@prefix skos: <http://www.w3.org/2004/02/skos/core#> .\n'
      const encoded = encodeBase64(ttlContent)

      globalThis.fetch = createMockFetch([{
        status: 200,
        body: { sha: 'abc123', content: encoded },
      }]) as any

      const file = useGitHubFile('owner', 'repo', 'data/vocabs/test.ttl', 'main')
      await file.load()

      expect(file.content.value).toBe(ttlContent)
      expect(file.sha.value).toBe('abc123')
      expect(file.error.value).toBeNull()
    })

    it('calls correct GitHub API URL', async () => {
      const mockFetch = createMockFetch([{
        status: 200,
        body: { sha: 'x', content: encodeBase64('test') },
      }])
      globalThis.fetch = mockFetch as any

      const file = useGitHubFile('myowner', 'myrepo', 'path/to/file.ttl', 'dev')
      await file.load()

      expect(mockFetch).toHaveBeenCalledOnce()
      const url = mockFetch.mock.calls[0]![0] as string
      expect(url).toBe('https://api.github.com/repos/myowner/myrepo/contents/path/to/file.ttl?ref=dev')
    })

    it('includes auth header', async () => {
      const mockFetch = createMockFetch([{
        status: 200,
        body: { sha: 'x', content: encodeBase64('test') },
      }])
      globalThis.fetch = mockFetch as any

      const file = useGitHubFile('o', 'r', 'f.ttl', 'main')
      await file.load()

      const headers = mockFetch.mock.calls[0]![1]?.headers as Record<string, string>
      expect(headers.Authorization).toBe('Bearer mock-gh-token')
    })

    it('strips leading slashes from path', async () => {
      const mockFetch = createMockFetch([{
        status: 200,
        body: { sha: 'x', content: encodeBase64('test') },
      }])
      globalThis.fetch = mockFetch as any

      const file = useGitHubFile('o', 'r', '/leading/slash.ttl', 'main')
      await file.load()

      const url = mockFetch.mock.calls[0]![0] as string
      expect(url).toContain('/contents/leading/slash.ttl')
      expect(url).not.toContain('/contents//leading')
    })

    it('sets error for 404', async () => {
      globalThis.fetch = createMockFetch([{
        status: 404,
        body: { message: 'Not Found' },
      }]) as any

      const file = useGitHubFile('o', 'r', 'missing.ttl', 'main')
      await file.load()

      expect(file.error.value).toContain('not found')
    })

    it('sets error when not authenticated', async () => {
      mockToken.value = ''
      const file = useGitHubFile('o', 'r', 'f.ttl', 'main')
      await file.load()

      expect(file.error.value).toContain('Not authenticated')
    })
  })

  describe('save()', () => {
    it('sends PUT with base64-encoded content and SHA', async () => {
      const mockFetch = createMockFetch([
        // load response
        { status: 200, body: { sha: 'orig-sha', content: encodeBase64('old content') } },
        // save response
        { status: 200, body: { content: { sha: 'new-sha' } } },
      ])
      globalThis.fetch = mockFetch as any

      const file = useGitHubFile('o', 'r', 'f.ttl', 'main')
      await file.load()
      const ok = await file.save('new content', 'Update vocab')

      expect(ok).toBe(true)
      expect(file.sha.value).toBe('new-sha')
      expect(file.content.value).toBe('new content')

      // Verify the PUT request body
      const saveCall = mockFetch.mock.calls[1]!
      expect(saveCall[1]?.method).toBe('PUT')

      const body = JSON.parse(saveCall[1]?.body as string)
      expect(body.sha).toBe('orig-sha')
      expect(body.message).toBe('Update vocab')
      expect(body.branch).toBe('main')
      // Verify content is base64 encoded
      expect(body.content).toBe(encodeBase64('new content'))
    })

    it('uses default commit message when none provided', async () => {
      const mockFetch = createMockFetch([
        { status: 200, body: { sha: 's', content: encodeBase64('x') } },
        { status: 200, body: { content: { sha: 's2' } } },
      ])
      globalThis.fetch = mockFetch as any

      const file = useGitHubFile('o', 'r', 'path/to/file.ttl', 'main')
      await file.load()
      await file.save('new content')

      const body = JSON.parse(mockFetch.mock.calls[1]![1]?.body as string)
      expect(body.message).toBe('Update path/to/file.ttl')
    })

    it('returns false on save failure', async () => {
      const mockFetch = createMockFetch([
        { status: 200, body: { sha: 's', content: encodeBase64('x') } },
        { status: 409, body: { message: 'Conflict' } },
      ])
      globalThis.fetch = mockFetch as any

      const file = useGitHubFile('o', 'r', 'f.ttl', 'main')
      await file.load()
      const ok = await file.save('new')

      expect(ok).toBe(false)
      expect(file.error.value).toBe('Conflict')
    })

    it('returns false when not authenticated', async () => {
      mockToken.value = ''
      const file = useGitHubFile('o', 'r', 'f.ttl', 'main')
      const ok = await file.save('content')

      expect(ok).toBe(false)
      expect(file.error.value).toContain('Not authenticated')
    })
  })
})
