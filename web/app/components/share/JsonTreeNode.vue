<script setup lang="ts">
const props = defineProps<{
  data: unknown
  label: string
  expanded?: boolean
  depth: number
}>()

const isExpanded = ref(props.expanded ?? false)

const dataType = computed(() => {
  if (props.data === null) return 'null'
  if (Array.isArray(props.data)) return 'array'
  return typeof props.data
})

const isExpandable = computed(() => dataType.value === 'object' || dataType.value === 'array')

const entries = computed(() => {
  if (dataType.value === 'array') {
    return (props.data as unknown[]).map((val, i) => ({ key: String(i), value: val }))
  }
  if (dataType.value === 'object') {
    return Object.entries(props.data as Record<string, unknown>).map(([key, value]) => ({ key, value }))
  }
  return []
})

const summary = computed(() => {
  if (dataType.value === 'array') return `[${(props.data as unknown[]).length}]`
  if (dataType.value === 'object') return `{${Object.keys(props.data as Record<string, unknown>).length}}`
  return ''
})

function formatValue(val: unknown): string {
  if (val === null) return 'null'
  if (typeof val === 'string') return `"${val}"`
  return String(val)
}

function valueColor(val: unknown): string {
  if (val === null) return 'text-gray-400'
  if (typeof val === 'string') return 'text-green-400'
  if (typeof val === 'number') return 'text-blue-400'
  if (typeof val === 'boolean') return 'text-amber-400'
  return ''
}
</script>

<template>
  <div :style="{ paddingLeft: depth > 0 ? '1rem' : '0' }">
    <div
      class="flex items-start gap-1 py-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 cursor-default"
      :class="{ 'cursor-pointer': isExpandable }"
      @click="isExpandable && (isExpanded = !isExpanded)"
    >
      <span v-if="isExpandable" class="select-none w-4 shrink-0 text-gray-400">
        {{ isExpanded ? '\u25BE' : '\u25B8' }}
      </span>
      <span v-else class="w-4 shrink-0" />

      <span class="text-purple-500 dark:text-purple-400 shrink-0">{{ label }}</span>
      <span v-if="!isExpandable" class="text-gray-400 mr-1">:</span>

      <template v-if="isExpandable">
        <span v-if="!isExpanded" class="text-gray-400 truncate">{{ summary }}</span>
      </template>
      <template v-else>
        <span :class="valueColor(data)" class="break-all">{{ formatValue(data) }}</span>
      </template>
    </div>

    <template v-if="isExpandable && isExpanded">
      <JsonTreeNode
        v-for="entry in entries"
        :key="entry.key"
        :data="entry.value"
        :label="entry.key"
        :depth="depth + 1"
      />
    </template>
  </div>
</template>
