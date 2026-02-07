import { html, css, nothing } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { PrezVocabBase } from './base-element.js'
import type { VocabTreeNode, VocabConcept } from '../utils/fetch-vocab.js'

/**
 * <prez-list>
 *
 * A unified vocabulary list/selection component supporting multiple modes:
 * - type="select" (default): Tree view with expand/collapse
 * - type="dropdown": Dropdown button with tree inside popover
 * - type="radio": Radio button selection (single) or checkboxes (multiple)
 * - type="table": Tabular display with configurable columns
 * - search: Adds filter/search input
 * - multiple: Checkbox-style multi-select
 * - horizontal: For radio type, renders same-level items in rows
 *
 * @fires prez-change - When selection changes. Detail: { value, vocab, concepts }
 * @fires prez-load - When vocabulary loads. Detail: { vocab, url, conceptCount }
 * @fires prez-error - When loading fails. Detail: { vocab, url, error }
 */
@customElement('prez-list')
export class PrezList extends PrezVocabBase {
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

    /* Dropdown container */
    .dropdown {
      position: relative;
    }

    .dropdown-trigger {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      padding: 0.5rem 0.75rem;
      border: 1px solid #d1d5db;
      border-radius: 0.375rem;
      background: white;
      font-size: 0.875rem;
      cursor: pointer;
      text-align: left;
      gap: 0.5rem;
    }

    .dropdown-trigger:hover {
      border-color: #9ca3af;
    }

    .dropdown-trigger:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
    }

    .dropdown-trigger.open {
      border-color: #3b82f6;
      box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
    }

    .dropdown-trigger-text {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .dropdown-trigger-placeholder {
      color: #9ca3af;
    }

    .dropdown-trigger-icon {
      flex-shrink: 0;
      width: 1rem;
      height: 1rem;
      color: #6b7280;
      transition: transform 0.15s;
    }

    .dropdown-trigger.open .dropdown-trigger-icon {
      transform: rotate(180deg);
    }

    .dropdown-search-input {
      flex: 1;
      border: none;
      background: transparent;
      font-size: 0.875rem;
      padding: 0;
      outline: none;
      min-width: 0;
    }

    .dropdown-search-input::placeholder {
      color: #374151;
    }

    .dropdown-trigger:has(.dropdown-search-input) {
      cursor: text;
    }

    .dropdown-popover {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      margin-top: 0.25rem;
      background: white;
      border: 1px solid #d1d5db;
      border-radius: 0.375rem;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      z-index: 50;
      max-height: 300px;
      overflow-y: auto;
    }

    .dropdown-popover .tree {
      padding: 0.25rem;
    }

    .dropdown-popover .search {
      padding: 0.5rem;
      border-bottom: 1px solid #e5e7eb;
      margin-bottom: 0;
    }

    .dropdown-popover .search input {
      margin-bottom: 0;
    }

    /* Search input */
    .search {
      margin-bottom: 0.5rem;
    }

    .search input {
      width: 100%;
      padding: 0.5rem 0.75rem;
      border: 1px solid #d1d5db;
      border-radius: 0.375rem;
      font-size: 0.875rem;
      box-sizing: border-box;
    }

    .search input:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
    }

    /* Tree and list styles */
    .tree, .flat-list {
      list-style: none;
      padding: 0;
      margin: 0;
      max-height: 300px;
      overflow-y: auto;
    }

    .flat-item {
      /* No special positioning needed for flat list */
    }

    .tree-item {
      position: relative;
    }

    /* Vertical connector line */
    .children {
      position: relative;
      list-style: none;
      padding-left: 1.5rem;
      margin: 0;
    }

    .children::before {
      content: '';
      position: absolute;
      left: 0.625rem;
      top: 0;
      bottom: 0.75rem;
      width: 1px;
      background: #e5e7eb;
    }

    .tree-row {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      cursor: pointer;
    }

    .tree-row:hover {
      background-color: #f3f4f6;
    }

    .tree-row.selected {
      background-color: #dbeafe;
    }

    .expand-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 1.25rem;
      height: 1.25rem;
      border: none;
      border-radius: 0.25rem;
      background: transparent;
      cursor: pointer;
      color: #6b7280;
      padding: 0;
      flex-shrink: 0;
      transition: background-color 0.15s, color 0.15s;
    }

    .expand-btn:hover {
      background: #e5e7eb;
      color: #374151;
    }

    .expand-placeholder {
      width: 1.25rem;
      height: 1.25rem;
      flex-shrink: 0;
    }

    .checkbox {
      margin-right: 0.25rem;
    }

    .label {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .notation {
      color: #6b7280;
      font-size: 0.75rem;
    }

    .count {
      color: #9ca3af;
      font-size: 0.75rem;
    }

    .children {
      list-style: none;
      padding-left: 1.25rem;
      margin: 0;
    }

    /* Status styles */
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
      padding: 0.5rem;
    }

    .selection-count {
      font-size: 0.75rem;
      color: #6b7280;
      margin-top: 0.25rem;
    }

    /* Radio mode styles */
    .radio-group {
      display: flex;
      flex-direction: column;
    }

    .radio-level {
      display: flex;
      flex-direction: column;
    }

    .radio-level.horizontal {
      flex-direction: row;
      flex-wrap: wrap;
      align-items: baseline;
    }

    .radio-level.horizontal > .radio-node {
      margin-right: 1rem;
      margin-bottom: 0.5rem;
    }

    .radio-node {
      margin-bottom: 0.5rem;
    }

    .radio-node:last-child {
      margin-bottom: 0;
    }

    .radio-children {
      padding-left: 1.5rem;
      margin-top: 0.5rem;
      display: flex;
      flex-direction: column;
    }

    .radio-children.horizontal {
      flex-direction: row;
      flex-wrap: wrap;
      align-items: baseline;
    }

    .radio-children.horizontal > .radio-node {
      margin-right: 1rem;
    }

    .radio-children.with-separator {
      padding-bottom: 0.5rem;
      margin-bottom: 0.5rem;
      border-bottom: 1px solid #e5e7eb;
    }

    .radio-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
    }

    .radio-item:hover {
      color: #3b82f6;
    }

    .radio-item input[type="radio"] {
      margin: 0;
      cursor: pointer;
    }

    .radio-item .label {
      cursor: pointer;
    }

    /* Description styles */
    .description {
      font-size: 0.75rem;
      color: #6b7280;
      margin-top: 0.125rem;
      line-height: 1.4;
    }

    .item-content {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-width: 0;
    }

    .item-content .label {
      flex: none;
    }

    /* Select all/deselect all controls */
    .select-controls {
      display: flex;
      gap: 0.5rem;
      padding: 0.25rem 0;
      margin-bottom: 0.5rem;
      border-bottom: 1px solid #e5e7eb;
    }

    .select-controls button {
      font-size: 0.75rem;
      color: #3b82f6;
      background: none;
      border: none;
      padding: 0.25rem 0.5rem;
      cursor: pointer;
      border-radius: 0.25rem;
    }

    .select-controls button:hover:not(:disabled) {
      background: #eff6ff;
    }

    .select-controls button:disabled {
      opacity: 0.6;
      cursor: default;
    }

    /* Table styles */
    .vocab-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
    }

    .vocab-table th {
      text-align: left;
      padding: 0.5rem;
      border-bottom: 2px solid #e5e7eb;
      font-weight: 600;
      color: #374151;
      background: #f9fafb;
    }

    .vocab-table td {
      padding: 0.5rem;
      border-bottom: 1px solid #e5e7eb;
      vertical-align: top;
    }

    .vocab-table tr:hover {
      background: #f9fafb;
    }

    .vocab-table tr.selected {
      background: #dbeafe;
    }

    .vocab-table tr.selected:hover {
      background: #bfdbfe;
    }

    .vocab-table .cell-indent {
      display: flex;
      align-items: flex-start;
      gap: 0.25rem;
    }

    .vocab-table .indent-spacer {
      width: 1rem;
      flex-shrink: 0;
    }

    .vocab-table .cell-checkbox {
      width: 2rem;
      text-align: center;
    }

    .vocab-table .cell-iri {
      font-family: monospace;
      font-size: 0.75rem;
      color: #6b7280;
      word-break: break-all;
    }

    .vocab-table .cell-description {
      color: #6b7280;
      font-size: 0.8125rem;
    }
  `

  /** Display type: 'select' (tree), 'dropdown' (popover), 'radio' (radio/checkbox buttons), 'table' (tabular) */
  @property({ type: String })
  type: 'select' | 'dropdown' | 'radio' | 'table' = 'select'

  /** Comma-separated list of fields to show in table mode (default: all) */
  @property({ type: String })
  fields: string = ''

  /** Allow multiple selections */
  @property({ type: Boolean })
  multiple = false

  /** Render as flat list instead of tree hierarchy */
  @property({ type: Boolean })
  flat = false

  /** Horizontal layout for radio type - renders same-level items in rows */
  @property({ type: Boolean })
  horizontal = false

  /** Show search/filter input */
  @property({ type: Boolean })
  search = false

  /** Maximum tree depth to expand initially (0 = all collapsed) */
  @property({ type: Number, attribute: 'max-level' })
  maxLevel = 1

  /** Highlight selected items */
  @property({ type: Boolean, attribute: 'show-selected' })
  showSelected = true

  /** Placeholder text for flat select mode */
  @property({ type: String })
  placeholder = 'Select...'

  /** Currently selected value (single mode) */
  @property({ type: String })
  value: string | null = null

  /** Currently selected values (multiple mode) */
  @property({ type: Array, attribute: 'values' })
  values: string[] = []

  /** Show child count for tree nodes */
  @property({ type: Boolean, attribute: 'show-count' })
  showCount = false

  /** Show concept definitions/descriptions */
  @property({ type: Boolean, attribute: 'show-description' })
  showDescription = false

  /** Show IRI in option display (flat mode) */
  @property({ type: Boolean, attribute: 'show-iri' })
  showIri = false

  /** Filter text for search mode */
  @state()
  private filterText = ''

  /** Expanded node IRIs for tree mode */
  @state()
  private expandedNodes: Set<string> = new Set()

  /** Dropdown open state for flat mode */
  @state()
  private dropdownOpen = false

  private boundHandleClickOutside = this.handleClickOutside.bind(this)

  connectedCallback(): void {
    super.connectedCallback()
    document.addEventListener('click', this.boundHandleClickOutside)
  }

  disconnectedCallback(): void {
    super.disconnectedCallback()
    document.removeEventListener('click', this.boundHandleClickOutside)
  }

  private handleClickOutside(e: Event): void {
    if (this.dropdownOpen && !this.contains(e.target as Node)) {
      this.dropdownOpen = false
    }
  }

  protected updated(changedProperties: Map<PropertyKey, unknown>): void {
    super.updated(changedProperties)

    // Initialize expanded state when data loads
    if (changedProperties.has('vocabData') && this.vocabData) {
      this.initializeExpanded()
    }
  }

  private initializeExpanded(): void {
    if (!this.vocabData?.tree) return

    if (this.maxLevel === -1) {
      // Expand all nodes
      const allIris = new Set<string>()
      const collectIris = (nodes: VocabTreeNode[]) => {
        for (const node of nodes) {
          if (node.children.length > 0) {
            allIris.add(node.iri)
            collectIris(node.children)
          }
        }
      }
      collectIris(this.vocabData.tree)
      this.expandedNodes = allIris
    } else if (this.maxLevel > 0) {
      // Expand to specified level
      const expanded = new Set<string>()
      const expandToLevel = (nodes: VocabTreeNode[], level: number) => {
        if (level <= 0) return
        for (const node of nodes) {
          if (node.children.length > 0) {
            expanded.add(node.iri)
            expandToLevel(node.children, level - 1)
          }
        }
      }
      expandToLevel(this.vocabData.tree, this.maxLevel)
      this.expandedNodes = expanded
    }
  }

  private handleFilter(e: Event): void {
    this.filterText = (e.target as HTMLInputElement).value
    this.emitFilter(this.filterText)
  }

  private toggleExpand(iri: string, e: Event): void {
    e.stopPropagation()
    const newExpanded = new Set(this.expandedNodes)
    const wasExpanded = newExpanded.has(iri)
    if (wasExpanded) {
      newExpanded.delete(iri)
    } else {
      newExpanded.add(iri)
    }
    this.expandedNodes = newExpanded
    this.emitExpand(iri, !wasExpanded)
  }

  private toggleDropdown(e: Event): void {
    e.stopPropagation()
    this.dropdownOpen = !this.dropdownOpen
  }

  private selectRadio(iri: string): void {
    this.value = iri
    this.emitChange(iri)
  }

  private selectAll(): void {
    if (!this.vocabData) return
    const allIris = this.filteredConcepts.map(c => c.iri)
    this.values = allIris
    this.emitChange(allIris)
  }

  private deselectAll(): void {
    this.values = []
    this.emitChange([])
  }

  private selectNode(iri: string): void {
    if (this.multiple) {
      const newValues = this.values.includes(iri)
        ? this.values.filter(v => v !== iri)
        : [...this.values, iri]
      this.values = newValues
      this.emitChange(newValues)
    } else {
      this.value = iri
      this.emitChange(iri)
      // Close dropdown on single selection
      if (this.type === 'dropdown') {
        this.dropdownOpen = false
        this.filterText = '' // Clear filter on selection
      }
    }
  }

  private handleSelectChange(e: Event): void {
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

  private countDescendants(node: VocabTreeNode): number {
    let count = node.children.length
    for (const child of node.children) {
      count += this.countDescendants(child)
    }
    return count
  }

  private collectDescendantIris(node: VocabTreeNode): string[] {
    const iris: string[] = [node.iri]
    for (const child of node.children) {
      iris.push(...this.collectDescendantIris(child))
    }
    return iris
  }

  private selectNodeWithDescendants(node: VocabTreeNode, e: Event): void {
    e.stopPropagation()
    e.preventDefault()

    const allIris = this.collectDescendantIris(node)
    const isCurrentlySelected = this.values.includes(node.iri)

    let newValues: string[]
    if (isCurrentlySelected) {
      // Deselect node and all descendants
      newValues = this.values.filter(v => !allIris.includes(v))
    } else {
      // Select node and all descendants
      const toAdd = allIris.filter(iri => !this.values.includes(iri))
      newValues = [...this.values, ...toAdd]
    }

    this.values = newValues
    this.emitChange(newValues)
  }

  private get filteredConcepts(): VocabConcept[] {
    if (!this.vocabData?.concepts) return []

    let concepts = this.vocabData.concepts

    if (this.filterText) {
      const filter = this.filterText.toLowerCase()
      concepts = concepts.filter(c =>
        c.label.toLowerCase().includes(filter) ||
        c.notation?.toLowerCase().includes(filter) ||
        c.altLabels?.some(a => a.toLowerCase().includes(filter))
      )
    }

    return [...concepts].sort((a, b) => a.label.localeCompare(b.label))
  }

  private filterTreeNodes(nodes: VocabTreeNode[]): VocabTreeNode[] {
    if (!this.filterText) return nodes

    const filter = this.filterText.toLowerCase()
    const matchesFilter = (node: VocabTreeNode): boolean => {
      return node.label.toLowerCase().includes(filter) ||
        node.notation?.toLowerCase().includes(filter)
    }

    const filterNode = (node: VocabTreeNode): VocabTreeNode | null => {
      const filteredChildren = node.children
        .map(filterNode)
        .filter((n): n is VocabTreeNode => n !== null)

      if (matchesFilter(node) || filteredChildren.length > 0) {
        return { ...node, children: filteredChildren }
      }
      return null
    }

    return nodes
      .map(filterNode)
      .filter((n): n is VocabTreeNode => n !== null)
  }

  private renderTreeNode(node: VocabTreeNode): unknown {
    const hasChildren = node.children.length > 0
    const isExpanded = this.expandedNodes.has(node.iri) || (this.filterText && hasChildren)
    const isSelected = this.multiple
      ? this.values.includes(node.iri)
      : this.value === node.iri

    return html`
      <li class="tree-item">
        <div
          class="tree-row ${this.showSelected && isSelected ? 'selected' : ''}"
          @click=${() => this.selectNode(node.iri)}
        >
          ${hasChildren ? html`
            <button
              class="expand-btn"
              @click=${(e: Event) => this.toggleExpand(node.iri, e)}
              aria-expanded=${isExpanded}
              aria-label=${isExpanded ? 'Collapse' : 'Expand'}
            >
              ${isExpanded
                ? html`<svg width="10" height="10" viewBox="0 0 10 10"><path d="M1 3 L5 7 L9 3" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`
                : html`<svg width="10" height="10" viewBox="0 0 10 10"><path d="M3 1 L7 5 L3 9" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`
              }
            </button>
          ` : html`<span class="expand-placeholder"></span>`}
          ${this.multiple ? html`
            <input
              type="checkbox"
              class="checkbox"
              .checked=${isSelected}
              @click=${(e: Event) => { e.stopPropagation(); this.selectNode(node.iri) }}
              @dblclick=${(e: Event) => this.selectNodeWithDescendants(node, e)}
              title="Double-click to select/deselect with all children"
            >
          ` : nothing}
          ${node.notation ? html`<span class="notation">${node.notation}</span>` : nothing}
          <div class="item-content">
            <span class="label">${node.label}</span>
            ${this.showDescription && node.description ? html`
              <span class="description">${node.description}</span>
            ` : nothing}
          </div>
          ${this.showCount && hasChildren ? html`
            <span class="count">(${this.countDescendants(node)})</span>
          ` : nothing}
        </div>
        ${hasChildren && isExpanded ? html`
          <ul class="children">
            ${node.children.map(child => this.renderTreeNode(child))}
          </ul>
        ` : nothing}
      </li>
    `
  }

  private findNodePath(targetIri: string, nodes: VocabTreeNode[] = this.vocabData?.tree || [], path: string[] = []): string[] | null {
    for (const node of nodes) {
      const currentPath = [...path, node.label]
      if (node.iri === targetIri) {
        return currentPath
      }
      if (node.children.length > 0) {
        const found = this.findNodePath(targetIri, node.children, currentPath)
        if (found) return found
      }
    }
    return null
  }

  private getSelectedLabels(): string {
    if (this.multiple) {
      if (this.values.length === 0) return ''
      const labels = this.values
        .map(iri => {
          // Show path only if not flat mode
          if (!this.flat) {
            const path = this.findNodePath(iri)
            if (path) return path.join(' > ')
          }
          return this.vocabData?.concepts.find(c => c.iri === iri)?.label || iri
        })
        .slice(0, 2)
      if (this.values.length > 2) {
        return `${labels.join(', ')} +${this.values.length - 2} more`
      }
      return labels.join(', ')
    } else {
      if (!this.value) return ''
      // Show path only if not flat mode
      if (!this.flat) {
        const path = this.findNodePath(this.value)
        if (path) return path.join(' > ')
      }
      return this.vocabData?.concepts.find(c => c.iri === this.value)?.label || this.value
    }
  }

  private renderDropdownContent() {
    if (this.flat) {
      const concepts = this.filteredConcepts
      if (concepts.length === 0) {
        return html`<div class="empty">${this.filterText ? 'No matching concepts' : 'No concepts available'}</div>`
      }
      return html`
        ${this.renderSelectControls()}
        <ul class="flat-list" role="listbox" aria-label=${this.vocabData?.label || 'Vocabulary list'}>
          ${concepts.map(concept => {
            const isSelected = this.multiple
              ? this.values.includes(concept.iri)
              : this.value === concept.iri
            return html`
              <li class="flat-item">
                <div
                  class="tree-row ${this.showSelected && isSelected ? 'selected' : ''}"
                  role="option"
                  aria-selected=${isSelected}
                  @click=${() => this.selectNode(concept.iri)}
                >
                  ${this.multiple ? html`
                    <input
                      type="checkbox"
                      class="checkbox"
                      .checked=${isSelected}
                      @click=${(e: Event) => { e.stopPropagation(); this.selectNode(concept.iri) }}
                    >
                  ` : nothing}
                  ${concept.notation ? html`<span class="notation">${concept.notation}</span>` : nothing}
                  <div class="item-content">
                    <span class="label">${concept.label}</span>
                    ${this.showDescription && concept.description ? html`
                      <span class="description">${concept.description}</span>
                    ` : nothing}
                  </div>
                </div>
              </li>
            `
          })}
        </ul>
      `
    }

    const tree = this.filterTreeNodes(this.vocabData?.tree || [])
    if (tree.length === 0) {
      return html`<div class="empty">${this.filterText ? 'No matching concepts' : 'No hierarchy available'}</div>`
    }
    return html`
      ${this.renderSelectControls()}
      <ul class="tree" role="tree" aria-label=${this.vocabData?.label || 'Vocabulary tree'}>
        ${tree.map(node => this.renderTreeNode(node))}
      </ul>
    `
  }

  private handleSearchFocus(): void {
    this.dropdownOpen = true
  }

  private handleSearchInput(e: Event): void {
    this.filterText = (e.target as HTMLInputElement).value
    this.emitFilter(this.filterText)
    if (!this.dropdownOpen) {
      this.dropdownOpen = true
    }
  }

  private renderDropdown() {
    const selectedLabel = this.getSelectedLabels()
    const hasSelection = this.multiple ? this.values.length > 0 : !!this.value

    // When search is enabled, use autocomplete-style input as trigger
    if (this.search) {
      return html`
        <div class="dropdown">
          <div class="dropdown-trigger ${this.dropdownOpen ? 'open' : ''}">
            <input
              type="text"
              class="dropdown-search-input"
              .value=${this.filterText}
              placeholder=${hasSelection ? selectedLabel : this.placeholder}
              @focus=${this.handleSearchFocus}
              @input=${this.handleSearchInput}
              @click=${(e: Event) => e.stopPropagation()}
              aria-haspopup="listbox"
              aria-expanded=${this.dropdownOpen}
            />
            <svg class="dropdown-trigger-icon" viewBox="0 0 20 20" fill="currentColor" @click=${this.toggleDropdown}>
              <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clip-rule="evenodd" />
            </svg>
          </div>
          ${this.dropdownOpen ? html`
            <div class="dropdown-popover">
              ${this.renderDropdownContent()}
              ${this.multiple && this.values.length > 0 ? html`
                <div class="selection-count" style="padding: 0.25rem 0.5rem; border-top: 1px solid #e5e7eb;">
                  ${this.values.length} selected
                </div>
              ` : nothing}
            </div>
          ` : nothing}
        </div>
      `
    }

    // Standard button trigger
    return html`
      <div class="dropdown">
        <button
          class="dropdown-trigger ${this.dropdownOpen ? 'open' : ''}"
          @click=${this.toggleDropdown}
          aria-haspopup="listbox"
          aria-expanded=${this.dropdownOpen}
        >
          <span class="dropdown-trigger-text ${!hasSelection ? 'dropdown-trigger-placeholder' : ''}">
            ${hasSelection ? selectedLabel : this.placeholder}
          </span>
          <svg class="dropdown-trigger-icon" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clip-rule="evenodd" />
          </svg>
        </button>
        ${this.dropdownOpen ? html`
          <div class="dropdown-popover">
            ${this.renderDropdownContent()}
            ${this.multiple && this.values.length > 0 ? html`
              <div class="selection-count" style="padding: 0.25rem 0.5rem; border-top: 1px solid #e5e7eb;">
                ${this.values.length} selected
              </div>
            ` : nothing}
          </div>
        ` : nothing}
      </div>
    `
  }

  private renderSelectControls() {
    if (!this.multiple) return nothing
    const totalCount = this.filteredConcepts.length
    const selectedCount = this.values.length
    return html`
      <div class="select-controls">
        <button @click=${this.selectAll} ?disabled=${selectedCount === totalCount}>
          Select all${this.filterText ? ' filtered' : ''} (${totalCount})
        </button>
        <button @click=${this.deselectAll} ?disabled=${selectedCount === 0}>
          Deselect all
        </button>
      </div>
    `
  }

  private renderTree() {
    const tree = this.filterTreeNodes(this.vocabData?.tree || [])

    if (tree.length === 0) {
      return html`<div class="empty">${this.filterText ? 'No matching concepts' : 'No hierarchy available'}</div>`
    }

    return html`
      ${this.renderSelectControls()}
      <ul class="tree" role="tree" aria-label=${this.vocabData?.label || 'Vocabulary tree'}>
        ${tree.map(node => this.renderTreeNode(node))}
      </ul>
      ${this.multiple && this.values.length > 0 ? html`
        <div class="selection-count">
          ${this.values.length} selected
        </div>
      ` : nothing}
    `
  }

  private renderRadioNode(node: VocabTreeNode, isLastInTree: boolean): unknown {
    const hasChildren = node.children.length > 0
    const hasMultipleChildren = node.children.length > 1
    const isSelected = this.value === node.iri
    const inputName = `radio-${this.vocab || 'vocab'}`

    // Show separator if horizontal, has multiple children, and not the last node in entire tree
    const showSeparator = this.horizontal && hasMultipleChildren && !isLastInTree

    return html`
      <div class="radio-node">
        <label class="radio-item">
          <input
            type="radio"
            name=${inputName}
            .checked=${isSelected}
            @change=${() => this.selectRadio(node.iri)}
          />
          ${node.notation ? html`<span class="notation">${node.notation}</span>` : nothing}
          <div class="item-content">
            <span class="label">${node.label}</span>
            ${this.showDescription && node.description ? html`
              <span class="description">${node.description}</span>
            ` : nothing}
          </div>
        </label>
        ${hasChildren ? html`
          <div class="radio-children ${this.horizontal ? 'horizontal' : ''} ${showSeparator ? 'with-separator' : ''}">
            ${node.children.map((child, idx) => {
              // Child is last in tree if parent is last and this is the last child
              const childIsLastInTree = isLastInTree && idx === node.children.length - 1
              return this.renderRadioNode(child, childIsLastInTree)
            })}
          </div>
        ` : nothing}
      </div>
    `
  }

  private renderRadio() {
    const tree = this.filterTreeNodes(this.vocabData?.tree || [])

    if (tree.length === 0) {
      return html`<div class="empty">${this.filterText ? 'No matching concepts' : 'No concepts available'}</div>`
    }

    return html`
      <div class="radio-group" role="radiogroup" aria-label=${this.vocabData?.label || 'Vocabulary selection'}>
        <div class="radio-level ${this.horizontal ? 'horizontal' : ''}">
          ${tree.map((node, idx) => this.renderRadioNode(node, idx === tree.length - 1))}
        </div>
      </div>
    `
  }

  private get tableFields(): string[] {
    if (this.fields) {
      return this.fields.split(',').map(f => f.trim())
    }
    // Default fields
    return ['iri', 'label', 'notation', 'description']
  }

  /**
   * Get display label for a field name.
   * Fields use shorthand names that map to VocabConcept properties.
   * Available: iri, label, notation, description, altLabels, broader, narrower
   */
  private getFieldLabel(field: string): string {
    const labels: Record<string, string> = {
      iri: 'IRI',
      label: 'Label',
      notation: 'Notation',
      description: 'Description',
      altLabels: 'Alt Labels',
      broader: 'Broader',
      narrower: 'Narrower'
    }
    return labels[field] || field
  }

  /**
   * Get value for a field from concept data.
   * Uses shorthand names mapped to VocabConcept properties.
   */
  private getFieldValue(concept: VocabConcept, field: string): string {
    switch (field) {
      case 'iri': return concept.iri
      case 'label': return concept.label
      case 'notation': return concept.notation || ''
      case 'description': return concept.description || ''
      case 'altLabels': return concept.altLabels?.join(', ') || ''
      case 'broader': return concept.broader?.join(', ') || ''
      case 'narrower': return concept.narrower?.join(', ') || ''
      default: return ''
    }
  }

  private renderTableRow(concept: VocabConcept, depth: number = 0): unknown {
    const isSelected = this.multiple
      ? this.values.includes(concept.iri)
      : this.value === concept.iri
    const fields = this.tableFields

    return html`
      <tr
        class="${isSelected ? 'selected' : ''}"
        @click=${() => this.selectNode(concept.iri)}
        style="cursor: pointer"
      >
        ${this.multiple ? html`
          <td class="cell-checkbox">
            <input
              type="checkbox"
              .checked=${isSelected}
              @click=${(e: Event) => { e.stopPropagation(); this.selectNode(concept.iri) }}
            />
          </td>
        ` : nothing}
        ${fields.map((field, idx) => html`
          <td class="${field === 'iri' ? 'cell-iri' : field === 'description' ? 'cell-description' : ''}">
            ${idx === 0 && !this.flat && depth > 0 ? html`
              <div class="cell-indent">
                ${Array(depth).fill(0).map(() => html`<span class="indent-spacer"></span>`)}
                <span>${this.getFieldValue(concept, field)}</span>
              </div>
            ` : this.getFieldValue(concept, field)}
          </td>
        `)}
      </tr>
    `
  }

  private renderTableTreeRows(node: VocabTreeNode, depth: number = 0): unknown[] {
    const concept = this.conceptMap.get(node.iri)
    if (!concept) return []

    const rows: unknown[] = [this.renderTableRow(concept, depth)]
    for (const child of node.children) {
      rows.push(...this.renderTableTreeRows(child, depth + 1))
    }
    return rows
  }

  private renderTable() {
    const fields = this.tableFields

    if (this.flat) {
      const concepts = this.filteredConcepts
      if (concepts.length === 0) {
        return html`<div class="empty">${this.filterText ? 'No matching concepts' : 'No concepts available'}</div>`
      }

      return html`
        ${this.renderSelectControls()}
        <table class="vocab-table">
          <thead>
            <tr>
              ${this.multiple ? html`<th class="cell-checkbox"></th>` : nothing}
              ${fields.map(field => html`<th>${this.getFieldLabel(field)}</th>`)}
            </tr>
          </thead>
          <tbody>
            ${concepts.map(c => this.renderTableRow(c, 0))}
          </tbody>
        </table>
        ${this.multiple && this.values.length > 0 ? html`
          <div class="selection-count">
            ${this.values.length} selected
          </div>
        ` : nothing}
      `
    }

    const tree = this.filterTreeNodes(this.vocabData?.tree || [])
    if (tree.length === 0) {
      return html`<div class="empty">${this.filterText ? 'No matching concepts' : 'No hierarchy available'}</div>`
    }

    return html`
      ${this.renderSelectControls()}
      <table class="vocab-table">
        <thead>
          <tr>
            ${this.multiple ? html`<th class="cell-checkbox"></th>` : nothing}
            ${fields.map(field => html`<th>${this.getFieldLabel(field)}</th>`)}
          </tr>
        </thead>
        <tbody>
          ${tree.flatMap(node => this.renderTableTreeRows(node, 0))}
        </tbody>
      </table>
      ${this.multiple && this.values.length > 0 ? html`
        <div class="selection-count">
          ${this.values.length} selected
        </div>
      ` : nothing}
    `
  }

  private renderFlatItem(concept: VocabConcept): unknown {
    const isSelected = this.multiple
      ? this.values.includes(concept.iri)
      : this.value === concept.iri

    if (this.type === 'radio') {
      const inputName = `radio-${this.vocab || 'vocab'}`
      return html`
        <div class="radio-node">
          <label class="radio-item">
            <input
              type="radio"
              name=${inputName}
              .checked=${isSelected}
              @change=${() => this.selectRadio(concept.iri)}
            />
            ${concept.notation ? html`<span class="notation">${concept.notation}</span>` : nothing}
            <div class="item-content">
              <span class="label">${concept.label}</span>
              ${this.showDescription && concept.description ? html`
                <span class="description">${concept.description}</span>
              ` : nothing}
            </div>
          </label>
        </div>
      `
    }

    // Default: select type (tree-row style)
    return html`
      <li class="flat-item">
        <div
          class="tree-row ${this.showSelected && isSelected ? 'selected' : ''}"
          role="option"
          aria-selected=${isSelected}
          @click=${() => this.selectNode(concept.iri)}
        >
          ${this.multiple ? html`
            <input
              type="checkbox"
              class="checkbox"
              .checked=${isSelected}
              @click=${(e: Event) => { e.stopPropagation(); this.selectNode(concept.iri) }}
            >
          ` : nothing}
          ${concept.notation ? html`<span class="notation">${concept.notation}</span>` : nothing}
          <div class="item-content">
            <span class="label">${concept.label}</span>
            ${this.showDescription && concept.description ? html`
              <span class="description">${concept.description}</span>
            ` : nothing}
          </div>
        </div>
      </li>
    `
  }

  private renderFlatList() {
    const concepts = this.filteredConcepts

    if (concepts.length === 0) {
      return html`<div class="empty">${this.filterText ? 'No matching concepts' : 'No concepts available'}</div>`
    }

    if (this.type === 'radio') {
      return html`
        <div class="radio-group" role="radiogroup" aria-label=${this.vocabData?.label || 'Vocabulary selection'}>
          <div class="radio-level ${this.horizontal ? 'horizontal' : ''}">
            ${concepts.map(c => this.renderFlatItem(c))}
          </div>
        </div>
      `
    }

    return html`
      ${this.renderSelectControls()}
      <ul class="flat-list" role="listbox" aria-label=${this.vocabData?.label || 'Vocabulary list'}>
        ${concepts.map(c => this.renderFlatItem(c))}
      </ul>
      ${this.multiple && this.values.length > 0 ? html`
        <div class="selection-count">
          ${this.values.length} selected
        </div>
      ` : nothing}
    `
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

    // Dropdown type
    if (this.type === 'dropdown') {
      return this.renderDropdown()
    }

    // Radio type
    if (this.type === 'radio') {
      return html`
        ${this.search ? html`
          <div class="search">
            <input
              type="text"
              .value=${this.filterText}
              @input=${this.handleFilter}
              placeholder="Filter concepts..."
              aria-label="Filter concepts"
            />
          </div>
        ` : nothing}
        ${this.flat ? this.renderFlatList() : this.renderRadio()}
      `
    }

    // Table type
    if (this.type === 'table') {
      return html`
        ${this.search ? html`
          <div class="search">
            <input
              type="text"
              .value=${this.filterText}
              @input=${this.handleFilter}
              placeholder="Filter concepts..."
              aria-label="Filter concepts"
            />
          </div>
        ` : nothing}
        ${this.renderTable()}
      `
    }

    // Select type (default)
    return html`
      ${this.search ? html`
        <div class="search">
          <input
            type="text"
            .value=${this.filterText}
            @input=${this.handleFilter}
            placeholder="Filter concepts..."
            aria-label="Filter concepts"
          />
        </div>
      ` : nothing}
      ${this.flat ? this.renderFlatList() : this.renderTree()}
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'prez-list': PrezList
  }
}
