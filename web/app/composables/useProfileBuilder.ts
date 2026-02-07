/**
 * Profile Builder Composable
 *
 * Provides reactive state management for building prez:ObjectProfile definitions.
 * Manages profile metadata, source predicates, generation flags, and generates
 * valid Turtle content.
 */

import type { PrezGenerateFlags } from '~/utils/shacl-profile-parser'
import type { ProfileBuilderState } from '~/utils/profile-generator'
import {
  generateProfileTTL,
  createDefaultBuilderState,
  createExampleBuilderState,
} from '~/utils/profile-generator'

export function useProfileBuilder() {
  // Core state
  const state = reactive<ProfileBuilderState>(createDefaultBuilderState())

  // Track if user has modified the state
  const isDirty = ref(false)

  // Watch for changes to mark as dirty
  watch(
    () => ({ ...state }),
    () => {
      isDirty.value = true
    },
    { deep: true }
  )

  // Generated TTL (computed from state)
  const generatedTtl = computed(() => {
    return generateProfileTTL(state)
  })

  // Reset to default state
  function reset() {
    Object.assign(state, createDefaultBuilderState())
    isDirty.value = false
  }

  // Load example profile
  function loadExample() {
    Object.assign(state, createExampleBuilderState())
    isDirty.value = true
  }

  // Load state from parsed profile (for editing existing profiles)
  function loadFromState(newState: Partial<ProfileBuilderState>) {
    Object.assign(state, { ...createDefaultBuilderState(), ...newState })
    isDirty.value = false
  }

  // --- Source predicate management ---

  function addLabelSource(iri: string) {
    if (!state.labelSources.includes(iri)) {
      state.labelSources.push(iri)
    }
  }

  function removeLabelSource(iri: string) {
    const idx = state.labelSources.indexOf(iri)
    if (idx >= 0) state.labelSources.splice(idx, 1)
  }

  function moveLabelSource(from: number, to: number) {
    const [item] = state.labelSources.splice(from, 1)
    if (item) state.labelSources.splice(to, 0, item)
  }

  function addDescriptionSource(iri: string) {
    if (!state.descriptionSources.includes(iri)) {
      state.descriptionSources.push(iri)
    }
  }

  function removeDescriptionSource(iri: string) {
    const idx = state.descriptionSources.indexOf(iri)
    if (idx >= 0) state.descriptionSources.splice(idx, 1)
  }

  function moveDescriptionSource(from: number, to: number) {
    const [item] = state.descriptionSources.splice(from, 1)
    if (item) state.descriptionSources.splice(to, 0, item)
  }

  function addProvenanceSource(iri: string) {
    if (!state.provenanceSources.includes(iri)) {
      state.provenanceSources.push(iri)
    }
  }

  function removeProvenanceSource(iri: string) {
    const idx = state.provenanceSources.indexOf(iri)
    if (idx >= 0) state.provenanceSources.splice(idx, 1)
  }

  function moveProvenanceSource(from: number, to: number) {
    const [item] = state.provenanceSources.splice(from, 1)
    if (item) state.provenanceSources.splice(to, 0, item)
  }

  // --- Generation flags ---

  function setGenerateFlag(flag: keyof PrezGenerateFlags, value: boolean) {
    state.generate[flag] = value
  }

  function toggleGenerateFlag(flag: keyof PrezGenerateFlags) {
    state.generate[flag] = !state.generate[flag]
  }

  // --- Output formats ---

  function addFormat(format: string) {
    if (!state.formats.includes(format)) {
      state.formats.push(format)
    }
  }

  function removeFormat(format: string) {
    const idx = state.formats.indexOf(format)
    if (idx >= 0) state.formats.splice(idx, 1)
  }

  function toggleFormat(format: string) {
    if (state.formats.includes(format)) {
      removeFormat(format)
    } else {
      addFormat(format)
    }
  }

  // --- Export/Download ---

  function downloadTtl() {
    const blob = new Blob([generatedTtl.value], { type: 'text/turtle' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${state.identifier || 'profile'}.ttl`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function copyTtl() {
    await navigator.clipboard.writeText(generatedTtl.value)
  }

  return {
    // State
    state,
    isDirty,
    generatedTtl,

    // Actions
    reset,
    loadExample,
    loadFromState,

    // Label sources
    addLabelSource,
    removeLabelSource,
    moveLabelSource,

    // Description sources
    addDescriptionSource,
    removeDescriptionSource,
    moveDescriptionSource,

    // Provenance sources
    addProvenanceSource,
    removeProvenanceSource,
    moveProvenanceSource,

    // Generation flags
    setGenerateFlag,
    toggleGenerateFlag,

    // Formats
    addFormat,
    removeFormat,
    toggleFormat,

    // Export
    downloadTtl,
    copyTtl,
  }
}
