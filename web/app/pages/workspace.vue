<script setup lang="ts">
import { fetchVocabMetadata, type VocabMetadata } from '~/composables/useVocabData'

const router = useRouter()
const { isAuthenticated } = useGitHubAuth()
const workspace = useWorkspace()

const vocabs = ref<VocabMetadata[]>([])
const vocabsLoading = ref(false)
const selectingVocab = ref<string | null>(null)
const selectError = ref<string | null>(null)

// Redirect to home if not authenticated
watch(isAuthenticated, (authenticated) => {
  if (!authenticated) navigateTo('/')
}, { immediate: true })

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

// Load vocab list when a workspace is selected
watch(() => workspace.state.value?.workspaceSlug, async (slug) => {
  if (slug) {
    vocabsLoading.value = true
    try {
      vocabs.value = await fetchVocabMetadata()
    } catch {
      vocabs.value = []
    } finally {
      vocabsLoading.value = false
    }
  }
}, { immediate: true })

function handleSelectWorkspace(slug: string) {
  workspace.selectWorkspace(slug)
}

function handleChangeWorkspace() {
  workspace.selectWorkspace(workspace.state.value?.workspaceSlug ?? '')
  // Clear to go back to step 1 by clearing workspace entirely
  workspace.clearWorkspace()
}

async function handleSelectVocab(vocabSlug: string) {
  selectingVocab.value = vocabSlug
  selectError.value = null
  const ok = await workspace.selectVocab(vocabSlug)
  selectingVocab.value = null
  if (ok) {
    router.back()
  } else {
    selectError.value = `Failed to set up branch for "${vocabSlug}". Check that you have write access to the repository.`
  }
}

function vocabBranchName(vocabSlug: string): string {
  if (!workspace.state.value) return ''
  return `${workspace.state.value.workspaceSlug}/${vocabSlug}`
}

function isVocabActive(vocabSlug: string): boolean {
  return workspace.branchExists(vocabBranchName(vocabSlug))
}
</script>

<template>
  <div class="py-8 max-w-2xl mx-auto">
    <div class="flex items-center gap-3 mb-2">
      <UIcon name="i-heroicons-folder-open" class="size-7 text-primary" />
      <h1 class="text-3xl font-bold">Workspace</h1>
    </div>

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

    <!-- Step 2: Choose vocabulary (workspace selected) -->
    <template v-else>
      <div class="flex items-center gap-3 mb-8">
        <UIcon :name="workspace.activeWorkspace.value?.icon ?? 'i-heroicons-folder'" class="size-5 text-primary" />
        <p class="text-muted">
          <span class="font-medium text-default">{{ workspace.activeWorkspace.value?.label ?? workspace.state.value.workspaceSlug }}</span>
          workspace — select a vocabulary to edit.
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

      <!-- Loading vocabs -->
      <div v-else-if="vocabsLoading" class="py-12 text-center">
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
          @click="handleSelectVocab(vocab.slug)"
        >
          <div class="flex-1 min-w-0">
            <p class="font-medium truncate">{{ vocab.prefLabel }}</p>
            <p class="text-xs text-muted mt-0.5">
              {{ vocab.conceptCount }} concept{{ vocab.conceptCount !== 1 ? 's' : '' }}
            </p>
          </div>

          <UBadge
            v-if="workspace.activeVocabSlug.value === vocab.slug"
            color="primary"
            variant="subtle"
            size="xs"
          >
            active
          </UBadge>
          <UBadge
            v-else-if="isVocabActive(vocab.slug)"
            color="success"
            variant="subtle"
            size="xs"
          >
            has branch
          </UBadge>

          <UIcon
            v-if="selectingVocab === vocab.slug"
            name="i-heroicons-arrow-path"
            class="size-4 animate-spin text-muted shrink-0"
          />
          <UIcon
            v-else
            name="i-heroicons-chevron-right"
            class="size-4 text-muted shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
          />
        </button>
      </div>
    </template>
  </div>
</template>
