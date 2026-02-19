<script setup lang="ts">
import type { ValidationResult } from '~/composables/useProfileValidation'

defineProps<{
  result: ValidationResult
  isValidating?: boolean
}>()

function getIcon(level: 'error' | 'warning' | 'info'): string {
  switch (level) {
    case 'error':
      return 'i-heroicons-x-circle'
    case 'warning':
      return 'i-heroicons-exclamation-triangle'
    case 'info':
      return 'i-heroicons-information-circle'
  }
}

function getColor(level: 'error' | 'warning' | 'info'): string {
  switch (level) {
    case 'error':
      return 'text-red-600 dark:text-red-400'
    case 'warning':
      return 'text-amber-600 dark:text-amber-400'
    case 'info':
      return 'text-blue-600 dark:text-blue-400'
  }
}

function getBgColor(level: 'error' | 'warning' | 'info'): string {
  switch (level) {
    case 'error':
      return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
    case 'warning':
      return 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
    case 'info':
      return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
  }
}
</script>

<template>
  <div class="space-y-3">
    <!-- Status Badge -->
    <div class="flex items-center gap-2">
      <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Validation</span>
      <template v-if="isValidating">
        <UIcon name="i-heroicons-arrow-path" class="size-4 text-gray-400 animate-spin" />
        <span class="text-xs text-gray-500">Validating...</span>
      </template>
      <template v-else-if="result.messages.length > 0">
        <span
          v-if="result.valid"
          class="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
        >
          Valid
        </span>
        <span
          v-else-if="result.parseError"
          class="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
        >
          Parse Error
        </span>
        <span
          v-else
          class="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
        >
          {{ result.messages.filter(m => m.level === 'warning').length }} warnings
        </span>
      </template>
    </div>

    <!-- Messages -->
    <div v-if="result.messages.length > 0" class="space-y-2">
      <div
        v-for="(msg, i) in result.messages"
        :key="i"
        :class="['px-3 py-2 rounded-lg border text-sm', getBgColor(msg.level)]"
      >
        <div class="flex items-start gap-2">
          <UIcon :name="getIcon(msg.level)" :class="['size-4 mt-0.5 flex-shrink-0', getColor(msg.level)]" />
          <div class="flex-1 min-w-0">
            <div :class="['font-medium', getColor(msg.level)]">
              {{ msg.message }}
            </div>
            <div v-if="msg.detail" class="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
              {{ msg.detail }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else-if="!isValidating" class="text-sm text-gray-500 dark:text-gray-400 italic">
      No validation results yet
    </div>

    <!-- Profile summary (when valid) -->
    <div v-if="result.profile && !result.parseError" class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
      <div class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Profile Summary</div>
      <dl class="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <dt class="text-gray-500">IRI</dt>
        <dd class="text-gray-700 dark:text-gray-300 font-mono truncate" :title="result.profile.iri">
          {{ result.profile.iri }}
        </dd>
        <dt class="text-gray-500">Target Class</dt>
        <dd class="text-gray-700 dark:text-gray-300 font-mono truncate">
          {{ result.profile.targetClass || '—' }}
        </dd>
        <dt class="text-gray-500">Label Sources</dt>
        <dd class="text-gray-700 dark:text-gray-300">
          {{ result.profile.labelSources.length }} defined
        </dd>
        <dt class="text-gray-500">Formats</dt>
        <dd class="text-gray-700 dark:text-gray-300">
          {{ result.profile.formats.length }} configured
        </dd>
      </dl>
    </div>
  </div>
</template>
