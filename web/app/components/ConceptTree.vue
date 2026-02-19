<script setup lang="ts">
interface TreeItem {
  id: string
  label: string
  icon?: string
  children?: TreeItem[]
  defaultExpanded?: boolean
}

const props = defineProps<{
  items: TreeItem[]
  expandAll?: boolean
  level?: number
  selectedId?: string
  editMode?: boolean
  expandToId?: string
}>()

const emit = defineEmits<{
  select: [id: string]
  edit: [id: string]
}>()

const level = props.level ?? 0
</script>

<template>
  <ul class="space-y-1" :class="{ 'pl-4': level > 0 }">
    <li v-for="item in items" :key="item.id">
      <ConceptTreeNode
        :item="item"
        :expand-all="expandAll"
        :level="level"
        :selected-id="selectedId"
        :edit-mode="editMode"
        :expand-to-id="expandToId"
        @select="emit('select', $event)"
        @edit="emit('edit', $event)"
      />
    </li>
  </ul>
</template>
