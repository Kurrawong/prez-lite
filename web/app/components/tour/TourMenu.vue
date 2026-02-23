<script setup lang="ts">
import { TOUR_KEY } from '~/composables/useTour'

export interface TourMenuItem {
  id: string
  label: string
  icon?: string
}

const props = defineProps<{
  tours: TourMenuItem[]
}>()

const tour = inject(TOUR_KEY, null)

const dropdownItems = computed(() => {
  return [
    props.tours.map(t => ({
      label: t.label,
      icon: t.icon,
      onSelect: () => tour?.start(t.id),
    })),
  ]
})
</script>

<template>
  <div class="flex items-center">
    <UDropdownMenu :items="dropdownItems" :ui="{ content: 'z-50' }">
      <UButton
        icon="i-heroicons-play-circle"
        color="neutral"
        variant="ghost"
        aria-label="Take a tour"
      />
    </UDropdownMenu>
    <UButton
      :icon="tour?.speechEnabled.value ? 'i-heroicons-speaker-wave' : 'i-heroicons-speaker-x-mark'"
      color="neutral"
      variant="ghost"
      size="xs"
      :aria-label="tour?.speechEnabled.value ? 'Disable tour narration' : 'Enable tour narration'"
      :title="tour?.speechEnabled.value ? 'Tour narration on' : 'Tour narration off'"
      class="-ml-2"
      @click="tour?.toggleSpeech()"
    />
  </div>
</template>
