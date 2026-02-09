<script setup lang="ts">
import type { VocabExport } from '~/composables/useShare'

interface InitialOptions {
  type?: 'select' | 'dropdown' | 'radio' | 'table'
  search?: boolean
  [key: string]: unknown
}

const props = withDefaults(defineProps<{
  component: 'list'
  vocab: VocabExport
  baseUrl: string
  initialOptions?: InitialOptions
}>(), {
  initialOptions: () => ({})
})

// Get current color mode from Nuxt UI
const colorMode = useColorMode()

// Type options for prez-list component
const typeOptions = ['select', 'dropdown', 'radio', 'table'] as const

// Fields for table mode
const fieldsValue = ref('')

// Attribute definitions - these become toggle chips
const attributeDefinitions = [
  { name: 'flat', label: 'Flat', description: 'Render as flat list instead of tree' },
  { name: 'search', label: 'Search', description: 'Show search/filter input' },
  { name: 'multiple', label: 'Multiple', description: 'Allow multiple selections', showWhen: () => selectedType.value !== 'radio' },
  { name: 'horizontal', label: 'Horizontal', description: 'Horizontal layout (radio type only)', showWhen: () => selectedType.value === 'radio' },
  { name: 'show-count', label: 'Counts', description: 'Show descendant counts', showWhen: () => selectedType.value === 'select' && !attrValues['flat'] },
  { name: 'show-description', label: 'Descriptions', description: 'Show concept definitions', showWhen: () => selectedType.value !== 'table' }
]

const attributes = computed(() => {
  return attributeDefinitions.filter(attr => !attr.showWhen || attr.showWhen())
})

// Reactive attribute values (all booleans for simplicity)
const attrValues = reactive<Record<string, boolean>>({})

// Initialize type from initial options or default
const selectedType = ref<'select' | 'dropdown' | 'radio' | 'table'>(
  props.initialOptions?.type || 'select'
)

// Initialize with defaults when component changes
watch(() => props.component, () => {
  // Reset all attribute values
  Object.keys(attrValues).forEach(key => {
    attrValues[key] = false
  })
  // Reset fields when switching away from table
  if (selectedType.value !== 'table') {
    fieldsValue.value = ''
  }
})

// Reset attribute values when type changes (but not on initial load)
watch(selectedType, (newType, oldType) => {
  if (oldType !== undefined) {
    Object.keys(attrValues).forEach(key => {
      attrValues[key] = false
    })
  }
  if (newType !== 'table') {
    fieldsValue.value = ''
  }
})

// Apply initial options on mount
onMounted(() => {
  if (props.initialOptions?.search) {
    attrValues['search'] = true
  }
})

// SPARQL mode
const sparqlMode = ref(false)
const sparqlEndpoint = ref('https://api.data.kurrawong.ai/sparql')
const sparqlVocabIri = ref('https://linked.data.gov.au/def/fsdf/themes')
const sparqlNamedGraph = ref('')
const sparqlTimeout = ref('')
const sparqlLabelPredicates = ref('')
const sparqlDescriptionPredicates = ref('')
const showSparqlPanel = ref(false)
// Whether the SPARQL config has been applied to the preview
const sparqlConnected = ref(false)
// Whether SPARQL fields changed since last connect
const sparqlDirty = ref(false)

function toggleSparqlMode() {
  sparqlMode.value = !sparqlMode.value
  sparqlConnected.value = false
  sparqlDirty.value = false
  isCodeEdited.value = false
}

function onSparqlFieldInput() {
  sparqlDirty.value = true
  // Update code editor but NOT the iframe preview
  isCodeEdited.value = false
}

const sparqlCanConnect = computed(() => {
  return sparqlEndpoint.value && sparqlVocabIri.value
})

function connectSparql() {
  if (!sparqlCanConnect.value) return
  sparqlConnected.value = true
  sparqlDirty.value = false
  isCodeEdited.value = false
  // Force iframe refresh with current code
  nextTick(() => updateIframe())
}

// Style customization
const showStylePanel = ref(false)
const customStyles = reactive<Record<string, string>>({
  '--prez-bg': '',
  '--prez-text': '',
  '--prez-border': '',
  '--prez-primary': '',
  '--prez-selected-bg': '',
  '--prez-hover-bg': ''
})

const hasCustomStyles = computed(() => {
  return Object.values(customStyles).some(v => v !== '')
})

function resetStyles() {
  Object.keys(customStyles).forEach(key => {
    customStyles[key] = ''
  })
}

const styleString = computed(() => {
  const styles = Object.entries(customStyles)
    .filter(([_, value]) => value !== '')
    .map(([key, value]) => `${key}: ${value}`)
    .join('; ')
  return styles ? ` style="${styles}"` : ''
})

// Color presets
const presets = [
  {
    name: 'Ocean Blue',
    colors: {
      '--prez-bg': '#0c4a6e',
      '--prez-text': '#e0f2fe',
      '--prez-border': '#0369a1',
      '--prez-primary': '#38bdf8',
      '--prez-selected-bg': '#0284c7',
      '--prez-hover-bg': '#075985'
    }
  },
  {
    name: 'Forest Green',
    colors: {
      '--prez-bg': '#14532d',
      '--prez-text': '#dcfce7',
      '--prez-border': '#166534',
      '--prez-primary': '#4ade80',
      '--prez-selected-bg': '#16a34a',
      '--prez-hover-bg': '#15803d'
    }
  },
  {
    name: 'Purple Haze',
    colors: {
      '--prez-bg': '#581c87',
      '--prez-text': '#f3e8ff',
      '--prez-border': '#7e22ce',
      '--prez-primary': '#c084fc',
      '--prez-selected-bg': '#9333ea',
      '--prez-hover-bg': '#6b21a8'
    }
  },
  {
    name: 'Sunset Orange',
    colors: {
      '--prez-bg': '#7c2d12',
      '--prez-text': '#fed7aa',
      '--prez-border': '#9a3412',
      '--prez-primary': '#fb923c',
      '--prez-selected-bg': '#ea580c',
      '--prez-hover-bg': '#c2410c'
    }
  },
  {
    name: 'Slate Gray',
    colors: {
      '--prez-bg': '#1e293b',
      '--prez-text': '#f1f5f9',
      '--prez-border': '#475569',
      '--prez-primary': '#94a3b8',
      '--prez-selected-bg': '#334155',
      '--prez-hover-bg': '#475569'
    }
  },
  {
    name: 'Rose Pink',
    colors: {
      '--prez-bg': '#881337',
      '--prez-text': '#ffe4e6',
      '--prez-border': '#9f1239',
      '--prez-primary': '#fb7185',
      '--prez-selected-bg': '#e11d48',
      '--prez-hover-bg': '#be123c'
    }
  }
]

function applyPreset(preset: typeof presets[0]) {
  Object.entries(preset.colors).forEach(([key, value]) => {
    customStyles[key] = value
  })
}

// Set example fields for table mode
function setExampleFields() {
  fieldsValue.value = 'iri,label,description'
  isCodeEdited.value = false
}

function clearFields() {
  fieldsValue.value = ''
  isCodeEdited.value = false
}

// Event log - compact format
const eventLog = ref<Array<{ time: string; event: string; detail: string }>>([])
const eventCount = ref(0)
const maxEvents = 10
const showEventLog = ref(false)

function addEvent(event: string, detail: unknown) {
  const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const detailStr = JSON.stringify(detail, null, 2)
  eventLog.value.unshift({ time, event, detail: detailStr })
  eventCount.value++
  if (eventLog.value.length > maxEvents) {
    eventLog.value.pop()
  }
}

function clearEvents() {
  eventLog.value = []
  eventCount.value = 0
}

// Generate the component HTML with script tag - complete working example
const componentHtml = computed(() => {
  let attrs: string

  if (sparqlMode.value) {
    // SPARQL mode attributes
    attrs = `sparql-endpoint="${sparqlEndpoint.value || 'https://your-endpoint/sparql'}"\n           vocab-iri="${sparqlVocabIri.value || 'https://example.org/vocab/your-scheme'}"`
    if (sparqlNamedGraph.value) {
      attrs += `\n           named-graph="${sparqlNamedGraph.value}"`
    }
    if (sparqlTimeout.value && sparqlTimeout.value !== '10000') {
      attrs += `\n           timeout="${sparqlTimeout.value}"`
    }
    if (sparqlLabelPredicates.value) {
      attrs += `\n           label-predicates="${sparqlLabelPredicates.value}"`
    }
    if (sparqlDescriptionPredicates.value) {
      attrs += `\n           description-predicates="${sparqlDescriptionPredicates.value}"`
    }
  } else {
    // Static JSON mode attributes
    attrs = `vocab="${props.vocab.slug}" base-url="${props.baseUrl}"`
  }

  // Add theme attribute to match prez-lite's current color mode
  if (colorMode.value !== 'auto') {
    attrs += ` theme="${colorMode.value}"`
  }

  // Add type attribute (only if not default 'select')
  if (selectedType.value !== 'select') {
    attrs += ` type="${selectedType.value}"`
  }

  // Add fields attribute for table mode
  if (selectedType.value === 'table' && fieldsValue.value) {
    attrs += ` fields="${fieldsValue.value}"`
  }

  for (const attr of attributes.value) {
    if (attrValues[attr.name]) {
      attrs += ` ${attr.name}`
    }
  }

  return `<script src="${props.baseUrl}/web-components/prez-lite.min.js" type="module"><\/script>

<prez-list ${attrs}${styleString.value}></prez-list>`
})

// Editable code state
const editableCode = ref('')
const isCodeEdited = ref(false)

// Sync editable code when attributes change (if not manually edited)
watch(componentHtml, (newHtml) => {
  if (!isCodeEdited.value) {
    editableCode.value = newHtml
  }
}, { immediate: true })

function handleCodeInput(e: Event) {
  editableCode.value = (e.target as HTMLTextAreaElement).value
  isCodeEdited.value = true
}

function resetCode() {
  editableCode.value = componentHtml.value
  isCodeEdited.value = false
}

// Extract just the component tag from editable code for iframe
function extractComponentCode(code: string): string {
  // Remove script tags, keep just the component
  return code.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '').trim()
}

// Generate full iframe HTML from the component code
function generateIframeHtml(code: string): string {
  const componentCode = extractComponentCode(code)
  const eventNames = "['prez-change', 'prez-load', 'prez-error', 'prez-expand', 'prez-filter']"

  // Determine iframe background based on color mode
  const bgColor = colorMode.value === 'dark' ? '#1f2937' : 'white'

  return `<!DOCTYPE html>
<html>
<head>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: system-ui, sans-serif;
      padding: 1rem;
      margin: 0;
      background: ${bgColor};
      color: ${colorMode.value === 'dark' ? '#f3f4f6' : '#374151'};
    }
    prez-list {
      width: 100%;
      max-width: 100%;
    }
  </style>
  <script src="${props.baseUrl}/web-components/prez-lite.min.js?v=${Date.now()}" type="module"><\/script>
</head>
<body>
  ${componentCode}
  <script type="module">
    let parentReady = false;
    const eventQueue = [];

    window.addEventListener('message', (e) => {
      if (e.data?.type === 'parent-ready') {
        parentReady = true;
        eventQueue.forEach(msg => window.parent.postMessage(msg, '*'));
        eventQueue.length = 0;
      }
    });

    function emitEvent(name, detail) {
      const msg = { type: 'prez-event', event: name, detail };
      if (parentReady) {
        window.parent.postMessage(msg, '*');
      } else {
        eventQueue.push(msg);
      }
    }

    // Wait for custom elements to be defined, then attach listeners
    const eventNames = ${eventNames};
    const tagName = 'prez-list';

    customElements.whenDefined(tagName).then(() => {
      const el = document.querySelector(tagName);
      if (el) {
        eventNames.forEach(eventName => {
          el.addEventListener(eventName, (e) => {
            emitEvent(eventName, e.detail);
          });
        });
      }
    });
  <\/script>
</body>
</html>`
}

const iframeRef = ref<HTMLIFrameElement>()

// Handle messages from iframe
onMounted(() => {
  window.addEventListener('message', (e) => {
    if (e.data?.type === 'prez-event') {
      addEvent(e.data.event, e.data.detail)
    }
  })
})

function updateIframe() {
  if (iframeRef.value) {
    const html = generateIframeHtml(editableCode.value)
    iframeRef.value.srcdoc = html
    iframeRef.value.onload = () => {
      iframeRef.value?.contentWindow?.postMessage({ type: 'parent-ready' }, '*')
    }
  }
}

// Update iframe when editable code changes
// In SPARQL mode, only update when connected (user clicked Connect)
watch(editableCode, () => {
  if (sparqlMode.value && !sparqlConnected.value) return
  updateIframe()
}, { flush: 'post' })

onMounted(() => {
  setTimeout(() => {
    updateIframe()
  }, 100)
})

async function copyCode() {
  await navigator.clipboard.writeText(editableCode.value)
}

// Toggle an attribute
function toggleAttr(name: string) {
  attrValues[name] = !attrValues[name]
  // Reset edited state so code syncs
  isCodeEdited.value = false
}
</script>

<template>
  <div class="space-y-4">
    <!-- Type selector + Attribute Toggles -->
    <div class="flex flex-wrap items-center gap-2">
      <!-- Type selector for select component -->
      <template v-if="component === 'list'">
        <span class="text-sm text-gray-600 dark:text-gray-400 mr-1">Type:</span>
        <button
          v-for="t in typeOptions"
          :key="t"
          :class="[
            'px-3 py-1.5 text-sm rounded-full border transition-colors capitalize',
            selectedType === t
              ? 'bg-primary text-white border-primary'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-gray-400'
          ]"
          @click="selectedType = t; isCodeEdited = false"
        >
          {{ t }}
        </button>
        <span class="text-gray-300 dark:text-gray-600 mx-1">|</span>
      </template>

      <span class="text-sm text-gray-600 dark:text-gray-400 mr-1">Options:</span>
      <button
        v-for="attr in attributes"
        :key="attr.name"
        :class="[
          'px-3 py-1.5 text-sm rounded-full border transition-colors',
          attrValues[attr.name]
            ? 'bg-blue-600 text-white border-blue-600'
            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-gray-400'
        ]"
        :title="attr.description"
        @click="toggleAttr(attr.name)"
      >
        {{ attr.label }}
      </button>

      <!-- Fields button for table mode -->
      <template v-if="component === 'list' && selectedType === 'table'">
        <span class="text-gray-300 dark:text-gray-600 mx-1">|</span>
        <button
          :class="[
            'px-3 py-1.5 text-sm rounded-full border transition-colors',
            fieldsValue
              ? 'bg-purple-600 text-white border-purple-600'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-gray-400'
          ]"
          title="Example: iri, label, description. Available: iri, label, notation, description, altLabels, broader, narrower"
          @click="fieldsValue ? clearFields() : setExampleFields()"
        >
          Fields
        </button>
      </template>
      <div class="flex-1" />
      <button
        :class="[
          'px-3 py-1.5 text-sm rounded-full border transition-colors flex items-center gap-1.5',
          showStylePanel
            ? 'bg-blue-600 text-white border-blue-600'
            : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-400'
        ]"
        @click="showStylePanel = !showStylePanel"
      >
        <span class="size-2 rounded-full" :class="hasCustomStyles ? 'bg-blue-500' : 'bg-gray-400'" />
        <span>Styles</span>
        <span v-if="hasCustomStyles" class="text-xs opacity-70">(custom)</span>
      </button>
      <button
        :class="[
          'px-3 py-1.5 text-sm rounded-full border transition-colors flex items-center gap-1.5',
          sparqlMode
            ? 'bg-emerald-600 text-white border-emerald-600'
            : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-400'
        ]"
        title="Toggle SPARQL endpoint mode"
        @click="toggleSparqlMode"
      >
        <span class="size-2 rounded-full" :class="sparqlMode ? 'bg-white' : 'bg-gray-400'" />
        <span>SPARQL</span>
      </button>
      <button
        :class="[
          'px-3 py-1.5 text-sm rounded-full border transition-colors flex items-center gap-1.5',
          showEventLog
            ? 'bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
            : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-400'
        ]"
        @click="showEventLog = !showEventLog"
      >
        <span class="size-2 rounded-full" :class="eventCount ? 'bg-green-500' : 'bg-gray-400'" />
        <span>Events</span>
        <span v-if="eventCount" class="text-xs opacity-70">({{ eventCount }})</span>
      </button>
    </div>

    <!-- SPARQL Configuration Panel -->
    <Transition name="slide">
      <div v-if="sparqlMode" class="border border-emerald-300 dark:border-emerald-700 rounded-lg overflow-hidden">
        <div class="flex items-center justify-between px-3 py-2 bg-emerald-50 dark:bg-emerald-900/30 border-b border-emerald-200 dark:border-emerald-800">
          <span class="text-sm font-medium text-emerald-800 dark:text-emerald-300">SPARQL Endpoint Configuration</span>
          <button
            class="text-xs px-2 py-1 rounded text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
            @click="showSparqlPanel = !showSparqlPanel"
          >
            {{ showSparqlPanel ? 'Hide options' : 'Show options' }}
          </button>
        </div>
        <div class="p-3 bg-white dark:bg-gray-900 space-y-3">
          <!-- Required fields -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Endpoint URL <span class="text-red-500">*</span>
              </label>
              <input
                v-model="sparqlEndpoint"
                type="url"
                placeholder="https://vocabs.example.org/sparql"
                class="w-full text-sm px-2.5 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                @input="onSparqlFieldInput"
              />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                ConceptScheme IRI <span class="text-red-500">*</span>
              </label>
              <input
                v-model="sparqlVocabIri"
                type="url"
                placeholder="https://example.org/vocab/your-scheme"
                class="w-full text-sm px-2.5 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                @input="onSparqlFieldInput"
              />
            </div>
          </div>
          <!-- Connect button -->
          <div class="flex items-center gap-3">
            <button
              :disabled="!sparqlCanConnect"
              :class="[
                'px-4 py-1.5 text-sm font-medium rounded transition-colors',
                sparqlCanConnect
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
              ]"
              @click="connectSparql"
            >
              {{ sparqlConnected && !sparqlDirty ? 'Reconnect' : 'Connect' }}
            </button>
            <span v-if="sparqlConnected && !sparqlDirty" class="text-xs text-emerald-600 dark:text-emerald-400">Connected</span>
            <span v-else-if="sparqlDirty" class="text-xs text-amber-600 dark:text-amber-400">Config changed — click Connect to apply</span>
            <span v-else-if="!sparqlCanConnect" class="text-xs text-gray-400">Enter endpoint URL and scheme IRI</span>
          </div>
          <!-- Optional fields (collapsible) -->
          <Transition name="slide">
            <div v-if="showSparqlPanel" class="space-y-3 pt-2 border-t border-gray-200 dark:border-gray-700">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Named Graph <span class="text-gray-400">(optional)</span>
                  </label>
                  <input
                    v-model="sparqlNamedGraph"
                    type="url"
                    placeholder="https://example.org/graph/vocabs"
                    class="w-full text-sm px-2.5 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    @input="onSparqlFieldInput"
                  />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Timeout (ms) <span class="text-gray-400">(default: 10000)</span>
                  </label>
                  <input
                    v-model="sparqlTimeout"
                    type="number"
                    placeholder="10000"
                    class="w-full text-sm px-2.5 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    @input="onSparqlFieldInput"
                  />
                </div>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Label Predicates <span class="text-gray-400">(default: skos:prefLabel,dcterms:title,rdfs:label)</span>
                  </label>
                  <input
                    v-model="sparqlLabelPredicates"
                    type="text"
                    placeholder="skos:prefLabel,dcterms:title,rdfs:label"
                    class="w-full text-sm px-2.5 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    @input="onSparqlFieldInput"
                  />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description Predicates <span class="text-gray-400">(default: skos:definition,dcterms:description)</span>
                  </label>
                  <input
                    v-model="sparqlDescriptionPredicates"
                    type="text"
                    placeholder="skos:definition,dcterms:description"
                    class="w-full text-sm px-2.5 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    @input="onSparqlFieldInput"
                  />
                </div>
              </div>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                Use prefixed names (skos:, dcterms:, rdfs:) or full IRIs. The endpoint must support CORS for browser access.
              </p>
            </div>
          </Transition>
        </div>
      </div>
    </Transition>

    <!-- Style Customization Panel -->
    <Transition name="slide">
      <div v-if="showStylePanel" class="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden mb-4">
        <div class="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <span class="text-sm font-medium text-gray-900 dark:text-gray-300">CSS Custom Properties</span>
          <button
            v-if="hasCustomStyles"
            class="text-xs px-2 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white transition-colors"
            @click="resetStyles"
          >
            Reset
          </button>
        </div>

        <!-- Presets -->
        <div class="p-3 bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
          <div class="text-xs font-medium text-gray-900 dark:text-gray-300 mb-2">Quick Presets</div>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="preset in presets"
              :key="preset.name"
              class="px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-300 transition-colors"
              @click="applyPreset(preset)"
            >
              {{ preset.name }}
            </button>
          </div>
          <div class="text-xs text-gray-600 dark:text-gray-400 mt-2">
            ℹ️ Inline styles override theme-based dark mode. Custom styles apply in both light/dark modes.
          </div>
        </div>

        <!-- Color Pickers -->
        <div class="p-4 bg-white dark:bg-gray-900 grid grid-cols-2 md:grid-cols-3 gap-4">
          <div v-for="(value, key) in customStyles" :key="key">
            <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              {{ key }}
            </label>
            <input
              v-model="customStyles[key]"
              type="color"
              class="w-full h-8 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
            />
            <input
              v-model="customStyles[key]"
              type="text"
              placeholder="e.g. #3b82f6"
              class="mt-1 w-full text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
          </div>
        </div>
      </div>
    </Transition>

    <!-- Main Panel: Code + Preview side by side -->
    <div class="grid md:grid-cols-2 gap-0 border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
      <!-- Code Editor -->
      <div class="bg-gray-900 relative">
        <div class="absolute top-2 right-2 flex gap-1 z-10">
          <button
            v-if="isCodeEdited"
            class="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded"
            @click="resetCode"
          >
            Reset
          </button>
          <button
            class="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded"
            @click="copyCode"
          >
            Copy
          </button>
        </div>
        <textarea
          :value="editableCode"
          @input="handleCodeInput"
          class="w-full h-48 md:h-72 font-mono text-sm bg-transparent text-gray-100 p-4 pt-10 border-0 resize-none focus:outline-none focus:ring-0"
          spellcheck="false"
          placeholder="Edit component HTML..."
        />
        <div v-if="isCodeEdited" class="absolute bottom-2 left-4 text-xs text-gray-500">
          edited
        </div>
      </div>

      <!-- Live Preview -->
      <div class="bg-white dark:bg-gray-900 border-l border-gray-300 dark:border-gray-600">
        <div class="text-xs text-gray-500 dark:text-gray-400 px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          Preview
        </div>
        <iframe
          ref="iframeRef"
          title="Component Preview"
          class="w-full h-40 md:h-64"
          style="border: none;"
          sandbox="allow-scripts allow-same-origin"
        />
      </div>
    </div>

    <!-- Event Log (collapsible) -->
    <Transition name="slide">
      <div v-if="showEventLog" class="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
        <div class="flex items-center justify-between px-3 py-2 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Event Log</span>
          <button
            v-if="eventLog.length"
            class="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            @click="clearEvents"
          >
            Clear
          </button>
        </div>
        <div class="max-h-48 overflow-y-auto font-mono text-xs bg-white dark:bg-gray-900">
          <div v-if="eventLog.length === 0" class="text-gray-400 text-center py-6">
            Interact with the component to see events
          </div>
          <div
            v-for="(entry, i) in eventLog"
            :key="i"
            class="border-b border-gray-100 dark:border-gray-800 last:border-0 px-3 py-2"
          >
            <div class="flex items-center gap-2">
              <span class="text-gray-400">{{ entry.time }}</span>
              <span
                :class="[
                  'px-1.5 py-0.5 rounded text-xs font-medium',
                  entry.event === 'prez-error' ? 'bg-red-100 text-red-700' :
                  entry.event === 'prez-load' ? 'bg-green-100 text-green-700' :
                  'bg-blue-100 text-blue-700'
                ]"
              >
                {{ entry.event }}
              </span>
            </div>
            <pre class="text-gray-500 mt-1 overflow-x-auto whitespace-pre-wrap text-xs">{{ entry.detail }}</pre>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.slide-enter-active,
.slide-leave-active {
  transition: all 0.2s ease;
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
