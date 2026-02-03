import { html, css, nothing } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { PrezVocabBase } from './base-element.js'

/**
 * <prez-vocab-select>
 *
 * A dropdown select component for vocabulary concepts.
 *
 * @fires prez-change - When selection changes. Detail: { value, vocab, concepts }
 * @fires prez-load - When vocabulary loads. Detail: { vocab, url, conceptCount }
 * @fires prez-error - When loading fails. Detail: { vocab, url, error }
 */
@customElement('prez-vocab-select')
export class PrezVocabSelect extends PrezVocabBase {
  static styles = css`
    :host {
      display: inline-block;
      font-family: system-ui, -apple-system, sans-serif;
    }

    :host([disabled]) {
      opacity: 0.6;
      pointer-events: none;
    }

    .select-wrapper {
      position: relative;
      display: inline-block;
      width: 100%;
    }

    select {
      width: 100%;
      padding: 0.5rem 2rem 0.5rem 0.75rem;
      font-size: 0.875rem;
      line-height: 1.25rem;
      border: 1px solid #d1d5db;
      border-radius: 0.375rem;
      background-color: white;
      appearance: none;
      cursor: pointer;
    }

    select:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
    }

    select:disabled {
      background-color: #f3f4f6;
      cursor: not-allowed;
    }

    .chevron {
      position: absolute;
      right: 0.5rem;
      top: 50%;
      transform: translateY(-50%);
      pointer-events: none;
      color: #6b7280;
    }

    .loading {
      color: #9ca3af;
      font-size: 0.875rem;
      padding: 0.5rem 0;
    }

    .error {
      color: #ef4444;
      font-size: 0.75rem;
      padding: 0.25rem 0;
    }

    /* Multiple select styles */
    select[multiple] {
      padding-right: 0.75rem;
      min-height: 120px;
    }

    .selection-count {
      font-size: 0.75rem;
      color: #6b7280;
      margin-top: 0.25rem;
    }
  `

  /** Allow multiple selections */
  @property({ type: Boolean })
  multiple = false

  /** Enable search/filter within dropdown */
  @property({ type: Boolean })
  searchable = false

  /** Placeholder text */
  @property({ type: String })
  placeholder = 'Select a concept...'

  /** Currently selected value (single) */
  @property({ type: String })
  value: string | null = null

  /** Currently selected values (multiple) */
  @property({ type: Array, attribute: 'values' })
  values: string[] = []

  /** Maximum selections (for multiple mode) */
  @property({ type: Number, attribute: 'max-selections' })
  maxSelections: number | null = null

  /** Show IRI in option display */
  @property({ type: Boolean, attribute: 'show-iri' })
  showIri = false

  /** Filter text for searchable mode */
  @state()
  private filterText = ''

  private handleChange(e: Event): void {
    const select = e.target as HTMLSelectElement

    if (this.multiple) {
      const selectedOptions = Array.from(select.selectedOptions).map(o => o.value)
      this.values = selectedOptions
      this.emitChange(selectedOptions)
    } else {
      const selectedValue = select.value || null
      this.value = selectedValue
      this.emitChange(selectedValue || '')
    }
  }

  private get filteredConcepts() {
    if (!this.vocabData?.concepts) return []

    let concepts = this.vocabData.concepts

    if (this.searchable && this.filterText) {
      const filter = this.filterText.toLowerCase()
      concepts = concepts.filter(c =>
        c.label.toLowerCase().includes(filter) ||
        c.notation?.toLowerCase().includes(filter) ||
        c.altLabels?.some(a => a.toLowerCase().includes(filter))
      )
    }

    // Sort alphabetically
    return [...concepts].sort((a, b) => a.label.localeCompare(b.label))
  }

  render() {
    if (this.loading) {
      return html`<div class="loading">Loading vocabulary...</div>`
    }

    if (this.error) {
      return html`<div class="error">${this.error}</div>`
    }

    if (!this.vocabData) {
      return html`<div class="loading">No vocabulary specified</div>`
    }

    const concepts = this.filteredConcepts

    return html`
      <div class="select-wrapper">
        <select
          ?multiple=${this.multiple}
          ?disabled=${this.disabled}
          @change=${this.handleChange}
          aria-label=${this.vocabData.label || 'Vocabulary select'}
        >
          ${!this.multiple ? html`
            <option value="" ?selected=${!this.value}>${this.placeholder}</option>
          ` : nothing}
          ${concepts.map(concept => {
            const isSelected = this.multiple
              ? this.values.includes(concept.iri)
              : this.value === concept.iri
            const label = this.showIri
              ? `${concept.label} (${concept.iri})`
              : concept.notation
                ? `${concept.notation} - ${concept.label}`
                : concept.label

            return html`
              <option value=${concept.iri} ?selected=${isSelected}>
                ${label}
              </option>
            `
          })}
        </select>
        ${!this.multiple ? html`
          <span class="chevron">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M4.427 6.427l3.396 3.396a.25.25 0 00.354 0l3.396-3.396A.25.25 0 0011.396 6H4.604a.25.25 0 00-.177.427z"/>
            </svg>
          </span>
        ` : nothing}
      </div>
      ${this.multiple && this.values.length > 0 ? html`
        <div class="selection-count">
          ${this.values.length} selected${this.maxSelections ? ` (max ${this.maxSelections})` : ''}
        </div>
      ` : nothing}
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'prez-vocab-select': PrezVocabSelect
  }
}
