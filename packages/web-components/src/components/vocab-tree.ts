import { html, css, nothing } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { PrezVocabBase } from './base-element.js'
import type { VocabTreeNode } from '../utils/fetch-vocab.js'

/**
 * <prez-vocab-tree>
 *
 * A hierarchical tree view component for vocabulary concepts.
 *
 * @fires prez-change - When selection changes. Detail: { value, vocab, concepts }
 * @fires prez-load - When vocabulary loads. Detail: { vocab, url, conceptCount }
 * @fires prez-error - When loading fails. Detail: { vocab, url, error }
 */
@customElement('prez-vocab-tree')
export class PrezVocabTree extends PrezVocabBase {
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

    .tree {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .tree-item {
      padding: 0.125rem 0;
    }

    .tree-row {
      display: flex;
      align-items: center;
      gap: 0.25rem;
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
      background: none;
      cursor: pointer;
      color: #6b7280;
      padding: 0;
      flex-shrink: 0;
    }

    .expand-btn:hover {
      color: #374151;
    }

    .expand-placeholder {
      width: 1.25rem;
      height: 1.25rem;
      flex-shrink: 0;
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
  `

  /** Expand all nodes by default */
  @property({ type: Boolean, attribute: 'expand-all' })
  expandAll = false

  /** Expand to this level (0 = collapsed, 1 = top level, etc.) */
  @property({ type: Number, attribute: 'expand-level' })
  expandLevel = 1

  /** Allow node selection */
  @property({ type: Boolean })
  selectable = true

  /** Show child count for nodes with children */
  @property({ type: Boolean, attribute: 'show-count' })
  showCount = false

  /** Currently selected value */
  @property({ type: String })
  value: string | null = null

  /** Expanded node IRIs */
  @state()
  private expandedNodes: Set<string> = new Set()

  protected updated(changedProperties: Map<PropertyKey, unknown>): void {
    super.updated(changedProperties)

    // Initialize expanded state when data loads
    if (changedProperties.has('vocabData') && this.vocabData) {
      this.initializeExpanded()
    }
  }

  private initializeExpanded(): void {
    if (!this.vocabData?.tree) return

    if (this.expandAll) {
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
    } else if (this.expandLevel > 0) {
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
      expandToLevel(this.vocabData.tree, this.expandLevel)
      this.expandedNodes = expanded
    }
  }

  private toggleExpand(iri: string, e: Event): void {
    e.stopPropagation()
    const newExpanded = new Set(this.expandedNodes)
    if (newExpanded.has(iri)) {
      newExpanded.delete(iri)
    } else {
      newExpanded.add(iri)
    }
    this.expandedNodes = newExpanded
  }

  private selectNode(iri: string): void {
    if (!this.selectable) return
    this.value = iri
    this.emitChange(iri)
  }

  private countDescendants(node: VocabTreeNode): number {
    let count = node.children.length
    for (const child of node.children) {
      count += this.countDescendants(child)
    }
    return count
  }

  private renderNode(node: VocabTreeNode): unknown {
    const hasChildren = node.children.length > 0
    const isExpanded = this.expandedNodes.has(node.iri)
    const isSelected = this.value === node.iri

    return html`
      <li class="tree-item">
        <div
          class="tree-row ${isSelected ? 'selected' : ''}"
          @click=${() => this.selectNode(node.iri)}
        >
          ${hasChildren ? html`
            <button
              class="expand-btn"
              @click=${(e: Event) => this.toggleExpand(node.iri, e)}
              aria-expanded=${isExpanded}
              aria-label=${isExpanded ? 'Collapse' : 'Expand'}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                ${isExpanded
                  ? html`<path d="M2 4l4 4 4-4z"/>`
                  : html`<path d="M4 2l4 4-4 4z"/>`
                }
              </svg>
            </button>
          ` : html`<span class="expand-placeholder"></span>`}
          ${node.notation ? html`<span class="notation">${node.notation}</span>` : nothing}
          <span class="label">${node.label}</span>
          ${this.showCount && hasChildren ? html`
            <span class="count">(${this.countDescendants(node)})</span>
          ` : nothing}
        </div>
        ${hasChildren && isExpanded ? html`
          <ul class="children">
            ${node.children.map(child => this.renderNode(child))}
          </ul>
        ` : nothing}
      </li>
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

    const tree = this.vocabData.tree
    if (!tree || tree.length === 0) {
      return html`<div class="empty">No hierarchy available</div>`
    }

    return html`
      <ul class="tree" role="tree" aria-label=${this.vocabData.label || 'Vocabulary tree'}>
        ${tree.map(node => this.renderNode(node))}
      </ul>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'prez-vocab-tree': PrezVocabTree
  }
}
