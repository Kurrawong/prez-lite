<script setup lang="ts">
const props = defineProps<{
  targetX: number
  targetY: number
  clicking: boolean
}>()

const emit = defineEmits<{
  moveComplete: []
  clickComplete: []
}>()

const cursorRef = useTemplateRef<HTMLElement>('cursorRef')

function onTransitionEnd(e: TransitionEvent) {
  if (e.propertyName === 'transform') {
    emit('moveComplete')
  }
}

// Click ripple animation
const showRipple = ref(false)

watch(() => props.clicking, (val) => {
  if (val) {
    showRipple.value = true
    setTimeout(() => {
      showRipple.value = false
      emit('clickComplete')
    }, 400)
  }
})
</script>

<template>
  <div
    ref="cursorRef"
    class="tour-cursor"
    :class="{ 'tour-cursor--clicking': clicking }"
    :style="{
      transform: `translate(${targetX}px, ${targetY}px)`,
    }"
    @transitionend="onTransitionEnd"
  >
    <!-- SVG cursor arrow -->
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      class="tour-cursor__icon"
    >
      <path
        d="M5 3l14 8-6.5 1.5L11 19z"
        fill="white"
        stroke="black"
        stroke-width="1.5"
        stroke-linejoin="round"
      />
    </svg>

    <!-- Click ripple -->
    <div
      v-if="showRipple"
      class="tour-cursor__ripple"
    />
  </div>
</template>

<style scoped>
.tour-cursor {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 1000000001;
  pointer-events: none;
  transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  will-change: transform;
  /* Offset so tip is at the exact coordinate */
  margin-left: -3px;
  margin-top: -3px;
}

.tour-cursor__icon {
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
  transition: transform 0.15s ease;
}

.tour-cursor--clicking .tour-cursor__icon {
  transform: scale(0.85);
}

.tour-cursor__ripple {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(59, 130, 246, 0.4);
  animation: tour-ripple 0.4s ease-out forwards;
}

@keyframes tour-ripple {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  100% {
    transform: scale(6);
    opacity: 0;
  }
}
</style>
