<script setup lang="ts">
import type { HistoryDiff } from '~/composables/useVocabHistory'

defineProps<{
  loading: boolean
  diff: HistoryDiff | null
  commitMessage: string
}>()

const emit = defineEmits<{
  close: []
}>()

const colorMode = useColorMode()
const monacoTheme = computed(() => colorMode.value === 'dark' ? 'prez-dark' : 'prez-light')
const activeTab = ref<'summary' | 'diff'>('summary')

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

function truncateValue(val: string, max = 60): string {
  if (val.startsWith('http')) {
    const hashIdx = val.lastIndexOf('#')
    const slashIdx = val.lastIndexOf('/')
    val = val.substring(Math.max(hashIdx, slashIdx) + 1)
  }
  return val.length > max ? val.slice(0, max) + '...' : val
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h3 class="text-lg font-semibold">Commit Changes</h3>
      <UButton icon="i-heroicons-x-mark" variant="ghost" size="xs" @click="emit('close')" />
    </div>

    <p v-if="commitMessage" class="text-sm text-muted truncate">{{ commitMessage }}</p>

    <div v-if="loading" class="py-8 text-center">
      <UIcon name="i-heroicons-arrow-path" class="size-5 animate-spin text-muted" />
      <p class="text-sm text-muted mt-2">Computing diff...</p>
    </div>

    <template v-else-if="diff">
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
        <div v-if="!diff.changeSummary.subjects.length" class="text-sm text-muted py-4 text-center">
          No structural changes detected (formatting only?)
        </div>

        <div
          v-for="subject in diff.changeSummary.subjects"
          :key="subject.subjectIri"
          class="border border-default rounded-lg p-3 space-y-2"
        >
          <div class="flex items-center gap-2">
            <UIcon
              :name="changeTypeIcon(subject.type)"
              :class="['size-4', changeTypeColor(subject.type)]"
            />
            <span class="text-sm font-medium">
              {{ changeTypePrefix(subject.type) }}: "{{ subject.subjectLabel }}"
            </span>
          </div>

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
                  <span class="line-through">{{ pc.oldValues.map(v => truncateValue(v)).join(', ') }}</span>
                  &rarr;
                  <span>{{ pc.newValues.map(v => truncateValue(v)).join(', ') }}</span>
                </span>
              </template>
              <template v-else-if="pc.type === 'added' && pc.newValues?.length">
                <span class="text-muted">: {{ pc.newValues.map(v => truncateValue(v)).join(', ') }}</span>
              </template>
              <template v-else-if="pc.type === 'removed' && pc.oldValues?.length">
                <span class="text-muted line-through">: {{ pc.oldValues.map(v => truncateValue(v)).join(', ') }}</span>
              </template>
            </div>
          </div>
        </div>
      </div>

      <!-- TTL Diff tab -->
      <div v-if="activeTab === 'diff'" class="border border-default rounded-lg overflow-hidden">
        <MonacoDiffEditor
          :original="diff.olderTTL"
          :model-value="diff.newerTTL"
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
    </template>

    <div v-else class="py-4">
      <UAlert color="error" title="Failed to load diff" />
    </div>
  </div>
</template>
