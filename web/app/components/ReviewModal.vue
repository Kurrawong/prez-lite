<script setup lang="ts">
import type { SubjectChange } from '~/composables/useEditMode'
import type { PRInfo, PRComment } from '~/composables/usePromotion'
import { buildPRBody } from '~/composables/usePromotion'

const props = defineProps<{
  mode: 'create' | 'view' | 'submitted'
  layerName: 'pending' | 'approved'
  changes: SubjectChange[]
  existingPR: PRInfo | null
  comments: PRComment[]
  commentsLoading: boolean
  creating: boolean
  vocabLabel: string
  sourceBranch: string
  targetBranch: string
  defaultTitle: string
  error?: string | null
  merging?: boolean
  rejecting?: boolean
  commenting?: boolean
  /** Workspace display name (e.g. "Staging") */
  workspaceLabel?: string
}>()

const emit = defineEmits<{
  create: [title: string, body: string]
  merge: []
  reject: [comment: string]
  comment: [body: string]
  close: []
}>()

const title = ref(props.defaultTitle)
const commentText = ref('')

watch(() => props.defaultTitle, (v) => { title.value = v })

// --- Layer-aware labels ---

const isPending = computed(() => props.layerName === 'pending')
const wsName = computed(() => props.workspaceLabel || 'staging')

/** Primary action button label */
const actionLabel = computed(() =>
  isPending.value ? 'Submit for Approval' : 'Submit for Publishing',
)

/** Merge/approve button label */
const mergeLabel = computed(() =>
  isPending.value ? 'Approve' : 'Publish to Production',
)

/** Success message after merge */
const mergeSuccessTitle = computed(() =>
  isPending.value
    ? `Changes approved and included in ${wsName.value}`
    : 'Changes published to production',
)

/** Next step hint after merge */
const mergeSuccessHint = computed(() =>
  isPending.value
    ? `Your changes are now in ${wsName.value}, ready to be published to production.`
    : null,
)

/** Submitted confirmation heading */
const submittedHeading = computed(() =>
  isPending.value ? 'Submitted for approval' : 'Submitted for publishing',
)

/** Submitted confirmation description */
const submittedDescription = computed(() =>
  isPending.value
    ? `Your changes to ${props.vocabLabel} have been submitted for review. Once approved, they will be included in ${wsName.value}.`
    : `All changes in ${wsName.value} have been submitted for review. Once approved, they will be published to production.`,
)

function handleCreate() {
  if (!title.value.trim()) return
  emit('create', title.value, buildPRBody(props.changes))
}

function handleComment() {
  if (!commentText.value.trim()) return
  emit('comment', commentText.value.trim())
  commentText.value = ''
}

function handleReject() {
  if (!commentText.value.trim()) return
  emit('reject', commentText.value.trim())
  commentText.value = ''
}

/** True when any async action is in progress */
const busy = computed(() => !!props.creating || !!props.merging || !!props.rejecting || !!props.commenting)

function formatDate(dateStr: string): string {
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

/** Provide actionable guidance for merge errors */
function errorDescription(msg: string): string | null {
  if (!msg) return null
  const lower = msg.toLowerCase()
  if (lower.includes('conflict') || lower.includes('not mergeable')) {
    return 'Conflicts need to be resolved before this can be approved.'
  }
  if (lower.includes('check') || lower.includes('status')) {
    return 'Checks must pass before this can be approved.'
  }
  if (lower.includes('already') || lower.includes('409')) {
    return 'Please wait a moment and try again.'
  }
  return null
}
</script>

<template>
  <div class="space-y-4">
    <!-- Create Mode -->
    <template v-if="mode === 'create'">
      <!-- Context description -->
      <p v-if="isPending" class="text-sm text-muted">
        Submit your saved changes for review before they are included in {{ wsName }}.
      </p>

      <!-- Warning for approved → production -->
      <UAlert
        v-if="!isPending"
        color="warning"
        icon="i-heroicons-exclamation-triangle"
        :title="`This will publish ALL changes in ${wsName} to production`"
        description="Review the changes below before submitting."
      />

      <!-- Title input -->
      <div>
        <label class="text-sm font-medium mb-1 block">Title</label>
        <UInput v-model="title" class="w-full" placeholder="Review title..." />
      </div>

      <!-- Change summary table -->
      <div v-if="changes.length" class="space-y-2">
        <p class="text-sm font-medium">Changes ({{ changes.length }})</p>
        <div class="max-h-60 overflow-y-auto border border-default rounded-lg">
          <table class="w-full text-sm">
            <thead class="bg-muted/10 sticky top-0">
              <tr>
                <th class="text-left px-3 py-1.5 font-medium">Concept</th>
                <th class="text-left px-3 py-1.5 font-medium w-24">Type</th>
                <th class="text-left px-3 py-1.5 font-medium">Properties</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-default">
              <tr v-for="c in changes" :key="c.subjectIri">
                <td class="px-3 py-1.5">
                  <div class="flex items-center gap-1.5">
                    <UIcon :name="changeIcon(c.type)" :class="['size-3.5', changeColor(c.type)]" />
                    <span class="truncate max-w-48">{{ c.subjectLabel }}</span>
                  </div>
                </td>
                <td class="px-3 py-1.5 capitalize">{{ c.type }}</td>
                <td class="px-3 py-1.5 text-muted text-xs">
                  {{ c.propertyChanges.map(p => p.predicateLabel).join(', ') || '-' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div v-else class="text-sm text-muted py-4 text-center">
        No changes detected
      </div>

      <!-- Error -->
      <UAlert
        v-if="error"
        color="error"
        icon="i-heroicons-exclamation-circle"
        :title="error"
      />

      <!-- Actions -->
      <div class="flex justify-end gap-2 pt-2">
        <UButton variant="ghost" :disabled="busy" @click="emit('close')">Cancel</UButton>
        <UButton
          icon="i-heroicons-arrow-up-tray"
          :loading="creating"
          :disabled="!title.trim() || !changes.length"
          @click="handleCreate"
        >
          {{ actionLabel }}
        </UButton>
      </div>
    </template>

    <!-- Submitted Mode (confirmation after PR creation) -->
    <template v-else-if="mode === 'submitted' && existingPR">
      <div class="text-center py-4 space-y-3">
        <UIcon name="i-heroicons-check-circle" class="size-10 text-success mx-auto" />
        <p class="text-lg font-semibold">{{ submittedHeading }}</p>
        <p class="text-sm text-muted">{{ submittedDescription }}</p>
      </div>
      <div class="flex justify-end pt-2">
        <UButton @click="emit('close')">Done</UButton>
      </div>
    </template>

    <!-- View Mode -->
    <template v-else-if="mode === 'view' && existingPR">
      <!-- Review header -->
      <div class="flex items-center gap-2 flex-wrap">
        <UBadge
          :color="existingPR.merged ? 'violet' : existingPR.state === 'open' ? 'success' : 'error'"
          variant="subtle"
        >
          {{ existingPR.merged ? 'Merged' : existingPR.state }}
        </UBadge>
        <span class="font-semibold text-sm">{{ existingPR.title }}</span>
      </div>

      <div class="flex items-center gap-2 text-xs text-muted">
        <span>Created {{ formatDate(existingPR.createdAt) }}</span>
      </div>

      <!-- Merged success -->
      <template v-if="existingPR.merged">
        <UAlert
          color="success"
          icon="i-heroicons-check-circle"
          :title="mergeSuccessTitle"
          :description="mergeSuccessHint ?? undefined"
        />
      </template>

      <!-- Error with actionable guidance -->
      <template v-else-if="error">
        <UAlert
          color="error"
          icon="i-heroicons-exclamation-circle"
          :title="error"
          :description="errorDescription(error) ?? undefined"
        />
      </template>

      <!-- Comments + actions (only for non-merged reviews) -->
      <template v-if="!existingPR.merged">
        <div class="space-y-2">
          <p class="text-sm font-medium">Comments</p>

          <div v-if="commentsLoading" class="flex items-center gap-2 text-sm text-muted py-4">
            <UIcon name="i-heroicons-arrow-path" class="size-4 animate-spin" />
            Loading comments...
          </div>

          <div v-else-if="!comments.length" class="text-sm text-muted py-4 text-center">
            No comments yet
          </div>

          <div v-else class="max-h-60 overflow-y-auto space-y-2">
            <div
              v-for="c in comments"
              :key="c.id"
              class="border border-default rounded-lg p-3"
            >
              <div class="flex items-center gap-2 mb-1.5">
                <img
                  :src="c.user.avatarUrl"
                  :alt="c.user.login"
                  class="size-5 rounded-full"
                >
                <span class="text-sm font-medium">{{ c.user.login }}</span>
                <span class="text-xs text-muted ml-auto">{{ formatDate(c.createdAt) }}</span>
              </div>
              <p class="text-sm whitespace-pre-wrap">{{ c.body }}</p>
            </div>
          </div>

          <!-- Reply + actions -->
          <div class="space-y-2 pt-2">
            <UTextarea
              v-model="commentText"
              placeholder="Write a comment..."
              :rows="2"
              class="w-full"
            />

            <div class="flex items-center gap-2">
              <UButton variant="ghost" :disabled="busy" @click="emit('close')">Close</UButton>
              <UButton
                v-if="commentText.trim()"
                variant="soft"
                :loading="commenting"
                :disabled="busy && !commenting"
                @click="handleComment"
              >
                Comment
              </UButton>

              <div class="flex-1" />

              <template v-if="existingPR.state === 'open'">
                <UButton
                  variant="soft"
                  color="neutral"
                  :disabled="!commentText.trim() || (busy && !rejecting)"
                  :loading="rejecting"
                  :title="commentText.trim() ? '' : 'Write a reason to reject'"
                  @click="handleReject"
                >
                  Reject
                </UButton>
                <UButton
                  color="primary"
                  :loading="merging"
                  :disabled="busy && !merging"
                  @click="emit('merge')"
                >
                  {{ mergeLabel }}
                </UButton>
              </template>
            </div>
          </div>
        </div>
      </template>

      <!-- Merged: done button + next step hint -->
      <div v-else class="flex justify-end pt-2">
        <UButton @click="emit('close')">Done</UButton>
      </div>
    </template>
  </div>
</template>
