<script setup lang="ts">
import type { Column } from '@tanstack/vue-table'

const props = defineProps<{
  column: Column<any>
  label: string
  draggable?: boolean
}>()

const emit = defineEmits<{
  dragstart: [colId: string]
  drop: [colId: string]
  dragend: []
}>()

const open = ref(false)
const dragOver = ref(false)

const filterValue = computed({
  get: () => (props.column.getFilterValue() as string) ?? '',
  set: (v: string) => props.column.setFilterValue(v || undefined),
})

const hasFilter = computed(() => !!filterValue.value)
const sorted = computed(() => props.column.getIsSorted())

function sortAsc() {
  props.column.toggleSorting(false)
  open.value = false
}

function sortDesc() {
  props.column.toggleSorting(true)
  open.value = false
}

function clearSort() {
  props.column.clearSorting()
  open.value = false
}

function clearFilter() {
  filterValue.value = ''
}

function onDragStart(e: DragEvent) {
  if (!props.draggable) return
  e.dataTransfer!.effectAllowed = 'move'
  emit('dragstart', props.column.id)
}

function onDragOver(e: DragEvent) {
  if (!props.draggable) return
  e.preventDefault()
  e.dataTransfer!.dropEffect = 'move'
  dragOver.value = true
}

function onDragLeave() {
  dragOver.value = false
}

function onDrop(e: DragEvent) {
  e.preventDefault()
  dragOver.value = false
  if (!props.draggable) return
  emit('drop', props.column.id)
}

function onDragEnd() {
  dragOver.value = false
  emit('dragend')
}
</script>

<template>
  <div
    class="flex items-center gap-1 w-full group/header"
    :class="[
      dragOver ? 'border-l-2 border-primary' : '',
      draggable ? 'cursor-grab' : '',
    ]"
    :draggable="draggable"
    @dragstart="onDragStart"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
    @dragend="onDragEnd"
  >
    <!-- Drag handle: visible on hover, only for draggable columns -->
    <UIcon
      v-if="draggable"
      name="i-heroicons-bars-2"
      class="size-3.5 shrink-0 text-muted opacity-0 group-hover/header:opacity-40 transition-opacity cursor-grab"
    />

    <!-- Clickable label area: cycles sort -->
    <button
      class="flex items-center gap-1 text-left font-medium hover:text-primary transition-colors min-w-0 truncate"
      @click.stop="column.toggleSorting()"
    >
      <span class="truncate">{{ label }}</span>
      <UIcon
        v-if="sorted === 'asc'"
        name="i-heroicons-bars-arrow-up"
        class="size-3.5 text-primary shrink-0"
      />
      <UIcon
        v-else-if="sorted === 'desc'"
        name="i-heroicons-bars-arrow-down"
        class="size-3.5 text-primary shrink-0"
      />
    </button>

    <!-- Filter/active indicator -->
    <UIcon
      v-if="hasFilter"
      name="i-heroicons-funnel-solid"
      class="size-3 text-primary shrink-0"
    />

    <!-- Dropdown trigger: aligned right -->
    <UPopover v-model:open="open" :ui="{ content: 'p-0' }">
      <button
        class="shrink-0 ml-auto rounded p-0.5 hover:bg-muted/50 transition-colors"
        :class="open ? 'opacity-100' : 'opacity-0 group-hover/header:opacity-60'"
        @click.stop
      >
        <UIcon name="i-heroicons-chevron-down" class="size-3.5" />
      </button>

      <template #content>
        <div class="w-52">
          <!-- Sort options -->
          <div class="px-1 py-1 border-b border-default">
            <button
              class="flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded hover:bg-muted/50 transition-colors"
              :class="sorted === 'asc' ? 'text-primary font-medium' : ''"
              @click="sortAsc"
            >
              <UIcon name="i-heroicons-bars-arrow-up" class="size-4" />
              Sort ascending
            </button>
            <button
              class="flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded hover:bg-muted/50 transition-colors"
              :class="sorted === 'desc' ? 'text-primary font-medium' : ''"
              @click="sortDesc"
            >
              <UIcon name="i-heroicons-bars-arrow-down" class="size-4" />
              Sort descending
            </button>
            <button
              v-if="sorted"
              class="flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded hover:bg-muted/50 transition-colors text-muted"
              @click="clearSort"
            >
              <UIcon name="i-heroicons-x-mark" class="size-4" />
              Clear sort
            </button>
          </div>

          <!-- Filter -->
          <div class="p-2">
            <UInput
              v-model="filterValue"
              :placeholder="`Filter ${label.toLowerCase()}...`"
              size="sm"
              autofocus
              icon="i-heroicons-funnel"
              @keydown.escape="open = false"
            />
            <button
              v-if="hasFilter"
              class="flex items-center gap-1.5 w-full mt-1.5 px-2 py-1 text-xs text-muted hover:text-default rounded hover:bg-muted/50 transition-colors"
              @click="clearFilter"
            >
              <UIcon name="i-heroicons-x-mark" class="size-3" />
              Clear filter
            </button>
          </div>
        </div>
      </template>
    </UPopover>
  </div>
</template>
