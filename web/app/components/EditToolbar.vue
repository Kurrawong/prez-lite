<script setup lang="ts">
import type { SubjectChange, ValidationError } from '~/composables/useEditMode'
import type { HistoryCommit } from '~/composables/useVocabHistory'

const props = defineProps<{
  isEditMode: boolean
  isDirty: boolean
  loading: boolean
  saving: boolean
  error: string | null
  pendingChanges: SubjectChange[]
  viewMode: 'simple' | 'expert'
  // Workspace
  workspaceLabel?: string | null
  // History
  historyCommits: HistoryCommit[]
  historyLoading: boolean
  // Undo/Redo
  canUndo?: boolean
  canRedo?: boolean
  undoLabel?: string
  redoLabel?: string
  // Validation
  validationErrors?: ValidationError[]
  /** Errors introduced by user edits only (controls save gate) */
  newValidationErrors?: ValidationError[]
}>()

const emit = defineEmits<{
  'save': []
  'toggle-view-mode': []
  'open-workspace': []
  // History
  'load-history': []
  'browse-version': [commit: HistoryCommit]
  'open-diff': [commit: HistoryCommit, index: number]
  // Undo/Redo
  'undo': []
  'redo': []
  'revert-subject': [subjectIri: string]
  'show-change-detail': [subjectIri: string]
  'select-concept': [iri: string]
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
const errorCount = computed(() => props.validationErrors?.length ?? 0)
const newErrorCount = computed(() => props.newValidationErrors?.length ?? 0)
const canSave = computed(() => changeCount.value > 0 && newErrorCount.value === 0)

const newErrorKeySet = computed(() => new Set(
  (props.newValidationErrors ?? []).map(e => `${e.subjectIri}|${e.predicate}|${e.message}`),
))
function isBaselineError(err: ValidationError): boolean {
  return !newErrorKeySet.value.has(`${err.subjectIri}|${err.predicate}|${err.message}`)
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

function truncateCommitMsg(msg: string, max = 50): string {
  const firstLine = msg.split('\n')[0] ?? msg
  return firstLine.length > max ? firstLine.slice(0, max) + '...' : firstLine
}
</script>

<template>
  <Teleport to="#edit-toolbar-slot">
    <div class="z-50 bg-primary-50 dark:bg-primary-950 border-b-2 border-primary-300 dark:border-primary-700">
      <div class="w-full max-w-(--ui-container) mx-auto px-4 sm:px-6 lg:px-8 py-1.5">
        <div class="flex items-center gap-3 flex-wrap">

      <!-- Editing indicator -->
      <div class="flex items-center gap-1.5 text-primary-600 dark:text-primary-400">
        <UIcon name="i-heroicons-pencil-square" class="size-4" />
        <span class="text-xs font-semibold">Editing</span>
      </div>

      <USeparator orientation="vertical" class="h-5" />

      <!-- Workspace badge (always visible when workspace is selected) -->
      <UButton
        v-if="workspaceLabel"
        variant="soft"
        color="neutral"
        size="xs"
        icon="i-heroicons-folder-open"
        @click="emit('open-workspace')"
      >
        {{ workspaceLabel }}
      </UButton>

      <!-- ============================================================ -->
      <!-- ALWAYS-ON EDITING TOOLBAR -->
      <!-- ============================================================ -->
      <template v-if="true">
        <!-- Undo/Redo -->
        <UButton
          icon="i-heroicons-arrow-uturn-left"
          :variant="canUndo ? 'ghost' : 'ghost'"
          :color="canUndo ? 'primary' : 'neutral'"
          size="xs"
          :disabled="!canUndo"
          :ui="canUndo ? {} : { base: 'text-gray-300 dark:text-gray-600' }"
          :title="canUndo ? `Undo: ${undoLabel}` : 'Nothing to undo'"
          @click="emit('undo')"
        />
        <UButton
          icon="i-heroicons-arrow-uturn-right"
          :variant="canRedo ? 'ghost' : 'ghost'"
          :color="canRedo ? 'primary' : 'neutral'"
          size="xs"
          :disabled="!canRedo"
          :ui="canRedo ? {} : { base: 'text-gray-300 dark:text-gray-600' }"
          :title="canRedo ? `Redo: ${redoLabel}` : 'Nothing to redo'"
          @click="emit('redo')"
        />

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
                  class="px-2 py-1.5 rounded-md hover:bg-muted/10 text-sm cursor-pointer group/row"
                  @click="emit('show-change-detail', change.subjectIri)"
                >
                  <div class="flex items-center gap-1.5">
                    <UIcon
                      :name="change.type === 'added' ? 'i-heroicons-plus-circle' : change.type === 'removed' ? 'i-heroicons-minus-circle' : 'i-heroicons-pencil'"
                      :class="change.type === 'added' ? 'text-success' : change.type === 'removed' ? 'text-error' : 'text-warning'"
                      class="size-3.5 shrink-0"
                    />
                    <span class="font-medium truncate">{{ change.subjectLabel }}</span>
                    <span class="text-muted text-xs ml-auto shrink-0 group-hover/row:opacity-0 transition-opacity">({{ change.propertyChanges.length }})</span>
                    <UButton
                      icon="i-heroicons-arrow-uturn-left"
                      variant="ghost"
                      size="xs"
                      class="shrink-0 opacity-0 group-hover/row:opacity-100 transition-opacity"
                      title="Revert changes to this subject"
                      @click.stop="emit('revert-subject', change.subjectIri)"
                    />
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

        <!-- Validation errors -->
        <UPopover v-if="errorCount > 0" :content="{ align: 'end', side: 'bottom' }" :ui="{ content: 'z-50' }">
          <UButton variant="ghost" size="xs" :color="newErrorCount > 0 ? 'error' : 'warning'">
            <UIcon name="i-heroicons-exclamation-triangle" class="size-3.5" />
            {{ errorCount }} error{{ errorCount !== 1 ? 's' : '' }}
          </UButton>
          <template #content>
            <div class="w-80 max-h-72 overflow-y-auto p-2 space-y-1">
              <p class="text-xs font-medium text-muted px-2 mb-2">Validation errors</p>
              <div
                v-for="(err, idx) in validationErrors"
                :key="idx"
                class="px-2 py-1.5 rounded-md text-sm hover:bg-muted/50 cursor-pointer transition-colors"
                :class="{ 'opacity-50': isBaselineError(err) }"
                @click="emit('select-concept', err.subjectIri)"
              >
                <div class="flex items-center gap-1.5">
                  <UIcon name="i-heroicons-exclamation-triangle" class="size-3.5 shrink-0" :class="isBaselineError(err) ? 'text-warning' : 'text-error'" />
                  <span class="font-medium truncate">{{ err.subjectLabel }}</span>
                  <span v-if="isBaselineError(err)" class="text-[10px] text-warning shrink-0">(pre-existing)</span>
                </div>
                <p class="text-xs text-muted ml-5 mt-0.5">
                  {{ err.predicateLabel }}: {{ err.message }}
                </p>
              </div>
            </div>
          </template>
        </UPopover>

        <!-- Save button -->
        <UButton
          size="sm"
          :disabled="!canSave"
          :color="canSave ? 'primary' : 'neutral'"
          :variant="canSave ? 'solid' : 'outline'"
          :ui="canSave ? {} : { base: 'text-gray-300 dark:text-gray-600 border-gray-200 dark:border-gray-700' }"
          :loading="saving"
          :title="newErrorCount > 0 ? `Fix ${newErrorCount} validation error${newErrorCount !== 1 ? 's' : ''} before saving` : ''"
          @click="emit('save')"
        >
          Save
        </UButton>
      </template>
        </div>
      </div>
    </div>
  </Teleport>
</template>
