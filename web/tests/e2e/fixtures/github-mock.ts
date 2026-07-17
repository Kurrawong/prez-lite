/**
 * Playwright fixtures for authenticated edit testing.
 *
 * Provides:
 * - `authedPage`: Page with GitHub OAuth mocked (token + user)
 * - `mockGitHubAPI`: GitHub API interceptor (contents load/save capture,
 *   branch listing/creation for the workspace edit-branch flow)
 *
 * Edit mode is always-on for authenticated users, so these fixtures are the
 * entry point for every edit-mode spec.
 */
import { test as base, expect, type Page } from '@playwright/test'
import { TEST_VOCAB_TTL, TEST_SCHEME_IRI } from './vocab-data'

export interface SavedRequest {
  message: string
  content: string
  sha: string
  branch?: string
}

export interface MockGitHubAPI {
  /** TTL content served by the mock GET endpoint */
  loadTTL: string
  /** Captured PUT requests (save operations) */
  savedRequests: SavedRequest[]
}

const MOCK_USER = {
  login: 'test-user',
  avatar_url: 'https://avatars.githubusercontent.com/u/1?v=4',
  name: 'Test User',
}

const MOCK_SHA = 'aaaabbbbccccddddeeeeffff0000111122223333'

/** Set up auth token and user mock on a page */
async function setupAuth(page: Page): Promise<void> {
  // Inject token into localStorage before any navigation
  await page.addInitScript(() => {
    localStorage.setItem('gh_token', 'mock-gh-token-e2e')
  })

  // Mock GitHub user endpoint
  await page.route('https://api.github.com/user', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_USER),
    }),
  )
}

/**
 * Seed a selected workspace (normally chosen on /workspace) so the save flow
 * can derive its edit branch. Must be called before navigation.
 */
export async function setupWorkspace(page: Page, workspaceSlug = 'staging'): Promise<void> {
  await page.addInitScript((slug: string) => {
    localStorage.setItem('prez_workspace', JSON.stringify({ workspaceSlug: slug, vocabSlug: null }))
  }, workspaceSlug)
}

/** Set up GitHub API mocks (load + save interception, branch flow) */
async function setupGitHubAPI(page: Page, loadTTL: string, savedRequests: SavedRequest[]): Promise<void> {
  // Catch-all FIRST — later, more specific routes take precedence in Playwright.
  // Keeps unanticipated GitHub calls (compare, pulls, trees) off the network.
  await page.route('**/api.github.com/**', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({}),
    }),
  )

  await page.route('**/api.github.com/repos/**/contents/**', (route, request) => {
    if (request.method() === 'GET') {
      const content = Buffer.from(loadTTL, 'utf-8').toString('base64')
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ sha: 'mock-sha-initial', content }),
      })
    }
    if (request.method() === 'PUT') {
      const body = JSON.parse(request.postData() || '{}')
      savedRequests.push({
        message: body.message,
        content: Buffer.from(body.content, 'base64').toString('utf-8'),
        sha: body.sha,
        branch: body.branch,
      })
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ content: { sha: 'mock-sha-saved' } }),
      })
    }
    return route.continue()
  })

  // Branch listing — includes the workspace roots so ensureWorkspaceBranch()
  // finds them and only the ephemeral edit branch needs creating.
  await page.route('**/api.github.com/repos/**/branches**', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { name: 'main', commit: { sha: MOCK_SHA } },
        { name: 'staging', commit: { sha: MOCK_SHA } },
      ]),
    }),
  )

  // Edit-branch creation / reset (ensureEditBranch flow)
  await page.route('**/api.github.com/repos/**/git/refs**', (route, request) => {
    if (request.method() === 'POST' || request.method() === 'PATCH') {
      const body = JSON.parse(request.postData() || '{}')
      return route.fulfill({
        status: request.method() === 'POST' ? 201 : 200,
        contentType: 'application/json',
        body: JSON.stringify({ ref: body.ref ?? 'refs/heads/mock', object: { sha: MOCK_SHA } }),
      })
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ object: { sha: MOCK_SHA } }),
    })
  })

  // Mock GitHub Actions runs endpoint (build status polling)
  await page.route('**/api.github.com/repos/**/actions/runs*', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ workflow_runs: [] }),
    }),
  )
}

export const test = base.extend<{
  authedPage: Page
  mockGitHubAPI: MockGitHubAPI
}>({
  // Authenticated page fixture
  authedPage: async ({ page }, use) => {
    await setupAuth(page)
    await use(page)
  },

  // GitHub API mock fixture (includes auth setup)
  mockGitHubAPI: async ({ page }, use) => {
    await setupAuth(page)
    const savedRequests: SavedRequest[] = []
    await setupGitHubAPI(page, TEST_VOCAB_TTL, savedRequests)
    await use({ loadTTL: TEST_VOCAB_TTL, savedRequests })
  },
})

export { expect, TEST_SCHEME_IRI }
