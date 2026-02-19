<script setup lang="ts">
import type { PrezGenerateFlags } from '~/utils/shacl-profile-parser'

const props = defineProps<{
  modelValue: PrezGenerateFlags
}>()

const emit = defineEmits<{
  'update:modelValue': [value: PrezGenerateFlags]
}>()

const flags: Array<{ key: keyof PrezGenerateFlags; label: string; description: string }> = [
  { key: 'identifier', label: 'Identifier', description: 'Generate prez:identifier annotation' },
  { key: 'link', label: 'Link', description: 'Generate prez:link annotation' },
  { key: 'members', label: 'Members', description: 'Generate prez:members annotation (for collections)' },
  { key: 'label', label: 'Label', description: 'Generate prez:label annotation' },
  { key: 'description', label: 'Description', description: 'Generate prez:description annotation' },
  { key: 'provenance', label: 'Provenance', description: 'Generate prez:provenance annotation' },
  { key: 'focusNode', label: 'Focus Node', description: 'Generate prez:focusNode annotation' },
]

function toggle(key: keyof PrezGenerateFlags) {
  emit('update:modelValue', {
    ...props.modelValue,
    [key]: !props.modelValue[key],
  })
}
</script>

<template>
  <div class="space-y-2">
    <div class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
      Generation Flags
    </div>
    <div class="grid grid-cols-2 gap-2">
      <button
        v-for="flag in flags"
        :key="flag.key"
        type="button"
        :class="[
          'flex items-center gap-2 px-3 py-2 rounded-lg border text-left text-sm transition-colors',
          modelValue[flag.key]
            ? 'bg-primary/10 border-primary text-primary'
            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300'
        ]"
        :title="flag.description"
        @click="toggle(flag.key)"
      >
        <UIcon
          :name="modelValue[flag.key] ? 'i-lucide-check-circle-2' : 'i-lucide-circle'"
          class="size-4 flex-shrink-0"
        />
        <span>{{ flag.label }}</span>
      </button>
    </div>
    <p class="text-xs text-gray-500 dark:text-gray-400 mt-2">
      Select which prez:* annotations to generate for this resource type.
    </p>
  </div>
</template>
