<script setup lang="ts">
import type { EditableProperty, EditableValue, ConceptSummary } from '~/composables/useEditMode'

const props = defineProps<{
  subjectIri: string
  properties: EditableProperty[]
  concepts: ConceptSummary[]
  isScheme?: boolean
  /** Auto-open editing for this predicate (used by scroll-to-property links) */
  autoEditPredicate?: string | null
}>()

const emit = defineEmits<{
  'update:value': [predicate: string, oldValue: EditableValue, newValue: string]
  'update:language': [predicate: string, oldValue: EditableValue, newLang: string]
  'add:value': [predicate: string]
  'remove:value': [predicate: string, value: EditableValue]
  'update:broader': [newIris: string[], oldIris: string[]]
  'update:related': [newIris: string[], oldIris: string[]]
  'delete': []
}>()

const SKOS_BROADER = 'http://www.w3.org/2004/02/skos/core#broader'
const SKOS_RELATED = 'http://www.w3.org/2004/02/skos/core#related'

const languageOptions = [
  { label: 'en', value: 'en' },
  { label: 'es', value: 'es' },
  { label: 'fr', value: 'fr' },
  { label: 'de', value: 'de' },
  { label: 'it', value: 'it' },
  { label: 'pt', value: 'pt' },
  { label: 'zh', value: 'zh' },
  { label: 'ja', value: 'ja' },
  { label: '(none)', value: '' },
]

const editingPredicate = ref<string | null>(null)
const showDeleteConfirm = ref(false)

// Watch for autoEditPredicate changes
watch(() => props.autoEditPredicate, (pred) => {
  if (pred) editingPredicate.value = pred
})

function isEditable(prop: EditableProperty): boolean {
  return prop.fieldType !== 'readonly'
}

function startEditing(prop: EditableProperty) {
  if (!isEditable(prop)) return
  editingPredicate.value = prop.predicate
}

function stopEditing() {
  editingPredicate.value = null
}

// Local input values to prevent cursor jumping when store re-renders
const localValues = reactive(new Map<string, string>())

function getLocalValue(val: EditableValue): string {
  return localValues.get(val.id) ?? val.value
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null

function handleValueInput(predicate: string, val: EditableValue, event: Event) {
  const target = event.target as HTMLInputElement | HTMLTextAreaElement
  localValues.set(val.id, target.value)
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    emit('update:value', predicate, val, target.value)
  }, 300)
}

function handleLanguageChange(predicate: string, val: EditableValue, newLang: string) {
  emit('update:language', predicate, val, newLang)
}

function handleBroaderUpdate(prop: EditableProperty, newIris: string[]) {
  const oldIris = prop.values.map(v => v.value)
  emit('update:broader', newIris, oldIris)
}

function handleRelatedUpdate(prop: EditableProperty, newIris: string[]) {
  const oldIris = prop.values.map(v => v.value)
  emit('update:related', newIris, oldIris)
}

function formatIri(iri: string): string {
  const concept = props.concepts.find(c => c.iri === iri)
  if (concept) return concept.prefLabel
  const hashIdx = iri.lastIndexOf('#')
  const slashIdx = iri.lastIndexOf('/')
  return iri.substring(Math.max(hashIdx, slashIdx) + 1)
}

function formatValue(val: EditableValue): string {
  if (val.type === 'iri') return formatIri(val.value)
  return val.value
}

function confirmDelete() {
  showDeleteConfirm.value = false
  emit('delete')
}

// Close editing when clicking outside this component.
// Internal clicks are stopped by @click.stop on the root <div>, so
// this listener only fires for clicks truly outside the component.
function handleClickOutside() {
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
  <div @click.stop>
    <!-- Subject IRI -->
    <div class="text-sm text-muted font-mono break-all bg-muted/30 px-3 py-2 rounded mb-3">
      {{ subjectIri }}
    </div>

    <div class="overflow-x-hidden">
      <table class="w-full text-sm table-fixed">
        <tbody class="divide-y divide-default">
          <tr
            v-for="prop in properties"
            :key="prop.predicate"
            :data-inline-edit-row="prop.predicate"
            :data-predicate="prop.predicate"
            class="group transition-colors"
            :class="{
              'hover:bg-muted/50 cursor-pointer': isEditable(prop) && editingPredicate !== prop.predicate,
              'bg-primary/5': editingPredicate === prop.predicate,
            }"
            @click="startEditing(prop)"
          >
            <!-- Property label -->
            <th class="py-3 pr-4 text-left align-top font-medium text-muted w-[140px] whitespace-nowrap">
              <span class="mr-1">{{ prop.label }}</span>
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
            </th>

            <!-- Value cell -->
            <td class="py-3 text-left align-top overflow-hidden">
              <!-- EDITING MODE for this row -->
              <template v-if="editingPredicate === prop.predicate && isEditable(prop)">
                <!-- iri-picker (broader / related) -->
                <template v-if="prop.fieldType === 'iri-picker'">
                  <div @click.stop>
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

                <!-- text / textarea / date -->
                <template v-else>
                  <div @click.stop>
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
                        :model-value="val.language || ''"
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

                    <div v-if="!prop.values.length" class="text-sm text-muted italic py-1">&mdash;</div>

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
              <div v-else class="select-none" :class="{ 'cursor-pointer': isEditable(prop) }">
                <template v-if="prop.values.length">
                  <!-- Blank node values: show as nested cards -->
                  <template v-if="prop.values.some(v => v.type === 'blank-node')">
                    <div class="space-y-2">
                      <template v-for="val in prop.values" :key="val.id">
                        <div v-if="val.type === 'blank-node' && val.nestedProperties?.length" class="bg-muted/30 rounded-lg px-3 py-2 space-y-1">
                          <div v-for="nested in val.nestedProperties" :key="nested.predicate" class="flex items-start gap-2">
                            <span class="font-medium text-xs w-20 shrink-0 text-muted">{{ nested.label }}</span>
                            <span class="text-xs">
                              <template v-for="(nv, nidx) in nested.values" :key="nv.id">
                                <a v-if="nv.type === 'iri'" :href="nv.value" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">
                                  {{ formatIri(nv.value) }}
                                </a>
                                <span v-else>{{ nv.value }}</span>
                                <span v-if="nidx < nested.values.length - 1">, </span>
                              </template>
                            </span>
                          </div>
                        </div>
                        <span v-else-if="val.type === 'iri'" class="text-primary">{{ formatIri(val.value) }}</span>
                        <span v-else>{{ val.value }}</span>
                      </template>
                    </div>
                  </template>
                  <!-- Simple values: inline display -->
                  <span v-else class="inline">
                    <template v-for="(val, idx) in prop.values" :key="val.id">
                      <span v-if="val.type === 'iri'" class="inline-flex items-center gap-1">
                        <span class="text-primary">{{ formatIri(val.value) }}</span>
                      </span>
                      <span v-else>
                        {{ val.value }}
                        <span v-if="val.language" class="text-xs text-muted ml-1">@{{ val.language }}</span>
                      </span>
                      <span v-if="idx < prop.values.length - 1">, </span>
                    </template>
                  </span>
                </template>
                <span v-else class="text-muted italic">&mdash;</span>
                <!-- Editable hint on hover -->
                <UIcon
                  v-if="isEditable(prop)"
                  name="i-heroicons-pencil-square"
                  class="w-3.5 h-3.5 ml-2 text-muted opacity-0 group-hover:opacity-100 transition-opacity inline-block align-text-bottom"
                />
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Delete concept button -->
    <div v-if="!isScheme" class="pt-4 border-t border-default mt-4">
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
