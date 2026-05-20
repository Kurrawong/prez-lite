/**
 * IRI validation helpers used by the editor's widget dispatch, save-time
 * validation, and defensive serialisation passes.
 *
 * Kept as a leaf utility (no Vue / Nuxt imports) so it can be tested
 * directly without a Nuxt environment.
 */

import { Store, type Quad } from 'n3'

/** SHACL constant for IRI-only node values */
export const SH_IRI = 'http://www.w3.org/ns/shacl#IRI'

/**
 * Bare scheme prefixes the iri-input widget seeds new values with. Treated
 * as "not yet finished typing" — neither saved nor serialised.
 */
const BARE_SCHEME_SEEDS = new Set(['https://', 'http://', 'urn:'])

/** Subset of `ProfilePropertyOrder` this module needs to read */
export interface IriShapeHints {
  class?: string
  nodeKind?: string
}

/**
 * True if the property shape declares its value must be an IRI.
 * `sh:nodeKind sh:IRI` or any `sh:class` (which implies a typed IRI value).
 */
export function isIriValued(po: IriShapeHints): boolean {
  if (po.nodeKind === SH_IRI) return true
  if (po.class) return true
  return false
}

/**
 * Loose IRI validity check used for save-time validation and defensive
 * serialisation. Accepts anything that looks like `scheme:opaque-part`
 * (where opaque-part has no whitespace and is non-empty after the colon).
 *
 * Bare scheme prefixes that the iri-input widget seeds (`https://`,
 * `http://`, `urn:`) are rejected as "incomplete" — the user must finish
 * typing the IRI before save.
 */
export function isValidIri(value: string | undefined | null): boolean {
  if (!value) return false
  const v = value.trim()
  if (!v) return false
  if (BARE_SCHEME_SEEDS.has(v)) return false
  return /^[a-zA-Z][a-zA-Z0-9+.\-]*:[^\s]+$/.test(v)
}

/**
 * Defensive: remove any quad whose object is an empty / non-IRI NamedNode
 * (or N3's DefaultGraph-typed placeholder for `namedNode('')`). Used right
 * before serialising to TTL so we never emit broken `<>` syntax for
 * incomplete iri-input values (#29).
 *
 * Mutates the passed store. Returns the number of quads removed.
 */
export function pruneInvalidIriQuads(store: Store): number {
  const invalid = (store.getQuads(null, null, null, null) as Quad[]).filter(q => {
    const obj = q.object
    // Empty value on anything non-literal/non-blank is broken (N3 normalises
    // namedNode('') to a DefaultGraph-typed term with empty value).
    if (obj.termType !== 'Literal' && obj.termType !== 'BlankNode' && !obj.value) {
      return true
    }
    // NamedNode whose value doesn't look like an IRI
    if (obj.termType === 'NamedNode' && !isValidIri(obj.value)) {
      return true
    }
    return false
  })
  if (invalid.length) {
    store.removeQuads(invalid)
  }
  return invalid.length
}
