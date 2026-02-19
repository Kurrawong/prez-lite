/**
 * Edit Flow E2E Test
 *
 * Verifies: Auth → edit mode → toolbar state changes → exit edit mode
 *
 * GitHub API is mocked via Playwright route interception.
 */
import { test, expect } from '@playwright/test'
import { VOCABS } from './helpers/fixtures'
import { injectAuthToken, mockGitHubAuth } from './helpers/github-mocks'

const MOCK_TTL = `
@prefix skos: <http://www.w3.org/2004/02/skos/core#> .
@prefix dcterms: <http://purl.org/dc/terms/> .

<${VOCABS.alterationForm.iri}>
    a skos:ConceptScheme ;
    skos:prefLabel "Alteration form"@en ;
    skos:definition "Test definition"@en ;
    skos:hasTopConcept <${VOCABS.alterationForm.iri}/pervasive> .

<${VOCABS.alterationForm.iri}/pervasive>
    a skos:Concept ;
    skos:prefLabel "pervasive"@en ;
    skos:definition "Pervasive alteration."@en ;
    skos:inScheme <${VOCABS.alterationForm.iri}> ;
    skos:topConceptOf <${VOCABS.alterationForm.iri}> .
`

/** Mock all GitHub Contents API calls to return our test TTL */
async function mockGitHubContents(page: import('@playwright/test').Page) {
  await page.route('**/api.github.com/repos/*/contents/**', (route, request) => {
    if (request.method() === 'GET') {
      const content = Buffer.from(MOCK_TTL, 'utf-8').toString('base64')
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ sha: 'mock-sha', content }),
      })
    }
    if (request.method() === 'PUT') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ content: { sha: 'new-sha' } }),
      })
    }
    return route.continue()
  })
}

test.describe('Edit flow', () => {
  test('authenticated user sees Edit button', async ({ page }) => {
    await injectAuthToken(page)
    await mockGitHubAuth(page)

    const uri = encodeURIComponent(VOCABS.alterationForm.iri)
    await page.goto(`/scheme?uri=${uri}`)

    // Wait for page to load
    await expect(page.getByText('Concepts').first()).toBeVisible({ timeout: 10_000 })

    // The edit button should be visible — use exact: true to avoid matching "Open in editor"
    await expect(page.getByRole('button', { name: 'Edit', exact: true })).toBeVisible({ timeout: 5_000 })
  })

  test('edit mode via URL param shows edit toolbar', async ({ page }) => {
    await injectAuthToken(page)
    await mockGitHubAuth(page)
    await mockGitHubContents(page)

    const uri = encodeURIComponent(VOCABS.alterationForm.iri)
    await page.goto(`/scheme?uri=${uri}&edit=full`)

    // Should show edit toolbar with "No changes yet" or save button
    await expect(
      page.getByText('No changes yet').or(page.getByRole('button', { name: 'Save' })),
    ).toBeVisible({ timeout: 15_000 })
  })

  test('unauthenticated user does not see edit toolbar', async ({ page }) => {
    // Ensure no auth token is set
    await page.addInitScript(() => {
      localStorage.removeItem('gh_token')
    })

    const uri = encodeURIComponent(VOCABS.alterationForm.iri)
    await page.goto(`/scheme?uri=${uri}`)

    await expect(page.getByText('Concepts').first()).toBeVisible({ timeout: 10_000 })

    // Edit toolbar should not be visible for unauthenticated users
    await expect(page.getByRole('button', { name: 'Edit', exact: true })).not.toBeVisible()
  })
})
