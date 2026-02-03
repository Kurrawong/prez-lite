import { html, css, nothing } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { PrezVocabBase } from './base-element.js'
import type { VocabConcept } from '../utils/fetch-vocab.js'

/**
 * <prez-vocab-list>
 *
 * A flat list component for vocabulary concepts with optional filtering.
 *
 * @fires prez-change - When selection changes. Detail: { value, vocab, concepts }
 * @fires prez-load - When vocabulary loads. Detail: { vocab, url, conceptCount }
 * @fires prez-error - When loading fails. Detail: { vocab, url, error }
 */
@customElement('prez-vocab-list')
export class PrezVocabList extends PrezVocabBase {
  static styles = css`
    :host {
      display: block;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 0.875rem;
    }

    :host([disabled]) {
      opacity: 0.6;
      pointer-events: none;
    }

    .search {
      margin-bottom: 0.5rem;
    }

    .search input {
      width: 100%;
      padding: 0.5rem 0.75rem;
      border: 1px solid #d1d5db;
      border-radius: 0.375rem;
      font-size: 0.875rem;
    }

    .search input:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
    }

    .list {
      list-style: none;
      padding: 0;
      margin: 0;
      max-height: 300px;
      overflow-y: auto;
      border: 1px solid #e5e7eb;
      border-radius: 0.375rem;
    }

    .list-item {
      padding: 0.5rem 0.75rem;
      cursor: pointer;
      border-bottom: 1px solid #e5e7eb;
    }

    .list-item:last-child {
      border-bottom: none;
    }

    .list-item:hover {
      background-color: #f9fafb;
    }

    .list-item.selected {
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
    }

    .definition {
      color: #6b7280;
      font-size: 0.75rem;
      margin-top: 0.25rem;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .alt-labels {
      color: #9ca3af;
      font-size: 0.75rem;
      font-style: italic;
    }

    .loading {
      color: #9ca3af;
      padding: 0.5rem;
    }

    .error {
      color: #ef4444;
      font-size: 0.75rem;
      padding: 0.25rem;
    }

    .empty {
      color: #9ca3af;
      padding: 1rem;
      text-align: center;
    }

    .count {
      color: #9ca3af;
      font-size: 0.75rem;
      margin-top: 0.25rem;
    }
  `

  /** Enable search input */
  @property({ type: Boolean })
  searchable = true

  /** Show definitions */
  @property({ type: Boolean, attribute: 'show-definitions' })
  showDefinitions = false

  /** Show alt labels */
  @property({ type: Boolean, attribute: 'show-alt-labels' })
  showAltLabels = false

  /** Placeholder for search input */
  @property({ type: String })
  placeholder = 'Filter concepts...'

  /** Currently selected value */
  @property({ type: String })
  value: string | null = null

  /** Maximum items to display (0 = all) */
  @property({ type: Number, attribute: 'max-items' })
  maxItems = 0

  /** Filter text */
  @state()
  private filterText = ''

  private handleFilter(e: Event): void {
    this.filterText = (e.target as HTMLInputElement).value
  }

  private selectItem(concept: VocabConcept): void {
    this.value = concept.iri
    this.emitChange(concept.iri)
  }

  private get filteredConcepts(): VocabConcept[] {
    if (!this.vocabData?.concepts) return []

    let concepts = this.vocabData.concepts

    if (this.filterText) {
      const filter = this.filterText.toLowerCase()
      concepts = concepts.filter(c =>
        c.label.toLowerCase().includes(filter) ||
        c.notation?.toLowerCase().includes(filter) ||
        c.definition?.toLowerCase().includes(filter) ||
        c.altLabels?.some(a => a.toLowerCase().includes(filter))
      )
    }

    // Sort alphabetically
    concepts = [...concepts].sort((a, b) => a.label.localeCompare(b.label))

    // Apply max items limit
    if (this.maxItems > 0) {
      concepts = concepts.slice(0, this.maxItems)
    }

    return concepts
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
    const totalConcepts = this.vocabData.concepts.length

    return html`
      ${this.searchable ? html`
        <div class="search">
          <input
            type="text"
            .value=${this.filterText}
            @input=${this.handleFilter}
            placeholder=${this.placeholder}
            aria-label="Filter concepts"
          />
        </div>
      ` : nothing}

      ${concepts.length > 0 ? html`
        <ul class="list" role="listbox" aria-label=${this.vocabData.label || 'Concepts'}>
          ${concepts.map(concept => html`
            <li
              class="list-item ${this.value === concept.iri ? 'selected' : ''}"
              role="option"
              aria-selected=${this.value === concept.iri}
              @click=${() => this.selectItem(concept)}
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
              ${this.showAltLabels && concept.altLabels && concept.altLabels.length > 0 ? html`
                <div class="alt-labels">Also: ${concept.altLabels.join(', ')}</div>
              ` : nothing}
            </li>
          `)}
        </ul>
        <div class="count">
          ${this.filterText
            ? `Showing ${concepts.length} of ${totalConcepts} concepts`
            : `${totalConcepts} concepts`
          }
        </div>
      ` : html`
        <div class="empty">
          ${this.filterText ? 'No matching concepts' : 'No concepts available'}
        </div>
      `}
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'prez-vocab-list': PrezVocabList
  }
}
