import { html, css, nothing } from 'lit'
import { customElement, property, state, query } from 'lit/decorators.js'
import { PrezVocabBase } from './base-element.js'
import type { VocabConcept } from '../utils/fetch-vocab.js'

/**
 * <prez-vocab-autocomplete>
 *
 * An autocomplete/typeahead input component for vocabulary concepts.
 *
 * @fires prez-change - When selection changes. Detail: { value, vocab, concepts }
 * @fires prez-load - When vocabulary loads. Detail: { vocab, url, conceptCount }
 * @fires prez-error - When loading fails. Detail: { vocab, url, error }
 */
@customElement('prez-vocab-autocomplete')
export class PrezVocabAutocomplete extends PrezVocabBase {
  static styles = css`
    :host {
      display: inline-block;
      font-family: system-ui, -apple-system, sans-serif;
      position: relative;
    }

    :host([disabled]) {
      opacity: 0.6;
      pointer-events: none;
    }

    .input-wrapper {
      position: relative;
      width: 100%;
    }

    input {
      width: 100%;
      padding: 0.5rem 2rem 0.5rem 0.75rem;
      font-size: 0.875rem;
      line-height: 1.25rem;
      border: 1px solid #d1d5db;
      border-radius: 0.375rem;
      background-color: white;
      box-sizing: border-box;
    }

    input:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
    }

    input:disabled {
      background-color: #f3f4f6;
      cursor: not-allowed;
    }

    .clear-btn {
      position: absolute;
      right: 0.5rem;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      cursor: pointer;
      color: #9ca3af;
      padding: 0.125rem;
      line-height: 0;
    }

    .clear-btn:hover {
      color: #6b7280;
    }

    .dropdown {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      margin-top: 0.25rem;
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 0.375rem;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      max-height: 240px;
      overflow-y: auto;
      z-index: 50;
    }

    .dropdown-item {
      padding: 0.5rem 0.75rem;
      cursor: pointer;
    }

    .dropdown-item:hover,
    .dropdown-item.highlighted {
      background-color: #f3f4f6;
    }

    .dropdown-item.selected {
      background-color: #dbeafe;
    }

    .item-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .notation {
      color: #6b7280;
      font-size: 0.75rem;
      font-family: monospace;
    }

    .label {
      font-weight: 500;
      font-size: 0.875rem;
    }

    .definition {
      color: #6b7280;
      font-size: 0.75rem;
      margin-top: 0.125rem;
      display: -webkit-box;
      -webkit-line-clamp: 1;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .no-results {
      padding: 0.75rem;
      color: #9ca3af;
      text-align: center;
      font-size: 0.875rem;
    }

    .loading {
      padding: 0.75rem;
      color: #9ca3af;
      text-align: center;
      font-size: 0.875rem;
    }

    .error {
      color: #ef4444;
      font-size: 0.75rem;
      padding: 0.25rem 0;
    }
  `

  /** Placeholder text */
  @property({ type: String })
  placeholder = 'Type to search...'

  /** Currently selected value */
  @property({ type: String })
  value: string | null = null

  /** Minimum characters before showing suggestions */
  @property({ type: Number, attribute: 'min-chars' })
  minChars = 1

  /** Maximum suggestions to show */
  @property({ type: Number, attribute: 'max-suggestions' })
  maxSuggestions = 10

  /** Show definitions in dropdown */
  @property({ type: Boolean, attribute: 'show-definitions' })
  showDefinitions = false

  /** Input text */
  @state()
  private inputText = ''

  /** Show dropdown */
  @state()
  private showDropdown = false

  /** Highlighted index */
  @state()
  private highlightedIndex = -1

  @query('input')
  private inputEl!: HTMLInputElement

  private get suggestions(): VocabConcept[] {
    if (!this.vocabData?.concepts || this.inputText.length < this.minChars) {
      return []
    }

    const filter = this.inputText.toLowerCase()
    const matches = this.vocabData.concepts
      .filter(c =>
        c.label.toLowerCase().includes(filter) ||
        c.notation?.toLowerCase().includes(filter) ||
        c.altLabels?.some(a => a.toLowerCase().includes(filter))
      )
      .sort((a, b) => {
        // Prioritize exact prefix matches
        const aStartsWith = a.label.toLowerCase().startsWith(filter) ? 0 : 1
        const bStartsWith = b.label.toLowerCase().startsWith(filter) ? 0 : 1
        if (aStartsWith !== bStartsWith) return aStartsWith - bStartsWith
        return a.label.localeCompare(b.label)
      })

    return matches.slice(0, this.maxSuggestions)
  }

  protected updated(changedProperties: Map<PropertyKey, unknown>): void {
    super.updated(changedProperties)

    // Update input text when value changes externally
    if (changedProperties.has('value') && this.value) {
      const concept = this.conceptMap.get(this.value)
      if (concept) {
        this.inputText = concept.label
      }
    }
  }

  private handleInput(e: Event): void {
    this.inputText = (e.target as HTMLInputElement).value
    this.showDropdown = true
    this.highlightedIndex = -1

    // Clear selection if input changes
    if (this.value) {
      const concept = this.conceptMap.get(this.value)
      if (concept && this.inputText !== concept.label) {
        this.value = null
        this.emitChange('')
      }
    }
  }

  private handleFocus(): void {
    if (this.inputText.length >= this.minChars) {
      this.showDropdown = true
    }
  }

  private handleBlur(): void {
    // Delay to allow click on dropdown item
    setTimeout(() => {
      this.showDropdown = false
    }, 200)
  }

  private handleKeydown(e: KeyboardEvent): void {
    const suggestions = this.suggestions

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        this.highlightedIndex = Math.min(this.highlightedIndex + 1, suggestions.length - 1)
        break
      case 'ArrowUp':
        e.preventDefault()
        this.highlightedIndex = Math.max(this.highlightedIndex - 1, -1)
        break
      case 'Enter':
        e.preventDefault()
        if (this.highlightedIndex >= 0 && suggestions[this.highlightedIndex]) {
          this.selectConcept(suggestions[this.highlightedIndex])
        }
        break
      case 'Escape':
        this.showDropdown = false
        this.inputEl?.blur()
        break
    }
  }

  private selectConcept(concept: VocabConcept): void {
    this.value = concept.iri
    this.inputText = concept.label
    this.showDropdown = false
    this.highlightedIndex = -1
    this.emitChange(concept.iri)
  }

  private clear(): void {
    this.value = null
    this.inputText = ''
    this.showDropdown = false
    this.highlightedIndex = -1
    this.emitChange('')
    this.inputEl?.focus()
  }

  render() {
    if (this.error) {
      return html`<div class="error">${this.error}</div>`
    }

    const suggestions = this.suggestions

    return html`
      <div class="input-wrapper">
        <input
          type="text"
          .value=${this.inputText}
          placeholder=${this.loading ? 'Loading...' : this.placeholder}
          ?disabled=${this.disabled || this.loading}
          @input=${this.handleInput}
          @focus=${this.handleFocus}
          @blur=${this.handleBlur}
          @keydown=${this.handleKeydown}
          aria-label=${this.vocabData?.label || 'Concept search'}
          aria-autocomplete="list"
          aria-expanded=${this.showDropdown}
          role="combobox"
        />
        ${this.inputText ? html`
          <button
            class="clear-btn"
            @mousedown=${(e: Event) => e.preventDefault()}
            @click=${this.clear}
            aria-label="Clear"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M4.28 3.22a.75.75 0 00-1.06 1.06L6.94 8l-3.72 3.72a.75.75 0 101.06 1.06L8 9.06l3.72 3.72a.75.75 0 101.06-1.06L9.06 8l3.72-3.72a.75.75 0 00-1.06-1.06L8 6.94 4.28 3.22z"/>
            </svg>
          </button>
        ` : nothing}
      </div>

      ${this.showDropdown && this.vocabData ? html`
        <div class="dropdown" role="listbox">
          ${this.loading ? html`
            <div class="loading">Loading...</div>
          ` : suggestions.length > 0 ? suggestions.map((concept, index) => html`
            <div
              class="dropdown-item ${index === this.highlightedIndex ? 'highlighted' : ''} ${this.value === concept.iri ? 'selected' : ''}"
              role="option"
              aria-selected=${this.value === concept.iri}
              @mousedown=${(e: Event) => e.preventDefault()}
              @click=${() => this.selectConcept(concept)}
            >
              <div class="item-header">
                ${concept.notation ? html`
                  <span class="notation">${concept.notation}</span>
                ` : nothing}
                <span class="label">${concept.label}</span>
              </div>
              ${this.showDefinitions && concept.definition ? html`
                <div class="definition">${concept.definition}</div>
              ` : nothing}
            </div>
          `) : this.inputText.length >= this.minChars ? html`
            <div class="no-results">No matching concepts</div>
          ` : nothing}
        </div>
      ` : nothing}
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'prez-vocab-autocomplete': PrezVocabAutocomplete
  }
}
