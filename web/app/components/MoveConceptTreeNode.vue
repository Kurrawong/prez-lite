<script setup lang="ts">
interface TreeItem {
  id: string
  label: string
  children?: TreeItem[]
}

const props = defineProps<{
  item: TreeItem
  conceptIri: string
  currentBroaderIris: string[]
  disabledIris: Set<string>
  level?: number
}>()

const emit = defineEmits<{
  select: [iri: string]
}>()

const level = props.level ?? 0
const hasChildren = computed(() => !!props.item.children?.length)
const isExpanded = ref(false)
const isSelf = computed(() => props.item.id === props.conceptIri)
const isDisabled = computed(() => isSelf.value || props.disabledIris.has(props.item.id))
const isCurrentParent = computed(() => props.currentBroaderIris.includes(props.item.id))

function toggle() {
  isExpanded.value = !isExpanded.value
}

function handleClick() {
  if (isDisabled.value) return
  emit('select', props.item.id)
}
</script>

<template>
  <div>
    <div
      class="flex items-center gap-2 py-1.5 px-2 rounded-md transition-colors"
      :class="[
        isDisabled
          ? 'opacity-40 cursor-not-allowed'
          : isCurrentParent
            ? 'bg-primary/5 border border-primary/20 cursor-pointer'
            : 'hover:bg-muted/50 border border-transparent cursor-pointer',
        { 'ml-5': !hasChildren },
      ]"
      @click="handleClick"
    >
      <!-- Expand/collapse -->
      <button
        v-if="hasChildren"
        type="button"
        class="flex items-center justify-center size-5 rounded hover:bg-accented transition-colors"
        @click.stop="toggle"
      >
        <UIcon
          :name="isExpanded ? 'i-heroicons-chevron-down' : 'i-heroicons-chevron-right'"
          class="size-4 text-muted"
        />
      </button>

      <!-- Icon -->
      <UIcon
        :name="isSelf ? 'i-heroicons-arrow-right-circle' : hasChildren ? 'i-heroicons-folder' : 'i-heroicons-document'"
        class="size-4 shrink-0"
        :class="isSelf ? 'text-warning' : hasChildren ? 'text-primary' : 'text-muted'"
      />

      <!-- Label -->
      <span
        class="text-sm flex-1 truncate"
        :class="[
          isSelf ? 'font-semibold text-warning' : isCurrentParent ? 'font-medium text-primary' : '',
        ]"
      >
        {{ item.label }}
      </span>

      <!-- Badges -->
      <UBadge v-if="isSelf" color="warning" variant="subtle" size="xs">moving</UBadge>
      <UBadge v-else-if="isCurrentParent" color="primary" variant="subtle" size="xs">current parent</UBadge>
    </div>

    <!-- Children -->
    <div v-if="hasChildren && isExpanded" class="ml-2 pl-3 border-l border-default">
      <MoveConceptTreeNode
        v-for="child in item.children"
        :key="child.id"
        :item="child"
        :concept-iri="conceptIri"
        :current-broader-iris="currentBroaderIris"
        :disabled-iris="disabledIris"
        :level="level + 1"
        @select="emit('select', $event)"
      />
    </div>
  </div>
</template>
