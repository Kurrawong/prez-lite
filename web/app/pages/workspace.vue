<script setup lang="ts">
import { fetchVocabMetadata, type VocabMetadata } from '~/composables/useVocabData'
import type { SubjectChange } from '~/composables/useEditMode'
import type { PRComment } from '~/composables/usePromotion'

const router = useRouter()
const { isAuthenticated, loading: authLoading } = useGitHubAuth()
const workspace = useWorkspace()

const vocabs = ref<VocabMetadata[]>([])
const vocabsLoading = ref(false)
const selectingVocab = ref<string | null>(null)
const selectError = ref<string | null>(null)
// Slugs on work branches but not yet in the published index (shown as "new")
const unpublishedSlugs = ref<Set<string>>(new Set())
const workspaceVocabs = useWorkspaceVocabs(workspace)

// Redirect to home if not authenticated (wait for auth to finish initializing)
watch([isAuthenticated, authLoading], ([authenticated, isLoading]) => {
  if (!isLoading && !authenticated) navigateTo('/')
})

// Load definitions on mount
onMounted(() => {
  workspace.loadDefinitions()
})

// Fetch branches when auth becomes available (may resolve after mount)
watch(() => workspace.isEnabled.value, async (enabled) => {
  if (enabled && !workspace.branches.value.length) {
    await workspace.fetchBranches()
  }
}, { immediate: true })

// Load vocab list when a workspace is selected. Re-runs when branches load so
// vocabs that exist only on work branches (not yet in the published index)
// appear too — see useWorkspaceVocabs.
async function loadVocabList() {
  // Only flash the spinner on first load — refreshes swap in place
  if (!vocabs.value.length) vocabsLoading.value = true
  try {
    const res = await workspaceVocabs.fetchWorkspaceVocabs()
    vocabs.value = res.vocabs
    unpublishedSlugs.value = res.unpublished
  } catch {
    try {
      vocabs.value = await fetchVocabMetadata()
    } catch {
      vocabs.value = []
    }
  } finally {
    vocabsLoading.value = false
  }
}

watch(
  [() => workspace.state.value?.workspaceSlug, () => workspace.branches.value],
  async ([slug]) => {
    if (slug) await loadVocabList()
  },
  { immediate: true },
)

function handleSelectWorkspace(slug: string) {
  workspace.selectWorkspace(slug)
}

function handleChangeWorkspace() {
  workspace.selectWorkspace(workspace.state.value?.workspaceSlug ?? '')
  // Clear to go back to step 1 by clearing workspace entirely
  workspace.clearWorkspace()
}

async function handleSelectVocab(vocab: VocabMetadata) {
  selectingVocab.value = vocab.slug
  selectError.value = null
  const ok = await workspace.selectVocab(vocab.slug)
  selectingVocab.value = null
  if (ok) {
    navigateTo({ path: '/scheme', query: { uri: vocab.iri } })
  } else {
    selectError.value = `Failed to set up branch for "${vocab.slug}". Check that you have write access to the repository.`
  }
}

function vocabBranchName(vocabSlug: string): string {
  if (!workspace.state.value) return ''
  return `edit/${workspace.state.value.workspaceSlug}/${vocabSlug}`
}

function isVocabActive(vocabSlug: string): boolean {
  return workspace.branchExists(vocabBranchName(vocabSlug))
}

// --- Promotion (workspace-level, Layer 3: staging → main) ---

const appConfig = useAppConfig()
const promotionEnabled = computed(() =>
  (appConfig.site as any)?.promotion?.enabled !== false,
)

const promotion = usePromotion(workspace, computed(() => ''))

// Workspace-level changed vocabs
const changedVocabs = ref<{ slug: string; label: string; status: string }[]>([])
const changedVocabsLoading = ref(false)

// Fetch changed vocabs when workspace is active
watch(
  [() => workspace.activeWorkspace.value, () => promotion.stagingPR.value, () => workspace.branches.value],
  async ([ws, stagingPR]) => {
    if (!ws) { changedVocabs.value = []; return }
    changedVocabsLoading.value = true
    try {
      changedVocabs.value = await promotion.fetchChangedVocabs()
    } catch {
      changedVocabs.value = []
    } finally {
      changedVocabsLoading.value = false
    }
  },
  { immediate: true },
)

// Slug → IRI lookup from loaded vocabs
const vocabIriMap = computed(() => {
  const map = new Map<string, string>()
  for (const vocab of vocabs.value) {
    map.set(vocab.slug, vocab.iri)
  }
  return map
})

function navigateToVocab(v: { slug: string; label: string; status: string }) {
  if (v.status === 'removed') {
    selectError.value = `"${v.label}" was removed in staging — use Discard to restore it from the published version.`
    return
  }
  const iri = vocabIriMap.value.get(v.slug)
  if (!iri) {
    selectError.value = `"${v.label}" could not be opened — its file was not found on the workspace branch.`
    return
  }
  workspace.selectVocab(v.slug)
  navigateTo({ path: '/scheme', query: { uri: iri } })
}

// --- Discard staged change (unwind a vocab on the workspace branch) ---

const discardTarget = ref<{ slug: string; label: string; status: string } | null>(null)
const discarding = ref(false)
const discardError = ref<string | null>(null)
const showDiscardModal = computed({
  get: () => !!discardTarget.value,
  set: (open: boolean) => { if (!open) discardTarget.value = null },
})

function openDiscardModal(v: { slug: string; label: string; status: string }) {
  discardError.value = null
  discardTarget.value = v
}

function closeDiscardModal() {
  discardTarget.value = null
}

const discardDescription = computed(() => {
  const v = discardTarget.value
  if (!v) return ''
  const base = workspace.activeWorkspace.value?.refreshFrom ?? 'the published version'
  if (v.status === 'added') {
    return `This permanently removes "${v.label}" from the ${wsLabel.value} workspace. It has not been published, so it will be gone entirely.`
  }
  if (v.status === 'removed') {
    return `This restores "${v.label}" in the ${wsLabel.value} workspace from ${base}.`
  }
  return `This resets "${v.label}" in the ${wsLabel.value} workspace to match ${base}, dropping the staged edits.`
})

async function confirmDiscard() {
  const v = discardTarget.value
  if (!v) return
  discarding.value = true
  discardError.value = null
  const ok = await promotion.discardVocabChange(v)
  discarding.value = false
  if (!ok) {
    discardError.value = promotion.error.value ?? 'Failed to discard the change'
    return
  }
  discardTarget.value = null
  // Clear the vocab selection if the discarded vocab was open
  if (workspace.activeVocabSlug.value === v.slug && workspace.state.value) {
    workspace.selectWorkspace(workspace.state.value.workspaceSlug)
  }
  // Refresh branches, staged-changes summary and the vocab list
  await workspace.fetchBranches()
  changedVocabs.value = await promotion.fetchChangedVocabs()
  await loadVocabList()
}

// Per-vocab status derived from branches + changedVocabs
const vocabStatusMap = computed(() => {
  const map = new Map<string, { hasEditBranch: boolean; stagingStatus: string | null }>()
  for (const vocab of vocabs.value) {
    const hasEditBranch = workspace.branchExists(vocabBranchName(vocab.slug))
    const changed = changedVocabs.value.find(v => v.slug === vocab.slug)
    map.set(vocab.slug, { hasEditBranch, stagingStatus: changed?.status ?? null })
  }
  return map
})

// Staging summary
const stagingPR = computed(() => promotion.stagingPR.value ?? null)
const hasOpenPR = computed(() => !!stagingPR.value && !stagingPR.value.merged)
const stagingChangeCount = computed(() => changedVocabs.value.length)

// --- Review Modal ---
const showReviewModal = ref(false)
const promotionMode = ref<'create' | 'view' | 'submitted'>('create')
const prComments = ref<PRComment[]>([])
const prCommentsLoading = ref(false)
const prCreating = ref(false)
const prMerging = ref(false)
const prRejecting = ref(false)
const prCommenting = ref(false)
const promotionError = ref<string | null>(null)

// --- Create vocabulary ---
const vocabCreate = useVocabCreate()
const showCreateModal = ref(false)
const createIriBase = ref('')

async function openCreateModal() {
  createIriBase.value = await vocabCreate.suggestIriBase()
  showCreateModal.value = true
}

async function handleCreateVocab(payload: { title: string; definition: string; slug: string; iri: string }) {
  const res = await vocabCreate.createVocabulary(payload)
  if (res.ok && res.iri) {
    showCreateModal.value = false
    navigateTo({ path: '/scheme', query: { uri: res.iri } })
  }
}

async function handleSubmitForPublishing() {
  promotionError.value = null
  // Refresh live PR state first so we don't offer Submit on an already-open PR (#41)
  await promotion.findExistingPRs(true)
  promotionMode.value = 'create'
  showReviewModal.value = true
}

async function handleViewPR() {
  promotionMode.value = 'view'
  prComments.value = []
  prCommentsLoading.value = true
  showReviewModal.value = true

  // Force a fresh lookup so the review screen reflects current PR state (#41)
  await promotion.findExistingPRs(true)
  const pr = promotion.stagingPR.value
  if (pr) {
    prComments.value = await promotion.getPRComments(pr.number)
  }
  prCommentsLoading.value = false
}

async function handleCreatePR(title: string, body: string) {
  const branches = promotion.getBranches('approved')
  if (!branches) return

  prCreating.value = true
  promotionError.value = null

  const wsOk = await workspace.ensureWorkspaceBranch()
  if (!wsOk) {
    promotionError.value = 'Failed to create workspace branch'
    prCreating.value = false
    return
  }

  const pr = await promotion.createPR(branches.head, branches.base, title, body)
  prCreating.value = false

  if (pr) {
    promotionMode.value = 'submitted'
    prComments.value = []
    promotionError.value = null
  } else {
    promotionError.value = promotion.error.value ?? 'Failed to submit for review'
  }
}

async function handleMergePR() {
  const pr = promotion.stagingPR.value
  if (!pr) return

  prMerging.value = true
  promotionError.value = null
  const ok = await promotion.mergePR(pr.number)
  prMerging.value = false

  if (ok) {
    // NB: do NOT delete the head branch here. For publishing (Layer 3) the head
    // is the workspace root branch (e.g. develop) — a long-lived integration
    // branch, not an ephemeral edit branch. Deleting it removed the workspace
    // branch entirely and broke the workspace until it was recreated. Ephemeral
    // edit-branch cleanup happens in the Layer 2 flow (scheme.vue), guarded to
    // promotionLayer === 'pending'.
    await workspace.fetchBranches()
    changedVocabs.value = await promotion.fetchChangedVocabs()
  } else {
    promotionError.value = promotion.error.value ?? 'Failed to complete review'
  }
}

async function handleRejectPR(comment: string) {
  const pr = promotion.stagingPR.value
  if (!pr) return

  prRejecting.value = true
  promotionError.value = null
  const ok = await promotion.closePR(pr.number, comment)
  prRejecting.value = false

  if (ok) {
    showReviewModal.value = false

    // NB: do NOT delete the head branch on reject. For publishing the head is
    // the workspace root branch (e.g. develop); its accumulated changes must
    // survive a rejected publish so they can be re-submitted. Only the PR is
    // closed. (Deleting develop here previously discarded all workspace work.)
    await workspace.fetchBranches()
    promotion.findExistingPRs(true)
    changedVocabs.value = await promotion.fetchChangedVocabs()
  } else {
    promotionError.value = promotion.error.value ?? 'Failed to reject review'
  }
}

async function handlePRComment(body: string) {
  const pr = promotion.stagingPR.value
  if (!pr) return

  prCommenting.value = true
  try {
    const ok = await promotion.addPRComment(pr.number, body)
    if (ok) {
      prComments.value = await promotion.getPRComments(pr.number)
    }
  } finally {
    prCommenting.value = false
  }
}

const promotionBranches = computed(() => {
  return promotion.getBranches('approved') ?? { head: '', base: '' }
})

const promotionDefaultTitle = computed(() => {
  return promotion.generateTitle('approved')
})

const wsLabel = computed(() =>
  workspace.activeWorkspace.value?.label ?? 'Staging',
)

/** Map changedVocabs to SubjectChange[] so ReviewModal can display them */
const promotionChanges = computed<SubjectChange[]>(() =>
  changedVocabs.value.map(v => ({
    subjectIri: vocabIriMap.value.get(v.slug) ?? v.slug,
    subjectLabel: v.label,
    type: v.status === 'added' ? 'added' as const : 'modified' as const,
    propertyChanges: [],
  })),
)

const reviewModalTitle = computed(() => {
  if (promotionMode.value === 'create') return `Publish ${wsLabel.value} to Production`
  if (promotionMode.value === 'submitted') return 'Publishing Submitted'
  return `Publish ${wsLabel.value} to Production`
})

// Breadcrumb for workspace page
const workspaceBreadcrumbs = computed(() => {
  if (!workspace.activeWorkspace.value) return [{ label: 'Workspace' }]
  return [
    { label: 'Workspace' },
    { label: workspace.activeWorkspace.value.label },
  ]
})
</script>

<template>
  <div class="py-8 max-w-2xl mx-auto">
    <!-- Loading definitions -->
    <div v-if="!workspace.definitionsLoaded.value" class="py-16 text-center">
      <UIcon name="i-heroicons-arrow-path" class="size-6 animate-spin text-muted" />
      <p class="text-sm text-muted mt-3">Loading workspaces...</p>
    </div>

    <!-- No definitions configured -->
    <div v-else-if="!workspace.definitions.value.length" class="py-16 text-center">
      <UIcon name="i-heroicons-exclamation-circle" class="size-8 text-muted mb-3" />
      <p class="text-sm text-muted">No workspaces configured.</p>
      <p class="text-xs text-muted mt-1">Add workspace definitions to <code>data/config/workspaces.ttl</code>.</p>
    </div>

    <!-- Step 1: Choose workspace (no workspace selected) -->
    <template v-else-if="!workspace.state.value">
      <div class="flex items-center gap-3 mb-2">
        <UIcon name="i-heroicons-folder-open" class="size-7 text-primary" />
        <h1 class="text-3xl font-bold">Workspace</h1>
      </div>
      <p class="text-muted mb-8">Choose your workspace to get started.</p>

      <div class="grid gap-4" :class="workspace.definitions.value.length <= 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'">
        <button
          v-for="def in workspace.definitions.value"
          :key="def.slug"
          class="flex flex-col items-center gap-3 p-6 rounded-xl border border-default hover:border-primary hover:bg-primary/5 transition-all text-center"
          @click="handleSelectWorkspace(def.slug)"
        >
          <UIcon :name="def.icon ?? 'i-heroicons-folder'" class="size-8 text-primary" />
          <div>
            <p class="font-semibold">{{ def.label }}</p>
            <p class="text-xs text-muted mt-1">{{ def.description }}</p>
          </div>
        </button>
      </div>
    </template>

    <!-- Step 2: Dashboard (workspace selected) -->
    <template v-else>
      <UBreadcrumb :items="workspaceBreadcrumbs" class="mb-6" />

      <div class="flex items-center gap-3 mb-8">
        <UIcon :name="workspace.activeWorkspace.value?.icon ?? 'i-heroicons-folder'" class="size-5 text-primary" />
        <p class="text-muted">
          <span class="font-medium text-default">{{ workspace.activeWorkspace.value?.label ?? workspace.state.value.workspaceSlug }}</span>
          workspace
        </p>
        <UButton
          variant="link"
          size="xs"
          @click="handleChangeWorkspace"
        >
          Change
        </UButton>
      </div>

      <!-- Loading branches -->
      <div v-if="workspace.branchesLoading.value" class="py-12 text-center">
        <UIcon name="i-heroicons-arrow-path" class="size-5 animate-spin text-muted" />
        <p class="text-sm text-muted mt-3">Loading branches...</p>
      </div>

      <!-- Error loading branches -->
      <div v-else-if="workspace.branchesError.value" class="py-12 text-center">
        <UIcon name="i-heroicons-exclamation-triangle" class="size-6 text-error" />
        <p class="text-sm text-error mt-3">{{ workspace.branchesError.value }}</p>
      </div>

      <template v-else>
        <!-- Branch Status Card -->
        <div
          v-if="promotionEnabled && !vocabsLoading"
          class="border border-default rounded-xl p-5 mb-8"
        >
          <div class="flex items-start gap-3 mb-3">
            <span class="w-2.5 h-2.5 rounded-full mt-1 shrink-0" :class="stagingChangeCount > 0 || hasOpenPR ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'" />
            <div class="flex-1 min-w-0">
              <p v-if="changedVocabsLoading" class="text-sm text-muted">
                Checking staging changes...
              </p>
              <p v-else-if="hasOpenPR" class="text-sm font-medium">
                Publishing awaiting approval
              </p>
              <p v-else-if="stagingChangeCount > 0" class="text-sm font-medium">
                {{ stagingChangeCount }} vocabular{{ stagingChangeCount === 1 ? 'y' : 'ies' }} changed in staging
              </p>
              <p v-else class="text-sm text-muted">
                No changes in staging
              </p>
            </div>
          </div>

          <!-- Changed vocabs list -->
          <div v-if="changedVocabs.length > 0" class="ml-5.5 space-y-0.5 mb-4">
            <div
              v-for="v in changedVocabs"
              :key="v.slug"
              class="flex items-center gap-1 -mx-2"
            >
              <button
                type="button"
                class="flex-1 min-w-0 flex items-center gap-2 text-sm py-1 px-2 rounded-md hover:bg-muted/50 transition-colors text-left"
                @click="navigateToVocab(v)"
              >
                <UIcon name="i-heroicons-book-open" class="size-3.5 shrink-0 text-muted" />
                <span class="font-medium truncate text-primary hover:underline">{{ v.label }}</span>
                <span class="text-xs text-muted ml-auto capitalize">{{ v.status }}</span>
                <UIcon name="i-heroicons-chevron-right" class="size-3 text-muted shrink-0" />
              </button>
              <UButton
                icon="i-heroicons-arrow-uturn-left"
                color="error"
                variant="ghost"
                size="xs"
                :title="`Discard staged change to ${v.label}`"
                @click="openDiscardModal(v)"
              />
            </div>
          </div>

          <!-- Promotion actions -->
          <div v-if="stagingChangeCount > 0 || hasOpenPR" class="ml-5.5">
            <template v-if="hasOpenPR">
              <div class="flex items-center gap-3">
                <UBadge color="success" variant="subtle" size="xs">
                  Approval pending
                </UBadge>
                <UButton
                  size="xs"
                  variant="soft"
                  @click="handleViewPR"
                >
                  Approve or Reject
                </UButton>
              </div>
            </template>
            <template v-else>
              <UButton
                size="sm"
                variant="soft"
                icon="i-heroicons-arrow-up-tray"
                @click="handleSubmitForPublishing"
              >
                Submit for Publishing
              </UButton>
            </template>
          </div>
        </div>

        <!-- Vocabularies header + create -->
        <div class="flex items-center justify-between mt-2 mb-3">
          <div>
            <h2 class="text-lg font-semibold">Vocabularies</h2>
            <p class="text-xs text-muted">Click a vocabulary to open it in the editor.</p>
          </div>
          <UButton
            size="sm"
            icon="i-heroicons-plus"
            variant="soft"
            @click="openCreateModal"
          >
            New vocabulary
          </UButton>
        </div>

        <!-- Loading vocabs -->
        <div v-if="vocabsLoading" class="py-12 text-center">
          <UIcon name="i-heroicons-arrow-path" class="size-5 animate-spin text-muted" />
          <p class="text-sm text-muted mt-3">Loading vocabularies...</p>
        </div>

        <!-- No vocabs found -->
        <div v-else-if="!vocabs.length" class="py-12 text-center">
          <UIcon name="i-heroicons-document-text" class="size-8 text-muted mb-3" />
          <p class="text-sm text-muted">No vocabularies found.</p>
        </div>

        <!-- Vocab list -->
        <div v-else class="space-y-1">
          <!-- Error selecting vocab -->
          <UAlert v-if="selectError" color="error" icon="i-heroicons-exclamation-triangle" :description="selectError" class="mb-4" />

          <button
            v-for="vocab in vocabs"
            :key="vocab.slug"
            class="w-full flex items-center gap-4 px-4 py-3.5 rounded-lg hover:bg-muted/50 transition-colors text-left group"
            :class="{ 'bg-primary/10 ring-1 ring-primary/30': workspace.activeVocabSlug.value === vocab.slug }"
            :disabled="selectingVocab === vocab.slug"
            @click="handleSelectVocab(vocab)"
          >
            <div class="flex-1 min-w-0">
              <p class="font-medium truncate">{{ vocab.prefLabel }}</p>
              <p class="text-xs text-muted mt-0.5">
                {{ vocab.conceptCount }} concept{{ vocab.conceptCount !== 1 ? 's' : '' }}
              </p>
            </div>

            <!-- Status badges -->
            <div class="flex items-center gap-1.5 shrink-0">
              <UBadge
                v-if="unpublishedSlugs.has(vocab.slug)"
                color="warning"
                variant="subtle"
                size="xs"
                title="Not yet published — exists only in the workspace"
              >
                new
              </UBadge>
              <UBadge
                v-if="vocabStatusMap.get(vocab.slug)?.hasEditBranch"
                color="primary"
                variant="subtle"
                size="xs"
                title="Edit branch exists — vocabulary is being edited"
              >
                editing
              </UBadge>
              <UBadge
                v-if="vocabStatusMap.get(vocab.slug)?.stagingStatus"
                color="success"
                variant="subtle"
                size="xs"
                :title="`Changed in staging (${vocabStatusMap.get(vocab.slug)?.stagingStatus})`"
              >
                staged
              </UBadge>
              <UBadge
                v-if="workspace.activeVocabSlug.value === vocab.slug"
                color="neutral"
                variant="subtle"
                size="xs"
              >
                current
              </UBadge>
            </div>

            <UIcon
              v-if="selectingVocab === vocab.slug"
              name="i-heroicons-arrow-path"
              class="size-4 animate-spin text-muted shrink-0"
              aria-hidden="true"
            />
            <UIcon
              v-else
              name="i-heroicons-chevron-right"
              class="size-4 text-muted shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
              aria-hidden="true"
            />
          </button>
        </div>
      </template>

      <!-- Review Modal -->
      <UModal v-model:open="showReviewModal">
        <template #header>
          <h3 class="font-semibold">
            {{ reviewModalTitle }}
          </h3>
        </template>
        <template #body>
          <ReviewModal
            :mode="promotionMode"
            layer-name="approved"
            :changes="promotionChanges"
            :existing-p-r="stagingPR"
            :comments="prComments"
            :comments-loading="prCommentsLoading"
            :creating="prCreating"
            :vocab-label="wsLabel"
            :source-branch="promotionBranches.head"
            :target-branch="promotionBranches.base"
            :default-title="promotionDefaultTitle"
            :error="promotionError"
            :merging="prMerging"
            :rejecting="prRejecting"
            :commenting="prCommenting"
            :workspace-label="wsLabel"
            @create="handleCreatePR"
            @merge="handleMergePR"
            @reject="handleRejectPR"
            @comment="handlePRComment"
            @close="showReviewModal = false"
          />
        </template>
      </UModal>

      <!-- Discard Staged Change Modal -->
      <UModal v-model:open="showDiscardModal">
        <template #header>
          <h3 class="font-semibold">Discard staged change</h3>
        </template>
        <template #body>
          <div class="space-y-4">
            <p class="text-sm">{{ discardDescription }}</p>
            <UAlert
              v-if="discardError"
              color="error"
              icon="i-heroicons-exclamation-triangle"
              :description="discardError"
            />
            <div class="flex justify-end gap-2">
              <UButton
                variant="ghost"
                color="neutral"
                :disabled="discarding"
                @click="closeDiscardModal"
              >
                Cancel
              </UButton>
              <UButton
                color="error"
                icon="i-heroicons-arrow-uturn-left"
                :loading="discarding"
                @click="confirmDiscard"
              >
                Discard
              </UButton>
            </div>
          </div>
        </template>
      </UModal>

      <!-- Create Vocabulary Modal -->
      <UModal v-model:open="showCreateModal">
        <template #header>
          <h3 class="font-semibold">New vocabulary</h3>
        </template>
        <template #body>
          <CreateVocabModal
            :creating="vocabCreate.creating.value"
            :error="vocabCreate.error.value"
            :iri-base="createIriBase"
            @create="handleCreateVocab"
            @close="showCreateModal = false"
          />
        </template>
      </UModal>
    </template>
  </div>
</template>
