<script setup lang="ts">
interface TreeItem {
  id: string
  label: string
  children?: TreeItem[]
}

const props = defineProps<{
  open: boolean
  conceptIri: string
  conceptLabel: string
  currentBroaderIris: string[]
  treeItems: TreeItem[]
  resolveLabel: (iri: string) => string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'confirm': [newBroaderIris: string[]]
}>()

const modalOpen = computed({
  get: () => props.open,
  set: (v) => emit('update:open', v),
})

// Selected new parent (null = root/top concept)
const selectedParentIri = ref<string | null>(null)
const showConfirm = ref(false)

// Reset state when modal opens
watch(() => props.open, (open) => {
  if (open) {
    selectedParentIri.value = null
    showConfirm.value = false
  }
})

// Collect all descendant IRIs of the concept being moved (to prevent circular moves)
const descendantIris = computed(() => {
  const descendants = new Set<string>()
  function collectDescendants(items: TreeItem[]) {
    for (const item of items) {
      if (item.id === props.conceptIri) {
        // Found the concept — collect all its children recursively
        function addChildren(children?: TreeItem[]) {
          if (!children) return
          for (const child of children) {
            descendants.add(child.id)
            addChildren(child.children)
          }
        }
        addChildren(item.children)
      } else if (item.children) {
        collectDescendants(item.children)
      }
    }
  }
  collectDescendants(props.treeItems)
  return descendants
})

function isDisabled(iri: string): boolean {
  return iri === props.conceptIri || descendantIris.value.has(iri)
}

function isCurrentParent(iri: string): boolean {
  return props.currentBroaderIris.includes(iri)
}

const isCurrentlyTopConcept = computed(() => props.currentBroaderIris.length === 0)

function selectParent(iri: string | null) {
  if (iri !== null && isDisabled(iri)) return
  selectedParentIri.value = iri
  showConfirm.value = true
}

function confirmMove() {
  const newBroader = selectedParentIri.value === null ? [] : [selectedParentIri.value]
  emit('confirm', newBroader)
  modalOpen.value = false
}

function cancelConfirm() {
  showConfirm.value = false
  selectedParentIri.value = null
}

const selectedParentLabel = computed(() => {
  if (selectedParentIri.value === null) return 'Root (top concept)'
  return props.resolveLabel(selectedParentIri.value)
})

const currentParentLabel = computed(() => {
  if (props.currentBroaderIris.length === 0) return 'Root (top concept)'
  return props.currentBroaderIris.map(iri => props.resolveLabel(iri)).join(', ')
})
</script>

<template>
  <UModal v-model:open="modalOpen" :ui="{ width: 'max-w-lg' }">
    <template #header>
      <div class="flex items-center gap-2">
        <UIcon name="i-heroicons-arrow-up-right" class="size-5 text-primary" />
        <h3 class="font-semibold">Move "{{ conceptLabel }}"</h3>
      </div>
    </template>

    <template #body>
      <!-- Confirmation step -->
      <template v-if="showConfirm">
        <div class="space-y-4">
          <p class="text-sm">Move <span class="font-medium">{{ conceptLabel }}</span> to a new location?</p>

          <div class="bg-muted/30 rounded-lg p-3 space-y-2 text-sm">
            <div class="flex items-center gap-2">
              <span class="text-muted w-16 shrink-0">From:</span>
              <span class="font-medium">{{ currentParentLabel }}</span>
            </div>
            <div class="flex items-center gap-2">
              <UIcon name="i-heroicons-arrow-down" class="size-4 text-muted ml-5" />
            </div>
            <div class="flex items-center gap-2">
              <span class="text-muted w-16 shrink-0">To:</span>
              <span class="font-medium text-primary">{{ selectedParentLabel }}</span>
            </div>
          </div>

          <div class="bg-muted/20 rounded-lg p-3 text-xs text-muted space-y-1">
            <p class="font-medium text-foreground">What will change:</p>
            <ul class="list-disc list-inside space-y-0.5">
              <li v-if="currentBroaderIris.length > 0">
                <code>skos:broader</code> removed from {{ currentParentLabel }}
              </li>
              <li v-if="currentBroaderIris.length > 0">
                <code>skos:narrower</code> removed from {{ currentParentLabel }}
              </li>
              <li v-if="selectedParentIri !== null">
                <code>skos:broader</code> added to {{ selectedParentLabel }}
              </li>
              <li v-if="selectedParentIri !== null">
                <code>skos:narrower</code> added on {{ selectedParentLabel }}
              </li>
              <li v-if="selectedParentIri === null && currentBroaderIris.length > 0">
                <code>skos:topConceptOf</code> and <code>skos:hasTopConcept</code> added
              </li>
              <li v-if="selectedParentIri !== null && currentBroaderIris.length === 0">
                <code>skos:topConceptOf</code> and <code>skos:hasTopConcept</code> removed
              </li>
            </ul>
          </div>

          <div class="flex justify-end gap-2">
            <UButton variant="ghost" size="sm" @click="cancelConfirm">Back</UButton>
            <UButton size="sm" @click="confirmMove">Confirm move</UButton>
          </div>
        </div>
      </template>

      <!-- Tree selection step -->
      <template v-else>
        <p class="text-sm text-muted mb-3">Select the new parent for this concept.</p>

        <!-- Make top concept option -->
        <div
          class="flex items-center gap-2 py-2 px-3 rounded-md transition-colors cursor-pointer mb-2"
          :class="isCurrentlyTopConcept ? 'bg-primary/5 border border-primary/20' : 'hover:bg-muted/50 border border-transparent'"
          @click="selectParent(null)"
        >
          <UIcon name="i-heroicons-home" class="size-4 text-primary" />
          <span class="text-sm font-medium">Root (top concept)</span>
          <UBadge v-if="isCurrentlyTopConcept" color="primary" variant="subtle" size="xs" class="ml-auto">current</UBadge>
        </div>

        <USeparator class="my-2" />

        <!-- Scrollable tree -->
        <div class="max-h-80 overflow-y-auto">
          <MoveConceptTreeNode
            v-for="item in treeItems"
            :key="item.id"
            :item="item"
            :concept-iri="conceptIri"
            :current-broader-iris="currentBroaderIris"
            :disabled-iris="descendantIris"
            @select="selectParent"
          />
        </div>
      </template>
    </template>
  </UModal>
</template>
