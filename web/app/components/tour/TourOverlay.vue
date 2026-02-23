<script setup lang="ts">
import { TOUR_KEY } from '~/composables/useTour'

const tour = inject(TOUR_KEY, null)
</script>

<template>
  <Teleport v-if="tour" to="body">
    <div v-if="tour.isActive.value" class="tour-overlay">
      <TourCursor
        :target-x="tour.cursorX.value"
        :target-y="tour.cursorY.value"
        :clicking="tour.clicking.value"
        @move-complete="tour.onCursorMoveComplete"
        @click-complete="tour.onClickAnimComplete"
      />

      <!-- Bottom control bar -->
      <div class="tour-controls">
        <div class="flex items-center gap-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-full px-4 py-2 shadow-lg">
          <!-- Mode toggle -->
          <button
            class="flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full transition-colors"
            :class="tour.mode.value === 'auto'
              ? 'bg-primary/10 text-primary'
              : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'"
            @click="tour.setMode('auto')"
          >
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
            Auto
          </button>

          <button
            class="flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full transition-colors"
            :class="tour.mode.value === 'manual'
              ? 'bg-primary/10 text-primary'
              : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'"
            @click="tour.setMode('manual')"
          >
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v4m0 12v4m10-10h-4M6 12H2" />
            </svg>
            Manual
          </button>

          <div class="w-px h-4 bg-gray-200 dark:bg-gray-700" />

          <!-- Speech toggle -->
          <button
            class="flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full transition-colors"
            :class="tour.speechEnabled.value
              ? 'bg-primary/10 text-primary'
              : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'"
            :title="tour.speechEnabled.value ? 'Mute narration' : 'Enable narration'"
            @click="tour.toggleSpeech"
          >
            <svg v-if="tour.speechEnabled.value" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            </svg>
            <svg v-else class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <line x1="23" y1="9" x2="17" y2="15" />
              <line x1="17" y1="9" x2="23" y2="15" />
            </svg>
          </button>

          <div class="w-px h-4 bg-gray-200 dark:bg-gray-700" />

          <!-- Step indicator -->
          <span class="text-xs text-gray-500 tabular-nums">
            {{ tour.currentStepIndex.value + 1 }}/{{ tour.steps.value.length }}
          </span>

          <div class="w-px h-4 bg-gray-200 dark:bg-gray-700" />

          <!-- End tour -->
          <button
            class="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            @click="tour.stop"
          >
            End Tour
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.tour-controls {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000000002;
  pointer-events: auto;
}
</style>
