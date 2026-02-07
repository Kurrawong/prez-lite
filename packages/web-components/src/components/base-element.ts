import { LitElement, PropertyValues } from 'lit'
import { property, state } from 'lit/decorators.js'
import { fetchVocab, type VocabData, type VocabConcept } from '../utils/fetch-vocab.js'
import { resolveVocabUrl } from '../utils/base-url.js'

/**
 * Base class for vocabulary components
 * Handles common data loading and event dispatching
 */
export abstract class PrezVocabBase extends LitElement {
  /** Vocabulary slug name */
  @property({ type: String })
  vocab: string | null = null

  /** Direct URL to vocabulary JSON (overrides vocab + base-url) */
  @property({ type: String, attribute: 'vocab-url' })
  vocabUrl: string | null = null

  /** Base URL for vocab resolution */
  @property({ type: String, attribute: 'base-url' })
  baseUrl: string | null = null

  /** Disabled state */
  @property({ type: Boolean, reflect: true })
  disabled = false

  /** Language preference */
  @property({ type: String })
  lang = 'en'

  /** Loading state */
  @state()
  protected loading = false

  /** Error message */
  @state()
  protected error: string | null = null

  /** Loaded vocabulary data */
  @state()
  protected vocabData: VocabData | null = null

  /** Concept lookup map */
  @state()
  protected conceptMap: Map<string, VocabConcept> = new Map()

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties)

    // Reload data when vocab or vocab-url changes
    if (changedProperties.has('vocab') || changedProperties.has('vocabUrl') || changedProperties.has('baseUrl')) {
      this.loadVocab()
    }
  }

  protected async loadVocab(): Promise<void> {
    const url = resolveVocabUrl(this.vocab, this.vocabUrl, this.baseUrl)
    if (!url) {
      this.vocabData = null
      this.conceptMap = new Map()
      return
    }

    this.loading = true
    this.error = null

    try {
      this.vocabData = await fetchVocab(url)
      this.conceptMap = new Map(this.vocabData.concepts.map(c => [c.iri, c]))

      this.dispatchEvent(new CustomEvent('prez-load', {
        bubbles: true,
        composed: true,
        detail: {
          vocab: this.vocab,
          url,
          conceptCount: this.vocabData.concepts.length
        }
      }))
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Failed to load vocabulary'
      this.vocabData = null
      this.conceptMap = new Map()

      this.dispatchEvent(new CustomEvent('prez-error', {
        bubbles: true,
        composed: true,
        detail: {
          vocab: this.vocab,
          url,
          error: this.error
        }
      }))
    } finally {
      this.loading = false
    }
  }

  /** Emit change event */
  protected emitChange(value: string | string[]): void {
    this.dispatchEvent(new CustomEvent('prez-change', {
      bubbles: true,
      composed: true,
      detail: {
        value,
        vocab: this.vocab,
        concepts: Array.isArray(value)
          ? value.map(v => this.conceptMap.get(v)).filter(Boolean)
          : this.conceptMap.get(value) || null
      }
    }))
  }

  /** Emit expand/collapse event */
  protected emitExpand(iri: string, expanded: boolean): void {
    this.dispatchEvent(new CustomEvent('prez-expand', {
      bubbles: true,
      composed: true,
      detail: {
        iri,
        expanded,
        vocab: this.vocab
      }
    }))
  }

  /** Emit filter event */
  protected emitFilter(text: string): void {
    this.dispatchEvent(new CustomEvent('prez-filter', {
      bubbles: true,
      composed: true,
      detail: {
        text,
        vocab: this.vocab
      }
    }))
  }

  /** Get label for a concept IRI */
  protected getConceptLabel(iri: string): string {
    const concept = this.conceptMap.get(iri)
    return concept?.label || iri.split(/[#/]/).pop() || iri
  }
}
