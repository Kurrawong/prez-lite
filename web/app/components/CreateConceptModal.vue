<script setup lang="ts">
import { conceptLocalName } from '~/composables/useVocabCreate'

const props = defineProps<{
  error?: string | null
  /** Scheme IRI used as the IRI base (a trailing '/' or '#' is ensured). */
  schemeBase: string
}>()

const emit = defineEmits<{
  create: [payload: { prefLabel: string; localName: string }]
  close: []
}>()

const prefLabel = ref('')
const localName = ref('')
const localNameEdited = ref(false)

// Auto-derive the identifier from the label until the user edits it directly.
watch(prefLabel, (v) => {
  if (!localNameEdited.value) localName.value = conceptLocalName(v)
})

function onLocalNameInput() {
  localNameEdited.value = true
}

const normalisedBase = computed(() => {
  const b = (props.schemeBase || '').trim()
  if (!b) return ''
  return b.endsWith('/') || b.endsWith('#') ? b : `${b}/`
})

const iri = computed(() => `${normalisedBase.value}${localName.value.trim()}`)

const localNameValid = computed(() => /^[A-Za-z0-9_-]+$/.test(localName.value.trim()))
const canSubmit = computed(() => !!prefLabel.value.trim() && localNameValid.value)

function submit() {
  if (!canSubmit.value) return
  emit('create', {
    prefLabel: prefLabel.value.trim(),
    localName: localName.value.trim(),
  })
}
</script>

<template>
  <div class="space-y-4">
    <p class="text-sm text-muted">
      Add a new concept to this vocabulary. Its IRI is derived from the identifier
      below and cannot be changed once the concept exists.
    </p>

    <UAlert
      v-if="error"
      color="error"
      icon="i-heroicons-exclamation-triangle"
      :description="error"
    />

    <!-- Preferred label -->
    <div>
      <label class="text-sm font-medium mb-1 block">Preferred label <span class="text-error">*</span></label>
      <UInput v-model="prefLabel" class="w-full" placeholder="e.g. Cross Reference" autofocus />
    </div>

    <!-- Identifier -->
    <div>
      <label class="text-sm font-medium mb-1 block">Identifier <span class="text-error">*</span></label>
      <UInput
        v-model="localName"
        class="w-full"
        placeholder="crossReference"
        :color="localName && !localNameValid ? 'error' : undefined"
        @input="onLocalNameInput"
      />
      <p v-if="localName && !localNameValid" class="text-xs text-error mt-1">
        Letters, numbers, hyphens and underscores only.
      </p>
    </div>

    <!-- IRI preview -->
    <div>
      <label class="text-sm font-medium mb-1 block">IRI</label>
      <p class="text-xs text-muted break-all font-mono">
        {{ iri || '…' }}
      </p>
    </div>

    <div class="flex justify-end items-center gap-3 pt-2">
      <UButton variant="ghost" color="neutral" @click="emit('close')">
        Cancel
      </UButton>
      <UButton
        icon="i-heroicons-plus"
        :disabled="!canSubmit"
        @click="submit"
      >
        Add concept
      </UButton>
    </div>
  </div>
</template>
