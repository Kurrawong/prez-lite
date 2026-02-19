/**
 * useEditMode composable
 *
 * Manages structured editing of a SKOS vocabulary via an N3.Store.
 * The Store is the single source of truth during editing.
 * Saves back to GitHub via useGitHubFile.
 *
 * Supports per-subject atomic saves with minimal TTL diffs via subject-block patching.
 */

import { Store, Parser, Writer, DataFactory, type Quad } from 'n3'
import { getPredicateLabel, getPredicateDescription } from '~/utils/vocab-labels'
import {
  extractPrefixes,
  parseSubjectBlocks,
  serializeSubjectBlock,
  patchTTL,
  computeQuadDiff,
  getModifiedSubjects,
  buildChangeSummary,
  quadKey,
  type ParsedTTL,
} from '~/utils/ttl-patch'
import type { TreeItem } from '~/composables/useScheme'

const { namedNode, literal, defaultGraph } = DataFactory

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

export interface ConceptSummary {
  iri: string
  prefLabel: string
  broader: string[]
}

export interface ChangeSummary {
  subjects: SubjectChange[]
  totalAdded: number
  totalRemoved: number
  totalModified: number
}

export interface SubjectChange {
  subjectIri: string
  subjectLabel: string
  type: 'added' | 'removed' | 'modified'
  propertyChanges: PropertyChange[]
}

export interface PropertyChange {
  predicateIri: string
  predicateLabel: string
  type: 'added' | 'removed' | 'modified'
  oldValues?: string[]
  newValues?: string[]
}

export interface HistoryEntry {
  label: string
  removed: Quad[]
  added: Quad[]
  timestamp: number
}

interface ProfilePropertyOrder {
  path: string
  order: number
  propertyOrder?: ProfilePropertyOrder[]
  minCount?: number
  maxCount?: number
}

interface ProfileConfig {
  conceptScheme: { propertyOrder: ProfilePropertyOrder[] }
  concept: { propertyOrder: ProfilePropertyOrder[] }
}

// ============================================================================
// Constants
// ============================================================================

const SKOS = 'http://www.w3.org/2004/02/skos/core#'
const RDF = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#'
const XSD = 'http://www.w3.org/2001/XMLSchema#'
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

function getFieldType(predicate: string): EditableProperty['fieldType'] {
  if (READONLY_PREDICATES.has(predicate)) return 'readonly'
  if (TEXTAREA_PREDICATES.has(predicate)) return 'textarea'
  if (IRI_PICKER_PREDICATES.has(predicate)) return 'iri-picker'
  if (DATE_PREDICATES.has(predicate)) return 'date'
  return 'text'
}

/** Fallback counter for newly added empty values */
let valueCounter = 0
function nextValueId(): string {
  return `ev-new-${++valueCounter}`
}

// ============================================================================
// Composable
// ============================================================================

export function useEditMode(
  owner: string,
  repo: string,
  vocabPath: Ref<string>,
  branch: string,
  schemeIri: Ref<string>,
) {
  // Core state
  const store = shallowRef<Store | null>(null)
  const storeVersion = ref(0)
  const profileConfig = ref<ProfileConfig | null>(null)
  const originalPrefixes = ref<Record<string, string>>({})
  const originalTTL = ref('')

  // Diff-tracking state
  const originalStore = shallowRef<Store | null>(null)
  const originalParsedTTL = shallowRef<ParsedTTL | null>(null)

  // UI state
  const isEditMode = ref(false)
  const isDirty = ref(false)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const selectedConceptIri = ref<string | null>(null)
  const saveStatus = ref<'idle' | 'saving' | 'success' | 'error'>('idle')

  // GitHub file (created lazily based on vocabPath)
  let githubFile: ReturnType<typeof useGitHubFile> | null = null

  function getGitHubFile() {
    if (!githubFile) {
      githubFile = useGitHubFile(owner, repo, vocabPath.value, branch)
    }
    return githubFile
  }

  // ---- History (undo/redo) ----

  const undoStack = ref<HistoryEntry[]>([])
  const redoStack = ref<HistoryEntry[]>([])
  const MAX_HISTORY = 50
  const canUndo = computed(() => undoStack.value.length > 0)
  const canRedo = computed(() => redoStack.value.length > 0)

  // ---- Store mutation helpers ----

  function bumpVersion() {
    storeVersion.value++
    isDirty.value = true
  }

  /** Wrap a mutation to capture quad delta for undo/redo. */
  function recordMutation(label: string, fn: () => void) {
    if (!store.value) return
    const beforeKeys = new Map(
      (store.value.getQuads(null, null, null, null) as Quad[]).map(q => [quadKey(q), q]),
    )
    fn()
    const afterQuads = store.value.getQuads(null, null, null, null) as Quad[]
    const afterKeys = new Set(afterQuads.map(quadKey))

    const removed = [...beforeKeys.entries()].filter(([k]) => !afterKeys.has(k)).map(([, q]) => q)
    const added = afterQuads.filter(q => !beforeKeys.has(quadKey(q)))

    if (removed.length === 0 && added.length === 0) return
    undoStack.value = [...undoStack.value, { label, removed, added, timestamp: Date.now() }].slice(-MAX_HISTORY)
    redoStack.value = []
    bumpVersion()
  }

  // ---- Clone a store (for originalStore snapshot) ----

  function cloneStore(src: Store): Store {
    const dst = new Store()
    dst.addQuads(src.getQuads(null, null, null, null))
    return dst
  }

  // ---- Enter / Exit ----

  async function enterEditMode() {
    if (isEditMode.value) return
    loading.value = true
    error.value = null

    try {
      // Load TTL from GitHub
      const ghFile = getGitHubFile()
      await ghFile.load()

      if (ghFile.error.value) {
        error.value = ghFile.error.value
        return
      }

      const ttl = ghFile.content.value
      originalTTL.value = ttl
      originalPrefixes.value = extractPrefixes(ttl)

      // Parse into N3 Store
      const parser = new Parser({ format: 'Turtle' })
      const newStore = new Store()
      newStore.addQuads(parser.parse(ttl))
      store.value = newStore
      storeVersion.value = 0
      isDirty.value = false

      // Snapshot for diff tracking
      originalStore.value = cloneStore(newStore)
      originalParsedTTL.value = parseSubjectBlocks(ttl, newStore, originalPrefixes.value)
      console.debug('[useEditMode] Parsed TTL:',
        originalParsedTTL.value.subjectBlocks.length, 'subject blocks,',
        'prefixBlock length:', originalParsedTTL.value.prefixBlock.length,
        'prefixes:', Object.keys(originalPrefixes.value).join(', '))

      // Load profile config
      if (!profileConfig.value) {
        try {
          const resp = await fetch('/export/system/profile.json')
          profileConfig.value = await resp.json()
        } catch {
          // Non-fatal: forms still work without ordering
        }
      }

      isEditMode.value = true
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to enter edit mode'
    } finally {
      loading.value = false
    }
  }

  function exitEditMode(force = false) {
    if (isDirty.value && !force) {
      if (!confirm('You have unsaved changes. Discard them?')) return false
    }
    isEditMode.value = false
    store.value = null
    originalStore.value = null
    originalParsedTTL.value = null
    isDirty.value = false
    selectedConceptIri.value = null
    error.value = null
    saveStatus.value = 'idle'
    clearHistory()
    // Reset GitHub file so it reloads fresh next time
    githubFile = null
    return true
  }

  // ---- Property reading ----

  function getPropertiesForSubject(
    iri: string,
    type: 'conceptScheme' | 'concept',
    populatedOnly = false,
  ): EditableProperty[] {
    // Force dependency on storeVersion for reactivity
    void storeVersion.value
    if (!store.value) return []

    const propertyOrder = profileConfig.value?.[type]?.propertyOrder ?? []

    // Gather all predicates for this subject
    const quads = store.value.getQuads(iri, null, null, null) as Quad[]
    const predicateSet = new Set(quads.map((q: Quad) => q.predicate.value))

    // Build properties in profile order first
    const result: EditableProperty[] = []
    const seen = new Set<string>()

    for (const po of propertyOrder) {
      // Nested property orders (e.g. prov:qualifiedAttribution) — extract blank node children, shown readonly
      if (po.propertyOrder) {
        const values = quadValuesForPredicate(iri, po.path, po.propertyOrder)
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

      const values = quadValuesForPredicate(iri, po.path)

      // In populatedOnly mode, skip properties with no values
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

    // Add any predicates not in profile (at end)
    let extraOrder = 1000
    for (const pred of predicateSet) {
      if (seen.has(pred)) continue
      const values = quadValuesForPredicate(iri, pred)
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

  function quadValuesForPredicate(
    subjectIri: string,
    predicateIri: string,
    nestedOrder?: ProfilePropertyOrder[],
  ): EditableValue[] {
    if (!store.value) return []
    return (store.value.getQuads(subjectIri, predicateIri, null, null) as Quad[]).map((q: Quad, idx: number) => {
      const slotId = `ev-${subjectIri}|${predicateIri}|${idx}`
      const obj = q.object
      if (obj.termType === 'BlankNode') {
        const nestedQuads = store.value!.getQuads(obj, null, null, null) as Quad[]
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

  function extractBlankNodeProperties(
    quads: Quad[],
    nestedOrder?: ProfilePropertyOrder[],
  ): EditableNestedProperty[] {
    // Group quads by predicate
    const grouped = new Map<string, Quad[]>()
    for (const q of quads) {
      const pred = q.predicate.value
      if (!grouped.has(pred)) grouped.set(pred, [])
      grouped.get(pred)!.push(q)
    }

    const result: EditableNestedProperty[] = []
    const seen = new Set<string>()

    // Add in profile order first
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

    // Add remaining predicates
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

  /** Used for nested blank node properties (readonly) — stable IDs not needed */
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

  // ---- Mutations ----

  function updateValue(subjectIri: string, predicateIri: string, oldValue: EditableValue, newValue: string) {
    recordMutation(`Update ${getPredicateLabel(predicateIri)}`, () => {
      if (!store.value) return
      const s = namedNode(subjectIri)
      const p = namedNode(predicateIri)

      // Remove old quad
      const oldObj = oldValue.type === 'iri'
        ? namedNode(oldValue.value)
        : oldValue.language
          ? literal(oldValue.value, oldValue.language)
          : oldValue.datatype
            ? literal(oldValue.value, namedNode(oldValue.datatype))
            : literal(oldValue.value)
      store.value.removeQuad(s, p, oldObj, defaultGraph())

      // Add new quad
      const newObj = oldValue.type === 'iri'
        ? namedNode(newValue)
        : oldValue.language
          ? literal(newValue, oldValue.language)
          : oldValue.datatype
            ? literal(newValue, namedNode(oldValue.datatype))
            : literal(newValue)
      store.value.addQuad(s, p, newObj, defaultGraph())
    })
  }

  function updateValueLanguage(subjectIri: string, predicateIri: string, oldValue: EditableValue, newLang: string) {
    recordMutation(`Update ${getPredicateLabel(predicateIri)} language`, () => {
      if (!store.value) return
      const s = namedNode(subjectIri)
      const p = namedNode(predicateIri)

      // Remove old quad
      const oldObj = oldValue.language
        ? literal(oldValue.value, oldValue.language)
        : oldValue.datatype
          ? literal(oldValue.value, namedNode(oldValue.datatype))
          : literal(oldValue.value)
      store.value.removeQuad(s, p, oldObj, defaultGraph())

      // Add new quad with new language
      const newObj = newLang ? literal(oldValue.value, newLang) : literal(oldValue.value)
      store.value.addQuad(s, p, newObj, defaultGraph())
    })
  }

  function addValue(subjectIri: string, predicateIri: string, type: 'literal' | 'iri' = 'literal') {
    if (type === 'iri') {
      // Don't add empty IRI — caller should use iri-picker
      return
    }
    recordMutation(`Add ${getPredicateLabel(predicateIri)}`, () => {
      if (!store.value) return
      const s = namedNode(subjectIri)
      const p = namedNode(predicateIri)
      store.value.addQuad(s, p, literal(''), defaultGraph())
    })
  }

  function removeValue(subjectIri: string, predicateIri: string, val: EditableValue) {
    recordMutation(`Remove ${getPredicateLabel(predicateIri)}`, () => {
      if (!store.value) return
      const s = namedNode(subjectIri)
      const p = namedNode(predicateIri)

      const obj = val.type === 'iri'
        ? namedNode(val.value)
        : val.language
          ? literal(val.value, val.language)
          : val.datatype
            ? literal(val.value, namedNode(val.datatype))
            : literal(val.value)
      store.value.removeQuad(s, p, obj, defaultGraph())
    })
  }

  // ---- Broader/Narrower sync ----

  function syncBroaderNarrower(conceptIri: string, newBroaderIris: string[], oldBroaderIris: string[]) {
    recordMutation('Update broader', () => {
      if (!store.value) return
      const s = namedNode(conceptIri)
      const schemeNode = namedNode(schemeIri.value)

      // Remove old broader quads and their inverse narrower
      for (const oldB of oldBroaderIris) {
        store.value.removeQuad(s, namedNode(`${SKOS}broader`), namedNode(oldB), defaultGraph())
        store.value.removeQuad(namedNode(oldB), namedNode(`${SKOS}narrower`), s, defaultGraph())
      }

      // Add new broader quads and their inverse narrower
      for (const newB of newBroaderIris) {
        store.value.addQuad(s, namedNode(`${SKOS}broader`), namedNode(newB), defaultGraph())
        store.value.addQuad(namedNode(newB), namedNode(`${SKOS}narrower`), s, defaultGraph())
      }

      // Manage topConceptOf/hasTopConcept
      if (newBroaderIris.length === 0) {
        if (!store.value.getQuads(conceptIri, `${SKOS}topConceptOf`, schemeIri.value, null).length) {
          store.value.addQuad(s, namedNode(`${SKOS}topConceptOf`), schemeNode, defaultGraph())
        }
        if (!store.value.getQuads(schemeIri.value, `${SKOS}hasTopConcept`, conceptIri, null).length) {
          store.value.addQuad(schemeNode, namedNode(`${SKOS}hasTopConcept`), s, defaultGraph())
        }
      } else {
        store.value.removeQuads(store.value.getQuads(conceptIri, `${SKOS}topConceptOf`, schemeIri.value, null))
        store.value.removeQuads(store.value.getQuads(schemeIri.value, `${SKOS}hasTopConcept`, conceptIri, null))
      }
    })
  }

  function syncRelated(conceptIri: string, newRelatedIris: string[], oldRelatedIris: string[]) {
    recordMutation('Update related', () => {
      if (!store.value) return
      const s = namedNode(conceptIri)

      // Remove old related quads (both directions)
      for (const oldR of oldRelatedIris) {
        store.value.removeQuad(s, namedNode(`${SKOS}related`), namedNode(oldR), defaultGraph())
        store.value.removeQuad(namedNode(oldR), namedNode(`${SKOS}related`), s, defaultGraph())
      }

      // Add new related quads (both directions)
      for (const newR of newRelatedIris) {
        store.value.addQuad(s, namedNode(`${SKOS}related`), namedNode(newR), defaultGraph())
        store.value.addQuad(namedNode(newR), namedNode(`${SKOS}related`), s, defaultGraph())
      }
    })
  }

  // ---- Subject rename ----

  function renameSubject(oldIri: string, newIri: string) {
    if (oldIri === newIri) return
    recordMutation('Rename subject', () => {
      if (!store.value) return
      const oldNode = namedNode(oldIri)
      const newNode = namedNode(newIri)

      // Rewrite all quads where oldIri appears as subject
      const asSubject = store.value.getQuads(oldIri, null, null, null) as Quad[]
      for (const q of asSubject) {
        store.value.removeQuad(q)
        store.value.addQuad(newNode, q.predicate, q.object, q.graph)
      }

      // Rewrite all quads where oldIri appears as object
      const asObject = store.value.getQuads(null, null, oldNode, null) as Quad[]
      for (const q of asObject) {
        store.value.removeQuad(q)
        store.value.addQuad(q.subject, q.predicate, newNode, q.graph)
      }
    })
  }

  // ---- Concept CRUD ----

  function addConcept(localName: string, prefLabel: string, broaderIri?: string) {
    if (!store.value) return null

    // Derive namespace from scheme IRI
    const base = schemeIri.value.endsWith('/') || schemeIri.value.endsWith('#')
      ? schemeIri.value
      : `${schemeIri.value}/`
    const conceptIri = `${base}${localName}`

    recordMutation(`Add concept "${prefLabel}"`, () => {
      if (!store.value) return
      const s = namedNode(conceptIri)
      const schemeNode = namedNode(schemeIri.value)

      store.value.addQuad(s, namedNode(`${RDF}type`), namedNode(`${SKOS}Concept`), defaultGraph())
      store.value.addQuad(s, namedNode(`${SKOS}prefLabel`), literal(prefLabel, 'en'), defaultGraph())
      store.value.addQuad(s, namedNode(`${SKOS}inScheme`), schemeNode, defaultGraph())

      if (broaderIri) {
        store.value.addQuad(s, namedNode(`${SKOS}broader`), namedNode(broaderIri), defaultGraph())
        store.value.addQuad(namedNode(broaderIri), namedNode(`${SKOS}narrower`), s, defaultGraph())
      } else {
        store.value.addQuad(s, namedNode(`${SKOS}topConceptOf`), schemeNode, defaultGraph())
        store.value.addQuad(schemeNode, namedNode(`${SKOS}hasTopConcept`), s, defaultGraph())
      }
    })

    return conceptIri
  }

  function deleteConcept(iri: string) {
    const label = resolveLabel(iri)
    recordMutation(`Delete concept "${label}"`, () => {
      if (!store.value) return

      // Get broader parents before deletion (to reparent children)
      const broaderIris = (store.value.getQuads(iri, `${SKOS}broader`, null, null) as Quad[]).map((q: Quad) => q.object.value)

      // Get children
      const childIris = (store.value.getQuads(iri, `${SKOS}narrower`, null, null) as Quad[]).map((q: Quad) => q.object.value)

      // Remove all quads where this concept is the subject
      store.value.removeQuads(store.value.getQuads(iri, null, null, null))

      // Remove all quads where this concept is the object
      store.value.removeQuads(store.value.getQuads(null, null, iri, null))

      // Reparent children to the deleted concept's broader (or make them top concepts)
      for (const childIri of childIris) {
        if (broaderIris.length > 0) {
          for (const parentIri of broaderIris) {
            store.value.addQuad(namedNode(childIri), namedNode(`${SKOS}broader`), namedNode(parentIri), defaultGraph())
            store.value.addQuad(namedNode(parentIri), namedNode(`${SKOS}narrower`), namedNode(childIri), defaultGraph())
          }
        } else {
          const schemeNode = namedNode(schemeIri.value)
          store.value.addQuad(namedNode(childIri), namedNode(`${SKOS}topConceptOf`), schemeNode, defaultGraph())
          store.value.addQuad(schemeNode, namedNode(`${SKOS}hasTopConcept`), namedNode(childIri), defaultGraph())
        }
      }
    })

    // Clear selection if deleted concept was selected (outside recordMutation for clarity)
    if (selectedConceptIri.value === iri) {
      selectedConceptIri.value = null
    }
  }

  // ---- Undo / Redo / Revert ----

  function recomputeDirty() {
    if (!store.value || !originalStore.value) { isDirty.value = false; return }
    const { added, removed } = computeQuadDiff(originalStore.value, store.value)
    isDirty.value = added.length > 0 || removed.length > 0
  }

  function undo() {
    if (!store.value || !undoStack.value.length) return
    const entry = undoStack.value[undoStack.value.length - 1]!
    undoStack.value = undoStack.value.slice(0, -1)
    for (const q of entry.added) store.value.removeQuad(q)
    for (const q of entry.removed) store.value.addQuad(q)
    redoStack.value = [...redoStack.value, entry]
    bumpVersion()
    recomputeDirty()
  }

  function redo() {
    if (!store.value || !redoStack.value.length) return
    const entry = redoStack.value[redoStack.value.length - 1]!
    redoStack.value = redoStack.value.slice(0, -1)
    for (const q of entry.removed) store.value.removeQuad(q)
    for (const q of entry.added) store.value.addQuad(q)
    undoStack.value = [...undoStack.value, entry]
    bumpVersion()
    recomputeDirty()
  }

  function revertSubject(subjectIri: string) {
    recordMutation(`Revert "${resolveLabel(subjectIri)}"`, () => {
      if (!store.value || !originalStore.value) return
      // Remove current quads for subject
      store.value.removeQuads(store.value.getQuads(subjectIri, null, null, null) as Quad[])
      // Restore original quads for subject
      store.value.addQuads(originalStore.value.getQuads(subjectIri, null, null, null) as Quad[])
      // Clean up inverse quads that differ from original
      const origAsObj = new Set(
        (originalStore.value.getQuads(null, null, subjectIri, null) as Quad[]).map(quadKey),
      )
      for (const q of store.value.getQuads(null, null, subjectIri, null) as Quad[]) {
        if (!origAsObj.has(quadKey(q))) store.value.removeQuad(q)
      }
      for (const q of originalStore.value.getQuads(null, null, subjectIri, null) as Quad[]) {
        if (!store.value.getQuads(q.subject, q.predicate, q.object, null).length) {
          store.value.addQuad(q)
        }
      }
    })
  }

  function clearHistory() {
    undoStack.value = []
    redoStack.value = []
  }

  // ---- Diff computation ----

  function computeDiff(): { added: Quad[]; removed: Quad[] } {
    if (!store.value || !originalStore.value) return { added: [], removed: [] }
    return computeQuadDiff(originalStore.value, store.value)
  }

  function getChangeSummary(): ChangeSummary {
    if (!store.value || !originalStore.value) {
      return { subjects: [], totalAdded: 0, totalRemoved: 0, totalModified: 0 }
    }
    return buildChangeSummary(originalStore.value, store.value, resolveLabel, getPredicateLabel)
  }

  function getChangesForSubject(iri: string): SubjectChange | null {
    const summary = getChangeSummary()
    return summary.subjects.find(s => s.subjectIri === iri) ?? null
  }

  // ---- Serialization ----

  function serializeToTTL(): string {
    if (!store.value) return ''

    const writer = new Writer({
      prefixes: originalPrefixes.value,
      format: 'Turtle',
    })

    // Write all quads
    for (const quad of store.value.getQuads(null, null, null, null)) {
      writer.addQuad(quad)
    }

    let result = ''
    writer.end((_error: Error | null, r: string) => { result = r })
    return result
  }

  /**
   * Serialize with minimal diffs using subject-block patching.
   * If subjectIri is given, patches only that block. Otherwise patches all modified blocks.
   */
  function serializeWithPatch(subjectIri?: string): string {
    if (!store.value || !originalParsedTTL.value) {
      console.warn('[useEditMode] serializeWithPatch falling back to serializeToTTL.',
        'store:', !!store.value,
        'originalParsedTTL:', !!originalParsedTTL.value)
      return serializeToTTL()
    }

    if (originalParsedTTL.value.subjectBlocks.length === 0) {
      console.warn('[useEditMode] originalParsedTTL has 0 subject blocks — patching will append instead of replace.')
    }

    const { added, removed } = computeDiff()
    const modifiedSubjects = subjectIri
      ? new Set([subjectIri])
      : getModifiedSubjects(added, removed)

    // Also include subjects affected indirectly (e.g. broader/narrower sync)
    if (!subjectIri) {
      // Re-compute to catch all
      const allModified = getModifiedSubjects(added, removed)
      for (const s of allModified) modifiedSubjects.add(s)
    }

    // Include deleted subjects (exist in original but have zero quads in current store).
    // This ensures renames are saved atomically: the new IRI is added and the old IRI is removed.
    const allModifiedFromDiff = getModifiedSubjects(added, removed)
    for (const sIri of allModifiedFromDiff) {
      if (store.value.getQuads(sIri, null, null, null).length === 0) {
        modifiedSubjects.add(sIri)
      }
    }

    const patches = new Map<string, string | null>()
    const newBlocks: string[] = []

    // Check which subjects are in the original parsed TTL
    const originalSubjectIris = new Set(
      originalParsedTTL.value.subjectBlocks.map(b => b.subjectIri),
    )

    for (const sIri of modifiedSubjects) {
      const hasQuads = store.value.getQuads(sIri, null, null, null).length > 0

      if (!hasQuads) {
        // Subject was deleted
        if (originalSubjectIris.has(sIri)) {
          patches.set(sIri, null)
        }
      } else if (originalSubjectIris.has(sIri)) {
        // Subject was modified — re-serialize its block
        patches.set(sIri, serializeSubjectBlock(store.value, sIri, originalPrefixes.value))
      } else {
        // New subject — append
        const block = serializeSubjectBlock(store.value, sIri, originalPrefixes.value)
        if (block) newBlocks.push(block)
      }
    }

    return patchTTL(originalParsedTTL.value, patches, newBlocks.length ? newBlocks : undefined)
  }

  // ---- Save ----

  /** Ensure commit message follows conventional commit format (type: description) */
  function ensureConventionalCommit(msg: string, fallback: string): string {
    const trimmed = msg.trim()
    if (!trimmed) return fallback
    // Already has a conventional type prefix (e.g. "fix:", "feat:", "chore:")
    if (/^[a-z]+(\(.+\))?!?:/.test(trimmed)) return trimmed
    return `chore: ${trimmed}`
  }

  async function save(commitMessage?: string) {
    if (!store.value) return false
    saveStatus.value = 'saving'
    error.value = null

    try {
      const ttl = serializeWithPatch()
      const ghFile = getGitHubFile()
      const msg = ensureConventionalCommit(commitMessage ?? '', 'chore: update vocabulary')
      const ok = await ghFile.save(ttl, msg)

      if (!ok) {
        error.value = ghFile.error.value
        saveStatus.value = 'error'
        return false
      }

      // Update originals after successful save
      refreshOriginals(ttl)
      isDirty.value = false
      clearHistory()
      saveStatus.value = 'success'
      setTimeout(() => { saveStatus.value = 'idle' }, 3000)
      return true
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to save'
      saveStatus.value = 'error'
      return false
    }
  }

  /**
   * Save changes for a single subject (atomic per-concept commit).
   * Only the subject's block is patched; all other blocks remain byte-identical.
   */
  async function saveSubject(iri: string, commitMessage?: string) {
    if (!store.value) return false
    saveStatus.value = 'saving'
    error.value = null

    try {
      const ttl = serializeWithPatch(iri)
      const ghFile = getGitHubFile()
      const label = resolveLabel(iri)
      const msg = ensureConventionalCommit(commitMessage ?? '', `chore: update ${label}`)
      const ok = await ghFile.save(ttl, msg)

      if (!ok) {
        error.value = ghFile.error.value
        saveStatus.value = 'error'
        return false
      }

      // Update originals after successful save
      refreshOriginals(ttl)
      clearHistory()

      // Check if there are still other dirty subjects
      const { added, removed } = computeDiff()
      isDirty.value = added.length > 0 || removed.length > 0

      saveStatus.value = 'success'
      setTimeout(() => { saveStatus.value = 'idle' }, 3000)
      return true
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to save'
      saveStatus.value = 'error'
      return false
    }
  }

  /** Refresh original store and parsed TTL after a successful save.
   *  Re-parses the saved TTL rather than cloning the current store,
   *  so unsaved changes for other subjects remain visible as dirty. */
  function refreshOriginals(savedTTL: string) {
    originalTTL.value = savedTTL
    originalPrefixes.value = extractPrefixes(savedTTL)
    const parser = new Parser({ format: 'Turtle' })
    const newOrigStore = new Store()
    newOrigStore.addQuads(parser.parse(savedTTL))
    originalStore.value = newOrigStore
    originalParsedTTL.value = parseSubjectBlocks(savedTTL, newOrigStore, originalPrefixes.value)
  }

  // ---- Computed properties (depend on storeVersion) ----

  const schemeProperties = computed<EditableProperty[]>(() => {
    void storeVersion.value
    if (!store.value || !schemeIri.value) return []
    return getPropertiesForSubject(schemeIri.value, 'conceptScheme')
  })

  const conceptProperties = computed<EditableProperty[]>(() => {
    void storeVersion.value
    if (!store.value || !selectedConceptIri.value) return []
    return getPropertiesForSubject(selectedConceptIri.value, 'concept')
  })

  const concepts = computed<ConceptSummary[]>(() => {
    void storeVersion.value
    if (!store.value) return []

    const conceptQuads = store.value.getQuads(null, `${RDF}type`, `${SKOS}Concept`, null) as Quad[]
    return conceptQuads.map((q: Quad) => {
      const iri: string = q.subject.value
      const labelQuads = store.value!.getQuads(iri, `${SKOS}prefLabel`, null, null) as Quad[]
      const prefLabel: string = labelQuads.length > 0 ? labelQuads[0]!.object.value : iri
      const broaderQuads = store.value!.getQuads(iri, `${SKOS}broader`, null, null) as Quad[]
      return {
        iri,
        prefLabel,
        broader: broaderQuads.map((bq: Quad) => bq.object.value as string),
      }
    }).sort((a: ConceptSummary, b: ConceptSummary) => a.prefLabel.localeCompare(b.prefLabel))
  })

  const treeItems = computed<TreeItem[]>(() => {
    void storeVersion.value
    if (!store.value || !concepts.value.length) return []

    const conceptMap = new Map(concepts.value.map(c => [c.iri, c]))

    // Build narrower map
    const narrowerMap = new Map<string, ConceptSummary[]>()
    for (const c of concepts.value) {
      for (const b of c.broader) {
        if (!narrowerMap.has(b)) narrowerMap.set(b, [])
        narrowerMap.get(b)!.push(c)
      }
    }

    // Find top concepts
    const hasParent = new Set(concepts.value.filter(c => c.broader.length > 0).map(c => c.iri))
    const topConcepts = concepts.value.filter(c => !hasParent.has(c.iri))

    function buildNode(concept: ConceptSummary, depth = 0): TreeItem {
      const children = narrowerMap.get(concept.iri) || []
      return {
        id: concept.iri,
        label: concept.prefLabel,
        icon: children.length > 0 ? 'i-heroicons-folder' : 'i-heroicons-document',
        defaultExpanded: depth === 0 && children.length < 10,
        children: children.length > 0
          ? children
            .sort((a, b) => a.prefLabel.localeCompare(b.prefLabel))
            .map(c => buildNode(c, depth + 1))
          : undefined,
      }
    }

    return topConcepts
      .sort((a, b) => a.prefLabel.localeCompare(b.prefLabel))
      .map(c => buildNode(c))
  })

  /** Resolve an IRI to its prefLabel from the store */
  /** Get the original and current TTL block for a single subject (for focused diffs).
   *  Both sides are serialized identically so only data changes appear in the diff. */
  function getSubjectDiffBlocks(iri: string): { original: string; current: string } {
    const original = originalStore.value
      ? (serializeSubjectBlock(originalStore.value, iri, originalPrefixes.value) ?? '').trim()
      : ''
    const current = store.value
      ? (serializeSubjectBlock(store.value, iri, originalPrefixes.value) ?? '').trim()
      : ''
    return { original, current }
  }

  function resolveLabel(iri: string): string {
    void storeVersion.value
    if (!store.value) return iri
    const quads = store.value.getQuads(iri, `${SKOS}prefLabel`, null, null)
    if (quads.length > 0) return quads[0].object.value
    // Fallback: local name
    const hashIdx = iri.lastIndexOf('#')
    const slashIdx = iri.lastIndexOf('/')
    return iri.substring(Math.max(hashIdx, slashIdx) + 1)
  }

  return {
    // State
    store: readonly(store),
    isEditMode: readonly(isEditMode),
    isDirty: readonly(isDirty),
    loading: readonly(loading),
    error,
    selectedConceptIri,
    saveStatus: readonly(saveStatus),
    storeVersion: readonly(storeVersion),
    originalTTL: readonly(originalTTL),
    originalPrefixes: readonly(originalPrefixes),

    // Actions
    enterEditMode,
    exitEditMode,
    updateValue,
    updateValueLanguage,
    addValue,
    removeValue,
    syncBroaderNarrower,
    syncRelated,
    renameSubject,
    addConcept,
    deleteConcept,
    save,
    saveSubject,
    serializeToTTL,
    serializeWithPatch,
    getSubjectDiffBlocks,
    resolveLabel,
    getPropertiesForSubject,

    // Undo/Redo
    undo,
    redo,
    revertSubject,
    canUndo,
    canRedo,
    undoStack: readonly(undoStack),
    redoStack: readonly(redoStack),

    // Diff
    computeDiff,
    getChangeSummary,
    getChangesForSubject,

    // Computed
    schemeProperties,
    conceptProperties,
    concepts,
    treeItems,
  }
}
