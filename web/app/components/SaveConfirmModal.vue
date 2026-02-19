<script setup lang="ts">
import type { ChangeSummary } from '~/composables/useEditMode'

const props = defineProps<{
  changeSummary: ChangeSummary
  originalTTL: string
  patchedTTL: string
}>()

const emit = defineEmits<{
  confirm: [message: string]
  cancel: []
}>()

const colorMode = useColorMode()
const monacoTheme = computed(() => colorMode.value === 'dark' ? 'prez-dark' : 'prez-light')

const activeTab = ref<'summary' | 'diff'>('summary')

/** Auto-generate a commit message from the change summary (conventional commit format) */
const autoMessage = computed(() => {
  const parts: string[] = []
  const { totalAdded, totalRemoved, totalModified } = props.changeSummary
  if (totalAdded > 0) parts.push(`add ${totalAdded} subject${totalAdded > 1 ? 's' : ''}`)
  if (totalModified > 0) parts.push(`update ${totalModified} subject${totalModified > 1 ? 's' : ''}`)
  if (totalRemoved > 0) parts.push(`remove ${totalRemoved} subject${totalRemoved > 1 ? 's' : ''}`)
  if (parts.length === 0) return 'chore: update vocabulary'
  return `chore: ${parts.join(', ')}`
})

const commitMessage = ref('')

function handleConfirm() {
  emit('confirm', commitMessage.value.trim() || autoMessage.value)
}

function changeTypeIcon(type: 'added' | 'removed' | 'modified'): string {
  switch (type) {
    case 'added': return 'i-heroicons-plus-circle'
    case 'removed': return 'i-heroicons-minus-circle'
    case 'modified': return 'i-heroicons-pencil'
  }
}

function changeTypeColor(type: 'added' | 'removed' | 'modified'): string {
  switch (type) {
    case 'added': return 'text-success'
    case 'removed': return 'text-error'
    case 'modified': return 'text-warning'
  }
}

function changeTypePrefix(type: 'added' | 'removed' | 'modified'): string {
  switch (type) {
    case 'added': return '+ Added'
    case 'removed': return '- Removed'
    case 'modified': return '~ Modified'
  }
}
</script>

<template>
  <div class="space-y-4">
    <!-- Tabs -->
    <div class="flex gap-1 border-b border-default">
      <button
        type="button"
        class="px-4 py-2 text-sm font-medium transition-colors"
        :class="activeTab === 'summary' ? 'border-b-2 border-primary text-primary' : 'text-muted hover:text-default'"
        @click="activeTab = 'summary'"
      >
        Summary
      </button>
      <button
        type="button"
        class="px-4 py-2 text-sm font-medium transition-colors"
        :class="activeTab === 'diff' ? 'border-b-2 border-primary text-primary' : 'text-muted hover:text-default'"
        @click="activeTab = 'diff'"
      >
        TTL Diff
      </button>
    </div>

    <!-- Summary tab -->
    <div v-if="activeTab === 'summary'" class="max-h-[400px] overflow-y-auto space-y-3">
      <div v-if="!changeSummary.subjects.length" class="text-sm text-muted py-4 text-center">
        No changes detected
      </div>

      <div
        v-for="subject in changeSummary.subjects"
        :key="subject.subjectIri"
        class="border border-default rounded-lg p-3 space-y-2"
      >
        <!-- Subject header -->
        <div class="flex items-center gap-2">
          <UIcon
            :name="changeTypeIcon(subject.type)"
            :class="['size-4', changeTypeColor(subject.type)]"
          />
          <span class="text-sm font-medium">
            {{ changeTypePrefix(subject.type) }}: "{{ subject.subjectLabel }}"
          </span>
        </div>

        <!-- Property changes -->
        <div v-if="subject.propertyChanges.length" class="pl-6 space-y-1">
          <div
            v-for="pc in subject.propertyChanges"
            :key="pc.predicateIri"
            class="text-xs text-muted"
          >
            <span :class="changeTypeColor(pc.type)" class="font-medium">
              {{ pc.type === 'added' ? '+' : pc.type === 'removed' ? '-' : '~' }}
            </span>
            <span class="ml-1">{{ pc.predicateLabel }}</span>
            <template v-if="pc.type === 'modified' && pc.oldValues?.length && pc.newValues?.length">
              <span class="text-muted">:
                <span class="line-through">{{ pc.oldValues.join(', ') }}</span>
                &rarr;
                <span>{{ pc.newValues.join(', ') }}</span>
              </span>
            </template>
            <template v-else-if="pc.type === 'added' && pc.newValues?.length">
              <span class="text-muted">: {{ pc.newValues.join(', ') }}</span>
            </template>
            <template v-else-if="pc.type === 'removed' && pc.oldValues?.length">
              <span class="text-muted line-through">: {{ pc.oldValues.join(', ') }}</span>
            </template>
          </div>
        </div>
      </div>
    </div>

    <!-- Diff tab -->
    <div v-if="activeTab === 'diff'" class="border border-default rounded-lg overflow-hidden">
      <MonacoDiffEditor
        :original="originalTTL"
        :model-value="patchedTTL"
        lang="turtle"
        :options="{
          theme: monacoTheme,
          readOnly: true,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          renderSideBySide: true,
          originalEditable: false,
        }"
        class="h-[400px]"
      />
    </div>

    <!-- Commit message -->
    <div class="space-y-2">
      <label class="text-sm font-medium text-muted">Commit message</label>
      <input
        v-model="commitMessage"
        type="text"
        :placeholder="autoMessage"
        class="w-full px-3 py-2 text-sm border border-default rounded-md bg-default"
      />
    </div>

    <!-- Actions -->
    <div class="flex justify-end gap-2 pt-2">
      <UButton variant="ghost" @click="emit('cancel')">Cancel</UButton>
      <UButton @click="handleConfirm">
        Save to GitHub
      </UButton>
    </div>
  </div>
</template>
