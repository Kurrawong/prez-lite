/**
 * Makes a UModal draggable by its header.
 * Returns a template ref to place on the header element (drag handle).
 * Resets position each time the modal reopens.
 */
export function useDraggableModal(isOpen: Ref<boolean>) {
  const handleRef = ref<HTMLElement | null>(null)
  let offsetX = 0
  let offsetY = 0

  watch(isOpen, (open) => {
    if (open) {
      offsetX = 0
      offsetY = 0
    }
  })

  function onMouseDown(e: MouseEvent) {
    const dialog = handleRef.value?.closest('[role="dialog"]') as HTMLElement | null
    if (!dialog) return

    e.preventDefault()
    const startX = e.clientX - offsetX
    const startY = e.clientY - offsetY

    function onMouseMove(ev: MouseEvent) {
      offsetX = ev.clientX - startX
      offsetY = ev.clientY - startY
      dialog!.style.translate = `${offsetX}px ${offsetY}px`
    }

    function onMouseUp() {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

  watch(handleRef, (el, _, onCleanup) => {
    if (!el) return
    el.style.cursor = 'grab'
    el.addEventListener('mousedown', onMouseDown)
    onCleanup(() => {
      el.removeEventListener('mousedown', onMouseDown)
    })
  })

  return { handleRef }
}
