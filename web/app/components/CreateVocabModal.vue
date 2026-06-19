<script setup lang="ts">
import { slugify } from '~/composables/useVocabCreate'

const props = defineProps<{
  creating: boolean
  error?: string | null
  /** IRI base learned from existing vocabularies, e.g. https://.../def/voc/ga/ */
  iriBase: string
}>()

const emit = defineEmits<{
  create: [payload: { title: string; definition: string; slug: string; iri: string }]
  close: []
}>()

const title = ref('')
const definition = ref('')
const slug = ref('')
const base = ref(props.iriBase)
const slugEdited = ref(false)

watch(() => props.iriBase, (v) => { if (!base.value) base.value = v })

// Auto-derive the slug from the title until the user edits it directly.
watch(title, (v) => {
  if (!slugEdited.value) slug.value = slugify(v)
})

function onSlugInput() {
  slugEdited.value = true
}

const normalisedBase = computed(() => {
  const b = base.value.trim().replace(/\/+$/, '')
  return b ? `${b}/` : ''
})

const iri = computed(() => `${normalisedBase.value}${slug.value.trim()}`)

const slugValid = computed(() => /^[A-Za-z0-9_-]+$/.test(slug.value.trim()))
const canSubmit = computed(() =>
  !!title.value.trim() && !!definition.value.trim() && slugValid.value && /^https?:\/\/.+/.test(iri.value),
)

function submit() {
  if (!canSubmit.value || props.creating) return
  emit('create', {
    title: title.value.trim(),
    definition: definition.value.trim(),
    slug: slug.value.trim(),
    iri: iri.value,
  })
}
</script>

<template>
  <div class="space-y-4">
    <p class="text-sm text-muted">
      Create a new vocabulary in this workspace. A SKOS ConceptScheme is scaffolded
      on your edit branch and opened in the editor so you can add concepts.
    </p>

    <UAlert
      v-if="error"
      color="error"
      icon="i-heroicons-exclamation-triangle"
      :description="error"
    />

    <!-- Title -->
    <div>
      <label class="text-sm font-medium mb-1 block">Title <span class="text-error">*</span></label>
      <UInput v-model="title" class="w-full" placeholder="e.g. Rock Classification" autofocus />
    </div>

    <!-- Description -->
    <div>
      <label class="text-sm font-medium mb-1 block">Description <span class="text-error">*</span></label>
      <UTextarea v-model="definition" class="w-full" :rows="3" placeholder="What this vocabulary covers." />
    </div>

    <!-- Identifier -->
    <div>
      <label class="text-sm font-medium mb-1 block">Identifier <span class="text-error">*</span></label>
      <UInput
        v-model="slug"
        class="w-full"
        placeholder="RockClassification"
        :color="slug && !slugValid ? 'error' : undefined"
        @input="onSlugInput"
      />
      <p v-if="slug && !slugValid" class="text-xs text-error mt-1">
        Letters, numbers, hyphens and underscores only.
      </p>
      <p class="text-xs text-muted mt-1">
        File: <code>{{ slug || '…' }}.ttl</code>
      </p>
    </div>

    <!-- IRI preview -->
    <div>
      <label class="text-sm font-medium mb-1 block">IRI</label>
      <UInput v-model="base" class="w-full font-mono text-xs" placeholder="https://example.org/def/voc/" />
      <p class="text-xs text-muted mt-1 break-all">
        New vocabulary IRI: <code>{{ iri || '…' }}</code>
      </p>
    </div>

    <div class="flex justify-end items-center gap-3 pt-2">
      <UButton variant="ghost" color="neutral" :disabled="creating" @click="emit('close')">
        Cancel
      </UButton>
      <UButton
        icon="i-heroicons-plus"
        :loading="creating"
        :disabled="!canSubmit || creating"
        @click="submit"
      >
        Create vocabulary
      </UButton>
    </div>
  </div>
</template>
