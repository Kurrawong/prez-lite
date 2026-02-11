<script setup lang="ts">
import type { EditableProperty, EditableValue, ConceptSummary } from '~/composables/useEditMode'

const props = defineProps<{
  subjectIri: string
  properties: EditableProperty[]
  concepts: ConceptSummary[]
  isScheme?: boolean
  mode?: 'inline' | 'full'
}>()

const emit = defineEmits<{
  'update:value': [predicate: string, oldValue: EditableValue, newValue: string]
  'update:language': [predicate: string, oldValue: EditableValue, newLang: string]
  'add:value': [predicate: string]
  'remove:value': [predicate: string, value: EditableValue]
  'update:broader': [newIris: string[], oldIris: string[]]
  'update:related': [newIris: string[], oldIris: string[]]
  'delete': []
  'save': []
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

const showDeleteConfirm = ref(false)

/** Filter properties based on mode: inline shows populated only, full shows all */
const displayProperties = computed(() => {
  if (props.mode === 'inline') {
    return props.properties.filter(p => p.values.length > 0)
  }
  return props.properties
})

function handleValueUpdate(predicate: string, val: EditableValue, event: Event) {
  const target = event.target as HTMLInputElement | HTMLTextAreaElement
  emit('update:value', predicate, val, target.value)
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
  <div class="max-h-[600px] overflow-y-auto">
    <div class="space-y-5">
      <!-- Subject IRI -->
      <div class="text-sm text-muted font-mono break-all bg-muted/30 px-3 py-2 rounded">
        {{ subjectIri }}
      </div>

      <!-- Properties -->
      <div v-for="prop in displayProperties" :key="prop.predicate" class="space-y-1.5">
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
            <template v-if="val.type === 'iri'">
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
              :model-value="val.value"
              :rows="3"
              class="flex-1"
              @change="handleValueUpdate(prop.predicate, val, $event)"
            />
            <UInput
              v-else-if="prop.fieldType === 'date'"
              type="date"
              :model-value="val.value"
              class="flex-1"
              @change="handleValueUpdate(prop.predicate, val, $event)"
            />
            <UInput
              v-else
              :model-value="val.value"
              class="flex-1"
              @change="handleValueUpdate(prop.predicate, val, $event)"
            />

            <!-- Language tag selector (for literals) -->
            <USelect
              v-if="val.type === 'literal' && prop.fieldType !== 'date'"
              :model-value="val.language || ''"
              :items="languageOptions"
              value-key="value"
              class="w-20"
              size="sm"
              @update:model-value="handleLanguageChange(prop.predicate, val, $event as string)"
            />

            <!-- Remove button -->
            <UButton
              icon="i-heroicons-x-mark"
              color="error"
              variant="ghost"
              size="xs"
              @click="emit('remove:value', prop.predicate, val)"
            />
          </div>

          <!-- Empty state for unpopulated properties in full mode -->
          <div v-if="!prop.values.length" class="text-sm text-muted italic py-1">&mdash;</div>

          <!-- Add value button -->
          <UButton
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
