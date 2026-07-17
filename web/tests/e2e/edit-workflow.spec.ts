/**
 * Edit Workflow E2E Tests
 *
 * Tests the core editing operations under the always-on edit model:
 * auto-entered edit mode, property edits, undo/redo, save with commit
 * message (workspace edit-branch flow), and the view-mode toggle.
 *
 * All GitHub API calls are mocked. No real commits are made.
 */
import { test, expect } from './fixtures'
import { setupWorkspace } from './fixtures/github-mock'
import { SchemeEditorPage } from './pages/scheme-editor.page'
import { EditToolbarPage } from './pages/edit-toolbar.page'
import { SaveModalPage } from './pages/save-modal.page'
import type { Page } from '@playwright/test'

/**
 * Edit an inline-table value: cells are click-to-edit, so click the cell
 * holding `value`, then fill the revealed input and commit with Enter.
 */
async function editInputWithValue(page: Page, value: string, newValue: string) {
  await page.getByRole('cell', { name: value, exact: true }).first().click()
  await page.waitForTimeout(300)
  const inputs = page.locator('input:not([type="date"]), textarea')
  const count = await inputs.count()
  for (let i = 0; i < count; i++) {
    const val = await inputs.nth(i).inputValue().catch(() => '')
    if (val === value) {
      await inputs.nth(i).fill(newValue)
      await inputs.nth(i).press('Enter')
      return true
    }
  }
  return false
}

test.describe('Edit workflow', () => {
  test('edit mode auto-enters with save disabled', async ({ page, mockGitHubAPI }) => {
    await setupWorkspace(page)
    const editor = new SchemeEditorPage(page)
    await editor.goto()
    await editor.waitForEditMode()

    await expect(page.getByText('No changes yet')).toBeVisible()

    // Save button should be disabled (no changes)
    const toolbar = new EditToolbarPage(page)
    await expect(toolbar.saveButton).toBeDisabled()
  })

  test('edit concept label shows unsaved change count', async ({ page, mockGitHubAPI }) => {
    await setupWorkspace(page)
    const editor = new SchemeEditorPage(page)
    await editor.goto()
    await editor.waitForEditMode()

    // Select the first concept in the tree and edit its prefLabel
    await editor.selectConcept('Alpha')
    expect(await editInputWithValue(page, 'Alpha', 'Alpha Modified')).toBe(true)

    // Wait for debounce (300ms)
    await page.waitForTimeout(400)

    // Toolbar should now show the unsaved badge instead of "No changes yet"
    await expect(page.getByText('No changes yet')).not.toBeVisible({ timeout: 3_000 })
    await expect(editor.unsavedBadge).toBeVisible()
  })

  test('undo reverts edit', async ({ page, mockGitHubAPI }) => {
    await setupWorkspace(page)
    const editor = new SchemeEditorPage(page)
    const toolbar = new EditToolbarPage(page)
    await editor.goto()
    await editor.waitForEditMode()

    await editor.selectConcept('Alpha')
    expect(await editInputWithValue(page, 'Alpha', 'Alpha Changed')).toBe(true)
    await page.waitForTimeout(400)

    // Should have changes
    await expect(editor.unsavedBadge).toBeVisible()

    // Undo
    await toolbar.undo()

    // Should revert to no changes
    await expect(page.getByText('No changes yet')).toBeVisible({ timeout: 3_000 })
  })

  test('redo reapplies undone edit', async ({ page, mockGitHubAPI }) => {
    await setupWorkspace(page)
    const editor = new SchemeEditorPage(page)
    const toolbar = new EditToolbarPage(page)
    await editor.goto()
    await editor.waitForEditMode()

    await editor.selectConcept('Alpha')
    expect(await editInputWithValue(page, 'Alpha', 'Alpha Changed')).toBe(true)
    await page.waitForTimeout(400)

    // Undo then redo
    await toolbar.undo()
    await expect(page.getByText('No changes yet')).toBeVisible({ timeout: 3_000 })

    await toolbar.redo()
    await expect(editor.unsavedBadge).toBeVisible({ timeout: 3_000 })
  })

  test('save opens modal and commits to GitHub', async ({ page, mockGitHubAPI }) => {
    // The save flow targets an edit branch derived from the selected workspace
    await setupWorkspace(page, 'staging')

    const editor = new SchemeEditorPage(page)
    const toolbar = new EditToolbarPage(page)
    const saveModal = new SaveModalPage(page)
    await editor.goto()
    await editor.waitForEditMode()

    // Edit a concept
    await editor.selectConcept('Alpha')
    expect(await editInputWithValue(page, 'Alpha', 'Alpha Updated')).toBe(true)
    await page.waitForTimeout(400)

    // Click save
    await toolbar.clickSave()
    await saveModal.waitForModal()

    // Set commit message and confirm
    await saveModal.setCommitMessage('test: update Alpha label')
    await saveModal.confirm()

    // Verify PUT request was captured
    await expect(async () => {
      expect(mockGitHubAPI.savedRequests.length).toBeGreaterThan(0)
    }).toPass({ timeout: 10_000 })
    expect(mockGitHubAPI.savedRequests[0]!.message).toBe('test: update Alpha label')
    expect(mockGitHubAPI.savedRequests[0]!.content).toContain('Alpha Updated')
  })

  test('expert toggle works in edit mode', async ({ page, mockGitHubAPI }) => {
    await setupWorkspace(page)
    const editor = new SchemeEditorPage(page)
    await editor.goto()
    await editor.waitForEditMode()

    // Toggle should be enabled in edit mode
    const expertButton = page.getByRole('button', { name: /Simple|Expert/ })
    await expect(expertButton).toBeEnabled()
  })
})
