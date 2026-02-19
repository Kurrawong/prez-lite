/**
 * EditToolbar Component Tests
 *
 * Tests the 2-state toolbar (only rendered for authenticated users):
 * 1. Authenticated, not editing — edit button + history
 * 2. Editing — mode switch, changes, save, exit
 *
 * The component uses <Teleport to="header"> so we create a <header>
 * element and query from there.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import EditToolbar from '~/components/EditToolbar.vue'

let header: HTMLElement

const baseProps = {
  editView: 'none' as const,
  editorAvailable: true,
  isAuthenticated: true,
  authEnabled: true,
  isEditMode: false,
  isDirty: false,
  loading: false,
  saving: false,
  error: null as string | null,
  pendingChanges: [] as any[],
  viewMode: 'simple' as const,
  historyCommits: [] as any[],
  historyLoading: false,
}

beforeEach(() => {
  header = document.createElement('header')
  document.body.appendChild(header)
})

afterEach(() => {
  header.remove()
})

/** Read teleported text from the header element */
function headerText(): string {
  return header.textContent ?? ''
}

/** Find buttons in header (teleported content) */
function headerButtons(): HTMLButtonElement[] {
  return Array.from(header.querySelectorAll('button'))
}

describe('EditToolbar', () => {
  describe('authenticated, not editing state', () => {
    it('renders edit button', async () => {
      await mountSuspended(EditToolbar, { props: baseProps })
      expect(headerText()).toContain('Edit')
    })

    it('renders history button', async () => {
      await mountSuspended(EditToolbar, { props: baseProps })
      expect(headerText()).toContain('History')
    })

    it('does not show save button', async () => {
      await mountSuspended(EditToolbar, { props: baseProps })
      const saveBtn = headerButtons().find(b => b.textContent?.includes('Save'))
      expect(saveBtn).toBeUndefined()
    })
  })

  describe('editing state', () => {
    const editProps = {
      ...baseProps,
      isAuthenticated: true,
      isEditMode: true,
      editView: 'full' as const,
    }

    it('renders save button', async () => {
      await mountSuspended(EditToolbar, { props: editProps })
      const saveBtn = headerButtons().find(b => b.textContent?.trim() === 'Save')
      expect(saveBtn).toBeDefined()
    })

    it('disables save when no changes', async () => {
      await mountSuspended(EditToolbar, {
        props: { ...editProps, pendingChanges: [] },
      })
      const saveBtn = headerButtons().find(b => b.textContent?.trim() === 'Save')
      expect(saveBtn?.disabled).toBe(true)
    })

    it('enables save when changes exist', async () => {
      await mountSuspended(EditToolbar, {
        props: {
          ...editProps,
          pendingChanges: [{
            subjectIri: 'http://example.com/a',
            subjectLabel: 'Concept A',
            type: 'modified' as const,
            propertyChanges: [{
              predicateIri: 'http://www.w3.org/2004/02/skos/core#prefLabel',
              predicateLabel: 'preferred label',
              type: 'modified' as const,
              oldValues: ['Old'],
              newValues: ['New'],
            }],
          }],
        },
      })
      const saveBtn = headerButtons().find(b => b.textContent?.trim() === 'Save')
      expect(saveBtn?.disabled).toBe(false)
    })

    it('shows change count', async () => {
      await mountSuspended(EditToolbar, {
        props: {
          ...editProps,
          pendingChanges: [
            { subjectIri: 'http://a', subjectLabel: 'A', type: 'modified' as const, propertyChanges: [] },
            { subjectIri: 'http://b', subjectLabel: 'B', type: 'added' as const, propertyChanges: [] },
          ],
        },
      })
      expect(headerText()).toContain('2')
      expect(headerText()).toContain('changes')
    })

    it('shows "No changes yet" when no changes', async () => {
      await mountSuspended(EditToolbar, { props: editProps })
      expect(headerText()).toContain('No changes yet')
    })

    it('shows exit button with aria-label', async () => {
      await mountSuspended(EditToolbar, { props: editProps })
      const closeBtn = headerButtons().find(b =>
        b.getAttribute('aria-label') === 'Exit edit mode',
      )
      expect(closeBtn).toBeDefined()
    })
  })
})
