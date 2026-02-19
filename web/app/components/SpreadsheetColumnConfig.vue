<script setup lang="ts">
import type { Table } from '@tanstack/vue-table'

const props = defineProps<{
  table: Table<any>
  schemeIri: string
}>()

const STORAGE_KEY_PREFIX = 'prez_col_order_'
const storageKey = computed(() => STORAGE_KEY_PREFIX + props.schemeIri)

const open = ref(false)

const columns = computed(() =>
  props.table.getAllColumns().filter(col => col.getCanHide()),
)

function moveColumn(colId: string, direction: -1 | 1) {
  const order = props.table.getState().columnOrder
  // If no explicit order yet, derive from current column layout
  const currentOrder = order.length
    ? [...order]
    : props.table.getAllColumns().map(c => c.id)

  const idx = currentOrder.indexOf(colId)
  if (idx < 0) return
  const targetIdx = idx + direction
  if (targetIdx < 0 || targetIdx >= currentOrder.length) return

  // Swap
  ;[currentOrder[idx], currentOrder[targetIdx]] = [currentOrder[targetIdx]!, currentOrder[idx]!]
  props.table.setColumnOrder(currentOrder)

  // Persist
  try {
    localStorage.setItem(storageKey.value, JSON.stringify(currentOrder))
  } catch { /* quota exceeded — non-critical */ }
}
</script>

<template>
  <UPopover v-model:open="open">
    <UButton
      icon="i-heroicons-adjustments-horizontal"
      variant="ghost"
      color="neutral"
      size="sm"
      title="Column settings"
    />

    <template #content>
      <div class="p-3 w-56 max-h-80 overflow-y-auto">
        <p class="text-xs font-medium text-muted mb-2">Columns</p>
        <div class="space-y-1">
          <div
            v-for="col in columns"
            :key="col.id"
            class="flex items-center gap-2 py-0.5"
          >
            <UCheckbox
              :model-value="col.getIsVisible()"
              :label="typeof col.columnDef.header === 'string' ? col.columnDef.header : col.id"
              size="sm"
              @update:model-value="col.toggleVisibility(!!$event)"
            />
            <div class="ml-auto flex items-center gap-0.5 shrink-0">
              <UButton
                icon="i-heroicons-chevron-up"
                variant="ghost"
                size="2xs"
                color="neutral"
                @click="moveColumn(col.id, -1)"
              />
              <UButton
                icon="i-heroicons-chevron-down"
                variant="ghost"
                size="2xs"
                color="neutral"
                @click="moveColumn(col.id, 1)"
              />
            </div>
          </div>
        </div>
      </div>
    </template>
  </UPopover>
</template>
