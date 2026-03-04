/**
 * Shared simple/expert view mode filtering.
 *
 * When profile data includes `simpleView` annotations, those drive filtering.
 * Otherwise falls back to the legacy hardcoded predicate set for backwards compat.
 */

/** Legacy hardcoded set of predicates hidden in simple view mode */
export const LEGACY_SIMPLE_HIDDEN = new Set([
  'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
  'http://www.w3.org/2004/02/skos/core#inScheme',
  'http://www.w3.org/2004/02/skos/core#topConceptOf',
  'http://www.w3.org/2004/02/skos/core#hasTopConcept',
  'http://www.w3.org/2004/02/skos/core#narrower',
  'http://www.w3.org/2004/02/skos/core#broader',
])

/**
 * Filter properties for simple view mode.
 *
 * If any property has `simpleView: true`, use profile-driven filtering
 * (keep only those with the flag). Otherwise fall back to the legacy
 * hardcoded hidden set.
 */
export function filterForSimpleView<T extends { predicate: string; simpleView?: boolean }>(
  properties: T[],
): T[] {
  if (properties.some(p => p.simpleView === true)) {
    return properties.filter(p => p.simpleView === true)
  }
  return properties.filter(p => !LEGACY_SIMPLE_HIDDEN.has(p.predicate))
}
