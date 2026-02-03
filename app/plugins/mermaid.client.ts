import { nextTick, watch } from 'vue'

/** Blue theme colours aligned with app primary (Tailwind blue) */
const BLUE_PRIMARY = '#3b82f6'
const BLUE_PRIMARY_DARK = '#60a5fa'
const TEXT_LIGHT = '#e2e8f0'
const TEXT_DARK = '#1e293b'
const LINE_LIGHT = '#94a3b8'
const LINE_DARK = '#64748b'
const BG_LIGHT = '#ffffff'
const BG_DARK = '#1e293b'

export default defineNuxtPlugin(() => {
  const colorMode = useColorMode()

  const getMermaidConfig = () => {
    const isDark = colorMode.value === 'dark'
    return {
      startOnLoad: false,
      securityLevel: 'loose',
      theme: 'base',
      themeVariables: {
        darkMode: isDark,
        primaryColor: isDark ? BLUE_PRIMARY_DARK : BLUE_PRIMARY,
        primaryTextColor: isDark ? TEXT_LIGHT : TEXT_DARK,
        primaryBorderColor: isDark ? BLUE_PRIMARY_DARK : BLUE_PRIMARY,
        lineColor: isDark ? LINE_DARK : LINE_LIGHT,
        secondaryColor: isDark ? '#334155' : '#f1f5f9',
        tertiaryColor: isDark ? '#0f172a' : '#e2e8f0',
        background: isDark ? BG_DARK : BG_LIGHT,
        mainBkg: isDark ? BG_DARK : BG_LIGHT,
        secondBkg: isDark ? '#334155' : '#f8fafc',
        border1: isDark ? LINE_DARK : LINE_LIGHT,
        border2: isDark ? '#475569' : '#cbd5e1',
        textColor: isDark ? TEXT_LIGHT : TEXT_DARK,
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      },
    }
  }

  const renderMermaid = async () => {
    const mermaidBlocks = document.querySelectorAll('pre.language-mermaid, pre[class*="language-mermaid"]')

    if (mermaidBlocks.length === 0) return

    let mermaid
    try {
      mermaid = await import('mermaid')
    } catch {
      // mermaid is an optional dependency - diagrams won't render without it
      console.info('[prez-lite] mermaid not installed - diagram rendering disabled. Install mermaid to enable.')
      return
    }
    mermaid.default.initialize(getMermaidConfig())

    for (const block of mermaidBlocks) {
      try {
        // Get the code content
        const codeEl = block.querySelector('code')
        if (!codeEl) continue

        // Extract text content, removing any HTML tags
        const code = codeEl.textContent?.trim()
        if (!code) continue

        // Create a container for the diagram (store code for re-render on theme change)
        const container = document.createElement('div')
        container.className = 'mermaid-diagram flex justify-center my-5 overflow-x-auto'
        try {
          container.setAttribute('data-mermaid-code', btoa(unescape(encodeURIComponent(code))))
        } catch {
          container.setAttribute('data-mermaid-code', code)
        }

        // Render the diagram
        const id = `mermaid-${Math.random().toString(36).substring(2, 11)}`
        const { svg } = await mermaid.default.render(id, code)
        container.innerHTML = svg

        // Replace the pre block with the rendered diagram
        block.parentNode?.replaceChild(container, block)
      } catch (e) {
        console.error('Mermaid render error:', e)
      }
    }
  }

  /** Re-render existing diagrams when theme changes (e.g. dark/light toggle). */
  const reRenderExistingDiagrams = async () => {
    const containers = document.querySelectorAll<HTMLElement>('.mermaid-diagram[data-mermaid-code]')
    if (containers.length === 0) return
    let mermaid
    try {
      mermaid = await import('mermaid')
    } catch {
      return
    }
    mermaid.default.initialize(getMermaidConfig())
    for (const container of containers) {
      const encoded = container.getAttribute('data-mermaid-code')
      if (!encoded) continue
      try {
        const code = decodeURIComponent(escape(atob(encoded)))
        const id = `mermaid-${Math.random().toString(36).substring(2, 11)}`
        const { svg } = await mermaid.default.render(id, code)
        container.innerHTML = svg
      } catch (e) {
        const code = encoded
        const id = `mermaid-${Math.random().toString(36).substring(2, 11)}`
        const { svg } = await mermaid.default.render(id, code)
        container.innerHTML = svg
      }
    }
  }

  /** Run render when mermaid blocks appear (e.g. after async content loads). Disconnects after first run or timeout. */
  function scheduleRenderOnMermaidBlocks(timeoutMs = 3000) {
    const runAndDisconnect = () => {
      renderMermaid()
      observer.disconnect()
      clearTimeout(timeoutId)
    }

    const observer = new MutationObserver(() => {
      const hasBlocks = document.querySelector('pre.language-mermaid, pre[class*="language-mermaid"]')
      if (hasBlocks) runAndDisconnect()
    })

    const timeoutId = setTimeout(() => {
      observer.disconnect()
      renderMermaid()
    }, timeoutMs)

    observer.observe(document.body, { childList: true, subtree: true })
    // Run once after Vue flush in case blocks are already in DOM (e.g. cached page)
    nextTick(() => {
      const hasBlocks = document.querySelector('pre.language-mermaid, pre[class*="language-mermaid"]')
      if (hasBlocks) runAndDisconnect()
    })
  }

  const router = useRouter()

  if (import.meta.client) {
    // Initial render after hydration
    onNuxtReady(() => {
      scheduleRenderOnMermaidBlocks(3000)
    })

    // On client navigation, DOM isn't ready yet — wait for mermaid blocks to appear
    router.afterEach(() => {
      scheduleRenderOnMermaidBlocks(3000)
    })

    // Re-render diagrams when user toggles dark/light mode
    watch(() => colorMode.value, () => {
      reRenderExistingDiagrams()
    })
  }
})
