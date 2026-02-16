/**
 * Search Flow E2E Test
 *
 * Verifies: Go to /search → type query → results appear →
 * click facet → results filter → navigate to result
 */
import { test, expect } from '@playwright/test'
import { VOCABS } from './helpers/fixtures'

test.describe('Search flow', () => {
  test('search page loads with input', async ({ page }) => {
    await page.goto('/search')

    // Search input should be visible
    const searchInput = page.locator('input[placeholder*="Search for concepts"]')
    await expect(searchInput).toBeVisible({ timeout: 10_000 })

    // The heading is "Search Vocabularies"
    await expect(page.getByRole('heading', { name: 'Search Vocabularies' })).toBeVisible()
  })

  test('typing a query shows results', async ({ page }) => {
    await page.goto('/search')

    const searchInput = page.locator('input[placeholder*="Search for concepts"]')
    await expect(searchInput).toBeVisible({ timeout: 10_000 })

    // Wait for Orama index to be ready (facet grid visible means index loaded)
    await expect(page.getByText('Enter a search term or click')).toBeVisible({ timeout: 10_000 })

    // Fill the search input and dispatch input event to trigger v-model
    await searchInput.fill('fault')

    // Wait for results — 150ms debounce + rendering
    const resultLink = page.locator('a[href*="/concept?uri="]')
    await expect(resultLink.first()).toBeVisible({ timeout: 10_000 })
  })

  test('search results link to concept page', async ({ page }) => {
    await page.goto('/search')

    const searchInput = page.locator('input[placeholder*="Search for concepts"]')
    await expect(searchInput).toBeVisible({ timeout: 10_000 })

    // Wait for index to load
    await expect(page.getByText('Enter a search term or click')).toBeVisible({ timeout: 10_000 })

    await searchInput.fill('fault')

    // Wait for result links to appear
    const resultLink = page.locator('a[href*="/concept?uri="]')
    await expect(resultLink.first()).toBeVisible({ timeout: 10_000 })

    // Click the first result link
    await resultLink.first().click()

    // Should navigate to concept page
    await expect(page).toHaveURL(/\/concept\?uri=/)
  })

  test('clicking a vocabulary facet shows concepts', async ({ page }) => {
    await page.goto('/search')

    // Wait for facets to load (they come from facets.json)
    await expect(page.getByText('Enter a search term or click')).toBeVisible({ timeout: 10_000 })

    // Click the alteration-form vocabulary facet button
    const facetBtn = page.locator('button', { hasText: /Alteration form/ })
    await expect(facetBtn).toBeVisible({ timeout: 5_000 })
    await facetBtn.click()

    // After clicking a facet, concept results should appear
    const resultLink = page.locator('a[href*="/concept?uri="]')
    await expect(resultLink.first()).toBeVisible({ timeout: 10_000 })
  })

  test('search via URL query parameter', async ({ page }) => {
    // Use a term that works with Orama search
    await page.goto('/search?q=zoned')

    // Results should appear without manual typing
    const resultLink = page.locator('a[href*="/concept?uri="]')
    await expect(resultLink.first()).toBeVisible({ timeout: 15_000 })
  })

  test('empty search shows facet grid', async ({ page }) => {
    await page.goto('/search')

    const searchInput = page.locator('input[placeholder*="Search for concepts"]')
    await expect(searchInput).toBeVisible({ timeout: 10_000 })

    // With no search query and no filters, should show the centered facet grid
    await expect(page.getByText('Enter a search term or click')).toBeVisible({ timeout: 5_000 })
  })
})
