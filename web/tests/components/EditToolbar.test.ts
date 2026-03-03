/**
 * EditToolbar Component Tests
 *
 * Tests the always-on edit toolbar (only rendered for authenticated users).
 * No enter/exit toggle — toolbar always shows editing state with mode switch,
 * undo/redo, changes, history, and save.
 *
 * The component uses <Teleport to="#edit-toolbar-slot"> so we create a
 * div with that id and query from there.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import EditToolbar from '~/components/EditToolbar.vue'

let slot: HTMLElement

const baseProps = {
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
  slot = document.createElement('div')
  slot.id = 'edit-toolbar-slot'
  document.body.appendChild(slot)
})

afterEach(() => {
  slot.remove()
})

/** Read teleported text from the slot element */
function headerText(): string {
  return slot.textContent ?? ''
}

/** Find buttons in slot (teleported content) */
function headerButtons(): HTMLButtonElement[] {
  return Array.from(slot.querySelectorAll('button'))
}

describe('EditToolbar', () => {
  describe('always-on toolbar', () => {
    it('renders history button', async () => {
      await mountSuspended(EditToolbar, { props: baseProps })
      expect(headerText()).toContain('History')
    })

    it('renders save button (disabled by default)', async () => {
      await mountSuspended(EditToolbar, { props: baseProps })
      const saveBtn = headerButtons().find(b => b.textContent?.trim() === 'Save')
      expect(saveBtn).toBeDefined()
      expect(saveBtn?.disabled).toBe(true)
    })
  })

  describe('editing state', () => {
    const editProps = {
      ...baseProps,
      isEditMode: true,
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
  })

  describe('validation errors', () => {
    const propsWithChanges = {
      ...baseProps,
      isEditMode: true,
      pendingChanges: [{
        subjectIri: 'http://example.com/a',
        subjectLabel: 'Concept A',
        type: 'modified' as const,
        propertyChanges: [{ predicateIri: 'x', predicateLabel: 'x', type: 'modified' as const, oldValues: ['a'], newValues: ['b'] }],
      }],
    }

    it('disables save when validation errors exist', async () => {
      const errors = [{
        subjectIri: 'http://example.com/a',
        subjectLabel: 'Concept A',
        predicate: 'http://www.w3.org/2004/02/skos/core#definition',
        predicateLabel: 'definition',
        message: 'Requires at least 1 value',
      }]
      await mountSuspended(EditToolbar, {
        props: {
          ...propsWithChanges,
          validationErrors: errors,
          newValidationErrors: errors,
        },
      })
      const saveBtn = headerButtons().find(b => b.textContent?.trim() === 'Save')
      expect(saveBtn?.disabled).toBe(true)
    })

    it('shows validation error count', async () => {
      await mountSuspended(EditToolbar, {
        props: {
          ...propsWithChanges,
          validationErrors: [
            { subjectIri: 'x', subjectLabel: 'X', predicate: 'p', predicateLabel: 'p', message: 'err1' },
            { subjectIri: 'y', subjectLabel: 'Y', predicate: 'p', predicateLabel: 'p', message: 'err2' },
          ],
        },
      })
      expect(headerText()).toContain('2')
      expect(headerText()).toContain('error')
    })

    it('enables save when changes exist and no validation errors', async () => {
      await mountSuspended(EditToolbar, {
        props: { ...propsWithChanges, validationErrors: [] },
      })
      const saveBtn = headerButtons().find(b => b.textContent?.trim() === 'Save')
      expect(saveBtn?.disabled).toBe(false)
    })
  })
})
