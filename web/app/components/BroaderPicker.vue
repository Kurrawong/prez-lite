<script setup lang="ts">
import type { ConceptSummary } from '~/composables/useEditMode'

const props = defineProps<{
  modelValue: string[]
  concepts: ConceptSummary[]
  excludeIri?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
}>()

const modalOpen = ref(false)
const searchQuery = ref('')

// Working selection (committed on confirm)
const pendingSelection = ref<Set<string>>(new Set())

function openModal() {
  pendingSelection.value = new Set(props.modelValue)
  searchQuery.value = ''
  modalOpen.value = true
}

function toggleConcept(iri: string) {
  const next = new Set(pendingSelection.value)
  if (next.has(iri)) {
    next.delete(iri)
  } else {
    next.add(iri)
  }
  pendingSelection.value = next
}

function confirm() {
  emit('update:modelValue', [...pendingSelection.value])
  modalOpen.value = false
}

function removeConcept(iri: string) {
  emit('update:modelValue', props.modelValue.filter(v => v !== iri))
}

/** Get display label for an IRI */
function getLabel(iri: string): string {
  const concept = props.concepts.find(c => c.iri === iri)
  if (concept) return concept.prefLabel
  const hashIdx = iri.lastIndexOf('#')
  const slashIdx = iri.lastIndexOf('/')
  return iri.substring(Math.max(hashIdx, slashIdx) + 1)
}

/** Filtered concepts for the modal list */
const filteredConcepts = computed(() => {
  let items = props.concepts.filter(c => c.iri !== props.excludeIri)
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    items = items.filter(c => c.prefLabel.toLowerCase().includes(q))
  }
  return items
})
</script>

<template>
  <div>
    <!-- Selected concepts as chips -->
    <div class="flex flex-wrap gap-1.5 mb-2" v-if="modelValue.length">
      <UBadge
        v-for="iri in modelValue"
        :key="iri"
        color="primary"
        variant="subtle"
        class="gap-1"
      >
        {{ getLabel(iri) }}
        <button
          type="button"
          class="ml-0.5 hover:text-error transition-colors"
          @click="removeConcept(iri)"
        >
          <UIcon name="i-heroicons-x-mark" class="size-3" />
        </button>
      </UBadge>
    </div>

    <!-- Add button -->
    <UButton
      icon="i-heroicons-plus"
      variant="ghost"
      size="xs"
      @click="openModal"
    >
      {{ modelValue.length ? 'Change' : 'Add' }}
    </UButton>

    <!-- Modal with concept list -->
    <UModal v-model:open="modalOpen">
      <template #header>
        <div class="flex items-center justify-between w-full">
          <h3 class="font-semibold">Select concepts</h3>
        </div>
      </template>

      <template #body>
        <UInput
          v-model="searchQuery"
          icon="i-heroicons-magnifying-glass"
          placeholder="Search concepts..."
          class="mb-3"
          autofocus
        />

        <div class="max-h-80 overflow-y-auto space-y-0.5">
          <button
            v-for="concept in filteredConcepts"
            :key="concept.iri"
            type="button"
            class="w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-2"
            :class="pendingSelection.has(concept.iri)
              ? 'bg-primary/10 text-primary'
              : 'hover:bg-muted/50'"
            @click="toggleConcept(concept.iri)"
          >
            <UIcon
              :name="pendingSelection.has(concept.iri) ? 'i-heroicons-check-circle-solid' : 'i-heroicons-circle-stack'"
              class="size-4 shrink-0"
            />
            <span class="truncate">{{ concept.prefLabel }}</span>
          </button>

          <p v-if="!filteredConcepts.length" class="text-sm text-muted text-center py-4">
            No matching concepts
          </p>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" @click="modalOpen = false">Cancel</UButton>
          <UButton @click="confirm">
            Confirm ({{ pendingSelection.size }})
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
