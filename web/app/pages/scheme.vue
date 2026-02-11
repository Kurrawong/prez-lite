<script setup lang="ts">
import { getLabel } from '~/composables/useVocabData'
import type { ChangeSummary } from '~/composables/useEditMode'

const route = useRoute()
const router = useRouter()
const uri = computed(() => route.query.uri as string)
const selectedConceptUri = computed(() => route.query.concept as string | undefined)

const {
  scheme,
  concepts,
  status,
  treeItems,
  metadataRows,
  richMetadata,
  breadcrumbs
} = useScheme(uri)

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
const { isAuthenticated } = useGitHubAuth()

const vocabSlugForEditor = computed(() => getVocabByIri(uri.value)?.slug)
const [editorOwner, editorRepoName] = (githubRepo as string).split('/')
const editorAvailable = computed(() => !!(editorOwner && editorRepoName && isAuthenticated.value && vocabSlugForEditor.value))
const editorFilePath = computed(() => `${githubVocabPath}/${vocabSlugForEditor.value}.ttl`)

// Edit view: 'none' | 'full' | 'inline'
const editView = ref<'none' | 'full' | 'inline'>('none')

// Monaco theme (used by TTL viewer modal and SaveConfirmModal)
const colorMode = useColorMode()
const monacoTheme = computed(() => colorMode.value === 'dark' ? 'prez-dark' : 'prez-light')

// --- Structured Form Editor ---
const editMode = (editorOwner && editorRepoName)
  ? useEditMode(editorOwner, editorRepoName, editorFilePath as Ref<string>, githubBranch as string, uri)
  : null

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

// --- Edit mode dropdown items ---

const editModeItems = [[
  { label: 'Full edit mode', icon: 'i-heroicons-pencil-square', onSelect: () => enterEdit('full') },
  { label: 'Inline edit mode', icon: 'i-heroicons-cursor-arrow-rays', onSelect: () => enterEdit('inline') },
]]

// --- Edit mode navigation ---

async function enterEdit(mode: 'full' | 'inline' = 'full') {
  const wasOff = editView.value === 'none'
  editView.value = mode
  if (wasOff && editMode) {
    await editMode.enterEditMode()
  }
}

function exitEdit() {
  if (editMode?.isEditMode.value) {
    const exited = editMode.exitEditMode()
    if (!exited) return
  }
  editView.value = 'none'
}

// --- Concept selection ---

function selectConcept(conceptUri: string) {
  router.replace({
    path: '/scheme',
    query: { uri: uri.value, concept: conceptUri }
  })
  if (editMode) {
    editMode.selectedConceptIri.value = conceptUri
  }
}

function clearConceptSelection() {
  router.replace({
    path: '/scheme',
    query: { uri: uri.value }
  })
}

// --- Editable properties ---

// Properties for the selected concept (when in edit mode)
const selectedConceptProperties = computed(() => {
  if (!editMode || !selectedConceptUri.value || editView.value === 'none') return []
  void editMode.storeVersion.value
  return editMode.getPropertiesForSubject(selectedConceptUri.value, 'concept', false)
})

// Properties for the scheme (when in edit mode)
const schemeProperties = computed(() => {
  if (!editMode || editView.value === 'none') return []
  void editMode.storeVersion.value
  return editMode.getPropertiesForSubject(uri.value, 'conceptScheme', false)
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

const saveModalOriginalTTL = computed(() => editMode?.originalTTL.value ?? '')
const saveModalPatchedTTL = computed(() => {
  if (!editMode || !saveModalSubjectIri.value) return ''
  return editMode.serializeWithPatch(saveModalSubjectIri.value)
})

async function handleSaveConfirm(commitMessage: string) {
  if (!editMode || !saveModalSubjectIri.value) return
  const ok = await editMode.saveSubject(saveModalSubjectIri.value, commitMessage)
  if (ok) {
    showSaveModal.value = false
    saveModalSubjectIri.value = null
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
  // For IRIs, show last segment
  if (val.startsWith('http')) {
    const hashIdx = val.lastIndexOf('#')
    const slashIdx = val.lastIndexOf('/')
    val = val.substring(Math.max(hashIdx, slashIdx) + 1)
  }
  return val.length > max ? val.slice(0, max) + '...' : val
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

// --- Tree ---

const searchQuery = ref('')
const expandAll = ref(false)

// Use edit mode tree items when in edit mode, otherwise static
const activeTreeItems = computed(() => {
  if (editView.value !== 'none' && editMode?.isEditMode.value) {
    return editMode!.treeItems.value
  }
  return displayTreeItems.value
})

const activeConceptCount = computed(() => {
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

// Edit panel positioning — align with breadcrumb, below the header
const breadcrumbRef = useTemplateRef<HTMLElement>('breadcrumbRef')
const editPanelTop = ref(96) // fallback: header(64) + padding(32)
onMounted(() => {
  nextTick(() => {
    const el = (breadcrumbRef.value as any)?.$el ?? breadcrumbRef.value
    if (el) {
      // Fixed position top = element's document offset (viewport top when not scrolled)
      editPanelTop.value = el.getBoundingClientRect().top + window.scrollY
    }
  })
})

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
    <UBreadcrumb ref="breadcrumbRef" :items="breadcrumbs" class="mb-6" />

    <div v-if="!uri" class="text-center py-12">
      <UAlert color="warning" title="No scheme selected" description="Please select a vocabulary from the vocabularies page" />
    </div>

    <template v-else-if="displayScheme">
      <!-- Header -->
      <div class="mb-8">
        <div class="flex items-start justify-between gap-4 mb-2">
          <h1 class="text-3xl font-bold">
            {{ getLabel(displayScheme.prefLabel) }}
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

          <!-- Edit button (not in edit mode) -->
          <UFieldGroup v-if="editorAvailable && editView === 'none'" class="shrink-0">
            <UButton color="neutral" variant="subtle" label="Edit" icon="i-heroicons-pencil-square" @click="enterEdit('full')" />
            <UDropdownMenu :items="editModeItems">
              <UButton color="neutral" variant="outline" icon="i-heroicons-chevron-down" />
            </UDropdownMenu>
          </UFieldGroup>
        </div>
        <div class="flex items-center gap-2 text-sm text-muted mb-4">
          <a :href="displayScheme.iri" target="_blank" class="text-primary hover:underline break-all">
            {{ displayScheme.iri }}
          </a>
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

          <!-- Fallback: edit on GitHub.dev -->
          <UButton
            v-if="!editorAvailable && githubEditUrl"
            :to="githubEditUrl"
            target="_blank"
            icon="i-heroicons-pencil-square"
            color="neutral"
            variant="ghost"
            size="xs"
            aria-label="Edit source on GitHub"
          />
        </div>
        <div v-if="displayScheme.definition">
          <p
            ref="descriptionRef"
            :class="['text-lg text-muted', descriptionExpanded ? '' : 'line-clamp-[8]']"
          >
            {{ getLabel(displayScheme.definition) }}
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
      </div>

      <!-- Fixed edit panel (top-right, always visible) -->
      <Teleport to="body">
        <div
          v-if="editorAvailable && editView !== 'none' && editMode"
          class="fixed right-6 z-50 bg-elevated border border-default rounded-lg shadow-lg w-[280px] flex flex-col"
          :style="{ top: `${editPanelTop}px` }"
        >
          <!-- Panel header -->
          <div class="flex items-center justify-between px-3 py-2.5">
            <div class="flex items-center gap-2 text-sm font-medium">
              <UIcon
                :name="editView === 'full' ? 'i-heroicons-pencil-square' : 'i-heroicons-cursor-arrow-rays'"
                class="size-4"
              />
              {{ editView === 'full' ? 'Full edit mode' : 'Inline edit mode' }}
            </div>
            <UButton
              icon="i-heroicons-x-mark"
              color="neutral"
              variant="ghost"
              size="xs"
              aria-label="Exit edit mode"
              @click="exitEdit"
            />
          </div>

          <USeparator />

          <!-- Body: changes list -->
          <div class="px-3 py-3 flex-1">
            <!-- Loading -->
            <div v-if="editMode.loading.value" class="flex items-center gap-2 text-xs text-muted py-1">
              <UIcon name="i-heroicons-arrow-path" class="size-3.5 animate-spin" />
              Loading from GitHub...
            </div>

            <!-- Error -->
            <div v-else-if="editMode.error.value" class="text-xs text-error py-1">
              {{ editMode.error.value }}
            </div>

            <!-- Pending changes -->
            <div v-else-if="pendingChanges.length" class="space-y-3 max-h-[320px] overflow-y-auto">
              <div v-for="change in pendingChanges" :key="change.subjectIri">
                <!-- Subject header -->
                <div class="flex items-center gap-1.5 text-xs font-medium mb-1" :title="change.subjectIri">
                  <UIcon
                    :name="change.type === 'added' ? 'i-heroicons-plus-circle' : change.type === 'removed' ? 'i-heroicons-minus-circle' : 'i-heroicons-pencil'"
                    :class="change.type === 'added' ? 'text-success' : change.type === 'removed' ? 'text-error' : 'text-warning'"
                    class="size-3.5 shrink-0"
                  />
                  <span class="truncate">{{ change.subjectLabel }}</span>
                </div>
                <!-- Property changes -->
                <div class="ml-5 space-y-1">
                  <div
                    v-for="prop in change.propertyChanges"
                    :key="prop.predicateIri"
                    class="text-[11px] leading-tight cursor-default"
                    :title="formatChangeTooltip(prop)"
                  >
                    <div class="font-medium text-muted">{{ prop.predicateLabel }}</div>
                    <div v-if="prop.oldValues?.length" v-for="val in prop.oldValues" :key="'old-' + val" class="pl-2 text-error">
                      <span class="select-none">- </span><span class="line-through">{{ truncateValue(val, 40) }}</span>
                    </div>
                    <div v-if="prop.newValues?.length" v-for="val in prop.newValues" :key="'new-' + val" class="pl-2 text-success">
                      <span class="select-none">+ </span>{{ truncateValue(val, 40) }}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Empty state -->
            <div v-else class="text-center py-4">
              <UIcon name="i-heroicons-document-text" class="size-6 text-muted/40 mx-auto mb-1.5" />
              <p class="text-xs text-muted/60">Changes you make will appear here</p>
            </div>
          </div>

          <USeparator />

          <!-- Action bar -->
          <div class="px-3 py-2.5 flex items-center justify-between gap-2">
            <UButton
              size="xs"
              color="neutral"
              variant="link"
              class="cursor-pointer"
              :icon="editView === 'full' ? 'i-heroicons-cursor-arrow-rays' : 'i-heroicons-pencil-square'"
              @click="enterEdit(editView === 'full' ? 'inline' : 'full')"
            >
              Switch to {{ editView === 'full' ? 'inline' : 'full' }}
            </UButton>
            <UFieldGroup>
              <UButton
                size="sm"
                :disabled="!pendingChanges.length"
                :loading="editMode.saveStatus.value === 'saving'"
                label="Save"
                @click="pendingChanges.length === 1 ? openSaveModal(pendingChanges[0]!.subjectIri) : openSaveModal(selectedConceptUri || uri)"
              />
              <UDropdownMenu :items="saveDropdownItems(selectedConceptUri || uri)">
                <UButton
                  size="sm"
                  color="neutral"
                  variant="outline"
                  icon="i-heroicons-chevron-down"
                  :disabled="editMode.saveStatus.value === 'saving'"
                />
              </UDropdownMenu>
            </UFieldGroup>
          </div>
        </div>
      </Teleport>

      <!-- Concepts Tree with inline panel -->
      <UCard class="mb-8">
        <template #header>
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h2 class="font-semibold flex items-center gap-2">
              <UIcon name="i-heroicons-list-bullet" />
              Concepts
              <UBadge color="primary" variant="subtle">{{ activeConceptCount }} total</UBadge>
              <UIcon v-if="isTreeLoading" name="i-heroicons-arrow-path" class="size-4 text-primary animate-spin" />
            </h2>

            <div class="flex items-center gap-2">
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
            <div v-if="selectedConceptUri" class="lg:w-1/2 lg:border-l lg:border-default lg:pl-6 min-h-[200px] max-h-[600px] overflow-y-auto overflow-x-hidden">
              <!-- Edit mode: full → ConceptForm -->
              <template v-if="editView === 'full' && editMode?.isEditMode.value">
                <div class="flex items-center justify-between mb-3">
                  <h3 class="font-semibold truncate mr-2">
                    {{ editMode.resolveLabel(selectedConceptUri) }}
                  </h3>
                  <UButton
                    icon="i-heroicons-x-mark"
                    variant="ghost"
                    size="xs"
                    @click="clearConceptSelection"
                  />
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
                  @delete="editMode!.deleteConcept(selectedConceptUri!)"
                />

              </template>

              <!-- Edit mode: inline → InlineEditTable -->
              <template v-else-if="editView === 'inline' && editMode?.isEditMode.value">
                <div class="flex items-center justify-between mb-3">
                  <h3 class="font-semibold truncate mr-2">
                    {{ editMode.resolveLabel(selectedConceptUri) }}
                  </h3>
                  <UButton
                    icon="i-heroicons-x-mark"
                    variant="ghost"
                    size="xs"
                    @click="clearConceptSelection"
                  />
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
      </UCard>

      <!-- Metadata -->
      <UCard id="metadata-section" class="mb-8">
        <template #header>
          <h2 class="font-semibold flex items-center gap-2">
            <UIcon name="i-heroicons-information-circle" />
            Metadata
          </h2>
        </template>

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

        <!-- View mode -->
        <template v-else>
          <!-- Rich metadata from annotated JSON-LD -->
          <RichMetadataTable v-if="richMetadata.length" :properties="richMetadata" />

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
    </template>

    <div v-else-if="(status === 'idle' || status === 'pending') && !lastValidScheme" class="space-y-4">
      <USkeleton class="h-12 w-1/2" />
      <USkeleton class="h-6 w-3/4" />
      <USkeleton class="h-64 w-full" />
    </div>

    <UAlert v-else-if="status !== 'pending' && status !== 'idle'" color="error" title="Scheme not found" :description="`No scheme found with IRI: ${uri}`" />
  </div>
</template>
