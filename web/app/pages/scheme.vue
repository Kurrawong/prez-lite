<script setup lang="ts">
import { Store, Parser, type Quad } from 'n3'
import { getLabel, clearCaches } from '~/composables/useVocabData'
import { getPredicateLabel } from '~/utils/vocab-labels'
import type { ChangeSummary } from '~/composables/useEditMode'
import type { HistoryCommit, HistoryDiff } from '~/composables/useVocabHistory'

const route = useRoute()
const router = useRouter()
const uri = computed(() => route.query.uri as string)
const selectedConceptUri = computed(() => route.query.concept as string | undefined)
const historySha = computed(() => route.query.sha as string | undefined)

const {
  scheme,
  concepts,
  status,
  treeItems,
  metadataRows,
  richMetadata,
  validation,
  breadcrumbs
} = useScheme(uri)

const showValidationDetails = ref(false)

// Keep track of last valid data to prevent flicker on back navigation
const lastValidScheme = ref<typeof scheme.value>(null)
const lastValidTreeItems = ref<typeof treeItems.value>([])
const lastValidConcepts = ref<typeof concepts.value>([])

// Update last valid data when we have successful data
watch([scheme, treeItems, concepts], () => {
  if (scheme.value && status.value === 'success') {
    lastValidScheme.value = scheme.value
    lastValidTreeItems.value = treeItems.value
    lastValidConcepts.value = concepts.value ?? []
  }
}, { immediate: true })

// Display values that fall back to previous data during loading
const displayScheme = computed(() => scheme.value ?? lastValidScheme.value)
const displayTreeItems = computed(() => treeItems.value.length ? treeItems.value : lastValidTreeItems.value)
const displayConcepts = computed(() => concepts.value?.length ? concepts.value : lastValidConcepts.value)

// Live header from N3 store in edit mode
const editModeTitle = computed(() => {
  if (editView.value === 'none' || !editMode?.isEditMode.value) return null
  return editMode.resolveLabel(uri.value)
})

const editModeDefinition = computed(() => {
  if (editView.value === 'none' || !editMode?.isEditMode.value || !editMode.store.value) return null
  void editMode.storeVersion.value
  const quads = editMode.store.value.getQuads(uri.value, 'http://www.w3.org/2004/02/skos/core#definition', null, null)
  return quads.length > 0 ? quads[0].object.value : null
})

const isLoading = computed(() => status.value === 'idle' || status.value === 'pending')
// Only show skeleton on initial load (no previous data)
const showTreeSkeleton = computed(() => isLoading.value && !lastValidTreeItems.value.length)
// Show loading indicator when refreshing existing data
const isTreeLoading = computed(() => isLoading.value && lastValidTreeItems.value.length > 0)

// Share functionality
const { getShareUrl, getVocabByIri } = useShare()
const shareUrl = computed(() => uri.value ? getShareUrl(uri.value) : undefined)

// Edit on GitHub
const { githubRepo, githubBranch, githubVocabPath } = useRuntimeConfig().public
const githubEditUrl = computed(() => {
  if (!githubRepo || !uri.value) return null
  const vocab = getVocabByIri(uri.value)
  if (!vocab) return null
  return `https://github.dev/${githubRepo}/blob/${githubBranch}/${githubVocabPath}/${vocab.slug}.ttl`
})

// --- Editor State ---
const { isAuthenticated, isEnabled: authEnabled, token: authToken, login: authLogin } = useGitHubAuth()

const vocabSlugForEditor = computed(() => getVocabByIri(uri.value)?.slug)
const [editorOwner, editorRepoName] = (githubRepo as string).split('/')
const editorAvailable = computed(() => !!(editorOwner && editorRepoName && isAuthenticated.value && vocabSlugForEditor.value))
const editorFilePath = computed(() => {
  const base = (githubVocabPath as string).replace(/^\/+|\/+$/g, '')
  const slug = vocabSlugForEditor.value
  return base ? `${base}/${slug}.ttl` : `${slug}.ttl`
})

// Edit view driven by URL param `edit` (full | inline | absent=none)
const editQueryParam = computed(() => route.query.edit as string | undefined)
const editView = computed(() => {
  // History mode forces read-only
  if (historySha.value) return 'none'
  if (editQueryParam.value === 'full' || editQueryParam.value === 'inline') return editQueryParam.value
  return 'none'
})

// Monaco theme (used by TTL viewer modal and SaveConfirmModal)
const colorMode = useColorMode()
const monacoTheme = computed(() => colorMode.value === 'dark' ? 'prez-dark' : 'prez-light')

// --- Structured Form Editor ---
const editMode = (editorOwner && editorRepoName)
  ? useEditMode(editorOwner, editorRepoName, editorFilePath as Ref<string>, githubBranch as string, uri)
  : null

// Build status polling
const buildStatus = (editorOwner && editorRepoName)
  ? useBuildStatus(editorOwner, editorRepoName)
  : null

// --- History ---
const historyPopoverOpen = ref(false)
const showDiffModal = ref(false)
const diffModalData = ref<HistoryDiff | null>(null)
const diffModalLoading = ref(false)
const diffModalCommitMsg = ref('')

// History composable (created lazily)
const vocabHistory = (editorOwner && editorRepoName)
  ? useVocabHistory(editorOwner, editorRepoName, editorFilePath as Ref<string>, githubBranch as string)
  : null

// Load commits when popover opens or when page loads with a sha param
watch(historyPopoverOpen, (open) => {
  if (open && vocabHistory && !vocabHistory.commits.value.length) {
    vocabHistory.fetchCommits()
  }
})
watch([historySha, authToken, vocabSlugForEditor], ([sha, token, slug]) => {
  if (sha && token && slug && vocabHistory && !vocabHistory.commits.value.length) {
    vocabHistory.fetchCommits()
  }
}, { immediate: true })

// Version label from scheme metadata
const versionLabel = computed(() => displayScheme.value?.version ?? null)

// --- Historical version browsing ---
const SKOS = 'http://www.w3.org/2004/02/skos/core#'
const RDF_TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type'

const historyStore = shallowRef<Store | null>(null)
const historyLoading = ref(false)
const historyError = ref<string | null>(null)

interface HistoryConcept {
  iri: string
  prefLabel: string
  broader: string[]
}

// Load historical version when sha changes (waits for auth token on fresh page load)
watch([historySha, authToken, vocabSlugForEditor], async ([sha, token, slug]) => {
  if (!sha || !vocabHistory) {
    historyStore.value = null
    return
  }
  if (!token || !slug) return // Wait for auth + vocab data to be ready
  historyLoading.value = true
  historyError.value = null
  try {
    const ttl = await vocabHistory.fetchVersionContent(sha)
    const parser = new Parser({ format: 'Turtle' })
    const s = new Store()
    s.addQuads(parser.parse(ttl))
    historyStore.value = s
  } catch (e) {
    historyError.value = e instanceof Error ? e.message : 'Failed to load version'
    historyStore.value = null
  } finally {
    historyLoading.value = false
  }
}, { immediate: true })

const historyConcepts = computed<HistoryConcept[]>(() => {
  const s = historyStore.value
  if (!s) return []
  const conceptQuads = s.getQuads(null, RDF_TYPE, `${SKOS}Concept`, null) as Quad[]
  return conceptQuads.map((q: Quad) => {
    const iri = q.subject.value
    const labelQuads = s.getQuads(iri, `${SKOS}prefLabel`, null, null) as Quad[]
    const prefLabel = labelQuads.length > 0 ? labelQuads[0]!.object.value : iri
    const broaderQuads = s.getQuads(iri, `${SKOS}broader`, null, null) as Quad[]
    return { iri, prefLabel, broader: broaderQuads.map((bq: Quad) => bq.object.value) }
  }).sort((a, b) => a.prefLabel.localeCompare(b.prefLabel))
})

const historyTreeItems = computed(() => {
  if (!historyConcepts.value.length) return []
  const narrowerMap = new Map<string, HistoryConcept[]>()
  for (const c of historyConcepts.value) {
    for (const b of c.broader) {
      if (!narrowerMap.has(b)) narrowerMap.set(b, [])
      narrowerMap.get(b)!.push(c)
    }
  }
  const hasParent = new Set(historyConcepts.value.filter(c => c.broader.length > 0).map(c => c.iri))
  const topConcepts = historyConcepts.value.filter(c => !hasParent.has(c.iri))

  function buildNode(concept: HistoryConcept, depth = 0): any {
    const children = narrowerMap.get(concept.iri) || []
    return {
      id: concept.iri,
      label: concept.prefLabel,
      icon: children.length > 0 ? 'i-heroicons-folder' : 'i-heroicons-document',
      defaultExpanded: depth === 0 && children.length < 10,
      children: children.length > 0
        ? children.sort((a, b) => a.prefLabel.localeCompare(b.prefLabel)).map(c => buildNode(c, depth + 1))
        : undefined,
    }
  }
  return topConcepts.sort((a, b) => a.prefLabel.localeCompare(b.prefLabel)).map(c => buildNode(c))
})

const historySelectedConcept = computed(() => historySha.value ? selectedConceptUri.value : undefined)

// Predicates to hide in history property views (structural, not informative)
const HISTORY_HIDDEN_PREDICATES = new Set([
  RDF_TYPE,
  `${SKOS}inScheme`,
  `${SKOS}topConceptOf`,
  `${SKOS}hasTopConcept`,
])

/** Resolve an RDF object value to a label using the history store */
function resolveHistoryValue(s: Store, val: string): string {
  if (!val.startsWith('http')) return val
  const labelQuads = s.getQuads(val, `${SKOS}prefLabel`, null, null) as Quad[]
  if (labelQuads.length > 0) return labelQuads[0]!.object.value
  // Fallback: local name
  const hashIdx = val.lastIndexOf('#')
  const slashIdx = val.lastIndexOf('/')
  return val.substring(Math.max(hashIdx, slashIdx) + 1)
}

function buildHistoryProperties(s: Store, subjectIri: string) {
  const quads = s.getQuads(subjectIri, null, null, null) as Quad[]
  const grouped = new Map<string, { predicate: string; values: string[] }>()
  for (const q of quads) {
    const pred = q.predicate.value
    if (HISTORY_HIDDEN_PREDICATES.has(pred)) continue
    if (!grouped.has(pred)) grouped.set(pred, { predicate: pred, values: [] })
    grouped.get(pred)!.values.push(resolveHistoryValue(s, q.object.value))
  }
  return Array.from(grouped.values()).map(g => ({
    ...g,
    label: getPredicateLabel(g.predicate),
  }))
}

const historyConceptProperties = computed(() => {
  const s = historyStore.value
  const iri = historySelectedConcept.value
  if (!s || !iri) return []
  return buildHistoryProperties(s, iri)
})

const historySchemeTitle = computed(() => {
  const s = historyStore.value
  if (!s || !uri.value) return null
  const quads = s.getQuads(uri.value, `${SKOS}prefLabel`, null, null) as Quad[]
  return quads.length > 0 ? quads[0]!.object.value : null
})

const historySchemeDefinition = computed(() => {
  const s = historyStore.value
  if (!s || !uri.value) return null
  const quads = s.getQuads(uri.value, `${SKOS}definition`, null, null) as Quad[]
  return quads.length > 0 ? quads[0]!.object.value : null
})

const historySchemeProperties = computed(() => {
  const s = historyStore.value
  if (!s || !uri.value) return []
  return buildHistoryProperties(s, uri.value)
})

// Track the commit metadata for the version being browsed
const selectedHistoryCommit = ref<HistoryCommit | null>(null)

// Resolve commit metadata from loaded commits when navigating directly to a sha URL
const activeHistoryCommit = computed(() => {
  if (!historySha.value) return null
  if (selectedHistoryCommit.value?.sha === historySha.value) return selectedHistoryCommit.value
  return vocabHistory?.commits.value.find(c => c.sha === historySha.value) ?? null
})

function browseVersion(commit: HistoryCommit) {
  selectedHistoryCommit.value = commit
  historyPopoverOpen.value = false
  router.push({ path: '/scheme', query: { uri: uri.value, sha: commit.sha } })
}

function exitHistoryView() {
  selectedHistoryCommit.value = null
  router.push({ path: '/scheme', query: { uri: uri.value } })
}

function formatHistoryDate(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(diffMs / 86_400_000)
  if (diffDays === 0) {
    const diffHours = Math.floor(diffMs / 3_600_000)
    if (diffHours === 0) return `${Math.floor(diffMs / 60_000)}m ago`
    return `${diffHours}h ago`
  }
  if (diffDays === 1) return 'yesterday'
  if (diffDays < 30) return `${diffDays}d ago`
  return d.toLocaleDateString()
}

function truncateCommitMsg(msg: string, max = 60): string {
  const firstLine = msg.split('\n')[0] ?? msg
  return firstLine.length > max ? firstLine.slice(0, max) + '...' : firstLine
}

async function openDiffModal(commit: { sha: string; message: string }, index: number) {
  if (!vocabHistory) return
  historyPopoverOpen.value = false
  diffModalLoading.value = true
  diffModalCommitMsg.value = commit.message
  showDiffModal.value = true
  diffModalData.value = null

  try {
    const commits = vocabHistory.commits.value
    const olderCommit = index < commits.length - 1 ? commits[index + 1]! : null

    if (!olderCommit) {
      const newerTTL = await vocabHistory.fetchVersionContent(commit.sha)
      const parser = new Parser({ format: 'Turtle' })
      const newerStore = new Store()
      newerStore.addQuads(parser.parse(newerTTL))
      const { buildChangeSummary } = await import('~/utils/ttl-patch')
      const emptyStore = new Store()
      const labelResolver = (iri: string): string => {
        const quads = newerStore.getQuads(iri, `${SKOS}prefLabel`, null, null) as Quad[]
        if (quads.length > 0) return quads[0]!.object.value
        const hashIdx = iri.lastIndexOf('#')
        const slashIdx = iri.lastIndexOf('/')
        return iri.substring(Math.max(hashIdx, slashIdx) + 1)
      }
      diffModalData.value = {
        changeSummary: buildChangeSummary(emptyStore, newerStore, labelResolver, getPredicateLabel),
        olderTTL: '',
        newerTTL,
      }
    } else {
      diffModalData.value = await vocabHistory.fetchDiff(olderCommit.sha, commit.sha)
    }
  } catch {
    diffModalData.value = null
  } finally {
    diffModalLoading.value = false
  }
}

function truncateIriValue(val: string, max = 80): string {
  if (val.startsWith('http')) {
    const hashIdx = val.lastIndexOf('#')
    const slashIdx = val.lastIndexOf('/')
    val = val.substring(Math.max(hashIdx, slashIdx) + 1)
  }
  return val.length > max ? val.slice(0, max) + '...' : val
}

// Save modal state
const showSaveModal = ref(false)
const saveModalSubjectIri = ref<string | null>(null)

// TTL viewer modal state
const showTTLViewer = ref(false)
const ttlViewerContent = ref('')
const ttlViewerTitle = ref('')

// Auto-edit predicate for inline mode scroll-to-property
const autoEditPredicate = ref<string | null>(null)

// Add Concept dialog
const showAddConcept = ref(false)
const newConceptLocalName = ref('')
const newConceptLabel = ref('')
const newConceptBroader = ref('')

// --- View mode (simple/expert) ---

const VIEW_MODE_KEY = 'prez_view_mode'
const SIMPLE_HIDDEN_PREDICATES = new Set([
  'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
  'http://www.w3.org/2004/02/skos/core#inScheme',
  'http://www.w3.org/2004/02/skos/core#topConceptOf',
  'http://www.w3.org/2004/02/skos/core#hasTopConcept',
  'http://www.w3.org/2004/02/skos/core#narrower',
  'http://www.w3.org/2004/02/skos/core#broader',
])

const viewMode = ref<'simple' | 'expert'>('simple')

onMounted(() => {
  const stored = localStorage.getItem(VIEW_MODE_KEY)
  if (stored === 'expert' || stored === 'simple') {
    viewMode.value = stored
  }
})

function toggleViewMode() {
  viewMode.value = viewMode.value === 'simple' ? 'expert' : 'simple'
  localStorage.setItem(VIEW_MODE_KEY, viewMode.value)
}

/** Filter properties based on view mode */
function filterByViewMode<T extends { predicate: string }>(properties: T[]): T[] {
  if (viewMode.value === 'expert') return properties
  return properties.filter(p => !SIMPLE_HIDDEN_PREDICATES.has(p.predicate))
}

// --- Edit mode navigation ---

const editErrorModal = ref(false)
const editErrorMessage = ref('')
const editErrorPath = ref('')

async function enterEdit(mode: 'full' | 'inline' = 'full') {
  const wasOff = editView.value === 'none'
  if (wasOff && editMode) {
    await editMode.enterEditMode()
    if (editMode.error.value) {
      editErrorMessage.value = editMode.error.value
      editErrorPath.value = editorFilePath.value
      editErrorModal.value = true
      return
    }
  }
  const query: Record<string, string> = { uri: uri.value, edit: mode }
  if (selectedConceptUri.value) query.concept = selectedConceptUri.value
  router.push({ path: '/scheme', query })
}

function exitEdit() {
  if (editMode?.isEditMode.value) {
    const exited = editMode.exitEditMode()
    if (!exited) return
  }
  const query: Record<string, string> = { uri: uri.value }
  if (selectedConceptUri.value) query.concept = selectedConceptUri.value
  router.push({ path: '/scheme', query })
}

// Sync edit mode composable with URL param changes (including page reload).
// On reload the URL already has ?edit=full but auth token and vocab metadata
// aren't available yet, so watch all three dependencies.
watch([editView, authToken, vocabSlugForEditor], async ([view]) => {
  if (view !== 'none' && editMode && !editMode.isEditMode.value && vocabSlugForEditor.value) {
    await editMode.enterEditMode()
  }
})

// --- Concept selection ---

function buildQuery(extra: Record<string, string | undefined> = {}): Record<string, string> {
  const q: Record<string, string> = { uri: uri.value }
  if (historySha.value) q.sha = historySha.value
  if (editQueryParam.value) q.edit = editQueryParam.value
  for (const [k, v] of Object.entries(extra)) {
    if (v) q[k] = v
    else delete q[k]
  }
  return q
}

function selectConcept(conceptUri: string) {
  router.push({ path: '/scheme', query: buildQuery({ concept: conceptUri }) })
  if (editMode && !historySha.value) {
    editMode.selectedConceptIri.value = conceptUri
  }
}

function clearConceptSelection() {
  router.push({ path: '/scheme', query: buildQuery({ concept: undefined }) })
}

// --- Editable properties ---

// Properties for the selected concept (when in edit mode)
const selectedConceptProperties = computed(() => {
  if (!editMode || !selectedConceptUri.value || editView.value === 'none') return []
  void editMode.storeVersion.value
  const props = editMode.getPropertiesForSubject(selectedConceptUri.value, 'concept', false)
  return filterByViewMode(props)
})

// Properties for the scheme (when in edit mode)
const schemeProperties = computed(() => {
  if (!editMode || editView.value === 'none') return []
  void editMode.storeVersion.value
  const props = editMode.getPropertiesForSubject(uri.value, 'conceptScheme', false)
  return filterByViewMode(props)
})

// Filtered rich metadata for read-only view (respects view mode)
const filteredRichMetadata = computed(() => {
  if (viewMode.value === 'expert') return richMetadata.value
  return richMetadata.value.filter((p: { predicate?: string }) =>
    !p.predicate || !SIMPLE_HIDDEN_PREDICATES.has(p.predicate),
  )
})

// --- Save modal ---

function subjectHasChanges(iri: string): boolean {
  if (!editMode) return false
  void editMode.storeVersion.value
  return editMode.getChangesForSubject(iri) !== null
}

function openSaveModal(iri: string) {
  saveModalSubjectIri.value = iri
  showSaveModal.value = true
}

const saveModalChangeSummary = computed<ChangeSummary>(() => {
  if (!editMode || !saveModalSubjectIri.value) {
    return { subjects: [], totalAdded: 0, totalRemoved: 0, totalModified: 0 }
  }
  const change = editMode.getChangesForSubject(saveModalSubjectIri.value)
  if (!change) {
    return { subjects: [], totalAdded: 0, totalRemoved: 0, totalModified: 0 }
  }
  return {
    subjects: [change],
    totalAdded: change.type === 'added' ? 1 : 0,
    totalRemoved: change.type === 'removed' ? 1 : 0,
    totalModified: change.type === 'modified' ? 1 : 0,
  }
})

const saveModalOriginalTTL = computed(() => {
  if (!editMode || !saveModalSubjectIri.value) return editMode?.originalTTL.value ?? ''
  return editMode.getSubjectDiffBlocks(saveModalSubjectIri.value).original
})
const saveModalPatchedTTL = computed(() => {
  if (!editMode || !saveModalSubjectIri.value) return ''
  return editMode.getSubjectDiffBlocks(saveModalSubjectIri.value).current
})

async function handleSaveConfirm(commitMessage: string) {
  if (!editMode || !saveModalSubjectIri.value) return
  const ok = await editMode.saveSubject(saveModalSubjectIri.value, commitMessage)
  if (ok) {
    showSaveModal.value = false
    saveModalSubjectIri.value = null
    clearCaches()
    buildStatus?.startPolling()
  }
}

// --- Save split button dropdown ---

function saveDropdownItems(iri: string) {
  const items: { label: string; icon: string; onSelect: () => void }[] = []
  if (subjectHasChanges(iri)) {
    items.push({ label: 'View differences', icon: 'i-heroicons-document-magnifying-glass', onSelect: () => openSaveModal(iri) })
  }
  items.push({ label: 'View original TTL', icon: 'i-heroicons-document-text', onSelect: () => openTTLViewer('original') })
  if (editMode?.isDirty.value) {
    items.push({ label: 'View new TTL', icon: 'i-heroicons-document-check', onSelect: () => openTTLViewer('patched', iri) })
  }
  return [items]
}

// --- TTL Viewer ---

function openTTLViewer(type: 'original' | 'patched', iri?: string) {
  if (type === 'original') {
    ttlViewerTitle.value = 'Original TTL'
    ttlViewerContent.value = editMode?.originalTTL.value ?? ''
  } else {
    ttlViewerTitle.value = 'New TTL'
    ttlViewerContent.value = iri ? editMode!.serializeWithPatch(iri) : ''
  }
  showTTLViewer.value = true
}

// --- Floating edit toolbar ---

const pendingChanges = computed(() => {
  if (!editMode || editView.value === 'none') return []
  void editMode.storeVersion.value
  const summary = editMode.getChangeSummary()
  return summary.subjects
})

function truncateValue(val: string, max = 30): string {
  if (val.startsWith('http')) {
    const hashIdx = val.lastIndexOf('#')
    const slashIdx = val.lastIndexOf('/')
    val = val.substring(Math.max(hashIdx, slashIdx) + 1)
  }
  return val.length > max ? val.slice(0, max) + '...' : val
}

interface DiffParts {
  before: string
  oldPart: string
  newPart: string
  after: string
}

/** Find the changed region between two strings and return it with surrounding context. */
function focusedDiff(oldStr: string, newStr: string, ctx = 15): DiffParts | null {
  // Find common prefix
  let prefixLen = 0
  while (prefixLen < oldStr.length && prefixLen < newStr.length && oldStr[prefixLen] === newStr[prefixLen]) {
    prefixLen++
  }
  // Find common suffix (not overlapping with prefix)
  let suffixLen = 0
  while (
    suffixLen < oldStr.length - prefixLen
    && suffixLen < newStr.length - prefixLen
    && oldStr[oldStr.length - 1 - suffixLen] === newStr[newStr.length - 1 - suffixLen]
  ) {
    suffixLen++
  }
  // If very little in common, not useful as a focused diff
  if (prefixLen + suffixLen < 5) return null

  const ctxStart = Math.max(0, prefixLen - ctx)
  const before = (ctxStart > 0 ? '...' : '') + oldStr.slice(ctxStart, prefixLen)

  const oldPart = oldStr.slice(prefixLen, suffixLen > 0 ? oldStr.length - suffixLen : undefined)
  const newPart = newStr.slice(prefixLen, suffixLen > 0 ? newStr.length - suffixLen : undefined)

  const suffixEnd = Math.min(suffixLen, ctx)
  const after = suffixLen > 0
    ? oldStr.slice(oldStr.length - suffixLen, oldStr.length - suffixLen + suffixEnd) + (suffixEnd < suffixLen ? '...' : '')
    : ''

  return { before, oldPart: oldPart || '\u25BE', newPart: newPart || '\u25BE', after }
}

function formatChangeTooltip(prop: { predicateLabel: string; predicateIri: string; type: string; oldValues?: string[]; newValues?: string[] }): string {
  const lines = [prop.predicateLabel, prop.predicateIri, '']
  if (prop.oldValues?.length) {
    for (const v of prop.oldValues) lines.push(`- ${v}`)
  }
  if (prop.newValues?.length) {
    if (prop.oldValues?.length) lines.push('')
    for (const v of prop.newValues) lines.push(`+ ${v}`)
  }
  return lines.join('\n')
}

// --- Scroll to metadata property ---

function scrollToMetadataProperty(predicateIri: string) {
  document.getElementById('metadata-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  if (editView.value === 'inline') {
    autoEditPredicate.value = predicateIri
    nextTick(() => { autoEditPredicate.value = null })
  }
}

// --- Add Concept ---

function handleAddConcept() {
  if (!editMode || !newConceptLocalName.value.trim() || !newConceptLabel.value.trim()) return
  const conceptIri = editMode.addConcept(
    newConceptLocalName.value.trim(),
    newConceptLabel.value.trim(),
    newConceptBroader.value || undefined,
  )
  if (conceptIri) {
    selectConcept(conceptIri)
  }
  showAddConcept.value = false
  newConceptLocalName.value = ''
  newConceptLabel.value = ''
  newConceptBroader.value = ''
}

// --- Concept move (reparent) ---
const showMovePicker = ref(false)

const currentBroaderIris = computed(() => {
  if (!editMode || !selectedConceptUri.value) return []
  void editMode.storeVersion.value
  const props = editMode.getPropertiesForSubject(selectedConceptUri.value, 'concept', false)
  const broaderProp = props.find(p => p.predicate === 'http://www.w3.org/2004/02/skos/core#broader')
  return broaderProp?.values.map(v => v.value) ?? []
})

function handleMoveConfirm(newBroaderIris: string[]) {
  if (!editMode || !selectedConceptUri.value) return
  editMode.syncBroaderNarrower(selectedConceptUri.value, newBroaderIris, currentBroaderIris.value)
}

const moveConceptLabel = computed(() => {
  if (!editMode || !selectedConceptUri.value) return ''
  return editMode.resolveLabel(selectedConceptUri.value)
})

// --- Inline label editing ---
const editingLabel = ref(false)
const editLabelValue = ref('')

const SKOS_PREFLABEL = 'http://www.w3.org/2004/02/skos/core#prefLabel'

function startLabelEdit() {
  if (!editMode || !selectedConceptUri.value) return
  const label = editMode.resolveLabel(selectedConceptUri.value)
  editLabelValue.value = label
  editingLabel.value = true
}

function commitLabelEdit() {
  if (!editMode || !selectedConceptUri.value) return
  editingLabel.value = false
  const currentLabel = editMode.resolveLabel(selectedConceptUri.value)
  if (editLabelValue.value.trim() && editLabelValue.value !== currentLabel) {
    // Find the prefLabel value object from the properties
    const props = editMode.getPropertiesForSubject(selectedConceptUri.value, 'concept', false)
    const prefLabelProp = props.find(p => p.predicate === SKOS_PREFLABEL)
    if (prefLabelProp?.values.length) {
      editMode.updateValue(selectedConceptUri.value, SKOS_PREFLABEL, prefLabelProp.values[0]!, editLabelValue.value.trim())
    }
  }
}

function cancelLabelEdit() {
  editingLabel.value = false
}

// Reset label editing when concept selection changes
watch(() => selectedConceptUri.value, () => {
  editingLabel.value = false
})

// --- Tree ---

const searchQuery = ref('')
const expandAll = ref(false)

// Collapsible panels
const conceptsPanelOpen = ref(true)
const metadataPanelOpen = ref(true)

// Use edit mode tree items when in edit mode, history store when browsing, otherwise static
const activeTreeItems = computed(() => {
  if (historySha.value && historyTreeItems.value.length) {
    return historyTreeItems.value
  }
  if (editView.value !== 'none' && editMode?.isEditMode.value) {
    return editMode!.treeItems.value
  }
  return displayTreeItems.value
})

const activeConceptCount = computed(() => {
  if (historySha.value) {
    return historyConcepts.value.length
  }
  if (editView.value !== 'none' && editMode?.isEditMode.value) {
    return editMode!.concepts.value.length
  }
  return displayConcepts.value?.length ?? 0
})

const filteredTreeItems = computed(() => {
  const sourceItems = activeTreeItems.value
  if (!searchQuery.value) return sourceItems

  const query = searchQuery.value.toLowerCase()

  function filterNode(item: any): any | null {
    const matchesSelf = item.label.toLowerCase().includes(query)
    const filteredChildren = item.children?.map(filterNode).filter(Boolean) || []

    if (matchesSelf || filteredChildren.length > 0) {
      return {
        ...item,
        children: filteredChildren.length > 0 ? filteredChildren : item.children,
        defaultExpanded: true
      }
    }
    return null
  }

  return sourceItems.map(filterNode).filter(Boolean)
})

// True if any node in the tree has children (can be expanded/collapsed)
const hasExpandableNodes = computed(() => {
  function hasChildren(items: any[]): boolean {
    return items.some((item) => item.children?.length > 0 || (item.children && hasChildren(item.children)))
  }
  return hasChildren(filteredTreeItems.value)
})

// Whether tree is in edit mode (show pencil icons on nodes)
const treeEditMode = computed(() => editView.value !== 'none' && !!editMode?.isEditMode.value)


// Description expand/collapse
const descriptionExpanded = ref(false)
const descriptionRef = useTemplateRef<HTMLElement>('descriptionRef')
const isDescriptionClamped = ref(false)

onMounted(() => {
  nextTick(() => {
    if (descriptionRef.value) {
      isDescriptionClamped.value = descriptionRef.value.scrollHeight > descriptionRef.value.clientHeight
    }
  })
})

watch(() => displayScheme.value, () => {
  nextTick(() => {
    if (descriptionRef.value) {
      isDescriptionClamped.value = descriptionRef.value.scrollHeight > descriptionRef.value.clientHeight
    }
  })
})

function copyIriToClipboard(iri: string) {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(iri).catch(() => {})
  }
}
</script>

<template>
  <div class="py-8">
    <!-- Edit Toolbar (always visible, fixed at top below header) -->
    <EditToolbar
      v-if="displayScheme && !historySha && isAuthenticated"
      :edit-view="editView"
      :editor-available="editorAvailable"
      :is-authenticated="isAuthenticated"
      :auth-enabled="authEnabled"
      :is-edit-mode="!!editMode?.isEditMode.value"
      :is-dirty="!!editMode?.isDirty.value"
      :loading="!!editMode?.loading.value"
      :saving="editMode?.saveStatus.value === 'saving'"
      :error="editMode?.error.value ?? null"
      :pending-changes="pendingChanges"
      :view-mode="viewMode"
      :history-commits="vocabHistory?.commits.value ?? []"
      :history-loading="!!vocabHistory?.loading.value"
      @enter-edit="enterEdit"
      @exit-edit="exitEdit"
      @toggle-mode="router.push({ path: '/scheme', query: buildQuery({ edit: editView === 'full' ? 'inline' : 'full' }) })"
      @save="pendingChanges.length === 1 ? openSaveModal(pendingChanges[0]!.subjectIri) : openSaveModal(selectedConceptUri || uri)"
      @toggle-view-mode="toggleViewMode"
      @sign-in="authLogin"
      @load-history="vocabHistory?.fetchCommits()"
      @browse-version="browseVersion"
      @open-diff="(commit, index) => openDiffModal(commit, index)"
    />

    <UBreadcrumb ref="breadcrumbRef" :items="breadcrumbs" class="mb-6" />

    <div v-if="!uri" class="text-center py-12">
      <UAlert color="warning" title="No scheme selected" description="Please select a vocabulary from the vocabularies page" />
    </div>

    <template v-else-if="displayScheme">
      <!-- Header -->
      <div class="mb-8">
        <div class="flex items-start justify-between gap-4 mb-2">
          <h1 class="text-3xl font-bold">
            {{ historySchemeTitle ?? editModeTitle ?? getLabel(displayScheme.prefLabel) }}
            <UButton
              v-if="editView !== 'none'"
              icon="i-heroicons-arrow-down-circle"
              variant="ghost"
              size="xs"
              class="ml-1 align-middle"
              title="Edit this property in metadata"
              @click="scrollToMetadataProperty('http://www.w3.org/2004/02/skos/core#prefLabel')"
            />
          </h1>

          <!-- Edit button moved to EditToolbar -->
        </div>
        <div class="flex items-center gap-2 text-sm text-muted mb-4">
          <a :href="displayScheme.iri" target="_blank" class="text-primary hover:underline break-all">
            {{ displayScheme.iri }}
          </a>
          <UBadge
            v-if="validation?.conforms === true"
            color="success"
            variant="subtle"
            size="xs"
          >
            Valid
          </UBadge>
          <UBadge
            v-else-if="validation?.errors"
            color="error"
            variant="subtle"
            size="xs"
            class="cursor-pointer"
            @click="showValidationDetails = !showValidationDetails"
          >
            {{ validation.errors }} error{{ validation.errors !== 1 ? 's' : '' }}
          </UBadge>
          <UBadge
            v-else-if="validation?.warnings"
            color="warning"
            variant="subtle"
            size="xs"
            class="cursor-pointer"
            @click="showValidationDetails = !showValidationDetails"
          >
            {{ validation.warnings }} warning{{ validation.warnings !== 1 ? 's' : '' }}
          </UBadge>
          <UButton
            icon="i-heroicons-clipboard"
            color="neutral"
            variant="ghost"
            size="xs"
            @click="copyIriToClipboard(displayScheme.iri)"
          />
          <UButton
            v-if="shareUrl"
            :to="shareUrl"
            icon="i-heroicons-share"
            color="neutral"
            variant="ghost"
            size="xs"
            aria-label="Share or embed this vocabulary"
          />
          <!-- History popover moved to EditToolbar -->
          <span v-if="historySha" class="inline-flex items-center gap-1.5 text-xs text-warning-500 dark:text-warning-400 bg-warning-50 dark:bg-warning-950/30 rounded-md px-2 py-0.5">
            <UIcon name="i-heroicons-clock" class="size-3 shrink-0" />
            <span class="truncate max-w-52">
              <template v-if="activeHistoryCommit">
                {{ formatHistoryDate(activeHistoryCommit.date) }} &middot; {{ activeHistoryCommit.author.login }} &middot; {{ truncateCommitMsg(activeHistoryCommit.message, 30) }}
              </template>
              <template v-else>
                {{ historySha.slice(0, 7) }}
              </template>
            </span>
            <button type="button" class="shrink-0 hover:text-warning-700 dark:hover:text-warning-300" @click="exitHistoryView">
              <UIcon name="i-heroicons-x-mark" class="size-3.5" />
            </button>
          </span>

          <!-- Fallback: edit on GitHub.dev (only when logged in but inline editor unavailable) -->
          <UButton
            v-if="isAuthenticated && !editorAvailable && githubEditUrl"
            :to="githubEditUrl"
            target="_blank"
            icon="i-heroicons-pencil-square"
            color="neutral"
            variant="ghost"
            size="xs"
            aria-label="Edit source on GitHub"
          />

          <!-- Build status indicator -->
          <UTooltip
            v-if="buildStatus && buildStatus.status.value === 'running'"
            text="Data pipeline running"
          >
            <a
              v-if="buildStatus.runUrl.value"
              :href="buildStatus.runUrl.value"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center"
            >
              <UIcon name="i-heroicons-arrow-path" class="size-4 animate-spin text-info" />
            </a>
            <UIcon v-else name="i-heroicons-arrow-path" class="size-4 animate-spin text-info" />
          </UTooltip>
          <UTooltip
            v-else-if="buildStatus && buildStatus.status.value === 'completed'"
            text="Exports updated"
          >
            <UIcon name="i-heroicons-check-circle" class="size-4 text-success" />
          </UTooltip>
          <UTooltip
            v-else-if="buildStatus && buildStatus.status.value === 'failed'"
            text="Pipeline failed"
          >
            <a
              v-if="buildStatus.runUrl.value"
              :href="buildStatus.runUrl.value"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center"
            >
              <UIcon name="i-heroicons-exclamation-triangle" class="size-4 text-error" />
            </a>
            <UIcon v-else name="i-heroicons-exclamation-triangle" class="size-4 text-error" />
          </UTooltip>
        </div>
        <div v-if="editModeDefinition ?? displayScheme.definition">
          <p
            ref="descriptionRef"
            :class="['text-lg text-muted', descriptionExpanded ? '' : 'line-clamp-[8]']"
          >
            {{ historySchemeDefinition ?? editModeDefinition ?? getLabel(displayScheme.definition) }}
            <UButton
              v-if="editView !== 'none'"
              icon="i-heroicons-arrow-down-circle"
              variant="ghost"
              size="xs"
              class="ml-1 align-middle"
              title="Edit this property in metadata"
              @click.stop="scrollToMetadataProperty('http://www.w3.org/2004/02/skos/core#definition')"
            />
          </p>
          <UButton
            v-if="isDescriptionClamped || descriptionExpanded"
            variant="link"
            color="primary"
            size="sm"
            class="mt-2 px-0"
            @click="descriptionExpanded = !descriptionExpanded"
          >
            {{ descriptionExpanded ? 'Show less' : 'Show more' }}
          </UButton>
        </div>

        <!-- Validation details (expandable) -->
        <div v-if="showValidationDetails && validation?.results?.length" class="mt-4">
          <UAlert
            :color="validation.errors ? 'error' : 'warning'"
            :icon="validation.errors ? 'i-heroicons-exclamation-triangle' : 'i-heroicons-exclamation-circle'"
            :title="`${validation.errors} error${validation.errors !== 1 ? 's' : ''}, ${validation.warnings} warning${validation.warnings !== 1 ? 's' : ''}`"
          >
            <template #description>
              <ul class="mt-2 space-y-1 text-sm">
                <li v-for="(result, i) in validation.results" :key="i" class="flex items-start gap-2">
                  <UBadge
                    :color="result.severity === 'Violation' ? 'error' : result.severity === 'Warning' ? 'warning' : 'info'"
                    variant="subtle"
                    size="xs"
                    class="shrink-0 mt-0.5"
                  >
                    {{ result.severity }}
                  </UBadge>
                  <span>
                    {{ result.message }}
                    <span v-if="result.path" class="text-muted text-xs ml-1">({{ result.path }})</span>
                  </span>
                </li>
              </ul>
            </template>
          </UAlert>
        </div>
      </div>


      <!-- Historical version loading/error -->
      <div v-if="historySha && historyLoading" class="mb-4 flex items-center gap-2 text-sm text-muted">
        <UIcon name="i-heroicons-arrow-path" class="size-4 animate-spin" />
        Loading version...
      </div>
      <div v-else-if="historySha && historyError" class="mb-4">
        <UAlert
          color="error"
          icon="i-heroicons-exclamation-triangle"
          :title="historyError"
        >
          <template #actions>
            <UButton size="xs" variant="soft" @click="exitHistoryView">Back to current</UButton>
          </template>
        </UAlert>
      </div>

      <!-- Bottom banner replaced by EditToolbar above -->

      <!-- Concepts Tree with inline panel -->
      <UCard class="mb-8">
        <template #header>
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h2
              class="font-semibold flex items-center gap-2 cursor-pointer select-none"
              @click="conceptsPanelOpen = !conceptsPanelOpen"
            >
              <UIcon
                :name="conceptsPanelOpen ? 'i-heroicons-chevron-down' : 'i-heroicons-chevron-right'"
                class="size-4"
              />
              <UIcon name="i-heroicons-list-bullet" />
              Concepts
              <UBadge color="primary" variant="subtle">{{ activeConceptCount }} total</UBadge>
              <UIcon v-if="isTreeLoading" name="i-heroicons-arrow-path" class="size-4 text-primary animate-spin" />
            </h2>

            <div v-if="conceptsPanelOpen" class="flex items-center gap-2">
              <UInput
                v-model="searchQuery"
                icon="i-heroicons-magnifying-glass"
                placeholder="Search concepts..."
                size="sm"
                class="w-48"
              />
              <UButton
                v-if="hasExpandableNodes"
                :icon="expandAll ? 'i-heroicons-minus' : 'i-heroicons-plus'"
                color="neutral"
                variant="ghost"
                size="sm"
                @click="expandAll = !expandAll"
              >
                {{ expandAll ? 'Collapse' : 'Expand' }}
              </UButton>
              <!-- Add concept (edit mode only) -->
              <UButton
                v-if="treeEditMode"
                icon="i-heroicons-plus"
                size="sm"
                variant="soft"
                @click="showAddConcept = true"
              >
                Add
              </UButton>
            </div>
          </div>
        </template>

        <p v-if="!conceptsPanelOpen" class="text-sm text-muted">
          {{ activeConceptCount }} concepts — click header to expand
        </p>
        <div v-show="conceptsPanelOpen">
        <div v-if="showTreeSkeleton" class="space-y-2">
          <USkeleton class="h-8 w-full" v-for="i in 5" :key="i" />
        </div>

        <template v-else-if="filteredTreeItems.length || activeTreeItems.length">
          <div class="flex gap-6" :class="selectedConceptUri ? 'flex-col lg:flex-row' : ''">
            <!-- Tree panel -->
            <div :class="selectedConceptUri ? 'lg:w-1/2' : 'w-full'" class="max-h-[600px] overflow-auto">
              <ConceptTree
                :items="filteredTreeItems"
                :expand-all="expandAll || !!searchQuery"
                :selected-id="selectedConceptUri"
                :edit-mode="treeEditMode"
                @select="selectConcept"
                @edit="selectConcept"
              />
            </div>

            <!-- Concept detail panel -->
            <div v-if="selectedConceptUri" class="lg:w-1/2 lg:border-l lg:border-default lg:pl-6 min-h-[200px] max-h-[600px] overflow-y-auto">
              <!-- Edit mode: full → ConceptForm -->
              <template v-if="editView === 'full' && editMode?.isEditMode.value">
                <div class="flex items-center justify-between mb-3 gap-2">
                  <!-- Inline-editable label -->
                  <div v-if="editingLabel" class="flex items-center gap-1.5 flex-1 min-w-0">
                    <UInput
                      v-model="editLabelValue"
                      class="flex-1 font-semibold"
                      size="sm"
                      autofocus
                      @keydown.enter="commitLabelEdit"
                      @keydown.escape="cancelLabelEdit"
                      @blur="commitLabelEdit"
                    />
                  </div>
                  <h3 v-else class="font-semibold truncate mr-2 flex items-center gap-1.5 cursor-pointer group" @click="startLabelEdit">
                    {{ editMode.resolveLabel(selectedConceptUri) }}
                    <UIcon name="i-heroicons-pencil" class="size-3.5 text-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </h3>
                  <div class="flex items-center gap-1 shrink-0">
                    <UButton
                      icon="i-heroicons-arrow-up-right"
                      variant="ghost"
                      size="xs"
                      title="Move to different parent"
                      @click="showMovePicker = true"
                    >
                      Move
                    </UButton>
                    <UButton
                      icon="i-heroicons-x-mark"
                      variant="ghost"
                      size="xs"
                      @click="clearConceptSelection"
                    />
                  </div>
                </div>

                <ConceptForm
                  :subject-iri="selectedConceptUri"
                  :properties="selectedConceptProperties"
                  :concepts="editMode.concepts.value"
                  @update:value="(pred, oldVal, newVal) => editMode!.updateValue(selectedConceptUri!, pred, oldVal, newVal)"
                  @update:language="(pred, oldVal, newLang) => editMode!.updateValueLanguage(selectedConceptUri!, pred, oldVal, newLang)"
                  @add:value="(pred) => editMode!.addValue(selectedConceptUri!, pred)"
                  @remove:value="(pred, val) => editMode!.removeValue(selectedConceptUri!, pred, val)"
                  @update:broader="(newIris, oldIris) => editMode!.syncBroaderNarrower(selectedConceptUri!, newIris, oldIris)"
                  @update:related="(newIris, oldIris) => editMode!.syncRelated(selectedConceptUri!, newIris, oldIris)"
                  @rename="(oldIri, newIri) => { editMode!.renameSubject(oldIri, newIri); selectedConceptUri = newIri }"
                  @delete="editMode!.deleteConcept(selectedConceptUri!)"
                />

              </template>

              <!-- Edit mode: inline → InlineEditTable -->
              <template v-else-if="editView === 'inline' && editMode?.isEditMode.value">
                <div class="flex items-center justify-between mb-3 gap-2">
                  <!-- Inline-editable label -->
                  <div v-if="editingLabel" class="flex items-center gap-1.5 flex-1 min-w-0">
                    <UInput
                      v-model="editLabelValue"
                      class="flex-1 font-semibold"
                      size="sm"
                      autofocus
                      @keydown.enter="commitLabelEdit"
                      @keydown.escape="cancelLabelEdit"
                      @blur="commitLabelEdit"
                    />
                  </div>
                  <h3 v-else class="font-semibold truncate mr-2 flex items-center gap-1.5 cursor-pointer group" @click="startLabelEdit">
                    {{ editMode.resolveLabel(selectedConceptUri) }}
                    <UIcon name="i-heroicons-pencil" class="size-3.5 text-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </h3>
                  <div class="flex items-center gap-1 shrink-0">
                    <UButton
                      icon="i-heroicons-arrow-up-right"
                      variant="ghost"
                      size="xs"
                      title="Move to different parent"
                      @click="showMovePicker = true"
                    >
                      Move
                    </UButton>
                    <UButton
                      icon="i-heroicons-x-mark"
                      variant="ghost"
                      size="xs"
                      @click="clearConceptSelection"
                    />
                  </div>
                </div>

                <InlineEditTable
                  :subject-iri="selectedConceptUri"
                  :properties="selectedConceptProperties"
                  :concepts="editMode.concepts.value"
                  @update:value="(pred, oldVal, newVal) => editMode!.updateValue(selectedConceptUri!, pred, oldVal, newVal)"
                  @update:language="(pred, oldVal, newLang) => editMode!.updateValueLanguage(selectedConceptUri!, pred, oldVal, newLang)"
                  @add:value="(pred) => editMode!.addValue(selectedConceptUri!, pred)"
                  @remove:value="(pred, val) => editMode!.removeValue(selectedConceptUri!, pred, val)"
                  @update:broader="(newIris, oldIris) => editMode!.syncBroaderNarrower(selectedConceptUri!, newIris, oldIris)"
                  @update:related="(newIris, oldIris) => editMode!.syncRelated(selectedConceptUri!, newIris, oldIris)"
                  @delete="editMode!.deleteConcept(selectedConceptUri!)"
                />
              </template>

              <!-- Historical version: read-only properties from store -->
              <template v-else-if="historySha && historyStore">
                <div class="flex items-center justify-between mb-3">
                  <h3 class="font-semibold truncate mr-2">
                    {{ historyConcepts.find(c => c.iri === selectedConceptUri)?.prefLabel ?? selectedConceptUri }}
                  </h3>
                  <UButton icon="i-heroicons-x-mark" variant="ghost" size="xs" @click="clearConceptSelection" />
                </div>
                <div class="space-y-3">
                  <div v-for="prop in historyConceptProperties" :key="prop.predicate" class="text-sm">
                    <p class="text-xs font-medium text-muted">{{ prop.label }}</p>
                    <p v-for="(val, i) in prop.values" :key="i" class="break-all">
                      {{ truncateIriValue(val, 120) }}
                    </p>
                  </div>
                </div>
              </template>

              <!-- View mode -->
              <template v-else>
                <ConceptPanel
                  :uri="selectedConceptUri"
                  :scheme-uri="uri"
                  @close="clearConceptSelection"
                />
              </template>
            </div>
          </div>
        </template>

        <UAlert
          v-else-if="searchQuery"
          color="info"
          icon="i-heroicons-information-circle"
          description="No concepts match your search"
        />

        <UAlert
          v-else
          color="info"
          icon="i-heroicons-information-circle"
          description="No concepts found in this scheme"
        />
        </div>
      </UCard>

      <!-- Metadata -->
      <UCard id="metadata-section" class="mb-8">
        <template #header>
          <h2
            class="font-semibold flex items-center gap-2 cursor-pointer select-none"
            @click="metadataPanelOpen = !metadataPanelOpen"
          >
            <UIcon
              :name="metadataPanelOpen ? 'i-heroicons-chevron-down' : 'i-heroicons-chevron-right'"
              class="size-4"
            />
            <UIcon name="i-heroicons-information-circle" />
            Metadata
          </h2>
        </template>

        <p v-if="!metadataPanelOpen" class="text-sm text-muted">
          Vocabulary metadata — click header to expand
        </p>
        <div v-show="metadataPanelOpen">
        <!-- Edit mode: full → ConceptForm for scheme properties -->
        <template v-if="editView === 'full' && editMode?.isEditMode.value">
          <ConceptForm
            :subject-iri="uri"
            :properties="schemeProperties"
            :concepts="editMode!.concepts.value"
            :is-scheme="true"
            @update:value="(pred, oldVal, newVal) => editMode!.updateValue(uri, pred, oldVal, newVal)"
            @update:language="(pred, oldVal, newLang) => editMode!.updateValueLanguage(uri, pred, oldVal, newLang)"
            @add:value="(pred) => editMode!.addValue(uri, pred)"
            @remove:value="(pred, val) => editMode!.removeValue(uri, pred, val)"
          />
        </template>

        <!-- Edit mode: inline → InlineEditTable for scheme properties -->
        <template v-else-if="editView === 'inline' && editMode?.isEditMode.value">
          <InlineEditTable
            :subject-iri="uri"
            :properties="schemeProperties"
            :concepts="editMode!.concepts.value"
            :is-scheme="true"
            :auto-edit-predicate="autoEditPredicate"
            @update:value="(pred, oldVal, newVal) => editMode!.updateValue(uri, pred, oldVal, newVal)"
            @update:language="(pred, oldVal, newLang) => editMode!.updateValueLanguage(uri, pred, oldVal, newLang)"
            @add:value="(pred) => editMode!.addValue(uri, pred)"
            @remove:value="(pred, val) => editMode!.removeValue(uri, pred, val)"
          />
        </template>

        <!-- Historical version: read-only properties from store -->
        <template v-else-if="historySha && historyStore">
          <div class="space-y-3">
            <div v-for="prop in historySchemeProperties" :key="prop.predicate" class="text-sm">
              <p class="text-xs font-medium text-muted">{{ prop.label }}</p>
              <p v-for="(val, i) in prop.values" :key="i" class="break-all">
                {{ truncateIriValue(val, 120) }}
              </p>
            </div>
          </div>
        </template>

        <!-- View mode -->
        <template v-else>
          <!-- Rich metadata from annotated JSON-LD -->
          <RichMetadataTable v-if="filteredRichMetadata.length" :properties="filteredRichMetadata" />

          <!-- Fallback to simple table -->
          <UTable
            v-else
            :data="metadataRows"
            :columns="[
              { accessorKey: 'property', header: 'Property' },
              { accessorKey: 'value', header: 'Value' }
            ]"
          />
        </template>
        </div>
      </UCard>

      <!-- Save Confirm Modal -->
      <UModal v-model:open="showSaveModal">
        <template #body>
          <SaveConfirmModal
            :change-summary="saveModalChangeSummary"
            :original-t-t-l="saveModalOriginalTTL"
            :patched-t-t-l="saveModalPatchedTTL"
            @confirm="handleSaveConfirm"
            @cancel="showSaveModal = false"
          />
        </template>
      </UModal>

      <!-- Edit Error Modal -->
      <UModal v-model:open="editErrorModal">
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-exclamation-triangle" class="size-5 text-error" />
            <h3 class="font-semibold">Unable to enter edit mode</h3>
          </div>
        </template>
        <template #body>
          <div class="space-y-3">
            <p class="text-sm">{{ editErrorMessage }}</p>
            <div class="bg-muted/10 border border-default rounded-md px-3 py-2">
              <p class="text-xs text-muted mb-1">File path</p>
              <code class="text-sm font-mono break-all">{{ editErrorPath }}</code>
            </div>
            <p class="text-xs text-muted">Check that the GitHub repository, branch, and vocab path are configured correctly in your environment variables.</p>
          </div>
        </template>
        <template #footer>
          <div class="flex justify-end">
            <UButton label="Close" @click="editErrorModal = false" />
          </div>
        </template>
      </UModal>

      <!-- TTL Viewer Modal -->
      <UModal v-model:open="showTTLViewer">
        <template #header>
          <h3 class="font-semibold">{{ ttlViewerTitle }}</h3>
        </template>
        <template #body>
          <div class="border border-default rounded-lg overflow-hidden">
            <MonacoEditor
              :model-value="ttlViewerContent"
              lang="turtle"
              :options="{ theme: monacoTheme, readOnly: true, minimap: { enabled: false }, wordWrap: 'on', scrollBeyondLastLine: false }"
              class="h-[28rem]"
            />
          </div>
        </template>
      </UModal>

      <!-- Add Concept Modal -->
      <UModal v-model:open="showAddConcept">
        <template #header>
          <h3 class="font-semibold">Add Concept</h3>
        </template>

        <template #body>
          <div class="space-y-4">
            <UFormField label="Local name" required help="Will be appended to the scheme IRI to form the concept IRI">
              <UInput
                v-model="newConceptLocalName"
                placeholder="my-concept"
                class="font-mono text-sm"
              />
            </UFormField>

            <UFormField label="Preferred label" required>
              <UInput
                v-model="newConceptLabel"
                placeholder="My Concept"
              />
            </UFormField>

            <UFormField label="Broader concept (optional)">
              <USelect
                v-model="newConceptBroader"
                :items="[
                  { label: '(none — top concept)', value: '' },
                  ...(editMode?.concepts.value ?? []).map(c => ({ label: c.prefLabel, value: c.iri }))
                ]"
                value-key="value"
              />
            </UFormField>
          </div>
        </template>

        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton variant="ghost" @click="showAddConcept = false">Cancel</UButton>
            <UButton
              :disabled="!newConceptLocalName.trim() || !newConceptLabel.trim()"
              @click="handleAddConcept"
            >
              Add
            </UButton>
          </div>
        </template>
      </UModal>

      <!-- Move Concept Modal -->
      <MoveConceptModal
        v-if="editMode && selectedConceptUri"
        :open="showMovePicker"
        :concept-iri="selectedConceptUri"
        :concept-label="moveConceptLabel"
        :current-broader-iris="currentBroaderIris"
        :tree-items="activeTreeItems"
        :resolve-label="editMode.resolveLabel"
        @update:open="showMovePicker = $event"
        @confirm="handleMoveConfirm"
      />

      <!-- History Diff Modal -->
      <UModal v-model:open="showDiffModal" :ui="{ width: 'max-w-4xl' }">
        <template #body>
          <VocabHistoryDiff
            :loading="diffModalLoading"
            :diff="diffModalData"
            :commit-message="diffModalCommitMsg"
            @close="showDiffModal = false"
          />
        </template>
      </UModal>
    </template>

    <div v-else-if="(status === 'idle' || status === 'pending') && !lastValidScheme" class="space-y-4">
      <USkeleton class="h-12 w-1/2" />
      <USkeleton class="h-6 w-3/4" />
      <USkeleton class="h-64 w-full" />
    </div>

    <UAlert v-else-if="status !== 'pending' && status !== 'idle'" color="error" title="Scheme not found" :description="`No scheme found with IRI: ${uri}`" />
  </div>
</template>
