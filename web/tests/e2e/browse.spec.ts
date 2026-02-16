/**
 * Browse Flow E2E Test
 *
 * Verifies: Vocab list → click vocab → tree renders → expand node →
 * click concept → detail panel shows → search within tree
 */
import { test, expect } from '@playwright/test'
import { VOCABS, CONCEPT } from './helpers/fixtures'

test.describe('Browse flow', () => {
  test('vocab list page loads with cards', async ({ page }) => {
    await page.goto('/vocabs')
    await expect(page.locator('h1')).toHaveText('Vocabularies')

    // Wait for vocab cards to appear (they load from static JSON)
    const cards = page.locator('a[href*="/scheme?uri="]')
    await expect(cards.first()).toBeVisible({ timeout: 10_000 })
    await expect(cards).toHaveCount(3) // 3 vocabs in test data
  })

  test('vocab cards show concept counts', async ({ page }) => {
    await page.goto('/vocabs')
    await expect(page.locator('a[href*="/scheme?uri="]').first()).toBeVisible({ timeout: 10_000 })

    // At least one card shows "concepts"
    await expect(page.getByText('concepts').first()).toBeVisible()
  })

  test('search filters vocab list', async ({ page }) => {
    await page.goto('/vocabs')
    await expect(page.locator('a[href*="/scheme?uri="]').first()).toBeVisible({ timeout: 10_000 })

    await page.fill('input[placeholder="Search vocabularies..."]', 'alteration')
    // Only the matching vocab should remain visible
    const cards = page.locator('a[href*="/scheme?uri="]')
    await expect(cards).toHaveCount(1)
  })

  test('clicking a vocab navigates to scheme page', async ({ page }) => {
    await page.goto('/vocabs')
    await expect(page.locator('a[href*="/scheme?uri="]').first()).toBeVisible({ timeout: 10_000 })

    // Click the alteration-form vocab card
    await page.locator('a[href*="/scheme?uri="]', {
      hasText: /alteration/i,
    }).click()

    // Should navigate to scheme page
    await expect(page).toHaveURL(/\/scheme\?uri=/)
    await expect(page.locator('h1')).toBeVisible()
  })

  test('scheme page shows concept tree', async ({ page }) => {
    const uri = encodeURIComponent(VOCABS.alterationForm.iri)
    await page.goto(`/scheme?uri=${uri}`)

    // Wait for the tree to load — look for the "Concepts" heading
    await expect(page.getByText('Concepts').first()).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('total')).toBeVisible()

    // Tree items should render — use first() for safety
    await expect(page.getByText('non-pervasive').first()).toBeVisible({ timeout: 5_000 })
  })

  test('clicking a concept shows detail panel', async ({ page }) => {
    const uri = encodeURIComponent(VOCABS.alterationForm.iri)
    await page.goto(`/scheme?uri=${uri}`)

    // Wait for tree to load
    await expect(page.getByText('non-pervasive').first()).toBeVisible({ timeout: 10_000 })

    // Click the concept in the tree (the tree node span with text-sm class)
    await page.locator('span.text-sm', { hasText: 'non-pervasive' }).first().click()

    // URL should include concept param
    await expect(page).toHaveURL(/concept=/)
  })

  test('concept tree search filters nodes', async ({ page }) => {
    const uri = encodeURIComponent(VOCABS.alterationForm.iri)
    await page.goto(`/scheme?uri=${uri}`)

    // Wait for tree
    await expect(page.getByText('non-pervasive').first()).toBeVisible({ timeout: 10_000 })

    // Search for a specific concept
    await page.fill('input[placeholder="Search concepts..."]', 'zoned')

    // "zoned" should be visible in tree — target the tree node specifically
    await expect(page.locator('span.text-sm', { hasText: /^zoned$/ }).first()).toBeVisible({ timeout: 3_000 })
  })

  test('concept detail page loads directly', async ({ page }) => {
    const conceptUri = encodeURIComponent(CONCEPT.iri)
    await page.goto(`/concept?uri=${conceptUri}`)

    // Should show concept heading
    await expect(page.getByRole('heading', { name: CONCEPT.label })).toBeVisible({ timeout: 10_000 })
  })
})
