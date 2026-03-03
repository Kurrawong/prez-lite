/**
 * Profile-ordered property extraction from an N3 Store.
 *
 * Reads quads for a given subject and orders them according to a profile config.
 * Properties not in the profile appear at the end with order >= 1000.
 */

import type { Store, Quad } from 'n3'
import { getPredicateLabel, getPredicateDescription } from '~/utils/vocab-labels'

// ============================================================================
// Types
// ============================================================================

export interface EditableNestedProperty {
  predicate: string
  label: string
  values: EditableValue[]
}

export interface EditableValue {
  id: string
  type: 'literal' | 'iri' | 'blank-node'
  value: string
  language?: string
  datatype?: string
  nestedProperties?: EditableNestedProperty[]
}

export interface EditableProperty {
  predicate: string
  label: string
  description?: string
  order: number
  values: EditableValue[]
  fieldType: 'text' | 'textarea' | 'iri-picker' | 'date' | 'readonly'
  minCount?: number
  maxCount?: number
}

export interface ProfilePropertyOrder {
  path: string
  order: number
  propertyOrder?: ProfilePropertyOrder[]
  minCount?: number
  maxCount?: number
  allowedValues?: string[]
}

export interface ProfileConfig {
  conceptScheme: { propertyOrder: ProfilePropertyOrder[] }
  concept: { propertyOrder: ProfilePropertyOrder[] }
}

// ============================================================================
// Constants
// ============================================================================

const SKOS = 'http://www.w3.org/2004/02/skos/core#'
const RDF = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#'
const SDO = 'https://schema.org/'

const TEXTAREA_PREDICATES = new Set([
  `${SKOS}definition`,
  `${SKOS}scopeNote`,
  `${SKOS}historyNote`,
  `${SKOS}example`,
])

const IRI_PICKER_PREDICATES = new Set([
  `${SKOS}broader`,
  `${SKOS}narrower`,
  `${SKOS}related`,
])

const DATE_PREDICATES = new Set([
  `${SDO}dateCreated`,
  `${SDO}dateModified`,
])

const READONLY_PREDICATES = new Set([
  `${RDF}type`,
  `${SKOS}inScheme`,
  `${SKOS}topConceptOf`,
])

// ============================================================================
// Helpers
// ============================================================================

/** Fallback counter for newly added empty values */
let valueCounter = 0

function nextValueId(): string {
  return `ev-new-${++valueCounter}`
}

export function getFieldType(predicate: string): EditableProperty['fieldType'] {
  if (READONLY_PREDICATES.has(predicate)) return 'readonly'
  if (TEXTAREA_PREDICATES.has(predicate)) return 'textarea'
  if (IRI_PICKER_PREDICATES.has(predicate)) return 'iri-picker'
  if (DATE_PREDICATES.has(predicate)) return 'date'
  return 'text'
}

function quadToEditableValue(q: Quad): EditableValue {
  const obj = q.object
  if (obj.termType === 'Literal') {
    return {
      id: nextValueId(),
      type: 'literal' as const,
      value: obj.value,
      language: (obj as any).language || undefined,
      datatype: (obj as any).datatype?.value || undefined,
    }
  }
  return {
    id: nextValueId(),
    type: 'iri' as const,
    value: obj.value,
  }
}

function extractBlankNodeProperties(
  quads: Quad[],
  nestedOrder?: ProfilePropertyOrder[],
): EditableNestedProperty[] {
  const grouped = new Map<string, Quad[]>()
  for (const q of quads) {
    const pred = q.predicate.value
    if (!grouped.has(pred)) grouped.set(pred, [])
    grouped.get(pred)!.push(q)
  }

  const result: EditableNestedProperty[] = []
  const seen = new Set<string>()

  if (nestedOrder) {
    for (const po of nestedOrder) {
      const predQuads = grouped.get(po.path)
      if (predQuads) {
        result.push({
          predicate: po.path,
          label: getPredicateLabel(po.path),
          values: predQuads.map(quadToEditableValue),
        })
      }
      seen.add(po.path)
    }
  }

  for (const [pred, predQuads] of grouped) {
    if (seen.has(pred)) continue
    result.push({
      predicate: pred,
      label: getPredicateLabel(pred),
      values: predQuads.map(quadToEditableValue),
    })
  }

  return result
}

// ============================================================================
// Main function
// ============================================================================

/**
 * Extract quad values for a predicate as EditableValue[].
 * Handles literals, IRIs, and blank nodes with nested properties.
 */
export function quadValuesForPredicate(
  store: Store,
  subjectIri: string,
  predicateIri: string,
  nestedOrder?: ProfilePropertyOrder[],
): EditableValue[] {
  return (store.getQuads(subjectIri, predicateIri, null, null) as Quad[]).map((q: Quad, idx: number) => {
    const slotId = `ev-${subjectIri}|${predicateIri}|${idx}`
    const obj = q.object
    if (obj.termType === 'BlankNode') {
      const nestedQuads = store.getQuads(obj, null, null, null) as Quad[]
      return {
        id: slotId,
        type: 'blank-node' as const,
        value: obj.value,
        nestedProperties: extractBlankNodeProperties(nestedQuads, nestedOrder),
      }
    }
    if (obj.termType === 'Literal') {
      return {
        id: slotId,
        type: 'literal' as const,
        value: obj.value,
        language: (obj as any).language || undefined,
        datatype: (obj as any).datatype?.value || undefined,
      }
    }
    return {
      id: slotId,
      type: 'iri' as const,
      value: obj.value,
    }
  })
}

/**
 * Get properties for a subject, ordered by profile configuration.
 *
 * @param store - N3 Store to query
 * @param iri - Subject IRI
 * @param type - 'conceptScheme' or 'concept'
 * @param profileConfig - Profile configuration with property orders
 * @param populatedOnly - If true, skip properties with no values
 */
export function getPropertiesForSubject(
  store: Store,
  iri: string,
  type: 'conceptScheme' | 'concept',
  profileConfig: ProfileConfig | null,
  populatedOnly = false,
): EditableProperty[] {
  const propertyOrder = profileConfig?.[type]?.propertyOrder ?? []

  const quads = store.getQuads(iri, null, null, null) as Quad[]
  const predicateSet = new Set(quads.map((q: Quad) => q.predicate.value))

  const result: EditableProperty[] = []
  const seen = new Set<string>()

  for (const po of propertyOrder) {
    if (po.propertyOrder) {
      const values = quadValuesForPredicate(store, iri, po.path, po.propertyOrder)
      if (values.length > 0) {
        result.push({
          predicate: po.path,
          label: getPredicateLabel(po.path),
          description: getPredicateDescription(po.path),
          order: po.order,
          values,
          fieldType: 'readonly',
        })
      }
      seen.add(po.path)
      continue
    }

    const values = quadValuesForPredicate(store, iri, po.path)

    if (populatedOnly && values.length === 0) {
      seen.add(po.path)
      continue
    }

    result.push({
      predicate: po.path,
      label: getPredicateLabel(po.path),
      description: getPredicateDescription(po.path),
      order: po.order,
      values,
      fieldType: getFieldType(po.path),
      ...(po.minCount != null && { minCount: po.minCount }),
      ...(po.maxCount != null && { maxCount: po.maxCount }),
    })
    seen.add(po.path)
  }

  let extraOrder = 1000
  for (const pred of predicateSet) {
    if (seen.has(pred)) continue
    const values = quadValuesForPredicate(store, iri, pred)
    result.push({
      predicate: pred,
      label: getPredicateLabel(pred),
      description: getPredicateDescription(pred),
      order: extraOrder++,
      values,
      fieldType: getFieldType(pred),
    })
  }

  return result
}
