/**
 * Create Vocabulary E2E Test
 *
 * Verifies the full create flow from the workspace dashboard: open the modal,
 * fill it in, create, and land in the editor. Regression guard for the
 * create hang — createVocabulary used to `await refreshNuxtData(...)` on keys
 * with no mounted consumers, which never resolves, leaving the modal open
 * forever with the vocab already committed to GitHub.
 *
 * All GitHub API calls are mocked. No real branches or commits are made.
 */
import { test, expect } from './fixtures'
import { setupWorkspace } from './fixtures/github-mock'

test.describe('Create vocabulary', () => {
  test('create from workspace closes the modal and opens the editor', async ({ page, mockGitHubAPI }) => {
    await setupWorkspace(page, 'staging')

    await page.goto('/workspace')
    await page.getByRole('button', { name: 'New vocabulary' }).click()

    // Fill the form — identifier and IRI derive from the title
    await page.getByRole('dialog').locator('input').first().fill('Playwright Created Vocab')
    await page.getByRole('dialog').locator('textarea').fill('Created by the e2e suite against mocked GitHub.')

    await page.getByRole('dialog').getByRole('button', { name: /Create vocabulary/ }).click()

    // The create must complete: modal gone, editor opened on the new vocab.
    // (The page content itself comes from the mocked contents API, which
    // serves the shared fixture TTL for every path — assert on the URL.)
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 15_000 })
    await expect(page).toHaveURL(/\/scheme\?uri=.*PlaywrightCreatedVocab/, { timeout: 15_000 })

    // The scaffold TTL was committed via the mocked contents API
    expect(mockGitHubAPI.savedRequests.length).toBeGreaterThan(0)
    const scaffold = mockGitHubAPI.savedRequests[0]!
    expect(scaffold.message).toContain('create vocabulary')
    expect(scaffold.content).toContain('Playwright Created Vocab')
  })
})
