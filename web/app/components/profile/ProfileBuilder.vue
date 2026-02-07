<script setup lang="ts">
import type { ProfileBuilderState } from '~/utils/profile-generator'
import { useOntologyProperties } from '~/composables/useOntologyProperties'

const props = defineProps<{
  state: ProfileBuilderState
}>()

const emit = defineEmits<{
  'update:state': [state: ProfileBuilderState]
}>()

const { targetClasses, toPrefixed } = useOntologyProperties()

// Local reactive copy that syncs with parent
const localState = computed({
  get: () => props.state,
  set: (value) => emit('update:state', value),
})

// Computed property accessors for v-model binding
const iriBase = computed({
  get: () => localState.value.iriBase,
  set: (value) => { localState.value.iriBase = value },
})

const identifier = computed({
  get: () => localState.value.identifier,
  set: (value) => { localState.value.identifier = value },
})

const title = computed({
  get: () => localState.value.title,
  set: (value) => { localState.value.title = value },
})

const description = computed({
  get: () => localState.value.description,
  set: (value) => { localState.value.description = value },
})

const targetClass = computed({
  get: () => localState.value.targetClass,
  set: (value) => { localState.value.targetClass = value },
})

const linkTemplate = computed({
  get: () => localState.value.linkTemplate,
  set: (value) => { localState.value.linkTemplate = value },
})

const membersTemplate = computed({
  get: () => localState.value.membersTemplate,
  set: (value) => { localState.value.membersTemplate = value },
})

const generateFlags = computed({
  get: () => localState.value.generate,
  set: (value) => { localState.value.generate = value },
})

const labelSources = computed({
  get: () => localState.value.labelSources,
  set: (value) => { localState.value.labelSources = value },
})

const descriptionSources = computed({
  get: () => localState.value.descriptionSources,
  set: (value) => { localState.value.descriptionSources = value },
})

const provenanceSources = computed({
  get: () => localState.value.provenanceSources,
  set: (value) => { localState.value.provenanceSources = value },
})

const formats = computed({
  get: () => localState.value.formats,
  set: (value) => { localState.value.formats = value },
})

const defaultFormat = computed({
  get: () => localState.value.defaultFormat,
  set: (value) => { localState.value.defaultFormat = value },
})

// Target class options for select
const targetClassOptions = targetClasses.map(tc => ({
  value: tc.iri,
  label: tc.label,
}))
</script>

<template>
  <div class="space-y-6">
    <!-- Profile Metadata -->
    <UCard>
      <template #header>
        <h3 class="font-semibold text-gray-900 dark:text-gray-100">Profile Metadata</h3>
      </template>

      <div class="space-y-4">
        <div class="grid md:grid-cols-2 gap-4">
          <UFormField label="IRI Base (optional)">
            <UInput
              v-model="iriBase"
              placeholder="https://example.org/profiles/"
              class="font-mono text-sm"
            />
          </UFormField>

          <UFormField label="Identifier" required>
            <UInput
              v-model="identifier"
              placeholder="my-profile"
              class="font-mono text-sm"
            />
          </UFormField>
        </div>

        <UFormField label="Title">
          <UInput
            v-model="title"
            placeholder="My Object Profile"
          />
        </UFormField>

        <UFormField label="Description">
          <UTextarea
            v-model="description"
            placeholder="A profile for..."
            :rows="2"
          />
        </UFormField>
      </div>
    </UCard>

    <!-- Target Class -->
    <UCard>
      <template #header>
        <h3 class="font-semibold text-gray-900 dark:text-gray-100">Target Class</h3>
      </template>

      <UFormField label="Applies to">
        <USelect
          v-model="targetClass"
          :items="targetClassOptions"
          placeholder="Select target class..."
        />
      </UFormField>
      <p class="text-xs text-gray-500 mt-2">
        The RDF class this profile applies to. Currently: <code class="text-primary">{{ toPrefixed(targetClass) }}</code>
      </p>
    </UCard>

    <!-- Source Predicates -->
    <UCard>
      <template #header>
        <h3 class="font-semibold text-gray-900 dark:text-gray-100">Source Predicates</h3>
      </template>

      <div class="space-y-6">
        <ProfileSourcePredicatesPanel
          title="Label Sources (prez:labelSource)"
          v-model="labelSources"
          category="label"
        />

        <ProfileSourcePredicatesPanel
          title="Description Sources (prez:descriptionSource)"
          v-model="descriptionSources"
          category="description"
        />

        <ProfileSourcePredicatesPanel
          title="Provenance Sources (prez:provenanceSource)"
          v-model="provenanceSources"
          category="provenance"
        />
      </div>
    </UCard>

    <!-- Generation Flags -->
    <UCard>
      <template #header>
        <h3 class="font-semibold text-gray-900 dark:text-gray-100">Generation Flags</h3>
      </template>

      <ProfileGenerationFlagsPanel v-model="generateFlags" />
    </UCard>

    <!-- Output Formats -->
    <UCard>
      <template #header>
        <h3 class="font-semibold text-gray-900 dark:text-gray-100">Output Formats</h3>
      </template>

      <ProfileOutputFormatsPanel
        v-model="formats"
        :default-format="defaultFormat"
        @update:default-format="defaultFormat = $event"
      />
    </UCard>

    <!-- Link Templates -->
    <UCard>
      <template #header>
        <h3 class="font-semibold text-gray-900 dark:text-gray-100">Link Templates</h3>
      </template>

      <div class="space-y-4">
        <UFormField label="Link Template">
          <UInput
            v-model="linkTemplate"
            placeholder="/catalogs/{catalogId}/collections/{schemeId}"
            class="font-mono text-sm"
          />
        </UFormField>

        <UFormField label="Members Template">
          <UInput
            v-model="membersTemplate"
            placeholder="/catalogs/{catalogId}/collections/{schemeId}/items"
            class="font-mono text-sm"
          />
        </UFormField>

        <p class="text-xs text-gray-500">
          URL templates for generating prez:link and prez:members values. Use {placeholders} for dynamic segments.
        </p>
      </div>
    </UCard>
  </div>
</template>
