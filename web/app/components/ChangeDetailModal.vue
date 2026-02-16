<script setup lang="ts">
import type { SubjectChange } from '~/composables/useEditMode'

defineProps<{
  change: SubjectChange
}>()

const emit = defineEmits<{
  revert: [subjectIri: string]
  close: []
}>()

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
    case 'added': return 'Added'
    case 'removed': return 'Removed'
    case 'modified': return 'Modified'
  }
}
</script>

<template>
  <div class="space-y-4">
    <!-- Subject header -->
    <div class="flex items-center gap-2">
      <UIcon
        :name="changeTypeIcon(change.type)"
        :class="['size-5', changeTypeColor(change.type)]"
      />
      <h3 class="text-lg font-semibold">
        {{ changeTypePrefix(change.type) }}: "{{ change.subjectLabel }}"
      </h3>
    </div>

    <!-- Property changes -->
    <div class="max-h-[400px] overflow-y-auto space-y-2">
      <div v-if="!change.propertyChanges.length" class="text-sm text-muted py-4 text-center">
        No property-level changes
      </div>

      <div
        v-for="pc in change.propertyChanges"
        :key="pc.predicateIri"
        class="border border-default rounded-lg p-3 space-y-1"
      >
        <div class="flex items-center gap-1.5">
          <UIcon
            :name="changeTypeIcon(pc.type)"
            :class="['size-3.5', changeTypeColor(pc.type)]"
          />
          <span class="text-sm font-medium">{{ pc.predicateLabel }}</span>
        </div>

        <div class="pl-5 text-xs space-y-0.5">
          <template v-if="pc.type === 'modified' && pc.oldValues?.length && pc.newValues?.length">
            <div v-for="(val, i) in pc.oldValues" :key="`old-${i}`" class="text-error line-through">
              {{ val }}
            </div>
            <div v-for="(val, i) in pc.newValues" :key="`new-${i}`" class="text-success">
              {{ val }}
            </div>
          </template>
          <template v-else-if="pc.type === 'added' && pc.newValues?.length">
            <div v-for="(val, i) in pc.newValues" :key="i" class="text-success">
              + {{ val }}
            </div>
          </template>
          <template v-else-if="pc.type === 'removed' && pc.oldValues?.length">
            <div v-for="(val, i) in pc.oldValues" :key="i" class="text-error line-through">
              - {{ val }}
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- Actions -->
    <div class="flex justify-end gap-2 pt-2">
      <UButton variant="ghost" @click="emit('close')">Close</UButton>
      <UButton
        icon="i-heroicons-arrow-uturn-left"
        color="error"
        variant="soft"
        @click="emit('revert', change.subjectIri); emit('close')"
      >
        Revert changes
      </UButton>
    </div>
  </div>
</template>
