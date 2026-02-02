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
  relationships
} = useConcept(uriRef)
</script>

<template>
  <div class="relative">
    <!-- Close button -->
    <UButton
      icon="i-heroicons-x-mark"
      color="neutral"
      variant="ghost"
      size="xs"
      class="absolute top-0 right-0"
      @click="emit('close')"
    />

    <!-- Loading -->
    <div v-if="status === 'pending'" class="space-y-3 pt-6">
      <USkeleton class="h-6 w-3/4" />
      <USkeleton class="h-4 w-full" />
      <USkeleton class="h-4 w-2/3" />
    </div>

    <!-- Concept details -->
    <template v-else-if="concept">
      <div class="pt-2">
        <!-- Title with link to full page -->
        <NuxtLink
          :to="{ path: '/concept', query: { uri: uri } }"
          class="text-xl font-semibold text-primary hover:underline block mb-1"
        >
          {{ getLabel(concept.prefLabel) }}
        </NuxtLink>

        <!-- IRI -->
        <a
          :href="uri"
          target="_blank"
          class="text-xs text-muted hover:text-primary break-all block mb-3"
        >
          {{ uri }}
        </a>

        <!-- Notation badge -->
        <UBadge v-if="concept.notation" color="primary" variant="subtle" size="sm" class="mb-3">
          {{ concept.notation }}
        </UBadge>

        <!-- Definition -->
        <p v-if="concept.definition" class="text-sm text-muted mb-4">
          {{ getLabel(concept.definition) }}
        </p>

        <!-- Properties summary -->
        <div v-if="coreProperties.length" class="mb-4">
          <h4 class="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Properties</h4>
          <div class="space-y-2">
            <div v-for="prop in coreProperties.slice(0, 4)" :key="prop.property" class="text-sm">
              <span class="text-muted">{{ prop.property }}:</span>
              <span class="ml-1">
                {{ prop.values.map(v => v.value).join(', ') }}
              </span>
            </div>
          </div>
        </div>

        <!-- Relationships summary -->
        <div v-if="relationships.length" class="mb-4">
          <h4 class="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Relationships</h4>
          <div class="space-y-2">
            <div v-for="rel in relationships" :key="rel.title" class="text-sm">
              <span class="text-muted">{{ rel.title }}:</span>
              <span class="ml-1">{{ rel.items.length }}</span>
            </div>
          </div>
        </div>

        <!-- Notes summary -->
        <div v-if="notes.length" class="mb-4">
          <h4 class="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Notes</h4>
          <div v-for="note in notes.slice(0, 2)" :key="note.title" class="text-sm mb-2">
            <span class="text-muted">{{ note.title }}:</span>
            <p class="mt-1 line-clamp-2">{{ note.content }}</p>
          </div>
        </div>

        <!-- View full details link -->
        <NuxtLink
          :to="{ path: '/concept', query: { uri: uri } }"
          class="inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          View full details
          <UIcon name="i-heroicons-arrow-right" class="size-4" />
        </NuxtLink>
      </div>
    </template>

    <!-- Not found -->
    <UAlert
      v-else
      color="warning"
      icon="i-heroicons-exclamation-triangle"
      title="Concept not found"
      class="mt-6"
    />
  </div>
</template>
