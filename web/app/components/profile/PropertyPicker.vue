<script setup lang="ts">
import { useOntologyProperties, type OntologyProperty, type OntologyNamespace } from '~/composables/useOntologyProperties'

const props = defineProps<{
  /** IRIs that are already selected (to show indicator) */
  selectedIris?: string[]
}>()

const emit = defineEmits<{
  select: [property: OntologyProperty]
}>()

const { namespaces, toPrefixed } = useOntologyProperties()

// Expanded state for accordion
const expandedNamespaces = ref<string[]>(['skos', 'dcterms'])

function isExpanded(prefix: string): boolean {
  return expandedNamespaces.value.includes(prefix)
}

function toggleNamespace(prefix: string) {
  if (isExpanded(prefix)) {
    expandedNamespaces.value = expandedNamespaces.value.filter(p => p !== prefix)
  } else {
    expandedNamespaces.value = [...expandedNamespaces.value, prefix]
  }
}

function isSelected(iri: string): boolean {
  return props.selectedIris?.includes(iri) ?? false
}

// Group properties by category within a namespace
function groupedProperties(ns: OntologyNamespace) {
  const groups: Record<string, OntologyProperty[]> = {}
  for (const prop of ns.properties) {
    if (!groups[prop.category]) {
      groups[prop.category] = []
    }
    groups[prop.category]!.push(prop)
  }
  return groups
}

const categoryLabels: Record<string, string> = {
  label: 'Labels',
  description: 'Descriptions',
  provenance: 'Provenance',
  metadata: 'Metadata',
  hierarchy: 'Hierarchy',
  other: 'Other',
}

const categoryOrder = ['label', 'description', 'provenance', 'metadata', 'hierarchy', 'other']
</script>

<template>
  <div class="space-y-1">
    <div
      v-for="ns in namespaces"
      :key="ns.prefix"
      class="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
    >
      <!-- Namespace header -->
      <button
        type="button"
        class="w-full flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        @click="toggleNamespace(ns.prefix)"
      >
        <div class="flex items-center gap-2">
          <UIcon
            :name="isExpanded(ns.prefix) ? 'i-heroicons-chevron-down' : 'i-heroicons-chevron-right'"
            class="size-4 text-gray-400"
          />
          <span class="font-medium text-sm">{{ ns.label }}</span>
          <code class="text-xs text-gray-500">{{ ns.prefix }}:</code>
        </div>
        <span class="text-xs text-gray-400">{{ ns.properties.length }} properties</span>
      </button>

      <!-- Properties (expanded) -->
      <Transition name="slide">
        <div v-if="isExpanded(ns.prefix)" class="px-3 py-2 space-y-3">
          <div
            v-for="category in categoryOrder"
            :key="category"
          >
            <template v-if="groupedProperties(ns)[category]?.length">
              <div class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                {{ categoryLabels[category] }}
              </div>
              <div class="flex flex-wrap gap-1">
                <button
                  v-for="prop in groupedProperties(ns)[category]"
                  :key="prop.iri"
                  type="button"
                  :class="[
                    'px-2 py-1 text-xs rounded border transition-colors',
                    isSelected(prop.iri)
                      ? 'bg-primary/20 border-primary text-primary'
                      : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-primary hover:text-primary'
                  ]"
                  :title="prop.description"
                  @click="emit('select', prop)"
                >
                  <span v-if="isSelected(prop.iri)" class="mr-1">✓</span>
                  {{ prop.localName }}
                </button>
              </div>
            </template>
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>

<style scoped>
.slide-enter-active,
.slide-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  max-height: 0;
}

.slide-enter-to,
.slide-leave-from {
  max-height: 500px;
}
</style>
