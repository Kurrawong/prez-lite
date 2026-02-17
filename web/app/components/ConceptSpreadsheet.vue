<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { SortingState, ColumnFiltersState, ColumnPinningState } from '@tanstack/vue-table'
import type { TreeItem } from '~/composables/useScheme'
import type { EditableProperty, EditableValue, ConceptSummary } from '~/composables/useEditMode'

const SIMPLE_HIDDEN_PREDICATES = new Set([
  'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
  'http://www.w3.org/2004/02/skos/core#inScheme',
  'http://www.w3.org/2004/02/skos/core#topConceptOf',
  'http://www.w3.org/2004/02/skos/core#hasTopConcept',
  'http://www.w3.org/2004/02/skos/core#narrower',
  'http://www.w3.org/2004/02/skos/core#broader',
])

const SKOS_PREFLABEL = 'http://www.w3.org/2004/02/skos/core#prefLabel'

interface EditModeApi {
  isEditMode: { value: boolean }
  storeVersion: { value: number }
  concepts: { value: ConceptSummary[] }
  getPropertiesForSubject: (iri: string, type: 'conceptScheme' | 'concept', populatedOnly?: boolean) => EditableProperty[]
  resolveLabel: (iri: string) => string
  updateValue: (subjectIri: string, predicateIri: string, oldValue: EditableValue, newValue: string) => void
  updateValueLanguage: (subjectIri: string, predicateIri: string, oldValue: EditableValue, newLang: string) => void
  addValue: (subjectIri: string, predicateIri: string) => void
  removeValue: (subjectIri: string, predicateIri: string, value: EditableValue) => void
  syncBroaderNarrower: (conceptIri: string, newBroaderIris: string[], oldBroaderIris: string[]) => void
  syncRelated: (conceptIri: string, newIris: string[], oldIris: string[]) => void
  renameSubject: (oldIri: string, newIri: string) => void
  deleteConcept: (iri: string) => void
}

interface SpreadsheetRow {
  iri: string
  label: string
  cells: Map<string, string>
}

const props = defineProps<{
  treeItems: TreeItem[]
  editMode: EditModeApi
  selectedConceptIri?: string
  searchQuery: string
  viewMode: 'simple' | 'expert'
  sortField: string
  sortOrder: 'asc' | 'desc'
  schemeIri: string
  immersive: boolean
}>()

const emit = defineEmits<{
  select: [iri: string]
  'update:sort': [field: string, order: 'asc' | 'desc']
}>()

const tableRef = useTemplateRef('tableRef')

// --- Flatten tree ---

function flattenTree(items: TreeItem[]): string[] {
  const result: string[] = []
  function walk(nodes: TreeItem[]) {
    for (const node of nodes) {
      result.push(node.id)
      if (node.children?.length) walk(node.children)
    }
  }
  walk(items)
  return result
}

// --- Sanitize predicate IRIs to safe column IDs ---
// TanStack accessorKey interprets dots as nested paths, so we derive a simple ID.

function predicateToColId(predicate: string): string {
  const hashIdx = predicate.lastIndexOf('#')
  const slashIdx = predicate.lastIndexOf('/')
  return predicate.substring(Math.max(hashIdx, slashIdx) + 1)
}

// --- Profile columns ---

interface ProfileCol {
  predicate: string
  colId: string
  label: string
}

const profileColumns = computed<ProfileCol[]>(() => {
  void props.editMode.storeVersion.value
  const concepts = props.editMode.concepts.value
  if (!concepts.length) return []
  const allProps = props.editMode.getPropertiesForSubject(concepts[0]!.iri, 'concept', false)

  // Deduplicate colIds by appending index if needed
  const seen = new Map<string, number>()
  return allProps
    .filter(p => {
      if (p.predicate === SKOS_PREFLABEL) return false
      if (props.viewMode === 'simple' && SIMPLE_HIDDEN_PREDICATES.has(p.predicate)) return false
      return true
    })
    .map(p => {
      let base = predicateToColId(p.predicate)
      const count = seen.get(base) ?? 0
      seen.set(base, count + 1)
      const colId = count > 0 ? `${base}_${count}` : base
      return { predicate: p.predicate, colId, label: p.label }
    })
})

// Reverse lookup: colId → predicate
const colIdToPredicate = computed(() => {
  const map = new Map<string, string>()
  for (const col of profileColumns.value) {
    map.set(col.colId, col.predicate)
  }
  return map
})

// --- Cell helpers ---

function getCellText(iri: string, predicateIri: string): string {
  const allProps = props.editMode.getPropertiesForSubject(iri, 'concept', true)
  const prop = allProps.find(p => p.predicate === predicateIri)
  if (!prop || !prop.values.length) return ''
  return prop.values.map(v => v.type === 'iri' ? props.editMode.resolveLabel(v.value) : v.value).join('; ')
}

// --- Build flat row data ---

const rows = computed<SpreadsheetRow[]>(() => {
  void props.editMode.storeVersion.value

  // Determine order
  let iris: string[]
  if (props.sortField === 'tree') {
    iris = flattenTree(props.treeItems)
    if (props.sortOrder === 'desc') iris = iris.reverse()
  } else if (props.sortField === 'label') {
    iris = [...props.editMode.concepts.value]
      .sort((a, b) => {
        const cmp = a.prefLabel.localeCompare(b.prefLabel)
        return props.sortOrder === 'desc' ? -cmp : cmp
      })
      .map(c => c.iri)
  } else {
    iris = flattenTree(props.treeItems)
  }

  const cols = profileColumns.value
  return iris.map(iri => {
    const cells = new Map<string, string>()
    for (const col of cols) {
      cells.set(col.colId, getCellText(iri, col.predicate))
    }
    return {
      iri,
      label: props.editMode.resolveLabel(iri),
      cells,
    }
  })
})

// --- UTable columns ---

const tableColumns = computed<TableColumn<SpreadsheetRow>[]>(() => {
  const cols: TableColumn<SpreadsheetRow>[] = [
    {
      accessorKey: 'label',
      header: 'Concept',
      enablePinning: true,
      enableHiding: false,
    },
  ]
  for (const col of profileColumns.value) {
    cols.push({
      id: col.colId,
      accessorFn: (row: SpreadsheetRow) => row.cells.get(col.colId) ?? '',
      header: col.label,
    })
  }
  return cols
})

// --- Sorting (bridged to URL params) ---

const sorting = computed<SortingState>({
  get() {
    if (props.sortField === 'tree') return []
    if (props.sortField === 'label') return [{ id: 'label', desc: props.sortOrder === 'desc' }]
    // Map predicate IRI to colId for the sort state
    const col = profileColumns.value.find(c => c.predicate === props.sortField)
    if (col) return [{ id: col.colId, desc: props.sortOrder === 'desc' }]
    return []
  },
  set(val) {
    if (!val.length) {
      emit('update:sort', 'tree', 'asc')
    } else {
      const s = val[0]!
      // Map colId back to predicate IRI or 'label'
      const predicate = colIdToPredicate.value.get(s.id)
      const field = predicate ?? s.id
      emit('update:sort', field, s.desc ? 'desc' : 'asc')
    }
  },
})

// --- Column filters ---

const columnFilters = ref<ColumnFiltersState>([])

// --- Global filter (from parent search) ---

const globalFilter = computed(() => props.searchQuery)

// --- Row expansion ---

// Track expanded IRI locally; feed to TanStack via getIsRowExpanded for reactivity
const expandedIri = ref<string | null>(null)

const expandedOptions = {
  getIsRowExpanded: (row: { original: SpreadsheetRow }) => row.original.iri === expandedIri.value,
}

// Row click handler: single click selects, double click expands
function handleRowSelect(e: Event, row: { original: SpreadsheetRow }) {
  const clickCount = (e as MouseEvent).detail ?? 1
  emit('select', row.original.iri)
  if (clickCount >= 2) {
    expandedIri.value = expandedIri.value === row.original.iri ? null : row.original.iri
  }
}

function collapseRow() {
  expandedIri.value = null
}

// Per-row CSS classes for hover + expanded highlight
function rowClass(row: { original: SpreadsheetRow }) {
  if (row.original.iri === expandedIri.value) return 'bg-primary/10'
  if (row.original.iri === props.selectedConceptIri) return 'bg-primary/5'
  return ''
}

// --- Column pinning ---

const columnPinning = ref<ColumnPinningState>({ left: ['label'] })

// --- Column order (drag-and-drop reordering, persisted to localStorage) ---

const COLUMN_ORDER_KEY_PREFIX = 'prez_col_order_'
const columnOrderKey = computed(() => COLUMN_ORDER_KEY_PREFIX + props.schemeIri)
const columnOrder = ref<string[]>([])

onMounted(() => {
  try {
    const stored = localStorage.getItem(columnOrderKey.value)
    if (stored) columnOrder.value = JSON.parse(stored)
  } catch { /* ignore */ }
})

// Drag-and-drop state
const dragColId = ref<string | null>(null)

function handleColumnDragStart(colId: string) {
  dragColId.value = colId
}

function handleColumnDrop(targetColId: string) {
  const sourceId = dragColId.value
  dragColId.value = null
  if (!sourceId || sourceId === targetColId) return

  // Build current order from table API or derive from columns
  const api = tableRef.value?.tableApi
  const currentOrder = api
    ? api.getAllColumns().map((c: { id: string }) => c.id)
    : ['label', ...profileColumns.value.map(c => c.colId)]

  const fromIdx = currentOrder.indexOf(sourceId)
  const toIdx = currentOrder.indexOf(targetColId)
  if (fromIdx < 0 || toIdx < 0) return

  // Move source to target position
  const newOrder = [...currentOrder]
  newOrder.splice(fromIdx, 1)
  newOrder.splice(toIdx, 0, sourceId)
  columnOrder.value = newOrder

  try {
    localStorage.setItem(columnOrderKey.value, JSON.stringify(newOrder))
  } catch { /* ignore */ }
}

function handleColumnDragEnd() {
  dragColId.value = null
}

// --- Expanded row: properties for InlineEditTable ---

function getExpandedProperties(iri: string): EditableProperty[] {
  if (!props.editMode) return []
  void props.editMode.storeVersion.value
  const allProps = props.editMode.getPropertiesForSubject(iri, 'concept', false)
  if (props.viewMode === 'expert') return allProps
  return allProps.filter(p => !SIMPLE_HIDDEN_PREDICATES.has(p.predicate))
}

</script>

<template>
  <div>
    <!-- UTable -->
    <div
      :class="immersive ? 'h-[calc(100dvh-14rem)]' : 'h-[600px]'"
      class="border border-default rounded-lg overflow-clip"
    >
      <UTable
        ref="tableRef"
        :data="rows"
        :columns="tableColumns"
        v-model:sorting="sorting"
        v-model:column-filters="columnFilters"
        v-model:column-pinning="columnPinning"
        v-model:column-order="columnOrder"
        :expanded-options="expandedOptions"
        :global-filter="globalFilter"
        :row-id="(row: SpreadsheetRow) => row.iri"
        sticky
        class="h-full"
        :ui="{
          th: 'first:font-semibold bg-muted/50',
          td: 'first:font-semibold cursor-pointer',
          tr: 'transition-colors',
        }"
        :meta="{ class: { tr: rowClass } }"
        @select="handleRowSelect"
      >
        <!-- Custom column headers with sort + filter + drag reorder -->
        <template #label-header="{ column }">
          <SpreadsheetColumnHeader :column="column" label="Concept" />
        </template>

        <template
          v-for="col in profileColumns"
          :key="col.colId"
          #[`${col.colId}-header`]="{ column }"
        >
          <SpreadsheetColumnHeader
            :column="column"
            :label="col.label"
            draggable
            @dragstart="handleColumnDragStart"
            @drop="handleColumnDrop"
            @dragend="handleColumnDragEnd"
          />
        </template>

        <!-- Label column: bold + selected highlight -->
        <template #label-cell="{ row }">
          <span
            class="font-semibold"
            :class="row.original.iri === selectedConceptIri ? 'text-primary' : ''"
          >
            {{ row.original.label }}
          </span>
        </template>

        <!-- Expanded row: header + InlineEditTable -->
        <template #expanded="{ row }">
          <div class="px-4 py-3 bg-primary/5">
            <div class="flex items-center justify-between mb-3 gap-2">
              <h3 class="font-semibold truncate">
                {{ editMode.resolveLabel(row.original.iri) }}
              </h3>
              <UButton
                icon="i-heroicons-x-mark"
                variant="ghost"
                size="xs"
                @click="collapseRow"
              />
            </div>
            <InlineEditTable
              :subject-iri="row.original.iri"
              :properties="getExpandedProperties(row.original.iri)"
              :concepts="editMode.concepts.value"
              @update:value="(pred, oldVal, newVal) => editMode.updateValue(row.original.iri, pred, oldVal, newVal)"
              @update:language="(pred, oldVal, newLang) => editMode.updateValueLanguage(row.original.iri, pred, oldVal, newLang)"
              @add:value="(pred) => editMode.addValue(row.original.iri, pred)"
              @remove:value="(pred, val) => editMode.removeValue(row.original.iri, pred, val)"
              @update:broader="(newIris, oldIris) => editMode.syncBroaderNarrower(row.original.iri, newIris, oldIris)"
              @update:related="(newIris, oldIris) => editMode.syncRelated(row.original.iri, newIris, oldIris)"
              @rename="(oldIri, newIri) => editMode.renameSubject(oldIri, newIri)"
              @delete="editMode.deleteConcept(row.original.iri)"
            />
          </div>
        </template>

        <!-- Empty state -->
        <template #empty>
          <div class="py-8 text-center text-muted text-sm">
            No concepts match your search
          </div>
        </template>
      </UTable>
    </div>
  </div>
</template>

<style scoped>
/* Pinned header: solid equivalent of bg-muted/50 to match other headers */
:deep(th[data-pinned="left"]),
:deep(th[data-pinned="right"]) {
  background-color: color-mix(in srgb, var(--ui-bg-muted) 50%, var(--ui-bg)) !important;
}

/* Hover: apply solid background to ALL cells (pinned + non-pinned) at the td level
   so pinned sticky cells match non-pinned transparent cells exactly. */
:deep(tr[data-slot="tr"]:hover > td) {
  background-color: color-mix(in srgb, var(--ui-bg-muted) 30%, var(--ui-bg)) !important;
}

/* Selected row: solid background on all cells */
:deep(tr[data-slot="tr"].bg-primary\/5 > td) {
  background-color: color-mix(in srgb, var(--ui-color-primary) 5%, var(--ui-bg)) !important;
}

/* Expanded row: solid background on all cells */
:deep(tr[data-slot="tr"].bg-primary\/10 > td),
:deep(tr[data-slot="tr"].bg-primary\/10:hover > td) {
  background-color: color-mix(in srgb, var(--ui-color-primary) 10%, var(--ui-bg)) !important;
}

/* Constrain the pinned label column to ~20% width with word wrap */
:deep(th[data-pinned="left"]),
:deep(td[data-pinned="left"]) {
  width: 20% !important;
  max-width: 240px !important;
  overflow: hidden !important;
  word-wrap: break-word !important;
  overflow-wrap: break-word !important;
}

/* All cells: allow word wrap */
:deep(td) {
  white-space: normal !important;
  word-wrap: break-word !important;
}
</style>
