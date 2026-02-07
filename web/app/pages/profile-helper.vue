<script setup lang="ts">
import { useProfileBuilder } from '~/composables/useProfileBuilder'
import { useProfileValidation } from '~/composables/useProfileValidation'

// Page metadata
useHead({
  title: 'Profile Helper | prez-lite',
})

// Builder state
const {
  state,
  isDirty,
  generatedTtl,
  reset,
  loadExample,
  downloadTtl,
  copyTtl,
} = useProfileBuilder()

// Validation
const { result: validationResult, isValidating, validateDebounced } = useProfileValidation()

// Mode: 'builder' or 'editor'
const mode = ref<'builder' | 'editor'>('builder')

// Editor content (separate from generated)
const editorContent = ref('')

// Sync editor content when switching modes
watch(mode, (newMode, oldMode) => {
  if (newMode === 'editor' && oldMode === 'builder') {
    // Switching to editor: copy generated TTL
    editorContent.value = generatedTtl.value
  }
})

// The active TTL content (generated or edited)
const activeTtl = computed(() => {
  return mode.value === 'builder' ? generatedTtl.value : editorContent.value
})

// Validate whenever TTL changes
watch(activeTtl, (ttl) => {
  validateDebounced(ttl, 500)
}, { immediate: true })

// Copy notification
const showCopied = ref(false)
async function handleCopy() {
  if (mode.value === 'builder') {
    await copyTtl()
  } else {
    await navigator.clipboard.writeText(editorContent.value)
  }
  showCopied.value = true
  setTimeout(() => { showCopied.value = false }, 2000)
}

// Download
function handleDownload() {
  const content = mode.value === 'builder' ? generatedTtl.value : editorContent.value
  const blob = new Blob([content], { type: 'text/turtle' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${state.identifier || 'profile'}.ttl`
  a.click()
  URL.revokeObjectURL(url)
}

// Load example
function handleLoadExample() {
  loadExample()
  if (mode.value === 'editor') {
    editorContent.value = generatedTtl.value
  }
}

// Reset
function handleReset() {
  reset()
  editorContent.value = ''
}

// Copy property IRI
async function copyPropertyIri(iri: string) {
  await navigator.clipboard.writeText(iri)
}
</script>

<template>
  <div class="py-8">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-3xl font-bold">Profile Helper</h1>
        <p class="text-muted mt-1">
          Build and validate prez:ObjectProfile definitions for vocabulary processing.
        </p>
      </div>

      <div class="flex items-center gap-2">
        <UButton
          variant="outline"
          color="neutral"
          size="sm"
          @click="handleLoadExample"
        >
          Load Example
        </UButton>
        <UButton
          variant="outline"
          color="neutral"
          size="sm"
          @click="handleReset"
        >
          Reset
        </UButton>
      </div>
    </div>

    <!-- Mode Toggle -->
    <div class="flex items-center gap-2 mb-6">
      <span class="text-sm text-gray-600 dark:text-gray-400">Mode:</span>
      <UFieldGroup size="sm">
        <UButton
          :variant="mode === 'builder' ? 'solid' : 'outline'"
          :color="mode === 'builder' ? 'primary' : 'neutral'"
          icon="i-lucide-wrench"
          @click="mode = 'builder'"
        >
          Builder
        </UButton>
        <UButton
          :variant="mode === 'editor' ? 'solid' : 'outline'"
          :color="mode === 'editor' ? 'primary' : 'neutral'"
          icon="i-lucide-code"
          @click="mode = 'editor'"
        >
          Editor
        </UButton>
      </UFieldGroup>
      <span v-if="isDirty" class="text-xs text-gray-500 ml-2">
        (unsaved changes)
      </span>
    </div>

    <!-- Main Content -->
    <div class="grid lg:grid-cols-2 gap-6">
      <!-- Left Column: Builder or Editor -->
      <div>
        <!-- Builder Mode -->
        <template v-if="mode === 'builder'">
          <ProfileBuilder
            :state="state"
            @update:state="Object.assign(state, $event)"
          />
        </template>

        <!-- Editor Mode -->
        <template v-else>
          <UCard>
            <template #header>
              <div class="flex items-center justify-between">
                <h3 class="font-semibold text-gray-900 dark:text-gray-100">TTL Editor</h3>
                <span class="text-xs text-gray-500">Edit the profile directly</span>
              </div>
            </template>

            <ProfileEditor
              v-model="editorContent"
              height="600px"
            />
          </UCard>
        </template>
      </div>

      <!-- Right Column: Preview & Validation -->
      <div class="space-y-6">
        <!-- Generated TTL Preview -->
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="font-semibold text-gray-900 dark:text-gray-100">
                {{ mode === 'builder' ? 'Generated TTL' : 'Preview' }}
              </h3>
              <div class="flex items-center gap-2">
                <Transition name="fade">
                  <span v-if="showCopied" class="text-xs text-green-600">Copied!</span>
                </Transition>
                <UButton
                  variant="ghost"
                  color="neutral"
                  size="xs"
                  icon="i-heroicons-clipboard-document"
                  @click="handleCopy"
                >
                  Copy
                </UButton>
                <UButton
                  variant="ghost"
                  color="neutral"
                  size="xs"
                  icon="i-heroicons-arrow-down-tray"
                  @click="handleDownload"
                >
                  Download
                </UButton>
              </div>
            </div>
          </template>

          <ProfileEditor
            :model-value="activeTtl"
            :readonly="true"
            height="400px"
          />
        </UCard>

        <!-- Validation Panel -->
        <UCard>
          <template #header>
            <h3 class="font-semibold text-gray-900 dark:text-gray-100">Validation</h3>
          </template>

          <ProfileValidation
            :result="validationResult"
            :is-validating="isValidating"
          />
        </UCard>

        <!-- Property Browser (collapsed by default) -->
        <UCard>
          <template #header>
            <h3 class="font-semibold text-gray-900 dark:text-gray-100">Property Browser</h3>
          </template>

          <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Browse available ontology properties. Click to copy the IRI.
          </p>

          <ProfilePropertyPicker
            :selected-iris="[...state.labelSources, ...state.descriptionSources, ...state.provenanceSources]"
            @select="(prop) => copyPropertyIri(prop.iri)"
          />
        </UCard>
      </div>
    </div>

    <!-- Help Section -->
    <div class="mt-12">
      <UCard>
        <template #header>
          <h3 class="font-semibold text-gray-900 dark:text-gray-100">About Object Profiles</h3>
        </template>

        <div class="prose prose-sm dark:prose-invert max-w-none">
          <p>
            A <code>prez:ObjectProfile</code> defines how Prez renders and annotates a specific type of RDF resource.
            Each profile specifies:
          </p>

          <ul>
            <li><strong>Target Class</strong>: The RDF class this profile applies to (e.g., <code>skos:ConceptScheme</code>)</li>
            <li><strong>Source Predicates</strong>: Which predicates to use for labels, descriptions, and provenance (order matters)</li>
            <li><strong>Generation Flags</strong>: Which <code>prez:*</code> annotations to generate</li>
            <li><strong>Output Formats</strong>: Supported content negotiation formats</li>
            <li><strong>Link Templates</strong>: URL patterns for resource links</li>
          </ul>

          <p>
            For more details, see the
            <NuxtLink to="/authoring" class="text-primary">Authoring Guide</NuxtLink>.
          </p>
        </div>
      </UCard>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
