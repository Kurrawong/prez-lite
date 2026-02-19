<script setup lang="ts">
const props = defineProps<{ code: string }>()

const containerRef = ref<HTMLElement | null>(null)
const rendered = ref(false)
const colorMode = useColorMode()

const BLUE_PRIMARY = '#3b82f6'
const BLUE_PRIMARY_DARK = '#60a5fa'

function getMermaidConfig() {
  const isDark = colorMode.value === 'dark'
  return {
    startOnLoad: false,
    securityLevel: 'antiscript' as const,
    theme: 'base' as const,
    themeVariables: {
      darkMode: isDark,
      primaryColor: isDark ? '#334155' : BLUE_PRIMARY,
      primaryTextColor: isDark ? '#e2e8f0' : '#ffffff',
      primaryBorderColor: isDark ? BLUE_PRIMARY_DARK : BLUE_PRIMARY,
      lineColor: isDark ? '#64748b' : '#94a3b8',
      secondaryColor: isDark ? '#334155' : '#f1f5f9',
      tertiaryColor: isDark ? '#0f172a' : '#e2e8f0',
      background: isDark ? '#1e293b' : '#ffffff',
      mainBkg: isDark ? '#334155' : '#ffffff',
      secondBkg: isDark ? '#1e293b' : '#f8fafc',
      border1: isDark ? '#475569' : '#94a3b8',
      border2: isDark ? BLUE_PRIMARY_DARK : '#cbd5e1',
      textColor: isDark ? '#e2e8f0' : '#1e293b',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    },
  }
}

async function renderDiagram() {
  if (!containerRef.value || !props.code) return
  try {
    const mermaid = await import('mermaid')
    mermaid.default.initialize(getMermaidConfig())
    const id = `mermaid-${Math.random().toString(36).substring(2, 11)}`
    const { svg } = await mermaid.default.render(id, props.code)
    if (containerRef.value) {
      containerRef.value.innerHTML = svg
      rendered.value = true
    }
  } catch (e) {
    console.error('Mermaid render error:', e)
  }
}

// Wait for ClientOnly to render the default slot before accessing containerRef
onMounted(async () => {
  await nextTick()
  renderDiagram()
})
watch(() => colorMode.value, () => renderDiagram())
// Re-render if containerRef becomes available after ClientOnly hydration
watch(containerRef, (el) => {
  if (el && !rendered.value) renderDiagram()
})
</script>

<template>
  <ClientOnly>
    <div
      ref="containerRef"
      class="mermaid-diagram flex justify-center my-5 overflow-x-auto"
    />
    <template #fallback>
      <div class="flex justify-center my-5 p-8 bg-muted rounded-lg" aria-label="Diagram loading">
        <div class="h-32 w-64 bg-muted-foreground/10 rounded animate-pulse" />
      </div>
    </template>
  </ClientOnly>
</template>
