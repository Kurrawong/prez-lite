<script setup lang="ts">
import { getLabel } from '~/composables/useVocabData'

const props = defineProps<{
  uri: string
  schemeUri: string
}>()

const emit = defineEmits<{
  close: []
}>()

const uriRef = computed(() => props.uri)
const {
  concept,
  status,
  coreProperties,
  notes,
  relationships,
  richMetadata
} = useConcept(uriRef)

// Keep track of last valid concept to prevent flicker during navigation
const lastValidConcept = ref<typeof concept.value>(null)
const lastValidUri = ref<string>('')
const lastValidRichMetadata = ref<typeof richMetadata.value>([])
const lastValidCoreProperties = ref<typeof coreProperties.value>([])
const lastValidNotes = ref<typeof notes.value>([])
const lastValidRelationships = ref<typeof relationships.value>([])

// Update last valid data when we have a successful load
watch([concept, richMetadata], () => {
  if (concept.value && status.value === 'success') {
    lastValidConcept.value = concept.value
    lastValidUri.value = props.uri
    lastValidRichMetadata.value = richMetadata.value
    lastValidCoreProperties.value = coreProperties.value
    lastValidNotes.value = notes.value
    lastValidRelationships.value = relationships.value
  }
}, { immediate: true })

// Show content if we have current data OR previous data while loading
const displayConcept = computed(() => concept.value ?? lastValidConcept.value)
const displayUri = computed(() => concept.value ? props.uri : lastValidUri.value)
const displayRichMetadata = computed(() => concept.value ? richMetadata.value : lastValidRichMetadata.value)
const displayCoreProperties = computed(() => concept.value ? coreProperties.value : lastValidCoreProperties.value)
const displayNotes = computed(() => concept.value ? notes.value : lastValidNotes.value)
const displayRelationships = computed(() => concept.value ? relationships.value : lastValidRelationships.value)

// Only show skeleton on initial load (no previous data)
const showSkeleton = computed(() => status.value === 'pending' && !lastValidConcept.value)
// Show loading overlay when switching concepts
const isTransitioning = computed(() => status.value === 'pending' && !!lastValidConcept.value)
</script>

<template>
  <div class="relative min-h-[200px]">
    <!-- Close button -->
    <UButton
      icon="i-heroicons-x-mark"
      color="neutral"
      variant="ghost"
      size="xs"
      class="absolute top-0 right-0 z-10"
      @click="emit('close')"
    />

    <!-- Loading skeleton (only on initial load) -->
    <div v-if="showSkeleton" class="space-y-3 pt-6">
      <USkeleton class="h-6 w-3/4" />
      <USkeleton class="h-4 w-full" />
      <USkeleton class="h-4 w-2/3" />
    </div>

    <!-- Concept details (show previous content while loading new) -->
    <template v-else-if="displayConcept">
      <div class="pt-2 transition-opacity duration-150" :class="{ 'opacity-50': isTransitioning }">
        <!-- Loading indicator overlay during transition -->
        <div v-if="isTransitioning" class="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <UIcon name="i-heroicons-arrow-path" class="size-5 text-primary animate-spin" />
        </div>

        <!-- Title with link to full page -->
        <NuxtLink
          :to="{ path: '/concept', query: { uri: displayUri } }"
          class="text-xl font-semibold text-primary hover:underline block mb-1"
        >
          {{ getLabel(displayConcept.prefLabel) }}
        </NuxtLink>

        <!-- IRI -->
        <a
          :href="displayUri"
          target="_blank"
          class="text-xs text-muted hover:text-primary break-all block mb-3"
        >
          {{ displayUri }}
        </a>

        <!-- Notation badge -->
        <UBadge v-if="displayConcept.notation" color="primary" variant="subtle" size="sm" class="mb-3">
          {{ displayConcept.notation }}
        </UBadge>

        <!-- Definition -->
        <p v-if="displayConcept.definition" class="text-sm text-muted mb-4">
          {{ getLabel(displayConcept.definition) }}
        </p>

        <!-- Properties summary - rich rendering when available -->
        <div v-if="displayRichMetadata.length || displayCoreProperties.length" class="mb-4">
          <h4 class="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Properties</h4>
          <!-- Rich metadata (limited for panel view) -->
          <RichMetadataTable v-if="displayRichMetadata.length" :properties="displayRichMetadata.slice(0, 6)" />
          <!-- Fallback to simple display -->
          <div v-else class="space-y-2">
            <div v-for="prop in displayCoreProperties.slice(0, 4)" :key="prop.property" class="text-sm">
              <span class="text-muted">{{ prop.property }}:</span>
              <span class="ml-1">
                {{ prop.values.map(v => v.value).join(', ') }}
              </span>
            </div>
          </div>
        </div>

        <!-- Relationships summary -->
        <div v-if="displayRelationships.length" class="mb-4">
          <h4 class="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Relationships</h4>
          <div class="space-y-2">
            <div v-for="rel in displayRelationships" :key="rel.title" class="text-sm">
              <span class="text-muted">{{ rel.title }}:</span>
              <span class="ml-1">{{ rel.items.length }}</span>
            </div>
          </div>
        </div>

        <!-- Notes summary -->
        <div v-if="displayNotes.length" class="mb-4">
          <h4 class="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Notes</h4>
          <div v-for="note in displayNotes.slice(0, 2)" :key="note.title" class="text-sm mb-2">
            <span class="text-muted">{{ note.title }}:</span>
            <p class="mt-1 line-clamp-2">{{ note.content }}</p>
          </div>
        </div>

        <!-- View full details link -->
        <NuxtLink
          :to="{ path: '/concept', query: { uri: displayUri } }"
          class="inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          View full details
          <UIcon name="i-heroicons-arrow-right" class="size-4" />
        </NuxtLink>
      </div>
    </template>

    <!-- Not found (only when not loading and no concept data) -->
    <UAlert
      v-else-if="status !== 'pending'"
      color="warning"
      icon="i-heroicons-exclamation-triangle"
      title="Concept not found"
      class="mt-6"
    />
  </div>
</template>
