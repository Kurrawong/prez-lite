<script setup lang="ts">
interface TreeItem {
  id: string
  label: string
  icon?: string
  children?: TreeItem[]
  defaultExpanded?: boolean
}

const props = defineProps<{
  item: TreeItem
  expandAll?: boolean
  level?: number
  selectedId?: string
  editMode?: boolean
}>()

const emit = defineEmits<{
  select: [id: string]
  edit: [id: string]
}>()

const level = props.level ?? 0
const hasChildren = computed(() => props.item.children && props.item.children.length > 0)
const isSelected = computed(() => props.selectedId === props.item.id)

// Track expanded state - default based on item.defaultExpanded or expandAll prop
const isExpanded = ref(props.item.defaultExpanded ?? false)

// Watch expandAll to override local state
watch(() => props.expandAll, (newVal) => {
  if (newVal !== undefined) {
    isExpanded.value = newVal
  }
}, { immediate: true })

function toggle() {
  isExpanded.value = !isExpanded.value
}

function handleSelect() {
  emit('select', props.item.id)
}

function handleEdit() {
  emit('edit', props.item.id)
}
</script>

<template>
  <div>
    <div
      class="flex items-center gap-2 py-1.5 px-2 rounded-md transition-colors group cursor-pointer"
      :class="[
        isSelected ? 'bg-primary/10 ring-2 ring-primary ring-inset' : 'hover:bg-muted/50',
        { 'ml-5': !hasChildren }
      ]"
      @click="handleSelect"
    >
      <!-- Expand/collapse button -->
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
        :name="hasChildren ? 'i-heroicons-folder' : 'i-heroicons-document'"
        class="size-4 shrink-0"
        :class="hasChildren ? 'text-primary' : 'text-muted'"
      />

      <!-- Label -->
      <span
        class="text-sm transition-colors flex-1 truncate"
        :class="isSelected ? 'text-primary font-medium' : 'hover:text-primary'"
      >
        {{ item.label }}
      </span>

      <!-- Edit button (shown on hover in edit mode) -->
      <UButton
        v-if="editMode"
        icon="i-heroicons-pencil-square"
        color="neutral"
        variant="ghost"
        size="xs"
        class="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
        @click.stop="handleEdit"
      />

      <!-- Child count badge -->
      <UBadge
        v-if="hasChildren"
        color="neutral"
        variant="subtle"
        size="xs"
        class="opacity-0 group-hover:opacity-100 transition-opacity"
      >
        {{ item.children!.length }}
      </UBadge>
    </div>

    <!-- Children -->
    <div v-if="hasChildren && isExpanded" class="ml-2 pl-3 border-l border-default">
      <ConceptTree
        :items="item.children!"
        :expand-all="expandAll"
        :level="level + 1"
        :selected-id="selectedId"
        :edit-mode="editMode"
        @select="emit('select', $event)"
        @edit="emit('edit', $event)"
      />
    </div>
  </div>
</template>
