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
  let attrs = `vocab="${props.vocab.slug}"`

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

  return `<script src="${props.baseUrl}/web-components/prez-vocab.min.js" type="module"><\/script>

<prez-list ${attrs}></prez-list>`
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

  return `<!DOCTYPE html>
<html>
<head>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: system-ui, sans-serif;
      padding: 1rem;
      margin: 0;
      background: white;
    }
    prez-list {
      width: 100%;
      max-width: 100%;
    }
  </style>
  <script src="${props.baseUrl}/web-components/prez-vocab.min.js" type="module"><\/script>
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
    const doc = iframeRef.value.contentDocument
    if (doc) {
      const html = generateIframeHtml(editableCode.value)
      doc.open()
      doc.write(html)
      doc.close()

      setTimeout(() => {
        iframeRef.value?.contentWindow?.postMessage({ type: 'parent-ready' }, '*')
      }, 100)
    }
  }
}

// Update iframe when editable code changes
watch(editableCode, () => {
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
      <div class="bg-white border-l border-gray-300 dark:border-gray-600">
        <div class="text-xs text-gray-500 px-3 py-2 border-b border-gray-200 bg-gray-50">
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
