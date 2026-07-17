/**
 * Edit Flow E2E Test
 *
 * Verifies the always-on edit-mode entry: authenticated users auto-enter edit
 * mode on the scheme page (no Edit button or URL param exists any more);
 * unauthenticated users never see the edit toolbar.
 *
 * Uses shared fixtures for auth and GitHub API mocking.
 */
import { test, expect } from './fixtures'
import { setupWorkspace } from './fixtures/github-mock'
import { VOCABS } from './helpers/fixtures'
import { SchemeEditorPage } from './pages/scheme-editor.page'

test.describe('Edit flow', () => {
  test('authenticated user auto-enters edit mode', async ({ page, mockGitHubAPI }) => {
    // A real session always has a workspace selected (fresh logins are
    // redirected to /workspace until one is chosen)
    await setupWorkspace(page)
    const editor = new SchemeEditorPage(page)
    await editor.goto()

    // Edit toolbar initialises without any user action
    await editor.waitForEditMode()
    await expect(page.getByText('No changes yet')).toBeVisible()
  })

  test('unauthenticated user does not see edit toolbar', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.removeItem('gh_token')
    })

    const uri = encodeURIComponent(VOCABS.alterationForm.iri)
    await page.goto(`/scheme?uri=${uri}`)
    await expect(page.getByText('Concepts').first()).toBeVisible({ timeout: 15_000 })

    await expect(page.getByText('No changes yet')).not.toBeVisible()
    await expect(page.getByRole('button', { name: 'Save', exact: true })).not.toBeVisible()
  })
})
