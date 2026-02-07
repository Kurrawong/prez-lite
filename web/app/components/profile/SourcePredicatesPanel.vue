<script setup lang="ts">
import { useOntologyProperties } from '~/composables/useOntologyProperties'

const props = defineProps<{
  title: string
  modelValue: string[]
  category: 'label' | 'description' | 'provenance'
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
}>()

const { toPrefixed, findPropertyByIri, labelProperties, descriptionProperties, provenanceProperties } = useOntologyProperties()

// Get suggested properties based on category
const suggestedProperties = computed(() => {
  switch (props.category) {
    case 'label':
      return labelProperties.value
    case 'description':
      return descriptionProperties.value
    case 'provenance':
      return provenanceProperties.value
    default:
      return []
  }
})

// Filter out already selected
const availableProperties = computed(() => {
  return suggestedProperties.value.filter(p => !props.modelValue.includes(p.iri))
})

function add(iri: string) {
  emit('update:modelValue', [...props.modelValue, iri])
}

function remove(iri: string) {
  emit('update:modelValue', props.modelValue.filter(i => i !== iri))
}

function moveUp(index: number) {
  if (index === 0) return
  const arr = [...props.modelValue]
  const prev = arr[index - 1]!
  const curr = arr[index]!
  arr[index - 1] = curr
  arr[index] = prev
  emit('update:modelValue', arr)
}

function moveDown(index: number) {
  if (index >= props.modelValue.length - 1) return
  const arr = [...props.modelValue]
  const curr = arr[index]!
  const next = arr[index + 1]!
  arr[index] = next
  arr[index + 1] = curr
  emit('update:modelValue', arr)
}

function getPropertyLabel(iri: string): string {
  const prop = findPropertyByIri(iri)
  return prop?.label ?? toPrefixed(iri)
}
</script>

<template>
  <div class="space-y-2">
    <div class="text-sm font-medium text-gray-700 dark:text-gray-300">
      {{ title }}
    </div>

    <!-- Selected predicates (ordered) -->
    <div v-if="modelValue.length > 0" class="space-y-1">
      <div
        v-for="(iri, index) in modelValue"
        :key="iri"
        class="flex items-center gap-2 px-3 py-2 bg-primary/10 border border-primary rounded-lg text-sm"
      >
        <span class="w-5 text-center text-xs text-gray-500">{{ index + 1 }}</span>
        <code class="flex-1 text-primary font-mono text-xs">{{ toPrefixed(iri) }}</code>
        <div class="flex items-center gap-1">
          <button
            type="button"
            class="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
            :disabled="index === 0"
            title="Move up"
            @click="moveUp(index)"
          >
            <UIcon name="i-heroicons-chevron-up" class="size-3" />
          </button>
          <button
            type="button"
            class="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
            :disabled="index === modelValue.length - 1"
            title="Move down"
            @click="moveDown(index)"
          >
            <UIcon name="i-heroicons-chevron-down" class="size-3" />
          </button>
          <button
            type="button"
            class="p-1 text-gray-400 hover:text-red-500"
            title="Remove"
            @click="remove(iri)"
          >
            <UIcon name="i-heroicons-x-mark" class="size-3" />
          </button>
        </div>
      </div>
    </div>
    <div v-else class="text-xs text-gray-500 italic py-2">
      No predicates selected. Add from suggestions below.
    </div>

    <!-- Add from suggestions -->
    <div v-if="availableProperties.length > 0" class="pt-2">
      <div class="text-xs text-gray-500 mb-2">Add predicate:</div>
      <div class="flex flex-wrap gap-1">
        <button
          v-for="prop in availableProperties"
          :key="prop.iri"
          type="button"
          class="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded hover:border-primary hover:text-primary transition-colors"
          :title="prop.description"
          @click="add(prop.iri)"
        >
          {{ prop.label }}
        </button>
      </div>
    </div>

    <p class="text-xs text-gray-500 dark:text-gray-400">
      Order matters: first matching value wins.
    </p>
  </div>
</template>
