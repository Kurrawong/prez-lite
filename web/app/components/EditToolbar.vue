<script setup lang="ts">
import type { SubjectChange } from '~/composables/useEditMode'
import type { HistoryCommit } from '~/composables/useVocabHistory'

const props = defineProps<{
  editView: 'none' | 'full' | 'inline'
  editorAvailable: boolean
  isAuthenticated: boolean
  authEnabled: boolean
  isEditMode: boolean
  isDirty: boolean
  loading: boolean
  saving: boolean
  error: string | null
  pendingChanges: SubjectChange[]
  viewMode: 'simple' | 'expert'
  // History
  historyCommits: HistoryCommit[]
  historyLoading: boolean
}>()

const emit = defineEmits<{
  'enter-edit': [mode: 'full' | 'inline']
  'exit-edit': []
  'toggle-mode': []
  'save': []
  'toggle-view-mode': []
  'sign-in': []
  // History
  'load-history': []
  'browse-version': [commit: HistoryCommit]
  'open-diff': [commit: HistoryCommit, index: number]
}>()

// Panel state
const changesOpen = ref(false)
const historyOpen = ref(false)

// Load history when panel opens
watch(historyOpen, (open) => {
  if (open && !props.historyCommits.length) {
    emit('load-history')
  }
})

const changeCount = computed(() => props.pendingChanges.length)

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

function truncateCommitMsg(msg: string, max = 50): string {
  const firstLine = msg.split('\n')[0] ?? msg
  return firstLine.length > max ? firstLine.slice(0, max) + '...' : firstLine
}
</script>

<template>
  <!-- Spacer to prevent content from hiding behind fixed toolbar -->
  <div class="h-12" />

  <Teleport to="body">
    <div class="fixed top-(--ui-header-height) inset-x-0 z-30 bg-[var(--ui-bg)]/95 backdrop-blur-sm">
      <div class="max-w-(--ui-container) mx-auto px-4 sm:px-6 lg:px-8 py-2">
        <div class="bg-muted/30 dark:bg-muted/10 border border-default rounded-lg px-4 py-2 flex items-center gap-3 flex-wrap">

      <!-- ============================================================ -->
      <!-- NOT AUTHENTICATED: view toggle + sign-in -->
      <!-- ============================================================ -->
      <template v-if="!isAuthenticated">
        <!-- View mode toggle -->
        <UButton
          :icon="viewMode === 'simple' ? 'i-heroicons-eye-slash' : 'i-heroicons-eye'"
          variant="ghost"
          size="xs"
          @click="emit('toggle-view-mode')"
        >
          {{ viewMode === 'simple' ? 'Simple' : 'Expert' }}
        </UButton>

        <div class="flex-1" />

        <!-- Sign in -->
        <UButton
          v-if="authEnabled"
          variant="ghost"
          size="sm"
          icon="i-simple-icons-github"
          @click="emit('sign-in')"
        >
          Sign in to edit
        </UButton>
      </template>

      <!-- ============================================================ -->
      <!-- AUTHENTICATED, NOT EDITING -->
      <!-- ============================================================ -->
      <template v-else-if="editView === 'none'">
        <UDropdownMenu
          v-if="editorAvailable"
          :items="[[
            { label: 'Full edit mode', icon: 'i-heroicons-pencil-square', onSelect: () => emit('enter-edit', 'full') },
            { label: 'Inline edit mode', icon: 'i-heroicons-cursor-arrow-rays', onSelect: () => emit('enter-edit', 'inline') },
          ]]"
          :ui="{ content: 'z-50' }"
        >
          <UButton icon="i-heroicons-pencil-square" variant="subtle" size="sm">
            Edit
            <UIcon name="i-heroicons-chevron-down" class="size-3 ml-0.5" />
          </UButton>
        </UDropdownMenu>

        <USeparator orientation="vertical" class="h-5" />

        <!-- View mode toggle -->
        <UButton
          :icon="viewMode === 'simple' ? 'i-heroicons-eye-slash' : 'i-heroicons-eye'"
          variant="ghost"
          size="xs"
          @click="emit('toggle-view-mode')"
        >
          {{ viewMode === 'simple' ? 'Simple' : 'Expert' }}
        </UButton>

        <div class="flex-1" />

        <!-- History -->
        <UPopover v-model:open="historyOpen" :content="{ align: 'end', side: 'bottom' }" :ui="{ content: 'z-50' }">
          <UButton icon="i-heroicons-clock" variant="ghost" size="xs">
            History
          </UButton>
          <template #content>
            <div class="w-96 max-h-96 overflow-y-auto p-2">
              <p class="text-xs font-medium text-muted px-2 mb-2">Edit history</p>

              <div v-if="historyLoading" class="py-6 text-center">
                <UIcon name="i-heroicons-arrow-path" class="size-4 animate-spin text-muted" />
              </div>

              <div v-else-if="!historyCommits.length" class="py-6 text-center text-xs text-muted">
                No history found
              </div>

              <div v-else class="space-y-0.5">
                <div
                  v-for="(commit, index) in historyCommits"
                  :key="commit.sha"
                  class="flex items-center gap-2.5 px-2 py-2 rounded-md hover:bg-muted/10 transition-colors group"
                >
                  <img
                    v-if="commit.author.avatar"
                    :src="commit.author.avatar"
                    :alt="commit.author.login"
                    class="size-6 rounded-full shrink-0"
                  />
                  <UIcon v-else name="i-heroicons-user-circle" class="size-6 text-muted shrink-0" />

                  <div class="flex-1 min-w-0">
                    <p class="text-xs font-medium truncate">{{ truncateCommitMsg(commit.message) }}</p>
                    <p class="text-[10px] text-muted">
                      {{ commit.author.login }} &middot; {{ formatHistoryDate(commit.date) }}
                      <span v-if="index === 0" class="ml-1 text-primary font-medium">current</span>
                    </p>
                  </div>

                  <div class="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <UButton size="xs" variant="soft" @click="emit('open-diff', commit, index)">Diff</UButton>
                    <UButton size="xs" variant="ghost" @click="emit('browse-version', commit)">Browse</UButton>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </UPopover>
      </template>

      <!-- ============================================================ -->
      <!-- EDITING -->
      <!-- ============================================================ -->
      <template v-else>
        <!-- Mode switcher -->
        <UButton
          :icon="editView === 'full' ? 'i-heroicons-pencil-square' : 'i-heroicons-cursor-arrow-rays'"
          variant="subtle"
          size="sm"
          @click="emit('toggle-mode')"
        >
          {{ editView === 'full' ? 'Full' : 'Inline' }}
          <UIcon name="i-heroicons-arrows-right-left" class="size-3 ml-0.5" />
        </UButton>

        <USeparator orientation="vertical" class="h-5" />

        <!-- Loading state -->
        <div v-if="loading" class="flex items-center gap-2 text-xs text-muted">
          <UIcon name="i-heroicons-arrow-path" class="size-3.5 animate-spin shrink-0" />
          Loading...
        </div>

        <!-- Error state -->
        <UTooltip v-else-if="error" :text="error">
          <div class="flex items-center gap-1.5 text-xs text-error cursor-default">
            <UIcon name="i-heroicons-exclamation-triangle" class="size-3.5 shrink-0" />
            <span class="truncate max-w-48">{{ error }}</span>
          </div>
        </UTooltip>

        <!-- Changes summary -->
        <template v-else>
          <UPopover v-if="changeCount > 0" v-model:open="changesOpen" :content="{ align: 'start', side: 'bottom' }" :ui="{ content: 'z-50' }">
            <UButton variant="ghost" size="xs">
              <UBadge color="warning" variant="subtle" size="xs" class="mr-1">{{ changeCount }}</UBadge>
              change{{ changeCount !== 1 ? 's' : '' }}
              <UIcon name="i-heroicons-chevron-down" class="size-3 ml-0.5" />
            </UButton>
            <template #content>
              <div class="w-80 max-h-72 overflow-y-auto p-2 space-y-1">
                <p class="text-xs font-medium text-muted px-2 mb-2">Pending changes</p>
                <div
                  v-for="change in pendingChanges"
                  :key="change.subjectIri"
                  class="px-2 py-1.5 rounded-md hover:bg-muted/10 text-sm"
                >
                  <div class="flex items-center gap-1.5">
                    <UIcon
                      :name="change.type === 'added' ? 'i-heroicons-plus-circle' : change.type === 'removed' ? 'i-heroicons-minus-circle' : 'i-heroicons-pencil'"
                      :class="change.type === 'added' ? 'text-success' : change.type === 'removed' ? 'text-error' : 'text-warning'"
                      class="size-3.5 shrink-0"
                    />
                    <span class="font-medium truncate">{{ change.subjectLabel }}</span>
                    <span class="text-muted text-xs ml-auto shrink-0">({{ change.propertyChanges.length }})</span>
                  </div>
                  <div v-for="pc in change.propertyChanges" :key="pc.predicateIri" class="text-xs text-muted ml-5 mt-0.5">
                    {{ pc.predicateLabel }}: {{ pc.type }}
                  </div>
                </div>
              </div>
            </template>
          </UPopover>
          <span v-else class="text-xs text-muted/60">No changes yet</span>
        </template>

        <!-- Spacer -->
        <div class="flex-1" />

        <!-- View mode toggle -->
        <UButton
          :icon="viewMode === 'simple' ? 'i-heroicons-eye-slash' : 'i-heroicons-eye'"
          variant="ghost"
          size="xs"
          @click="emit('toggle-view-mode')"
        >
          {{ viewMode === 'simple' ? 'Simple' : 'Expert' }}
        </UButton>

        <!-- History -->
        <UPopover v-model:open="historyOpen" :content="{ align: 'end', side: 'bottom' }" :ui="{ content: 'z-50' }">
          <UButton icon="i-heroicons-clock" variant="ghost" size="xs">
            History
          </UButton>
          <template #content>
            <div class="w-96 max-h-96 overflow-y-auto p-2">
              <p class="text-xs font-medium text-muted px-2 mb-2">Edit history</p>

              <div v-if="historyLoading" class="py-6 text-center">
                <UIcon name="i-heroicons-arrow-path" class="size-4 animate-spin text-muted" />
              </div>

              <div v-else-if="!historyCommits.length" class="py-6 text-center text-xs text-muted">
                No history found
              </div>

              <div v-else class="space-y-0.5">
                <div
                  v-for="(commit, index) in historyCommits"
                  :key="commit.sha"
                  class="flex items-center gap-2.5 px-2 py-2 rounded-md hover:bg-muted/10 transition-colors group"
                >
                  <img
                    v-if="commit.author.avatar"
                    :src="commit.author.avatar"
                    :alt="commit.author.login"
                    class="size-6 rounded-full shrink-0"
                  />
                  <UIcon v-else name="i-heroicons-user-circle" class="size-6 text-muted shrink-0" />

                  <div class="flex-1 min-w-0">
                    <p class="text-xs font-medium truncate">{{ truncateCommitMsg(commit.message) }}</p>
                    <p class="text-[10px] text-muted">
                      {{ commit.author.login }} &middot; {{ formatHistoryDate(commit.date) }}
                      <span v-if="index === 0" class="ml-1 text-primary font-medium">current</span>
                    </p>
                  </div>

                  <div class="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <UButton size="xs" variant="soft" @click="emit('open-diff', commit, index)">Diff</UButton>
                    <UButton size="xs" variant="ghost" @click="emit('browse-version', commit)">Browse</UButton>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </UPopover>

        <USeparator orientation="vertical" class="h-5" />

        <!-- Save button -->
        <UButton
          size="sm"
          :disabled="!changeCount"
          :loading="saving"
          @click="emit('save')"
        >
          Save
        </UButton>

        <!-- Close edit mode -->
        <UButton
          icon="i-heroicons-x-mark"
          color="neutral"
          variant="ghost"
          size="xs"
          aria-label="Exit edit mode"
          @click="emit('exit-edit')"
        />
      </template>
        </div>
      </div>
    </div>
  </Teleport>
</template>
