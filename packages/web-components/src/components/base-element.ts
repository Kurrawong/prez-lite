import { LitElement, PropertyValues } from 'lit'
import { property, state } from 'lit/decorators.js'
import { fetchVocab, type VocabData, type VocabConcept } from '../utils/fetch-vocab.js'
import { resolveVocabUrl } from '../utils/base-url.js'
import {
  fetchTopConcepts,
  fetchNarrowerConcepts,
  fetchSchemeMetadata,
  type SparqlConfig,
  type SparqlTreeNode
} from '../utils/sparql-fetch.js'

/** Parse a comma-separated prefixed predicate string into full IRIs */
function parsePredicates(value: string): string[] {
  const prefixMap: Record<string, string> = {
    'skos:': 'http://www.w3.org/2004/02/skos/core#',
    'dcterms:': 'http://purl.org/dc/terms/',
    'rdfs:': 'http://www.w3.org/2000/01/rdf-schema#',
    'rdf:': 'http://www.w3.org/1999/02/22-rdf-syntax-ns#'
  }

  return value.split(',').map(s => {
    const trimmed = s.trim()
    for (const [prefix, ns] of Object.entries(prefixMap)) {
      if (trimmed.startsWith(prefix)) {
        return ns + trimmed.slice(prefix.length)
      }
    }
    // Already a full IRI or unknown prefix — return as-is
    return trimmed
  })
}

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

  /** SPARQL endpoint URL — enables dynamic SPARQL mode */
  @property({ type: String, attribute: 'sparql-endpoint' })
  sparqlEndpoint: string | null = null

  /** ConceptScheme IRI (required in SPARQL mode) */
  @property({ type: String, attribute: 'vocab-iri' })
  vocabIri: string | null = null

  /** Named graph to query within (optional, SPARQL mode) */
  @property({ type: String, attribute: 'named-graph' })
  namedGraph: string | null = null

  /** Request timeout in milliseconds (SPARQL mode) */
  @property({ type: Number })
  timeout = 10000

  /** Comma-separated label predicates for SPARQL resolution (default: skos:prefLabel,dcterms:title,rdfs:label) */
  @property({ type: String, attribute: 'label-predicates' })
  labelPredicates: string | null = null

  /** Comma-separated description predicates for SPARQL resolution (default: skos:definition,dcterms:description) */
  @property({ type: String, attribute: 'description-predicates' })
  descriptionPredicates: string | null = null

  /** Disabled state */
  @property({ type: Boolean, reflect: true })
  disabled = false

  /** Language preference */
  @property({ type: String })
  lang = 'en'

  /** Theme preference: 'light', 'dark', or 'auto' (default: 'auto' uses system preference) */
  @property({ type: String, reflect: true })
  theme: 'light' | 'dark' | 'auto' = 'auto'

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

  /** Whether SPARQL mode is active */
  protected get sparqlMode(): boolean {
    return !!this.sparqlEndpoint
  }

  /** Build SparqlConfig from current properties */
  protected get sparqlConfig(): SparqlConfig | null {
    if (!this.sparqlEndpoint || !this.vocabIri) return null
    return {
      endpoint: this.sparqlEndpoint,
      schemeIri: this.vocabIri,
      namedGraph: this.namedGraph ?? undefined,
      timeout: this.timeout,
      labelPredicates: this.labelPredicates ? parsePredicates(this.labelPredicates) : undefined,
      descriptionPredicates: this.descriptionPredicates ? parsePredicates(this.descriptionPredicates) : undefined
    }
  }

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties)

    // Reload data when source properties change
    if (
      changedProperties.has('vocab') ||
      changedProperties.has('vocabUrl') ||
      changedProperties.has('baseUrl') ||
      changedProperties.has('sparqlEndpoint') ||
      changedProperties.has('vocabIri')
    ) {
      this.loadVocab()
    }
  }

  protected async loadVocab(): Promise<void> {
    if (this.sparqlMode) {
      return this.loadVocabFromSparql()
    }

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

  /** Load vocabulary from a SPARQL endpoint */
  private async loadVocabFromSparql(): Promise<void> {
    const config = this.sparqlConfig
    if (!config) {
      this.vocabData = null
      this.conceptMap = new Map()
      return
    }

    this.loading = true
    this.error = null

    try {
      const [metadata, topConcepts] = await Promise.all([
        fetchSchemeMetadata(config),
        fetchTopConcepts(config)
      ])

      // Build VocabData from SPARQL results
      const concepts = topConcepts.map(node => ({
        iri: node.iri,
        label: node.label,
        notation: node.notation,
        description: node.description
      }))

      this.vocabData = {
        iri: config.schemeIri,
        label: metadata.label,
        description: metadata.description,
        concepts,
        tree: topConcepts
      }

      this.conceptMap = new Map(concepts.map(c => [c.iri, c]))

      this.dispatchEvent(new CustomEvent('prez-load', {
        bubbles: true,
        composed: true,
        detail: {
          vocab: this.vocabIri,
          url: config.endpoint,
          conceptCount: concepts.length
        }
      }))
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Failed to query SPARQL endpoint'
      this.vocabData = null
      this.conceptMap = new Map()

      this.dispatchEvent(new CustomEvent('prez-error', {
        bubbles: true,
        composed: true,
        detail: {
          vocab: this.vocabIri,
          url: config.endpoint,
          error: this.error
        }
      }))
    } finally {
      this.loading = false
    }
  }

  /** Lazily load children for a SPARQL tree node */
  protected async loadChildren(parentIri: string): Promise<void> {
    const config = this.sparqlConfig
    if (!config || !this.vocabData) return

    // Find the node in the tree and mark it loading
    const node = this.findTreeNode(parentIri, this.vocabData.tree)
    if (!node) return

    const sparqlNode = node as SparqlTreeNode
    if (sparqlNode.childrenLoaded) return

    sparqlNode.loading = true
    this.requestUpdate()

    try {
      const children = await fetchNarrowerConcepts(config, parentIri)
      sparqlNode.children = children
      sparqlNode.childrenLoaded = true

      // Add children to concepts list and conceptMap
      for (const child of children) {
        if (!this.conceptMap.has(child.iri)) {
          const concept: VocabConcept = {
            iri: child.iri,
            label: child.label,
            notation: child.notation,
            description: child.description,
            broader: [parentIri]
          }
          this.vocabData.concepts.push(concept)
          this.conceptMap.set(child.iri, concept)
        }
      }
    } catch (err) {
      sparqlNode.childrenLoaded = false
      const message = err instanceof Error ? err.message : 'Failed to load children'
      this.dispatchEvent(new CustomEvent('prez-error', {
        bubbles: true,
        composed: true,
        detail: { iri: parentIri, error: message }
      }))
    } finally {
      sparqlNode.loading = false
      this.requestUpdate()
    }
  }

  /** Recursively find a tree node by IRI */
  private findTreeNode(iri: string, nodes: import('../utils/fetch-vocab.js').VocabTreeNode[]): import('../utils/fetch-vocab.js').VocabTreeNode | null {
    for (const node of nodes) {
      if (node.iri === iri) return node
      if (node.children.length > 0) {
        const found = this.findTreeNode(iri, node.children)
        if (found) return found
      }
    }
    return null
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
