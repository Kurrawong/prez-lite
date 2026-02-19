<script setup lang="ts">
import type { EditableProperty, EditableValue, ConceptSummary } from '~/composables/useEditMode'

const props = defineProps<{
  subjectIri: string
  properties: EditableProperty[]
  concepts: ConceptSummary[]
  isScheme?: boolean
}>()

const emit = defineEmits<{
  'update:value': [predicate: string, oldValue: EditableValue, newValue: string]
  'update:language': [predicate: string, oldValue: EditableValue, newLang: string]
  'add:value': [predicate: string]
  'remove:value': [predicate: string, value: EditableValue]
  'update:broader': [newIris: string[], oldIris: string[]]
  'update:related': [newIris: string[], oldIris: string[]]
  'rename': [oldIri: string, newIri: string]
  'delete': []
  'save': []
}>()

const SKOS_BROADER = 'http://www.w3.org/2004/02/skos/core#broader'
const SKOS_RELATED = 'http://www.w3.org/2004/02/skos/core#related'

// Reka UI SelectItem rejects empty-string values, so we use a sentinel
// for "no language tag" and convert at the model-value boundary.
const LANG_NONE = '_none'

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

function confirmDelete() {
  showDeleteConfirm.value = false
  emit('delete')
}

/** Format an IRI for readonly display — show prefLabel if available */
function formatIri(iri: string): string {
  const concept = props.concepts.find(c => c.iri === iri)
  if (concept) return concept.prefLabel
  const hashIdx = iri.lastIndexOf('#')
  const slashIdx = iri.lastIndexOf('/')
  return iri.substring(Math.max(hashIdx, slashIdx) + 1)
}
</script>

<template>
  <div>
    <div class="space-y-5">
      <!-- Subject IRI -->
      <div v-if="editingIri" class="flex items-center gap-2">
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
        class="text-sm text-muted font-mono break-all bg-muted/30 px-3 py-2 rounded cursor-pointer group flex items-center gap-2 hover:bg-muted/50 transition-colors"
        @click="startIriEdit"
      >
        <span class="flex-1">{{ subjectIri }}</span>
        <UIcon name="i-heroicons-pencil" class="size-3.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      <!-- Properties -->
      <div v-for="prop in properties" :key="prop.predicate" class="space-y-1.5">
        <!-- Property label with link icon (matching RichMetadataTable pattern) -->
        <div class="flex items-center gap-1 text-sm font-medium text-muted">
          <span>{{ prop.label }}</span>
          <a
            :href="prop.predicate"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center text-muted hover:text-primary"
            :title="prop.description"
          >
            <UIcon name="i-heroicons-arrow-top-right-on-square" class="w-3.5 h-3.5" />
          </a>
        </div>

        <!-- readonly -->
        <template v-if="prop.fieldType === 'readonly'">
          <div v-for="val in prop.values" :key="val.id" class="text-sm text-muted py-1">
            <!-- Blank node: show nested properties -->
            <template v-if="val.type === 'blank-node' && val.nestedProperties?.length">
              <div class="bg-muted/30 rounded-lg px-3 py-2 space-y-1">
                <div v-for="nested in val.nestedProperties" :key="nested.predicate" class="flex items-start gap-2">
                  <span class="font-medium text-xs w-20 shrink-0">{{ nested.label }}</span>
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
            </template>
            <template v-else-if="val.type === 'iri'">
              <span class="font-mono text-xs">{{ formatIri(val.value) }}</span>
            </template>
            <template v-else>
              <span>{{ val.value }}</span>
              <span v-if="val.language" class="text-xs text-muted ml-1">@{{ val.language }}</span>
            </template>
          </div>
          <div v-if="!prop.values.length" class="text-sm text-muted italic py-1">&mdash;</div>
        </template>

        <!-- iri-picker (broader / related) -->
        <template v-else-if="prop.fieldType === 'iri-picker'">
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
        </template>

        <!-- text / textarea / date -->
        <template v-else>
          <div v-for="val in prop.values" :key="val.id" class="flex items-start gap-2 mb-2">
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

            <!-- Language tag selector (for literals) -->
            <USelect
              v-if="val.type === 'literal' && prop.fieldType !== 'date'"
              :model-value="val.language || LANG_NONE"
              :items="languageOptions"
              value-key="value"
              class="w-20"
              size="sm"
              :ui="{ content: 'z-50' }"
              @update:model-value="handleLanguageChange(prop.predicate, val, $event as string)"
            />

            <!-- Remove button (hidden when at minCount) -->
            <UButton
              v-if="prop.minCount == null || prop.values.length > prop.minCount"
              icon="i-heroicons-x-mark"
              color="error"
              variant="ghost"
              size="xs"
              @click="emit('remove:value', prop.predicate, val)"
            />
          </div>

          <!-- Add value button (hidden when at maxCount) -->
          <UButton
            v-if="prop.maxCount == null || prop.values.length < prop.maxCount"
            icon="i-heroicons-plus"
            variant="ghost"
            size="xs"
            @click="emit('add:value', prop.predicate)"
          >
            Add value
          </UButton>
        </template>
      </div>

      <!-- Delete concept button -->
      <div v-if="!isScheme" class="pt-4 border-t border-default">
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
  </div>
</template>
