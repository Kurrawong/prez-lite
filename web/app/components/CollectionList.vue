<script setup lang="ts">
import type { CollectionListItem } from '~/composables/useVocabData'
import type { Concept } from '~/composables/useVocabData'
import { getLabel } from '~/composables/useVocabData'

const props = defineProps<{
  collections: CollectionListItem[]
  concepts: Concept[]
}>()

const emit = defineEmits<{
  'select-concept': [iri: string]
}>()

// Build a lookup map from concept IRI to label
const conceptLabelMap = computed(() => {
  const map = new Map<string, string>()
  for (const c of props.concepts) {
    map.set(c.iri, getLabel(c.prefLabel))
  }
  return map
})

function resolveMemberLabel(iri: string): string {
  return conceptLabelMap.value.get(iri) || iri.substring(Math.max(iri.lastIndexOf('#'), iri.lastIndexOf('/')) + 1)
}

// Track which collections are expanded
const expandedSet = ref(new Set<string>())

function toggle(iri: string) {
  const next = new Set(expandedSet.value)
  if (next.has(iri)) {
    next.delete(iri)
  } else {
    next.add(iri)
  }
  expandedSet.value = next
}
</script>

<template>
  <div class="space-y-2">
    <div
      v-for="col in collections"
      :key="col.iri"
      class="border border-default rounded-lg"
    >
      <!-- Collection header -->
      <button
        type="button"
        class="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted/50 transition-colors rounded-lg"
        @click="toggle(col.iri)"
      >
        <UIcon
          :name="expandedSet.has(col.iri) ? 'i-heroicons-chevron-down' : 'i-heroicons-chevron-right'"
          class="size-4 shrink-0 text-muted"
        />
        <UIcon name="i-heroicons-rectangle-stack" class="size-4 shrink-0 text-primary" />
        <span class="font-medium text-sm truncate">{{ col.prefLabel }}</span>
        <UBadge color="neutral" variant="subtle" size="xs" class="shrink-0">
          {{ col.members.length }} member{{ col.members.length !== 1 ? 's' : '' }}
        </UBadge>
        <span v-if="col.definition && !expandedSet.has(col.iri)" class="text-xs text-muted truncate ml-auto">
          {{ col.definition }}
        </span>
      </button>

      <!-- Expanded content -->
      <div v-if="expandedSet.has(col.iri)" class="px-3 pb-3">
        <p v-if="col.definition" class="text-sm text-muted mb-2">
          {{ col.definition }}
        </p>
        <div class="flex flex-wrap gap-1.5">
          <UButton
            v-for="memberIri in col.members"
            :key="memberIri"
            variant="soft"
            color="primary"
            size="xs"
            @click="emit('select-concept', memberIri)"
          >
            {{ resolveMemberLabel(memberIri) }}
          </UButton>
        </div>
        <p v-if="col.members.length === 0" class="text-xs text-muted italic">
          No members
        </p>
      </div>
    </div>
  </div>
</template>
