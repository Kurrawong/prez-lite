import type { InjectionKey, Ref, ComputedRef } from 'vue'
import { driver as createDriver } from 'driver.js'
import type { Config, DriveStep, Driver } from 'driver.js'

export interface TourStep {
  id: string
  target?: string
  title: string
  description: string
  action: 'click' | 'type' | 'scroll' | 'none'
  typeText?: string
  position: 'top' | 'bottom' | 'left' | 'right'
  waitFor?: string
  delay: number
  navigateTo?: string
  /** Skip this step silently if the target element can't be found */
  skipOnMissing?: boolean
}

export interface TourState {
  availableTourIds: string[]
  isActive: Ref<boolean>
  mode: Ref<'auto' | 'manual'>
  currentStepIndex: Ref<number>
  currentStep: ComputedRef<TourStep | null>
  steps: Ref<TourStep[]>
  cursorX: Ref<number>
  cursorY: Ref<number>
  clicking: Ref<boolean>
  speechEnabled: Ref<boolean>
  speaking: Ref<boolean>
  start: (tourId: string) => Promise<void>
  stop: () => void
  next: () => void
  prev: () => void
  setMode: (mode: 'auto' | 'manual') => void
  toggleSpeech: () => void
  onCursorMoveComplete: () => void
  onClickAnimComplete: () => void
}

export const TOUR_KEY = Symbol('tour') as InjectionKey<TourState>

export function useTour(): TourState {
  const router = useRouter()

  const isActive = ref(false)
  const mode = ref<'auto' | 'manual'>('auto')
  const currentStepIndex = ref(0)
  const steps = ref<TourStep[]>([])

  const cursorX = ref(window.innerWidth / 2)
  const cursorY = ref(window.innerHeight / 2)
  const clicking = ref(false)

  // Speech — persist preference to localStorage
  const SPEECH_KEY = 'prez-lite-tour-speech'
  const speechEnabled = ref(
    typeof localStorage !== 'undefined' && localStorage.getItem(SPEECH_KEY) === 'true',
  )
  const speaking = ref(false)

  watch(speechEnabled, (val) => {
    try { localStorage.setItem(SPEECH_KEY, String(val)) } catch { /* quota */ }
  })

  let autoTimer: ReturnType<typeof setTimeout> | null = null
  let cursorResolve: (() => void) | null = null
  let clickResolve: (() => void) | null = null

  // driver.js instance
  let driverInstance: Driver | null = null

  // Progress bar animation
  let progressFrame: ReturnType<typeof requestAnimationFrame> | null = null
  let progressBar: HTMLElement | null = null
  let progressStart = 0

  const currentStep = computed(() => {
    if (!steps.value.length) return null
    return steps.value[currentStepIndex.value] ?? null
  })

  function clearTimers() {
    if (autoTimer) { clearTimeout(autoTimer); autoTimer = null }
    stopProgress()
  }

  // ---------------------------------------------------------------------------
  // Progress bar (injected into driver.js popover in auto mode)
  // ---------------------------------------------------------------------------

  function startProgress(duration: number) {
    stopProgress()
    if (mode.value !== 'auto') return

    progressStart = performance.now()

    function tick() {
      if (!progressBar) return
      const elapsed = performance.now() - progressStart
      const pct = Math.min(100, (elapsed / duration) * 100)
      progressBar.style.width = `${pct}%`
      if (pct < 100 && mode.value === 'auto') {
        progressFrame = requestAnimationFrame(tick)
      }
    }
    progressFrame = requestAnimationFrame(tick)
  }

  function stopProgress() {
    if (progressFrame) {
      cancelAnimationFrame(progressFrame)
      progressFrame = null
    }
    progressBar = null
  }

  // ---------------------------------------------------------------------------
  // Audio narration — pre-generated MP3 files with Web Speech API fallback
  // ---------------------------------------------------------------------------

  let currentAudio: HTMLAudioElement | null = null

  function stopSpeech() {
    if (currentAudio) {
      currentAudio.pause()
      currentAudio.currentTime = 0
      currentAudio = null
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
    speaking.value = false
  }

  /** Try to play a pre-generated MP3; fall back to Web Speech API. */
  function speak(stepId: string, text: string): Promise<void> {
    if (!speechEnabled.value) return Promise.resolve()

    return playAudioFile(stepId).catch(() => speakWithWebSpeech(text))
  }

  function playAudioFile(stepId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const audio = new Audio(`/audio/tour/${stepId}.mp3`)
      currentAudio = audio
      speaking.value = true

      audio.onended = () => {
        currentAudio = null
        speaking.value = false
        resolve()
      }
      audio.onerror = () => {
        currentAudio = null
        speaking.value = false
        reject(new Error('Audio file not found'))
      }

      audio.play().catch((err) => {
        currentAudio = null
        speaking.value = false
        reject(err)
      })
    })
  }

  function speakWithWebSpeech(text: string): Promise<void> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !window.speechSynthesis) {
        resolve()
        return
      }

      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 1.0
      utterance.pitch = 1.0
      utterance.volume = 1.0

      const voices = window.speechSynthesis.getVoices()
      const preferred = voices.find(v => v.name.includes('Samantha'))
        ?? voices.find(v => v.lang.startsWith('en') && v.localService)
        ?? voices.find(v => v.lang.startsWith('en'))
      if (preferred) utterance.voice = preferred

      speaking.value = true

      utterance.onend = () => {
        speaking.value = false
        resolve()
      }
      utterance.onerror = () => {
        speaking.value = false
        resolve()
      }

      window.speechSynthesis.speak(utterance)
    })
  }

  function toggleSpeech() {
    speechEnabled.value = !speechEnabled.value
    if (!speechEnabled.value) stopSpeech()
  }

  // ---------------------------------------------------------------------------
  // Cursor helpers
  // ---------------------------------------------------------------------------

  function onCursorMoveComplete() {
    cursorResolve?.()
    cursorResolve = null
  }

  function onClickAnimComplete() {
    clickResolve?.()
    clickResolve = null
  }

  function waitForCursorMove(): Promise<void> {
    return new Promise(resolve => { cursorResolve = resolve })
  }

  function waitForClickAnim(): Promise<void> {
    return new Promise(resolve => { clickResolve = resolve })
  }

  // ---------------------------------------------------------------------------
  // Element finding helpers
  // ---------------------------------------------------------------------------

  /** Try each comma-separated selector and return first match. */
  function queryFirst(selector: string): Element | null {
    const selectors = selector.split(',').map(s => s.trim())
    for (const sel of selectors) {
      try {
        const el = document.querySelector(sel)
        if (el) return el
      } catch { /* invalid selector */ }
    }
    return null
  }

  /** Check if an element is visible (non-zero size and not hidden). */
  function isElementVisible(el: Element): boolean {
    const rect = el.getBoundingClientRect()
    if (rect.width === 0 && rect.height === 0) return false
    const style = window.getComputedStyle(el)
    return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0'
  }

  /** Find a visible element matching selector, polling up to timeoutMs. */
  function findVisibleElement(selector: string, timeoutMs = 5000): Promise<Element | null> {
    return new Promise((resolve) => {
      const startTime = Date.now()
      let timer: ReturnType<typeof setTimeout> | null = null

      function poll() {
        if (!isActive.value) { resolve(null); return }

        const el = queryFirst(selector)
        if (el && isElementVisible(el)) { resolve(el); return }

        if (Date.now() - startTime > timeoutMs) {
          resolve(null)
          return
        }

        timer = setTimeout(poll, 100)
      }

      poll()
    })
  }

  /**
   * If a nav-area element isn't visible, the mobile menu is probably collapsed.
   * Open it via the UHeader toggle button, then retry.
   */
  async function ensureVisibleOrOpenMenu(selector: string): Promise<Element | null> {
    let el = queryFirst(selector)

    // Already visible — fast path
    if (el && isElementVisible(el)) return el

    // Try opening the mobile menu toggle
    const toggle = document.querySelector('button[data-slot="toggle"]')
    if (toggle && toggle instanceof HTMLElement && isElementVisible(toggle)) {
      toggle.click()
      await new Promise(r => setTimeout(r, 400))
      el = await findVisibleElement(selector, 3000)
      if (el) return el
    }

    // Fall back to polling (element may be loading)
    return findVisibleElement(selector)
  }

  // ---------------------------------------------------------------------------
  // Action execution
  // ---------------------------------------------------------------------------

  async function executeAction(step: TourStep) {
    if (!isActive.value) return
    if (step.action === 'none') return

    // Re-find the element (it may have moved or re-rendered)
    const el = step.target ? queryFirst(step.target) : null
    if (!el) return

    if (step.action === 'click') {
      // Animate click
      clicking.value = true
      await Promise.race([
        waitForClickAnim(),
        new Promise(r => setTimeout(r, 500)),
      ])
      clicking.value = false

      // Perform real click
      if (el instanceof HTMLElement) {
        el.click()
      } else {
        el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
      }

      // Validate: wait for expected element to confirm click worked
      if (step.waitFor) {
        const found = await findVisibleElement(step.waitFor, 5000)
        if (!found) {
          // Click didn't produce expected result — try clicking again
          if (el instanceof HTMLElement) el.click()
          await findVisibleElement(step.waitFor, 3000)
        }
        await new Promise(r => setTimeout(r, 200))
      }
    } else if (step.action === 'type' && step.typeText && el instanceof HTMLInputElement) {
      el.focus()
      for (const char of step.typeText) {
        el.value += char
        el.dispatchEvent(new Event('input', { bubbles: true }))
        await new Promise(r => setTimeout(r, 80))
      }
    } else if (step.action === 'scroll') {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  // ---------------------------------------------------------------------------
  // Navigation helper
  // ---------------------------------------------------------------------------

  function waitForNavigation(path: string): Promise<void> {
    return new Promise<void>((resolve) => {
      if (router.currentRoute.value.path === path) {
        resolve()
        return
      }

      let unwatch: (() => void) | null = null
      const timeout = setTimeout(() => {
        unwatch?.()
        resolve()
      }, 5000)

      unwatch = watch(
        () => router.currentRoute.value.path,
        (newPath) => {
          if (newPath === path) {
            unwatch?.()
            clearTimeout(timeout)
            setTimeout(resolve, 300)
          }
        },
      )
    })
  }

  function waitForQueryChange(expected: URLSearchParams): Promise<void> {
    return new Promise<void>((resolve) => {
      const currentQuery = router.currentRoute.value.query
      let allMatch = true
      expected.forEach((value, key) => {
        if (currentQuery[key] !== value) allMatch = false
      })
      if (allMatch) { setTimeout(resolve, 500); return }

      let unwatch: (() => void) | null = null
      const timeout = setTimeout(() => { unwatch?.(); resolve() }, 5000)

      unwatch = watch(
        () => router.currentRoute.value.query,
        (q) => {
          let match = true
          expected.forEach((value, key) => { if (q[key] !== value) match = false })
          if (match) { unwatch?.(); clearTimeout(timeout); setTimeout(resolve, 500) }
        },
      )
    })
  }

  /** Navigate for a step, handling both absolute paths and relative query strings. */
  async function navigateToStep(step: TourStep): Promise<void> {
    if (!step.navigateTo) return

    if (step.navigateTo.startsWith('?')) {
      const params = new URLSearchParams(step.navigateTo.slice(1))
      const query: Record<string, string> = { ...router.currentRoute.value.query as Record<string, string> }
      params.forEach((value, key) => { query[key] = value })
      router.push({ path: router.currentRoute.value.path, query })
      await waitForQueryChange(params)
    } else {
      router.push(step.navigateTo)
      await waitForNavigation(step.navigateTo)
    }

    if (step.target) {
      await ensureVisibleOrOpenMenu(step.target)
    }
  }

  // ---------------------------------------------------------------------------
  // Move cursor near a highlighted element, avoiding the popover text.
  //
  // The SVG cursor arrow tip is at the coordinate; its body extends ~20px
  // DOWN and to the RIGHT.  To keep the arrow off readable text, position
  // the tip OUTSIDE the highlight box on the side OPPOSITE the popover so
  // the body points toward the element but doesn't cover anything.
  //
  // driver.js adds 8px stage-padding around the element, so we offset an
  // extra 8px beyond the element rect.
  // ---------------------------------------------------------------------------

  const STAGE_PAD = 8   // matches driver.js stagePadding config
  const CURSOR_GAP = 6  // extra clearance from the highlight box edge

  function moveCursorToElement(el: Element | undefined, popoverSide?: string) {
    if (!el) {
      // No target — centered popover.  Park cursor in the bottom-right
      // corner well away from the centered popover text.
      cursorX.value = window.innerWidth - 80
      cursorY.value = window.innerHeight - 120
      return
    }
    const rect = el.getBoundingClientRect()

    // For small elements (icons, buttons), sit just outside the bottom-right
    if (rect.width < 48 || rect.height < 48) {
      cursorX.value = rect.right + STAGE_PAD + CURSOR_GAP
      cursorY.value = rect.bottom + STAGE_PAD + CURSOR_GAP
      return
    }

    // Position the cursor TIP outside the highlight box on the opposite
    // side from the popover.  The arrow body then extends away from both
    // the popover and the element text.
    const offset = STAGE_PAD + CURSOR_GAP
    switch (popoverSide) {
      case 'top':
        // Popover above → cursor below the highlight box
        cursorX.value = rect.left + rect.width * 0.3
        cursorY.value = rect.bottom + offset
        break
      case 'right':
        // Popover to the right → cursor left of the highlight box
        cursorX.value = rect.left - offset - 20 // extra offset so body doesn't reach element
        cursorY.value = rect.top + rect.height * 0.3
        break
      case 'left':
        // Popover to the left → cursor right of the highlight box
        cursorX.value = rect.right + offset
        cursorY.value = rect.top + rect.height * 0.3
        break
      case 'bottom':
      default:
        // Popover below → cursor above the highlight box
        // Tip above, arrow body extends down toward element (not into popover)
        cursorX.value = rect.left + rect.width * 0.3
        cursorY.value = rect.top - offset - 20 // body ends ~20px below tip, near element top
        break
    }
  }

  // ---------------------------------------------------------------------------
  // Convert our TourStep[] → driver.js DriveStep[]
  // ---------------------------------------------------------------------------

  function convertSteps(tourSteps: TourStep[]): DriveStep[] {
    return tourSteps.map((step, index) => {
      const driveStep: DriveStep = {
        popover: {
          title: step.title,
          description: step.description,
          side: step.position,
          align: 'center',
          popoverClass: 'tour-popover',
          // We handle navigation ourselves — prevent driver.js default button behavior
          onNextClick: () => next(),
          onPrevClick: () => prev(),
          onCloseClick: () => stop(),
          onPopoverRender: (popover) => {
            // Inject progress bar for auto mode
            if (mode.value === 'auto') {
              const progressContainer = document.createElement('div')
              progressContainer.className = 'tour-popover-progress'
              const bar = document.createElement('div')
              bar.className = 'tour-popover-progress-bar'
              bar.style.width = '0%'
              progressContainer.appendChild(bar)
              popover.wrapper.insertBefore(progressContainer, popover.wrapper.firstChild)
              progressBar = bar
              startProgress(step.delay)
            }
          },
        },
      }

      // Steps with a target get an element selector
      if (step.target) {
        // Use a function to support comma-separated selectors (driver.js only takes one)
        driveStep.element = () => {
          const el = queryFirst(step.target!)
          if (!el && step.skipOnMissing) {
            // Skip missing elements — return a hidden dummy so driver.js doesn't crash
            return undefined as unknown as Element
          }
          return (el ?? document.body) as Element
        }
      }

      // Hook: when step is highlighted, move cursor + play audio + auto-advance
      driveStep.onHighlighted = async (el) => {
        // If element wasn't found and skipOnMissing, auto-skip
        if (step.target && step.skipOnMissing && (!el || el === document.body)) {
          const actual = queryFirst(step.target)
          if (!actual) {
            driverInstance?.moveNext()
            return
          }
        }

        currentStepIndex.value = index
        moveCursorToElement(el, step.position)

        await Promise.race([
          waitForCursorMove(),
          new Promise(r => setTimeout(r, 800)),
        ])

        // Speak step content
        const speechText = `${step.title}. ${step.description}`
        const speechPromise = speak(step.id, speechText)

        if (mode.value === 'auto') {
          // Wait for both the minimum delay and speech to finish
          const delayPromise = new Promise<void>(resolve => {
            autoTimer = setTimeout(resolve, step.delay)
          })
          await Promise.all([delayPromise, speechPromise])

          if (!isActive.value) return

          await executeAction(step)

          if (!isActive.value) return

          // Auto-advance to next step
          if (index < tourSteps.length - 1) {
            const nextStep = tourSteps[index + 1]
            if (nextStep) await navigateToStep(nextStep)
            driverInstance?.moveNext()
          } else {
            // Last step — end tour
            stop()
          }
        }
      }

      return driveStep
    })
  }

  // ---------------------------------------------------------------------------
  // Tour lifecycle
  // ---------------------------------------------------------------------------

  function stop() {
    clearTimers()
    stopSpeech()
    clicking.value = false
    cursorResolve = null
    clickResolve = null

    if (driverInstance) {
      driverInstance.destroy()
      driverInstance = null
    }

    isActive.value = false
  }

  async function start(tourId: string) {
    stop()
    const tourData = await loadTour(tourId)
    if (!tourData.length) return

    steps.value = tourData
    currentStepIndex.value = 0
    isActive.value = true
    mode.value = 'auto'

    cursorX.value = window.innerWidth / 2
    cursorY.value = window.innerHeight / 2

    await nextTick()

    const driveSteps = convertSteps(tourData)

    // Handle navigation for the first step if needed
    const firstStep = tourData[0]
    if (firstStep) await navigateToStep(firstStep)

    const config: Config = {
      steps: driveSteps,
      animate: true,
      overlayColor: 'black',
      overlayOpacity: 0.5,
      smoothScroll: true,
      allowClose: false, // We handle close via our control bar
      allowKeyboardControl: false, // We handle keyboard in the plugin
      stagePadding: 8,
      stageRadius: 4,
      popoverClass: 'tour-popover',
      showProgress: true,
      progressText: '{{current}} of {{total}}',
      showButtons: ['next', 'previous', 'close'],
      onDestroyStarted: () => {
        stopSpeech()
        clearTimers()
      },
    }

    driverInstance = createDriver(config)
    driverInstance.drive()
  }

  const tourModules = import.meta.glob<{ default: TourStep[] }>('~/tours/*.json')

  const availableTourIds = Object.keys(tourModules)
    .map(k => k.match(/\/([^/]+)\.json$/)?.[1])
    .filter((id): id is string => !!id)

  async function loadTour(tourId: string): Promise<TourStep[]> {
    const key = Object.keys(tourModules).find(k => k.endsWith(`/${tourId}.json`))
    if (!key) return []
    const mod = await tourModules[key]()
    return mod.default
  }

  function next() {
    if (!isActive.value || !driverInstance) return
    stopSpeech()
    clearTimers()

    const step = currentStep.value
    if (!step) return

    // Execute the action for the current step, then advance
    executeAction(step).then(async () => {
      if (!isActive.value || !driverInstance) return

      const nextIndex = currentStepIndex.value + 1
      if (nextIndex >= steps.value.length) {
        stop()
        return
      }

      // Handle navigation for the next step
      const nextStep = steps.value[nextIndex]
      if (nextStep) await navigateToStep(nextStep)

      driverInstance?.moveNext()
    })
  }

  function prev() {
    if (!isActive.value || !driverInstance) return
    stopSpeech()
    clearTimers()
    driverInstance.movePrevious()
  }

  function setMode(newMode: 'auto' | 'manual') {
    mode.value = newMode
    if (newMode === 'auto') {
      // Restart auto-advance from current step
      const step = currentStep.value
      if (step && driverInstance) {
        const speechText = `${step.title}. ${step.description}`
        const speechPromise = speak(step.id, speechText)

        autoTimer = setTimeout(async () => {
          await speechPromise
          if (!isActive.value || mode.value !== 'auto') return
          await executeAction(step)
          if (!isActive.value) return

          const nextIndex = currentStepIndex.value + 1
          if (nextIndex >= steps.value.length) {
            stop()
            return
          }

          const nextStep = steps.value[nextIndex]
          if (nextStep) await navigateToStep(nextStep)

          driverInstance?.moveNext()
        }, step.delay)
      }
    } else {
      clearTimers()
    }
  }

  return {
    availableTourIds,
    isActive,
    mode,
    currentStepIndex,
    currentStep,
    steps,
    cursorX,
    cursorY,
    clicking,
    speechEnabled,
    speaking,
    start,
    stop,
    next,
    prev,
    setMode,
    toggleSpeech,
    onCursorMoveComplete,
    onClickAnimComplete,
  }
}
