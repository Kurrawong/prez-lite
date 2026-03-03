<script setup lang="ts">
import type { EditableProperty, EditableValue, EditableNestedProperty, ConceptSummary, SubjectChange, AgentEntry, ValidationError } from '~/composables/useEditMode'

const props = defineProps<{
  subjectIri: string
  properties: EditableProperty[]
  concepts: ConceptSummary[]
  agents?: AgentEntry[]
  isScheme?: boolean
  /** Auto-open editing for this predicate (used by scroll-to-property links) */
  autoEditPredicate?: string | null
  subjectChanges?: SubjectChange | null
  validationErrors?: ValidationError[]
}>()

const changedPredicates = computed(() => {
  if (!props.subjectChanges) return new Set<string>()
  return new Set(props.subjectChanges.propertyChanges.map(c => c.predicateIri))
})

/** Map predicate → error messages for this subject */
const errorsByPredicate = computed(() => {
  const map = new Map<string, string[]>()
  if (!props.validationErrors?.length) return map
  for (const err of props.validationErrors) {
    const msgs = map.get(err.predicate) ?? []
    msgs.push(err.message)
    map.set(err.predicate, msgs)
  }
  return map
})

const emit = defineEmits<{
  'update:value': [predicate: string, oldValue: EditableValue, newValue: string]
  'update:language': [predicate: string, oldValue: EditableValue, newLang: string]
  'add:value': [predicate: string, type?: 'literal' | 'iri', defaultIri?: string]
  'remove:value': [predicate: string, value: EditableValue]
  'update:broader': [newIris: string[], oldIris: string[]]
  'update:related': [newIris: string[], oldIris: string[]]
  'update:nested': [blankNodeId: string, predicate: string, oldValue: EditableValue, newValue: string]
  'remove:nested': [blankNodeId: string, predicate: string, value: EditableValue]
  'add:nested-value': [blankNodeId: string, predicate: string, type: 'iri' | 'literal', defaultValue?: string]
  'add:blank-node': [predicate: string]
  'remove:blank-node': [predicate: string, blankNodeId: string]
  'rename': [oldIri: string, newIri: string]
  'delete': []
}>()

const SKOS_BROADER = 'http://www.w3.org/2004/02/skos/core#broader'
const SKOS_RELATED = 'http://www.w3.org/2004/02/skos/core#related'

// Reka UI SelectItem rejects empty-string values, so we use a sentinel
// for "no language tag" and convert at the model-value boundary.
const LANG_NONE = '_none'

// Sentinel for "no value" option in nested selects (role, agent-picker)
const NESTED_NONE = '_none'

const languageOptions = [
  { label: 'en', value: 'en' },
  { label: 'es', value: 'es' },
  { label: 'fr', value: 'fr' },
  { label: 'de', value: 'de' },
  { label: 'it', value: 'it' },
  { label: 'pt', value: 'pt' },
  { label: 'zh', value: 'zh' },
  { label: 'ja', value: 'ja' },
  { label: '(none)', value: LANG_NONE },
]

const editingPredicate = ref<string | null>(null)
const showDeleteConfirm = ref(false)
const editingIri = ref(false)
const editIriValue = ref('')

function startIriEdit() {
  editIriValue.value = props.subjectIri
  editingIri.value = true
}

function commitIriEdit() {
  const newIri = editIriValue.value.trim()
  if (newIri && newIri !== props.subjectIri) {
    emit('rename', props.subjectIri, newIri)
  }
  editingIri.value = false
}

function cancelIriEdit() {
  editingIri.value = false
}

// Watch for autoEditPredicate changes
watch(() => props.autoEditPredicate, (pred) => {
  if (pred) editingPredicate.value = pred
})

function isEditable(prop: EditableProperty): boolean {
  return prop.fieldType !== 'readonly' && prop.fieldType !== 'nested'
}

/** Format an IRI using agents, concepts, or local name as fallback */
function formatIriAuto(iri: string): string {
  const agent = props.agents?.find(a => a.iri === iri)
  if (agent) return agent.name
  const concept = props.concepts.find(c => c.iri === iri)
  if (concept) return concept.prefLabel
  return formatIri(iri)
}

function constraintDescription(prop: EditableProperty): string | null {
  const parts: string[] = []
  if (prop.minCount != null) parts.push(`Min: ${prop.minCount}`)
  if (prop.maxCount != null) parts.push(`Max: ${prop.maxCount}`)
  if (prop.allowedValues?.length) {
    parts.push(`Allowed: ${prop.allowedValues.map(v => formatIriAuto(v)).join(', ')}`)
  }
  if (prop.class) {
    const className = formatIri(prop.class)
    parts.push(`Type: ${className}`)
  }
  return parts.length ? parts.join(' · ') : null
}

function handleRowClick(prop: EditableProperty) {
  if (!isEditable(prop) && prop.fieldType !== 'nested') return
  // Toggle: clicking the background of an already-editing row exits editing
  if (editingPredicate.value === prop.predicate) {
    stopEditing()
  } else {
    editingPredicate.value = prop.predicate
  }
}

function stopEditing() {
  editingPredicate.value = null
}

// Local input values to prevent cursor jumping when store re-renders
const localValues = reactive(new Map<string, string>())
// Track whether we caused the latest prop change (via our own debounced emit)
let selfEmitted = false

function getLocalValue(val: EditableValue): string {
  return localValues.get(val.id) ?? val.value
}

// Clear local cache when properties change from outside (e.g. undo/redo)
watch(() => props.properties, () => {
  if (selfEmitted) {
    selfEmitted = false
    return
  }
  localValues.clear()
}, { deep: true })

let debounceTimer: ReturnType<typeof setTimeout> | null = null

function handleValueInput(predicate: string, val: EditableValue, event: Event) {
  const target = event.target as HTMLInputElement | HTMLTextAreaElement
  localValues.set(val.id, target.value)
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    selfEmitted = true
    emit('update:value', predicate, val, target.value)
  }, 300)
}

function handleLanguageChange(predicate: string, val: EditableValue, newLang: string) {
  emit('update:language', predicate, val, newLang === LANG_NONE ? '' : newLang)
}

function handleBroaderUpdate(prop: EditableProperty, newIris: string[]) {
  const oldIris = prop.values.map(v => v.value)
  emit('update:broader', newIris, oldIris)
}

function handleRelatedUpdate(prop: EditableProperty, newIris: string[]) {
  const oldIris = prop.values.map(v => v.value)
  emit('update:related', newIris, oldIris)
}

/** Handle concept-picker / agent-picker multi-select updates (add/remove IRIs) */
function handleIriPickerUpdate(prop: EditableProperty, newIris: string[]) {
  const oldIris = prop.values.map(v => v.value)
  // Remove values no longer selected
  for (const old of oldIris) {
    if (!newIris.includes(old)) {
      const val = prop.values.find(v => v.value === old)
      if (val) emit('remove:value', prop.predicate, val)
    }
  }
  // Add newly selected values
  for (const iri of newIris) {
    if (!oldIris.includes(iri)) {
      emit('add:value', prop.predicate, 'iri', iri)
    }
  }
}

/** Ensure blank node IDs have _: prefix for store operations */
function bnId(val: EditableValue): string {
  const v = val.value
  return v.startsWith('_:') ? v : `_:${v}`
}

/** Build items for a nested agent-picker, ensuring the current value is always present */
function agentPickerItems(nested: EditableNestedProperty) {
  const items = (props.agents ?? []).map(a => ({ label: `${a.name} (${a.type})`, value: a.iri }))
  const current = nested.values[0]?.value
  if (current && !items.some(i => i.value === current)) {
    items.unshift({ label: formatIriAuto(current), value: current })
  }
  return [{ label: '(none)', value: NESTED_NONE }, ...items]
}

/** Build items for a nested select (allowedValues), ensuring the current value is always present */
function nestedSelectItems(nested: EditableNestedProperty) {
  const items = (nested.allowedValues ?? []).map(v => ({ label: formatIriAuto(v), value: v }))
  const current = nested.values[0]?.value
  if (current && !items.some(i => i.value === current)) {
    items.unshift({ label: formatIriAuto(current), value: current })
  }
  return [{ label: '(none)', value: NESTED_NONE }, ...items]
}

/** Unified handler for nested select changes — handles add, update, and remove (via "none") */
function handleNestedSelectChange(parentVal: EditableValue, nested: EditableNestedProperty, newValue: string) {
  if (newValue === NESTED_NONE) {
    // Clear: remove the existing value
    if (nested.values.length) {
      emit('remove:nested', bnId(parentVal), nested.predicate, nested.values[0]!)
    }
  } else if (nested.values.length) {
    // Update: change the existing value
    emit('update:nested', bnId(parentVal), nested.predicate, nested.values[0]!, newValue)
  } else {
    // Add: create a new value
    emit('add:nested-value', bnId(parentVal), nested.predicate, 'iri', newValue)
  }
}

function formatAgent(iri: string): string {
  const agent = props.agents?.find(a => a.iri === iri)
  if (agent) return agent.name
  return formatIri(iri)
}

function formatIri(iri: string): string {
  const concept = props.concepts.find(c => c.iri === iri)
  if (concept) return concept.prefLabel
  const hashIdx = iri.lastIndexOf('#')
  const slashIdx = iri.lastIndexOf('/')
  return iri.substring(Math.max(hashIdx, slashIdx) + 1)
}

function formatValue(val: EditableValue): string {
  if (val.type === 'iri') return formatIriAuto(val.value)
  return val.value
}

function confirmDelete() {
  showDeleteConfirm.value = false
  emit('delete')
}

// Close editing when clicking outside this component.
// Uses click (not pointerdown) so Reka UI's SelectTrigger can process
// pointerdown first and open the dropdown before we decide to close.
// The rootRef containment check prevents double-closing (the root div
// @click handler already handles clicks on empty space within the component).
const rootRef = useTemplateRef<HTMLElement>('rootRef')

function handleClickOutside(event: MouseEvent) {
  const target = event.target as HTMLElement | null
  if (!target) return
  // Inside this component's own DOM tree — never close
  if (rootRef.value?.contains(target)) return
  // Inside Reka UI teleported content (dropdowns, popovers, select panels)
  if (target.closest('[data-reka-select-content], [data-reka-combobox-content], [data-reka-popover-content], [role="listbox"], [role="option"]')) return
  // A DismissableLayer overlay is active (e.g. Select dropdown) —
  // body has pointer-events: none, so click targets may be wrong.
  // Let the overlay close first; the next click will close editing.
  if (document.body.style.pointerEvents === 'none') return
  stopEditing()
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div ref="rootRef" @click="stopEditing()">
    <!-- Subject IRI (click-to-edit) -->
    <div v-if="editingIri" class="flex items-center gap-2 mb-3" @click.stop>
      <UInput
        v-model="editIriValue"
        class="flex-1 font-mono text-sm"
        size="sm"
        autofocus
        @keydown.enter="commitIriEdit"
        @keydown.escape="cancelIriEdit"
      />
      <UButton size="xs" @click="commitIriEdit">Apply</UButton>
      <UButton size="xs" variant="ghost" @click="cancelIriEdit">Cancel</UButton>
    </div>
    <div
      v-else
      class="text-sm text-muted font-mono break-all bg-muted/30 px-3 py-2 rounded mb-3 cursor-pointer group flex items-center gap-2 hover:bg-muted/50 transition-colors"
      @click.stop="startIriEdit"
    >
      <span class="flex-1">{{ subjectIri }}</span>
      <UIcon name="i-heroicons-pencil" class="size-3.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>

    <div class="overflow-x-hidden -mx-4">
      <table class="w-full text-sm table-fixed">
        <tbody class="divide-y divide-default">
          <tr
            v-for="prop in properties"
            :key="prop.predicate"
            :data-inline-edit-row="prop.predicate"
            :data-predicate="prop.predicate"
            class="group transition-colors"
            :class="{
              'hover:bg-muted/50 cursor-pointer': (isEditable(prop) || prop.fieldType === 'nested') && editingPredicate !== prop.predicate,
              'border-l-2 border-l-error bg-error/5': editingPredicate !== prop.predicate && errorsByPredicate.has(prop.predicate),
              'border-l-2 border-l-warning': !errorsByPredicate.has(prop.predicate) && changedPredicates.has(prop.predicate),
            }"
            @click.stop="handleRowClick(prop)"
          >
            <!-- Property label -->
            <th
              class="py-3 pl-4 pr-4 text-left align-top font-medium text-muted w-[172px] whitespace-nowrap transition-colors"
              :class="{ 'bg-primary-50 dark:bg-primary-950/50': editingPredicate === prop.predicate }"
            >
              <UTooltip v-if="constraintDescription(prop)" :text="constraintDescription(prop)!">
                <UIcon
                  name="i-heroicons-information-circle"
                  class="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 cursor-help shrink-0 inline-block align-text-bottom mr-1"
                  @click.stop
                />
              </UTooltip>
              <span class="mr-1" :class="{ 'text-error': editingPredicate !== prop.predicate && errorsByPredicate.has(prop.predicate) }">{{ prop.label }}</span>
              <a
                :href="prop.predicate"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center text-muted hover:text-primary"
                :title="prop.description"
                @click.stop
              >
                <UIcon name="i-heroicons-arrow-top-right-on-square" class="w-3.5 h-3.5" />
              </a>
              <!-- Validation error indicator (hidden while actively editing) -->
              <UTooltip v-if="editingPredicate !== prop.predicate && errorsByPredicate.has(prop.predicate)" :text="errorsByPredicate.get(prop.predicate)!.join('; ')">
                <UIcon
                  name="i-heroicons-exclamation-triangle"
                  class="w-3.5 h-3.5 text-error shrink-0 inline-block align-text-bottom ml-1"
                  @click.stop
                />
              </UTooltip>
            </th>

            <!-- Value cell -->
            <td
              class="py-3 pr-4 text-left align-top overflow-hidden transition-colors"
              :class="{ 'bg-primary-50 dark:bg-primary-950/50': editingPredicate === prop.predicate }"
            >
              <!-- EDITING MODE for this row -->
              <template v-if="editingPredicate === prop.predicate && isEditable(prop)">
                <!-- iri-picker (broader / related) -->
                <template v-if="prop.fieldType === 'iri-picker'">
                  <div class="min-h-7" @click.stop @pointerdown.stop>
                    <BroaderPicker
                      :model-value="prop.values.map(v => v.value)"
                      :concepts="concepts"
                      :exclude-iri="subjectIri"
                      @update:model-value="
                        prop.predicate === SKOS_BROADER
                          ? handleBroaderUpdate(prop, $event)
                          : prop.predicate === SKOS_RELATED
                            ? handleRelatedUpdate(prop, $event)
                            : null
                      "
                    />
                  </div>
                </template>

                <!-- select (sh:in constrained values) -->
                <template v-else-if="prop.fieldType === 'select' && prop.allowedValues">
                  <div class="min-h-7" @click.stop @pointerdown.stop>
                    <div v-for="val in prop.values" :key="val.id" class="flex items-center gap-2 mb-2">
                      <USelect
                        :model-value="val.value"
                        :items="prop.allowedValues.map(v => ({ label: formatIri(v), value: v }))"
                        value-key="value"
                        class="flex-1"
                        size="sm"
                        @update:model-value="emit('update:value', prop.predicate, val, $event as string)"
                      />
                      <!-- Remove button (hidden when at minCount) -->
                      <UButton
                        v-if="prop.minCount == null || prop.values.length > prop.minCount"
                        icon="i-heroicons-x-mark"
                        color="error"
                        variant="ghost"
                        size="xs"
                        @click.stop="emit('remove:value', prop.predicate, val)"
                      />
                    </div>
                    <!-- Add value button (hidden when at maxCount) -->
                    <UButton
                      v-if="prop.maxCount == null || prop.values.length < prop.maxCount"
                      icon="i-heroicons-plus"
                      variant="ghost"
                      size="xs"
                      @click.stop="emit('add:value', prop.predicate, 'iri', prop.allowedValues[0])"
                    >
                      Add value
                    </UButton>
                  </div>
                </template>

                <!-- concept-picker (wasDerivedFrom, revisionOf, replaces, isReplacedBy) -->
                <template v-else-if="prop.fieldType === 'concept-picker'">
                  <div class="min-h-7" @click.stop @pointerdown.stop>
                    <BroaderPicker
                      :model-value="prop.values.map(v => v.value)"
                      :concepts="concepts"
                      :exclude-iri="subjectIri"
                      @update:model-value="handleIriPickerUpdate(prop, $event)"
                    />
                  </div>
                </template>

                <!-- agent-picker (creator, publisher, prov:agent) -->
                <template v-else-if="prop.fieldType === 'agent-picker'">
                  <div class="min-h-7" @click.stop @pointerdown.stop>
                    <div v-for="val in prop.values" :key="val.id" class="flex items-center gap-2 mb-2">
                      <USelect
                        :model-value="val.value"
                        :items="(agents ?? []).map(a => ({ label: `${a.name} (${a.type})`, value: a.iri }))"
                        value-key="value"
                        class="flex-1"
                        size="sm"
                        @update:model-value="emit('update:value', prop.predicate, val, $event as string)"
                      />
                      <UButton
                        v-if="prop.minCount == null || prop.values.length > prop.minCount"
                        icon="i-heroicons-x-mark"
                        color="error"
                        variant="ghost"
                        size="xs"
                        @click.stop="emit('remove:value', prop.predicate, val)"
                      />
                    </div>
                    <UButton
                      v-if="agents?.length && (prop.maxCount == null || prop.values.length < prop.maxCount)"
                      icon="i-heroicons-plus"
                      variant="ghost"
                      size="xs"
                      @click.stop="emit('add:value', prop.predicate, 'iri', agents![0].iri)"
                    >
                      Add agent
                    </UButton>
                  </div>
                </template>

                <!-- text / textarea / date -->
                <template v-else>
                  <div class="min-h-7" @click.stop @pointerdown.stop>
                    <div v-for="val in prop.values" :key="val.id" class="flex items-start gap-2 mb-2 min-w-0">
                      <UTextarea
                        v-if="prop.fieldType === 'textarea'"
                        :model-value="getLocalValue(val)"
                        :rows="3"
                        class="flex-1"
                        @input="handleValueInput(prop.predicate, val, $event)"
                      />
                      <UInput
                        v-else-if="prop.fieldType === 'date'"
                        type="date"
                        :model-value="getLocalValue(val)"
                        class="flex-1"
                        @input="handleValueInput(prop.predicate, val, $event)"
                      />
                      <UInput
                        v-else
                        :model-value="getLocalValue(val)"
                        class="flex-1"
                        @input="handleValueInput(prop.predicate, val, $event)"
                      />

                      <!-- Language tag selector -->
                      <USelect
                        v-if="val.type === 'literal' && prop.fieldType !== 'date'"
                        :model-value="val.language || LANG_NONE"
                        :items="languageOptions"
                        value-key="value"
                        class="w-20"
                        size="sm"
                        @update:model-value="handleLanguageChange(prop.predicate, val, $event as string)"
                      />

                      <!-- Remove button (hidden when at minCount) -->
                      <UButton
                        v-if="prop.minCount == null || prop.values.length > prop.minCount"
                        icon="i-heroicons-x-mark"
                        color="error"
                        variant="ghost"
                        size="xs"
                        @click.stop="emit('remove:value', prop.predicate, val)"
                      />
                    </div>

                    <!-- Add value button (hidden when at maxCount) -->
                    <UButton
                      v-if="prop.maxCount == null || prop.values.length < prop.maxCount"
                      icon="i-heroicons-plus"
                      variant="ghost"
                      size="xs"
                      @click.stop="emit('add:value', prop.predicate)"
                    >
                      Add value
                    </UButton>
                  </div>
                </template>
              </template>

              <!-- READ-ONLY DISPLAY -->
              <div v-else class="select-none min-h-7 flex items-start" :class="{ 'cursor-pointer': isEditable(prop) || prop.fieldType === 'nested' }">
                <template v-if="prop.values.length">
                  <!-- Blank node values: nested cards -->
                  <template v-if="prop.values.some(v => v.type === 'blank-node')">
                    <div class="space-y-2 flex-1" @click.stop="handleRowClick(prop)">
                      <template v-for="val in prop.values" :key="val.id">
                        <div
                          v-if="val.type === 'blank-node' && val.nestedProperties?.length"
                          class="bg-muted/30 rounded-lg px-3 py-2 space-y-2 relative group/card"
                          :class="{ 'pt-7': editingPredicate === prop.predicate }"
                        >
                          <!-- Delete blank node button (top-right, visible when editing) -->
                          <UButton
                            v-if="editingPredicate === prop.predicate"
                            icon="i-heroicons-x-mark"
                            variant="ghost"
                            color="error"
                            size="xs"
                            class="absolute top-1 right-1 z-10"
                            title="Remove this entry"
                            @click.stop="emit('remove:blank-node', prop.predicate, bnId(val))"
                          />
                          <div v-for="nested in val.nestedProperties" :key="nested.predicate" class="flex items-center gap-2">
                            <span class="font-medium text-xs w-24 shrink-0 text-muted">{{ nested.label }}</span>
                            <!-- EDITING: show inputs when row is active -->
                            <template v-if="editingPredicate === prop.predicate">
                              <!-- Nested select (sh:in — e.g. hadRole) — unified with (none) option -->
                              <template v-if="nested.fieldType === 'select' && nested.allowedValues?.length">
                                <USelect
                                  :model-value="nested.values[0]?.value"
                                  :items="nestedSelectItems(nested)"
                                  value-key="value"
                                  :placeholder="`Select ${nested.label}...`"
                                  class="flex-1"
                                  size="xs"
                                  @click.stop
                                  @update:model-value="handleNestedSelectChange(val, nested, $event as string)"
                                />
                              </template>
                              <!-- Nested agent-picker — unified with (none) option -->
                              <template v-else-if="nested.fieldType === 'agent-picker'">
                                <USelect
                                  :model-value="nested.values[0]?.value"
                                  :items="agentPickerItems(nested)"
                                  value-key="value"
                                  :placeholder="`Select ${nested.label}...`"
                                  class="flex-1"
                                  size="xs"
                                  @click.stop
                                  @update:model-value="handleNestedSelectChange(val, nested, $event as string)"
                                />
                              </template>
                              <!-- Nested date -->
                              <template v-else-if="nested.fieldType === 'date'">
                                <template v-if="nested.values.length">
                                  <template v-for="nv in nested.values" :key="nv.id">
                                    <input
                                      type="date"
                                      :value="nv.value"
                                      class="text-xs px-2 py-1 rounded border border-default bg-default focus:ring-1 focus:ring-primary focus:border-primary"
                                      @click.stop
                                      @change="emit('update:nested', bnId(val), nested.predicate, nv, ($event.target as HTMLInputElement).value)"
                                    />
                                    <UButton
                                      v-if="nested.minCount == null || nested.values.length > nested.minCount"
                                      icon="i-heroicons-x-mark"
                                      variant="ghost"
                                      color="error"
                                      size="xs"
                                      title="Remove"
                                      @click.stop="emit('remove:nested', bnId(val), nested.predicate, nv)"
                                    />
                                  </template>
                                </template>
                                <!-- Empty: show blank date input -->
                                <input
                                  v-else
                                  type="date"
                                  value=""
                                  class="text-xs px-2 py-1 rounded border border-default bg-default focus:ring-1 focus:ring-primary focus:border-primary"
                                  @click.stop
                                  @change="emit('add:nested-value', bnId(val), nested.predicate, 'literal', ($event.target as HTMLInputElement).value)"
                                />
                              </template>
                              <!-- Nested text (default editable) -->
                              <template v-else-if="nested.fieldType !== 'readonly'">
                                <template v-if="nested.values.length">
                                  <template v-for="nv in nested.values" :key="nv.id">
                                    <input
                                      type="text"
                                      :value="nv.value"
                                      class="text-xs px-2 py-1 rounded border border-default bg-default focus:ring-1 focus:ring-primary focus:border-primary flex-1"
                                      @click.stop
                                      @change="emit('update:nested', bnId(val), nested.predicate, nv, ($event.target as HTMLInputElement).value)"
                                    />
                                    <UButton
                                      v-if="nested.minCount == null || nested.values.length > nested.minCount"
                                      icon="i-heroicons-x-mark"
                                      variant="ghost"
                                      color="error"
                                      size="xs"
                                      title="Remove"
                                      @click.stop="emit('remove:nested', bnId(val), nested.predicate, nv)"
                                    />
                                  </template>
                                </template>
                                <!-- Empty: show blank text input -->
                                <input
                                  v-else
                                  type="text"
                                  :placeholder="nested.label"
                                  class="text-xs px-2 py-1 rounded border border-default bg-default focus:ring-1 focus:ring-primary focus:border-primary flex-1"
                                  @click.stop
                                  @change="emit('add:nested-value', bnId(val), nested.predicate, 'literal', ($event.target as HTMLInputElement).value)"
                                />
                              </template>
                              <!-- Nested readonly -->
                              <span v-else class="text-xs">
                                <template v-for="(nv, nidx) in nested.values" :key="nv.id">
                                  <a v-if="nv.type === 'iri'" :href="nv.value" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">
                                    {{ formatIriAuto(nv.value) }}
                                  </a>
                                  <span v-else>{{ nv.value }}</span>
                                  <span v-if="nidx < nested.values.length - 1">, </span>
                                </template>
                              </span>
                            </template>
                            <!-- READ-ONLY: show plain text values -->
                            <span v-else class="text-xs">
                              <template v-for="(nv, nidx) in nested.values" :key="nv.id">
                                <a v-if="nv.type === 'iri'" :href="nv.value" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">
                                  {{ formatIriAuto(nv.value) }}
                                </a>
                                <span v-else>{{ nv.value || '—' }}</span>
                                <span v-if="nidx < nested.values.length - 1">, </span>
                              </template>
                            </span>
                          </div>
                        </div>
                        <span v-else-if="val.type === 'iri'" class="text-primary">{{ formatIriAuto(val.value) }}</span>
                        <span v-else>{{ val.value }}</span>
                      </template>
                      <!-- Add blank node button (when editing) -->
                      <UButton
                        v-if="editingPredicate === prop.predicate && (prop.maxCount == null || prop.values.length < prop.maxCount)"
                        icon="i-heroicons-plus"
                        variant="ghost"
                        size="xs"
                        @click.stop="emit('add:blank-node', prop.predicate)"
                      >
                        Add {{ prop.label }}
                      </UButton>
                    </div>
                  </template>
                  <!-- Simple values: inline display -->
                  <span v-else class="inline">
                    <template v-for="(val, idx) in prop.values" :key="val.id">
                      <span v-if="val.type === 'iri'" class="inline-flex items-center gap-1">
                        <span class="text-primary">{{ formatIriAuto(val.value) }}</span>
                      </span>
                      <span v-else>
                        {{ val.value }}
                        <span v-if="val.language" class="text-xs text-muted ml-1">@{{ val.language }}</span>
                      </span>
                      <span v-if="idx < prop.values.length - 1">, </span>
                    </template>
                  </span>
                </template>
                <template v-else>
                  <!-- Nested property with no values: show Add button -->
                  <UButton
                    v-if="prop.fieldType === 'nested'"
                    icon="i-heroicons-plus"
                    variant="ghost"
                    size="xs"
                    @click.stop="emit('add:blank-node', prop.predicate)"
                  >
                    Add {{ prop.label }}
                  </UButton>
                  <span v-else class="text-muted italic">&mdash;</span>
                </template>
                <!-- Editable hint on hover -->
                <UIcon
                  v-if="isEditable(prop) || prop.fieldType === 'nested'"
                  name="i-heroicons-pencil-square"
                  class="w-3.5 h-3.5 ml-2 text-muted opacity-0 group-hover:opacity-100 transition-opacity inline-block align-text-bottom shrink-0"
                />
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Delete concept button -->
    <div v-if="!isScheme" class="pt-4 border-t border-default mt-4" @click.stop>
      <UButton
        v-if="!showDeleteConfirm"
        icon="i-heroicons-trash"
        color="error"
        variant="soft"
        size="sm"
        @click="showDeleteConfirm = true"
      >
        Delete concept
      </UButton>
      <div v-else class="flex items-center gap-2">
        <span class="text-sm text-error">Are you sure?</span>
        <UButton size="xs" color="error" @click="confirmDelete">Yes, delete</UButton>
        <UButton size="xs" variant="ghost" @click="showDeleteConfirm = false">Cancel</UButton>
      </div>
    </div>
  </div>
</template>
