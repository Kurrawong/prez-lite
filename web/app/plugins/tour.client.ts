import 'driver.js/dist/driver.css'
import '~/assets/css/tour.css'
import { TOUR_KEY, useTour } from '~/composables/useTour'

export default defineNuxtPlugin((nuxtApp) => {
  const tour = useTour()

  nuxtApp.vueApp.provide(TOUR_KEY, tour)

  // Keyboard shortcuts
  const handleKeydown = (e: KeyboardEvent) => {
    if (!tour.isActive.value) return

    switch (e.key) {
      case 'Escape':
        e.preventDefault()
        tour.stop()
        break
      case 'ArrowRight':
        if (tour.mode.value === 'manual') {
          e.preventDefault()
          tour.next()
        }
        break
      case 'ArrowLeft':
        if (tour.mode.value === 'manual') {
          e.preventDefault()
          tour.prev()
        }
        break
    }
  }

  if (import.meta.client) {
    window.addEventListener('keydown', handleKeydown)
  }

  return {
    provide: {
      tour,
    },
  }
})
