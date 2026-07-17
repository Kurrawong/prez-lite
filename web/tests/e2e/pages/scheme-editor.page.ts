/**
 * Page object for the scheme page in edit mode.
 *
 * Edit mode is always-on for authenticated users — navigating to a scheme
 * while authenticated auto-enters edit mode; there is no Edit button, URL
 * param, or exit affordance.
 */
import type { Page, Locator } from '@playwright/test'
import { VOCABS } from '../helpers/fixtures'

export class SchemeEditorPage {
  readonly page: Page

  constructor(page: Page) {
    this.page = page
  }

  /** Navigate to a scheme page */
  async goto(schemeIri: string = VOCABS.alterationForm.iri) {
    const uri = encodeURIComponent(schemeIri)
    await this.page.goto(`/scheme?uri=${uri}`)
    await this.waitForTree()
  }

  /** Wait for the concept tree to render */
  async waitForTree() {
    await this.page.getByText('Concepts').first().waitFor({ timeout: 30_000 })
  }

  /** Wait for edit mode to initialise (toolbar shows "No changes yet") */
  async waitForEditMode() {
    await this.page.getByText('No changes yet').waitFor({ timeout: 20_000 })
    // Extra settle time for the N3 store to finish building
    await this.page.waitForTimeout(500)
  }

  /** Click a concept in the tree */
  async selectConcept(label: string) {
    await this.page.locator('span.text-sm', { hasText: label }).first().click()
    // Wait for concept detail to load
    await this.page.waitForTimeout(500)
  }

  /** The "Unsaved" changes badge (visible once in-memory edits exist) */
  get unsavedBadge(): Locator {
    return this.page.getByRole('button', { name: /Unsaved/ })
  }

  /** Get the "No changes yet" text */
  get noChangesText(): Locator {
    return this.page.getByText('No changes yet')
  }
}
