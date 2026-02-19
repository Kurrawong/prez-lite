<script setup lang="ts">
import { useOntologyProperties } from '~/composables/useOntologyProperties'

const props = defineProps<{
  modelValue: string[]
  defaultFormat: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
  'update:defaultFormat': [value: string]
}>()

const { outputFormats } = useOntologyProperties()

function isSelected(format: string): boolean {
  return props.modelValue.includes(format)
}

function toggle(format: string) {
  if (isSelected(format)) {
    emit('update:modelValue', props.modelValue.filter(f => f !== format))
    // If removing the default format, clear it
    if (props.defaultFormat === format) {
      emit('update:defaultFormat', '')
    }
  } else {
    emit('update:modelValue', [...props.modelValue, format])
  }
}

function setDefault(format: string) {
  // Ensure format is in the list
  if (!isSelected(format)) {
    emit('update:modelValue', [...props.modelValue, format])
  }
  emit('update:defaultFormat', format)
}
</script>

<template>
  <div class="space-y-2">
    <div class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
      Output Formats
    </div>
    <div class="space-y-1">
      <div
        v-for="format in outputFormats"
        :key="format.id"
        :class="[
          'flex items-center justify-between px-3 py-2 rounded-lg border text-sm transition-colors',
          isSelected(format.id)
            ? 'bg-primary/10 border-primary'
            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
        ]"
      >
        <button
          type="button"
          class="flex items-center gap-2 flex-1 text-left"
          @click="toggle(format.id)"
        >
          <UIcon
            :name="isSelected(format.id) ? 'i-lucide-square-check' : 'i-lucide-square'"
            :class="[
              'size-4 flex-shrink-0',
              isSelected(format.id) ? 'text-primary' : 'text-gray-400'
            ]"
          />
          <span :class="isSelected(format.id) ? 'text-primary' : 'text-gray-700 dark:text-gray-300'">
            {{ format.label }}
          </span>
          <code class="text-xs text-gray-500 dark:text-gray-400">.{{ format.extension }}</code>
        </button>
        <button
          v-if="isSelected(format.id)"
          type="button"
          :class="[
            'px-2 py-0.5 text-xs rounded transition-colors',
            defaultFormat === format.id
              ? 'bg-primary text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          ]"
          :title="defaultFormat === format.id ? 'Default format' : 'Set as default'"
          @click.stop="setDefault(format.id)"
        >
          {{ defaultFormat === format.id ? 'Default' : 'Set default' }}
        </button>
      </div>
    </div>
    <p class="text-xs text-gray-500 dark:text-gray-400 mt-2">
      Select supported output formats. Mark one as the default.
    </p>
  </div>
</template>
