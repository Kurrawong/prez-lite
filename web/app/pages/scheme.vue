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
const { isAuthenticated, token } = useGitHubAuth()

const vocabSlugForEditor = computed(() => getVocabByIri(uri.value)?.slug)
const [editorOwner, editorRepoName] = (githubRepo as string).split('/')
const editorAvailable = computed(() => !!(editorOwner && editorRepoName && isAuthenticated.value && vocabSlugForEditor.value))
const editorFilePath = computed(() => `${githubVocabPath}/${vocabSlugForEditor.value}.ttl`)

// Edit view: 'none' | 'form' | 'code'
const editView = ref<'none' | 'form' | 'code'>('none')

// --- Code Editor (Monaco) ---
const colorMode = useColorMode()
const monacoTheme = computed(() => colorMode.value === 'dark' ? 'prez-dark' : 'prez-light')

const editorContent = ref('')
const editorLoaded = ref(false)
const editorSha = ref('')
const editorLoading = ref(false)
const editorError = ref<string | null>(null)
const saveMessage = ref('')
const codeSaveStatus = ref<'idle' | 'saving' | 'success' | 'error'>('idle')

async function loadEditor() {
  if (!token.value || !vocabSlugForEditor.value) return
  editorLoading.value = true
  editorError.value = null
  try {
    const res = await fetch(
      `https://api.github.com/repos/${editorOwner}/${editorRepoName}/contents/${editorFilePath.value}?ref=${githubBranch}`,
      { headers: { Authorization: `Bearer ${token.value}` } },
    )
    if (!res.ok) {
      editorError.value = res.status === 404 ? 'File not found' : `GitHub API error: ${res.status}`
      return
    }
    const data = await res.json()
    editorSha.value = data.sha
    editorContent.value = new TextDecoder().decode(
      Uint8Array.from(atob(data.content.replace(/\n/g, '')), (c) => c.charCodeAt(0)),
    )
    editorLoaded.value = true
  } catch (e) {
    editorError.value = e instanceof Error ? e.message : 'Failed to load file'
  } finally {
    editorLoading.value = false
  }
}

async function saveEditor() {
  if (!token.value || !vocabSlugForEditor.value) return
  codeSaveStatus.value = 'saving'
  editorError.value = null
  try {
    const msg = saveMessage.value.trim() || `Update ${vocabSlugForEditor.value}.ttl`
    const encoded = btoa(Array.from(new TextEncoder().encode(editorContent.value), (b) => String.fromCharCode(b)).join(''))
    const res = await fetch(
      `https://api.github.com/repos/${editorOwner}/${editorRepoName}/contents/${editorFilePath.value}`,
      {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token.value}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, content: encoded, sha: editorSha.value, branch: githubBranch }),
      },
    )
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      editorError.value = (body as { message?: string }).message || `Save failed: ${res.status}`
      codeSaveStatus.value = 'error'
      return
    }
    const data = await res.json()
    editorSha.value = data.content.sha
    saveMessage.value = ''
    codeSaveStatus.value = 'success'
  } catch (e) {
    editorError.value = e instanceof Error ? e.message : 'Failed to save'
    codeSaveStatus.value = 'error'
  }
  setTimeout(() => { codeSaveStatus.value = 'idle' }, 3000)
}

// --- Structured Form Editor ---
const editMode = (editorOwner && editorRepoName)
  ? useEditMode(editorOwner, editorRepoName, editorFilePath as Ref<string>, githubBranch as string, uri)
  : null

// --- Edit mode state ---
const editingConceptIri = ref<string | null>(null)
const editingScheme = ref(false)
const conceptFormMode = ref<'inline' | 'full'>('inline')
const schemeFormMode = ref<'inline' | 'full'>('inline')

// Save modal state
const showSaveModal = ref(false)
const saveModalSubjectIri = ref<string | null>(null)

// Add Concept dialog
const showAddConcept = ref(false)
const newConceptLocalName = ref('')
const newConceptLabel = ref('')
const newConceptBroader = ref('')

// --- Edit mode navigation ---

async function enterEdit() {
  if (editView.value !== 'none') return
  editView.value = 'form'
  if (editMode) {
    await editMode.enterEditMode()
  }
}

async function switchEditView(view: 'form' | 'code') {
  if (view === editView.value) return
  if (view === 'code' && !editorLoaded.value) {
    await loadEditor()
  }
  if (view === 'form' && editMode && !editMode.isEditMode.value) {
    await editMode.enterEditMode()
  }
  editView.value = view
}

function exitEdit() {
  if (editMode?.isEditMode.value) {
    const exited = editMode.exitEditMode()
    if (!exited) return
  }
  editView.value = 'none'
  editingConceptIri.value = null
  editingScheme.value = false
}

// --- Concept editing ---

function startEditingConcept(iri: string) {
  editingConceptIri.value = iri
  if (editMode) {
    editMode.selectedConceptIri.value = iri
  }
  // Select in URL if not already selected
  if (selectedConceptUri.value !== iri) {
    router.replace({ path: '/scheme', query: { uri: uri.value, concept: iri } })
  }
}

function selectConcept(conceptUri: string) {
  editingConceptIri.value = null
  router.replace({
    path: '/scheme',
    query: { uri: uri.value, concept: conceptUri }
  })
}

function clearConceptSelection() {
  editingConceptIri.value = null
  router.replace({
    path: '/scheme',
    query: { uri: uri.value }
  })
}

// Properties for the concept being edited (respects inline/full mode)
const editingConceptProperties = computed(() => {
  if (!editMode || !editingConceptIri.value) return []
  void editMode.storeVersion.value
  return editMode.getPropertiesForSubject(
    editingConceptIri.value,
    'concept',
    conceptFormMode.value === 'inline',
  )
})

// Properties for the scheme being edited (respects inline/full mode)
const editingSchemeProperties = computed(() => {
  if (!editMode || !editingScheme.value) return []
  void editMode.storeVersion.value
  return editMode.getPropertiesForSubject(
    uri.value,
    'conceptScheme',
    schemeFormMode.value === 'inline',
  )
})

// --- Save modal ---

function subjectHasChanges(iri: string): boolean {
  if (!editMode) return false
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
    if (editingConceptIri.value === saveModalSubjectIri.value) {
      editingConceptIri.value = null
    }
    if (saveModalSubjectIri.value === uri.value) {
      editingScheme.value = false
    }
    saveModalSubjectIri.value = null
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
    startEditingConcept(conceptIri)
  }
  showAddConcept.value = false
  newConceptLocalName.value = ''
  newConceptLabel.value = ''
  newConceptBroader.value = ''
}

// --- Tree ---

const searchQuery = ref('')
const expandAll = ref(false)

// Use edit mode tree items when in form edit mode, otherwise static
const activeTreeItems = computed(() => {
  if (editView.value === 'form' && editMode?.isEditMode.value) {
    return editMode!.treeItems.value
  }
  return displayTreeItems.value
})

const activeConceptCount = computed(() => {
  if (editView.value === 'form' && editMode?.isEditMode.value) {
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
const treeEditMode = computed(() => editView.value === 'form' && !!editMode?.isEditMode.value)

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
    <UBreadcrumb :items="breadcrumbs" class="mb-6" />

    <div v-if="!uri" class="text-center py-12">
      <UAlert color="warning" title="No scheme selected" description="Please select a vocabulary from the vocabularies page" />
    </div>

    <template v-else-if="displayScheme">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold mb-2">{{ getLabel(displayScheme.prefLabel) }}</h1>
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

          <!-- Edit: single pencil when not in edit mode -->
          <UButton
            v-if="editorAvailable && editView === 'none'"
            icon="i-heroicons-pencil-square"
            color="neutral"
            variant="ghost"
            size="xs"
            aria-label="Enter edit mode"
            @click="enterEdit"
          />

          <!-- Edit mode toolbar -->
          <template v-if="editorAvailable && editView !== 'none'">
            <UButtonGroup size="xs">
              <UButton
                icon="i-heroicons-list-bullet"
                :color="editView === 'form' ? 'primary' : 'neutral'"
                :variant="editView === 'form' ? 'solid' : 'ghost'"
                aria-label="Structured editor"
                @click="switchEditView('form')"
              />
              <UButton
                icon="i-heroicons-code-bracket"
                :color="editView === 'code' ? 'primary' : 'neutral'"
                :variant="editView === 'code' ? 'solid' : 'ghost'"
                aria-label="Code editor"
                @click="switchEditView('code')"
              />
            </UButtonGroup>
            <UBadge v-if="editMode?.isDirty.value" color="warning" variant="subtle" size="sm">
              Unsaved changes
            </UBadge>
            <UButton
              icon="i-heroicons-x-mark"
              color="neutral"
              variant="ghost"
              size="xs"
              aria-label="Exit edit mode"
              @click="exitEdit"
            />
          </template>

          <!-- Fallback: edit on GitHub.dev -->
          <UButton
            v-else-if="!editorAvailable && githubEditUrl"
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

      <!-- Edit mode loading -->
      <div v-if="editView === 'form' && editMode?.loading.value" class="mb-4">
        <div class="flex items-center gap-2 text-muted py-4">
          <UIcon name="i-heroicons-arrow-path" class="size-4 animate-spin" />
          <span class="text-sm">Loading vocabulary from GitHub...</span>
        </div>
      </div>

      <!-- Edit mode error -->
      <UAlert
        v-if="editView === 'form' && editMode?.error.value"
        color="error"
        icon="i-heroicons-exclamation-circle"
        :title="editMode.error.value"
        class="mb-4"
      />

      <!-- Code Editor (Monaco) -->
      <div v-if="editView === 'code'" class="mb-8">
        <UAlert
          v-if="editorError"
          color="error"
          icon="i-heroicons-exclamation-circle"
          :title="editorError"
          class="mb-4"
        />

        <template v-if="editorLoaded">
          <div class="border border-default rounded-lg overflow-hidden">
            <MonacoEditor
              v-model="editorContent"
              lang="turtle"
              :options="{ theme: monacoTheme, minimap: { enabled: false }, wordWrap: 'on', scrollBeyondLastLine: false }"
              class="h-[28rem]"
            />
          </div>

          <div class="flex items-center gap-3 mt-3">
            <input
              v-model="saveMessage"
              type="text"
              placeholder="Commit message (optional)"
              class="flex-1 px-3 py-1.5 text-sm border border-default rounded-md bg-default"
            />
            <UButton
              icon="i-heroicons-check"
              :loading="codeSaveStatus === 'saving'"
              :disabled="codeSaveStatus === 'saving'"
              @click="saveEditor"
            >
              Save to GitHub
            </UButton>
          </div>

          <p v-if="codeSaveStatus === 'success'" class="text-sm text-success mt-2">
            Saved successfully.
          </p>
          <p v-if="codeSaveStatus === 'error' && editorError" class="text-sm text-error mt-2">
            {{ editorError }}
          </p>
        </template>

        <div v-else-if="editorLoading" class="flex items-center gap-2 text-muted">
          <UIcon name="i-heroicons-arrow-path" class="size-4 animate-spin" />
          <span class="text-sm">Loading file from GitHub...</span>
        </div>
      </div>

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
                @edit="startEditingConcept"
              />
            </div>

            <!-- Concept detail panel -->
            <div v-if="selectedConceptUri" class="lg:w-1/2 lg:border-l lg:border-default lg:pl-6 min-h-[200px] max-h-[600px] overflow-y-auto">
              <!-- Editing this concept -->
              <template v-if="editingConceptIri === selectedConceptUri && editMode?.isEditMode.value">
                <div class="flex items-center justify-between mb-3">
                  <h3 class="font-semibold truncate mr-2">
                    {{ editMode.resolveLabel(editingConceptIri) }}
                  </h3>
                  <div class="flex items-center gap-2 shrink-0">
                    <UButtonGroup size="xs">
                      <UButton
                        :color="conceptFormMode === 'inline' ? 'primary' : 'neutral'"
                        :variant="conceptFormMode === 'inline' ? 'solid' : 'ghost'"
                        @click="conceptFormMode = 'inline'"
                      >
                        Inline
                      </UButton>
                      <UButton
                        :color="conceptFormMode === 'full' ? 'primary' : 'neutral'"
                        :variant="conceptFormMode === 'full' ? 'solid' : 'ghost'"
                        @click="conceptFormMode = 'full'"
                      >
                        Full
                      </UButton>
                    </UButtonGroup>
                    <UButton
                      icon="i-heroicons-x-mark"
                      variant="ghost"
                      size="xs"
                      @click="editingConceptIri = null"
                    />
                  </div>
                </div>

                <ConceptForm
                  :subject-iri="editingConceptIri"
                  :properties="editingConceptProperties"
                  :concepts="editMode.concepts.value"
                  :mode="conceptFormMode"
                  @update:value="(pred, oldVal, newVal) => editMode!.updateValue(editingConceptIri!, pred, oldVal, newVal)"
                  @update:language="(pred, oldVal, newLang) => editMode!.updateValueLanguage(editingConceptIri!, pred, oldVal, newLang)"
                  @add:value="(pred) => editMode!.addValue(editingConceptIri!, pred)"
                  @remove:value="(pred, val) => editMode!.removeValue(editingConceptIri!, pred, val)"
                  @update:broader="(newIris, oldIris) => editMode!.syncBroaderNarrower(editingConceptIri!, newIris, oldIris)"
                  @update:related="(newIris, oldIris) => editMode!.syncRelated(editingConceptIri!, newIris, oldIris)"
                  @delete="editMode!.deleteConcept(editingConceptIri!)"
                />

                <!-- Per-concept save -->
                <div class="mt-4 pt-3 border-t border-default flex items-center justify-between">
                  <p v-if="editMode.saveStatus.value === 'success'" class="text-sm text-success">
                    Saved successfully.
                  </p>
                  <p v-else-if="editMode.saveStatus.value === 'error' && editMode.error.value" class="text-sm text-error">
                    {{ editMode.error.value }}
                  </p>
                  <span v-else />
                  <UButton
                    :disabled="!subjectHasChanges(editingConceptIri)"
                    :loading="editMode.saveStatus.value === 'saving'"
                    size="sm"
                    @click="openSaveModal(editingConceptIri)"
                  >
                    Save
                  </UButton>
                </div>
              </template>

              <!-- View mode (with Edit button when in edit mode) -->
              <template v-else>
                <div v-if="treeEditMode" class="flex justify-end mb-2">
                  <UButton
                    icon="i-heroicons-pencil-square"
                    variant="soft"
                    size="xs"
                    @click="startEditingConcept(selectedConceptUri!)"
                  >
                    Edit
                  </UButton>
                </div>
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
      <UCard class="mb-8">
        <template #header>
          <div class="flex items-center justify-between">
            <h2 class="font-semibold flex items-center gap-2">
              <UIcon name="i-heroicons-information-circle" />
              Metadata
            </h2>
            <!-- Edit button for scheme metadata (edit mode only) -->
            <UButton
              v-if="treeEditMode && !editingScheme"
              icon="i-heroicons-pencil-square"
              variant="soft"
              size="xs"
              @click="editingScheme = true"
            >
              Edit
            </UButton>
          </div>
        </template>

        <!-- Editing scheme properties -->
        <template v-if="editingScheme && editMode?.isEditMode.value">
          <div class="flex items-center justify-between mb-3">
            <UButtonGroup size="xs">
              <UButton
                :color="schemeFormMode === 'inline' ? 'primary' : 'neutral'"
                :variant="schemeFormMode === 'inline' ? 'solid' : 'ghost'"
                @click="schemeFormMode = 'inline'"
              >
                Inline
              </UButton>
              <UButton
                :color="schemeFormMode === 'full' ? 'primary' : 'neutral'"
                :variant="schemeFormMode === 'full' ? 'solid' : 'ghost'"
                @click="schemeFormMode = 'full'"
              >
                Full
              </UButton>
            </UButtonGroup>
            <UButton
              icon="i-heroicons-x-mark"
              variant="ghost"
              size="xs"
              @click="editingScheme = false"
            />
          </div>

          <ConceptForm
            :subject-iri="uri"
            :properties="editingSchemeProperties"
            :concepts="editMode!.concepts.value"
            :is-scheme="true"
            :mode="schemeFormMode"
            @update:value="(pred, oldVal, newVal) => editMode!.updateValue(uri, pred, oldVal, newVal)"
            @update:language="(pred, oldVal, newLang) => editMode!.updateValueLanguage(uri, pred, oldVal, newLang)"
            @add:value="(pred) => editMode!.addValue(uri, pred)"
            @remove:value="(pred, val) => editMode!.removeValue(uri, pred, val)"
          />

          <!-- Per-scheme save -->
          <div class="mt-4 pt-3 border-t border-default flex items-center justify-between">
            <p v-if="editMode!.saveStatus.value === 'success'" class="text-sm text-success">
              Saved successfully.
            </p>
            <p v-else-if="editMode!.saveStatus.value === 'error' && editMode!.error.value" class="text-sm text-error">
              {{ editMode!.error.value }}
            </p>
            <span v-else />
            <UButton
              :disabled="!subjectHasChanges(uri)"
              :loading="editMode!.saveStatus.value === 'saving'"
              size="sm"
              @click="openSaveModal(uri)"
            >
              Save
            </UButton>
          </div>
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
