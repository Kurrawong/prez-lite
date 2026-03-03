<script setup lang="ts">
import type { SubjectChange, ValidationError } from '~/composables/useEditMode'
import type { HistoryCommit } from '~/composables/useVocabHistory'
import type { LayerData } from '~/composables/useLayerStatus'
import type { PRInfo } from '~/composables/usePromotion'

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
  // Layer indicators
  pendingLayer?: LayerData | null
  approvedLayer?: LayerData | null
  promotionEnabled?: boolean
  pendingReview?: PRInfo | null
  approvedReview?: PRInfo | null
  /** When set, keep this layer's popover open (diff modal is showing) */
  diffOpenLayer?: string | null
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
  // Layer actions
  'navigate-to-change': [subjectIri: string, predicateIri?: string]
  'show-layer-diff': [layerName: string, changeIndex: number]
  'submit-for-review': [layerName: 'pending' | 'approved']
  'view-review': [layerName: 'pending' | 'approved']
  'navigate-to-workspace': []
}>()

// Panel state — mutual exclusion: only one popover open at a time
const changesOpen = ref(false)
const historyOpen = ref(false)
const pendingOpen = ref(false)
const approvedOpen = ref(false)

// Close other popovers when one opens
watch(changesOpen, (v) => { if (v) { pendingOpen.value = false; approvedOpen.value = false } })
watch(pendingOpen, (v) => { if (v) { changesOpen.value = false; approvedOpen.value = false } })
watch(approvedOpen, (v) => { if (v) { changesOpen.value = false; pendingOpen.value = false } })

// Controlled popover state for layer popovers (block close during diff modal)
function handleLayerPopoverUpdate(layerName: string, open: boolean) {
  if (!open && props.diffOpenLayer === layerName) return // block close while diff is showing
  if (layerName === 'pending') pendingOpen.value = open
  else if (layerName === 'approved') approvedOpen.value = open
}

// Re-open the popover when diffOpenLayer is set
watch(() => props.diffOpenLayer, (name) => {
  if (name === 'pending') pendingOpen.value = true
  else if (name === 'approved') approvedOpen.value = true
})

/** Whether the current vocab has per-vocab staging changes (show popover vs navigate) */
const hasApprovedChanges = computed(() => (props.approvedLayer?.changes.length ?? 0) > 0)

function handleApprovedClick() {
  if (hasApprovedChanges.value) {
    approvedOpen.value = !approvedOpen.value
  } else {
    emit('navigate-to-workspace')
  }
}

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

/** Map layer color names to Tailwind classes */
const dotClasses: Record<string, string> = {
  amber: 'bg-amber-500',
  blue: 'bg-blue-500',
  green: 'bg-emerald-500',
}

const textClasses: Record<string, string> = {
  amber: 'text-amber-600 dark:text-amber-400',
  blue: 'text-blue-600 dark:text-blue-400',
  green: 'text-emerald-600 dark:text-emerald-400',
}

function changeIcon(type: string): string {
  if (type === 'added') return 'i-heroicons-plus-circle'
  if (type === 'removed') return 'i-heroicons-minus-circle'
  return 'i-heroicons-pencil'
}

function changeColor(type: string): string {
  if (type === 'added') return 'text-success'
  if (type === 'removed') return 'text-error'
  return 'text-warning'
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

/** Pending (blue) indicator label — changes based on review state */
const pendingLabel = computed(() => {
  if (props.pendingReview && !props.pendingReview.merged) return 'pending approval'
  return props.pendingLayer?.label ?? 'saved'
})

/** Approved (green) indicator label — changes based on review state */
const approvedLabel = computed(() => {
  if (props.approvedReview && !props.approvedReview.merged) return 'awaiting publishing'
  return 'in staging'
})

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

        <!-- Changes + Layer indicators -->
        <template v-else>
          <!-- Unsaved changes -->
          <UPopover v-if="changeCount > 0" v-model:open="changesOpen" :content="{ align: 'start', side: 'bottom' }" :ui="{ content: 'z-50' }">
            <UButton variant="ghost" size="xs">
              <span class="w-2 h-2 rounded-full shrink-0 bg-amber-500" />
              <UBadge color="warning" variant="subtle" size="xs" class="mr-1">{{ changeCount }}</UBadge>
              Unsaved
              <UIcon name="i-heroicons-chevron-down" class="size-3 ml-0.5" />
            </UButton>
            <template #content>
              <div class="w-80 max-h-72 overflow-y-auto p-2 space-y-1">
                <p class="text-xs font-medium text-muted px-2 mb-2">Unsaved changes</p>
                <div
                  v-for="change in pendingChanges"
                  :key="change.subjectIri"
                  class="px-2 py-1.5 rounded-md hover:bg-muted/10 text-sm cursor-pointer group/row"
                  @click="emit('show-change-detail', change.subjectIri)"
                >
                  <div class="flex items-center gap-1.5">
                    <UIcon
                      :name="changeIcon(change.type)"
                      :class="changeColor(change.type)"
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

          <!-- Pending layer indicator -->
          <template v-if="pendingLayer">
            <UPopover
              v-if="pendingLayer.count > 0"
              :open="pendingOpen"
              :content="{ align: 'start', side: 'bottom' }"
              :ui="{ content: 'z-50' }"
              @update:open="handleLayerPopoverUpdate('pending', $event)"
            >
              <button
                type="button"
                class="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs hover:bg-primary-100 dark:hover:bg-primary-900 transition-colors"
                :class="textClasses[pendingLayer.color]"
              >
                <span class="w-2 h-2 rounded-full shrink-0" :class="dotClasses[pendingLayer.color]" />
                <span class="font-semibold">{{ pendingLayer.count }}</span>
                <span class="capitalize">{{ pendingLabel }}</span>
              </button>
              <template #content>
                <div class="w-80 max-h-72 overflow-y-auto p-2 space-y-1">
                  <p class="text-xs font-medium text-muted px-2 mb-2">{{ pendingLabel === 'pending approval' ? 'Changes pending approval' : 'Saved changes' }}</p>
                  <div
                    v-for="(change, idx) in pendingLayer.changes"
                    :key="change.subjectIri"
                    class="px-2 py-1.5 rounded-md hover:bg-muted/10 text-sm"
                  >
                    <div
                      class="flex items-center gap-1.5 cursor-pointer"
                      @click="emit('navigate-to-change', change.subjectIri, change.propertyChanges[0]?.predicateIri)"
                    >
                      <UIcon
                        :name="changeIcon(change.type)"
                        :class="changeColor(change.type)"
                        class="size-3.5 shrink-0"
                      />
                      <span class="font-medium truncate">{{ change.subjectLabel }}</span>
                      <UButton
                        icon="i-heroicons-document-magnifying-glass"
                        variant="ghost"
                        color="neutral"
                        size="xs"
                        title="View diff"
                        class="size-5 ml-auto shrink-0"
                        @click.stop="emit('show-layer-diff', 'pending', idx)"
                      />
                    </div>
                    <button
                      v-for="pc in change.propertyChanges"
                      :key="pc.predicateIri"
                      type="button"
                      class="text-xs text-muted ml-5 mt-0.5 hover:text-default transition-colors cursor-pointer block"
                      @click="emit('navigate-to-change', change.subjectIri, pc.predicateIri)"
                    >
                      {{ pc.predicateLabel }}: {{ pc.type }}
                    </button>
                  </div>

                  <!-- Review footer -->
                  <div
                    v-if="promotionEnabled"
                    class="border-t border-default mt-2 pt-2 px-2"
                  >
                    <template v-if="pendingReview && !pendingReview.merged">
                      <div class="flex items-center justify-between">
                        <div class="flex items-center gap-1.5 text-xs">
                          <UBadge color="success" variant="subtle" size="xs">
                            Review #{{ pendingReview.number }}
                          </UBadge>
                        </div>
                        <UButton
                          size="xs"
                          variant="ghost"
                          @click="emit('view-review', 'pending')"
                        >
                          View
                        </UButton>
                      </div>
                    </template>
                    <template v-else>
                      <UButton
                        size="xs"
                        variant="soft"
                        icon="i-heroicons-arrow-up-tray"
                        class="w-full justify-center"
                        @click="emit('submit-for-review', 'pending')"
                      >
                        Submit for Approval
                      </UButton>
                    </template>
                  </div>
                </div>
              </template>
            </UPopover>

            <!-- Zero-count: dimmed, no popover -->
            <div
              v-else
              class="flex items-center gap-1.5 px-2 py-0.5 text-xs text-muted/40"
            >
              <UIcon
                v-if="pendingLayer.loading"
                name="i-heroicons-arrow-path"
                class="size-3 animate-spin"
              />
              <span v-else class="w-2 h-2 rounded-full shrink-0 bg-gray-300 dark:bg-gray-600" />
              <span class="font-semibold">0</span>
              <span class="capitalize">{{ pendingLabel }}</span>
              <UTooltip v-if="pendingLayer.error" :text="pendingLayer.error">
                <UIcon name="i-heroicons-exclamation-triangle" class="size-3 text-error" />
              </UTooltip>
            </div>
          </template>

          <!-- Approved layer indicator -->
          <template v-if="approvedLayer">
            <!-- Has per-vocab changes: popover with diff list -->
            <UPopover
              v-if="hasApprovedChanges"
              :open="approvedOpen"
              :content="{ align: 'start', side: 'bottom' }"
              :ui="{ content: 'z-50' }"
              @update:open="handleLayerPopoverUpdate('approved', $event)"
            >
              <button
                type="button"
                class="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs hover:bg-primary-100 dark:hover:bg-primary-900 transition-colors"
                :class="textClasses[approvedLayer.color]"
              >
                <span class="w-2 h-2 rounded-full shrink-0" :class="dotClasses[approvedLayer.color]" />
                <span class="font-semibold">{{ approvedLayer.count }}</span>
                <span class="capitalize">{{ approvedLabel }}</span>
              </button>
              <template #content>
                <div class="w-80 max-h-72 overflow-y-auto p-2 space-y-1">
                  <p class="text-xs font-medium text-muted px-2 mb-2">Changes in staging for this vocabulary</p>
                  <div
                    v-for="(change, idx) in approvedLayer.changes"
                    :key="change.subjectIri"
                    class="px-2 py-1.5 rounded-md hover:bg-muted/10 text-sm"
                  >
                    <div
                      class="flex items-center gap-1.5 cursor-pointer"
                      @click="emit('navigate-to-change', change.subjectIri, change.propertyChanges[0]?.predicateIri)"
                    >
                      <UIcon
                        :name="changeIcon(change.type)"
                        :class="changeColor(change.type)"
                        class="size-3.5 shrink-0"
                      />
                      <span class="font-medium truncate">{{ change.subjectLabel }}</span>
                      <UButton
                        icon="i-heroicons-document-magnifying-glass"
                        variant="ghost"
                        color="neutral"
                        size="xs"
                        title="View diff"
                        class="size-5 ml-auto shrink-0"
                        @click.stop="emit('show-layer-diff', 'approved', idx)"
                      />
                    </div>
                    <button
                      v-for="pc in change.propertyChanges"
                      :key="pc.predicateIri"
                      type="button"
                      class="text-xs text-muted ml-5 mt-0.5 hover:text-default transition-colors cursor-pointer block"
                      @click="emit('navigate-to-change', change.subjectIri, pc.predicateIri)"
                    >
                      {{ pc.predicateLabel }}: {{ pc.type }}
                    </button>
                  </div>

                  <!-- Link to workspace -->
                  <div class="border-t border-default mt-2 pt-2 px-2">
                    <UButton
                      size="xs"
                      variant="link"
                      icon="i-heroicons-arrow-top-right-on-square"
                      @click="emit('navigate-to-workspace')"
                    >
                      View all in workspace
                    </UButton>
                  </div>
                </div>
              </template>
            </UPopover>

            <!-- No per-vocab changes but workspace has changes or PR open: navigate -->
            <button
              v-else-if="approvedLayer.count > 0 || (approvedReview && !approvedReview.merged)"
              type="button"
              class="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs hover:bg-primary-100 dark:hover:bg-primary-900 transition-colors"
              :class="textClasses[approvedLayer.color]"
              @click="emit('navigate-to-workspace')"
            >
              <span class="w-2 h-2 rounded-full shrink-0" :class="dotClasses[approvedLayer.color]" />
              <span class="font-semibold">{{ approvedLayer.count }}</span>
              <span class="capitalize">{{ approvedLabel }}</span>
            </button>

            <!-- Zero-count: dimmed, no interaction -->
            <div
              v-else
              class="flex items-center gap-1.5 px-2 py-0.5 text-xs text-muted/40"
            >
              <UIcon
                v-if="approvedLayer.loading"
                name="i-heroicons-arrow-path"
                class="size-3 animate-spin"
              />
              <span v-else class="w-2 h-2 rounded-full shrink-0 bg-gray-300 dark:bg-gray-600" />
              <span class="font-semibold">0</span>
              <span class="capitalize">{{ approvedLabel }}</span>
              <UTooltip v-if="approvedLayer.error" :text="approvedLayer.error">
                <UIcon name="i-heroicons-exclamation-triangle" class="size-3 text-error" />
              </UTooltip>
            </div>
          </template>
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
