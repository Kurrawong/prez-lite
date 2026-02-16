/**
 * Playwright route interceptors for GitHub API mocking.
 *
 * Usage:
 *   await mockGitHubAuth(page)
 *   await mockGitHubFileLoad(page, 'owner', 'repo', 'path/to/file.ttl', ttlContent)
 */
import type { Page } from '@playwright/test'
import { GITHUB } from './fixtures'

/** Inject a mock auth token into localStorage before navigation */
export async function injectAuthToken(page: Page): Promise<void> {
  await page.addInitScript((token) => {
    localStorage.setItem('gh_token', token)
  }, GITHUB.token)
}

/** Mock the GitHub /user endpoint so the app thinks we're authenticated */
export async function mockGitHubAuth(page: Page): Promise<void> {
  await page.route('https://api.github.com/user', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(GITHUB.user),
    }),
  )
}

/** Encode string to base64 (for GitHub Contents API responses) */
function toBase64(text: string): string {
  return Buffer.from(text, 'utf-8').toString('base64')
}

/** Mock a GitHub Contents API GET for a specific file path */
export async function mockGitHubFileLoad(
  page: Page,
  owner: string,
  repo: string,
  path: string,
  content: string,
  sha = 'mock-sha-abc123',
): Promise<void> {
  const urlPattern = `https://api.github.com/repos/${owner}/${repo}/contents/${path}*`
  await page.route(urlPattern, (route, request) => {
    if (request.method() === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ sha, content: toBase64(content) }),
      })
    }
    // PUT = save
    if (request.method() === 'PUT') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ content: { sha: 'new-sha-def456' } }),
      })
    }
    return route.continue()
  })
}

/** Mock GitHub commits endpoint for history */
export async function mockGitHubCommits(
  page: Page,
  owner: string,
  repo: string,
  path: string,
): Promise<void> {
  const urlPattern = `https://api.github.com/repos/${owner}/${repo}/commits*`
  await page.route(urlPattern, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          sha: 'commit-sha-1',
          commit: {
            message: 'Update vocabulary',
            author: { name: 'Test User', date: '2026-02-15T10:00:00Z' },
          },
          author: GITHUB.user,
        },
        {
          sha: 'commit-sha-2',
          commit: {
            message: 'Initial import',
            author: { name: 'Test User', date: '2026-02-14T09:00:00Z' },
          },
          author: GITHUB.user,
        },
      ]),
    }),
  )
}
