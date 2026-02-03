<script setup lang="ts">
import type { VocabExport } from '~/composables/useShare'

const props = defineProps<{
  component: 'select' | 'tree' | 'list' | 'autocomplete'
  vocab: VocabExport
  baseUrl: string
}>()

// Component tag mapping
const componentTags = {
  select: 'prez-vocab-select',
  tree: 'prez-vocab-tree',
  list: 'prez-vocab-list',
  autocomplete: 'prez-vocab-autocomplete'
}

const tag = computed(() => componentTags[props.component])

// Attribute definitions per component
const attributeDefinitions = {
  select: [
    { name: 'multiple', type: 'boolean', default: false, description: 'Allow multiple selections' },
    { name: 'show-iri', type: 'boolean', default: false, description: 'Show IRI in options' },
    { name: 'disabled', type: 'boolean', default: false, description: 'Disable the component' },
    { name: 'placeholder', type: 'string', default: 'Select a concept...', description: 'Placeholder text' }
  ],
  tree: [
    { name: 'expand-all', type: 'boolean', default: false, description: 'Expand all nodes' },
    { name: 'expand-level', type: 'number', default: 1, description: 'Expand to depth (0-3)', min: 0, max: 3 },
    { name: 'selectable', type: 'boolean', default: true, description: 'Allow selection' },
    { name: 'show-count', type: 'boolean', default: false, description: 'Show descendant counts' },
    { name: 'disabled', type: 'boolean', default: false, description: 'Disable the component' }
  ],
  list: [
    { name: 'searchable', type: 'boolean', default: true, description: 'Show search input' },
    { name: 'show-definitions', type: 'boolean', default: false, description: 'Show definitions' },
    { name: 'show-alt-labels', type: 'boolean', default: false, description: 'Show alt labels' },
    { name: 'max-items', type: 'number', default: 0, description: 'Max items (0=all)', min: 0, max: 50 },
    { name: 'disabled', type: 'boolean', default: false, description: 'Disable the component' }
  ],
  autocomplete: [
    { name: 'min-chars', type: 'number', default: 1, description: 'Min chars to search', min: 1, max: 5 },
    { name: 'max-suggestions', type: 'number', default: 10, description: 'Max suggestions', min: 3, max: 20 },
    { name: 'show-definitions', type: 'boolean', default: false, description: 'Show definitions' },
    { name: 'disabled', type: 'boolean', default: false, description: 'Disable the component' },
    { name: 'placeholder', type: 'string', default: 'Type to search...', description: 'Placeholder text' }
  ]
}

const attributes = computed(() => attributeDefinitions[props.component] || [])

// Reactive attribute values
const attrValues = reactive<Record<string, boolean | number | string>>({})

// Initialize with defaults
onMounted(() => {
  for (const attr of attributes.value) {
    attrValues[attr.name] = attr.default
  }
})

// Event log
const eventLog = ref<Array<{ time: string; event: string; detail: string }>>([])
const maxEvents = 20

function addEvent(event: string, detail: unknown) {
  const time = new Date().toLocaleTimeString()
  const detailStr = JSON.stringify(detail, null, 2)
  eventLog.value.unshift({ time, event, detail: detailStr })
  if (eventLog.value.length > maxEvents) {
    eventLog.value.pop()
  }
}

function clearEvents() {
  eventLog.value = []
}

// Generate attributes string for preview
const attrsString = computed(() => {
  const parts: string[] = [`vocab="${props.vocab.slug}"`]
  for (const attr of attributes.value) {
    const value = attrValues[attr.name]
    if (value !== attr.default) {
      if (attr.type === 'boolean' && value) {
        parts.push(attr.name)
      } else if (attr.type !== 'boolean') {
        parts.push(`${attr.name}="${value}"`)
      }
    }
  }
  return parts.join('\n    ')
})

// Generate preview HTML
const previewHtml = computed(() => {
  let attrsHtml = `vocab="${props.vocab.slug}"`
  for (const attr of attributes.value) {
    const value = attrValues[attr.name]
    if (value !== attr.default) {
      if (attr.type === 'boolean' && value) {
        attrsHtml += ` ${attr.name}`
      } else if (attr.type !== 'boolean') {
        attrsHtml += ` ${attr.name}="${value}"`
      }
    }
  }

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
    ${tag.value} {
      width: 100%;
      max-width: 100%;
    }
  </style>
  <script src="${props.baseUrl}/web-components/prez-vocab.min.js" type="module"><\/script>
</head>
<body>
  <${tag.value} ${attrsHtml}></${tag.value}>
  <script>
    const el = document.querySelector('${tag.value}');
    ['prez-change', 'prez-load', 'prez-error'].forEach(eventName => {
      el.addEventListener(eventName, (e) => {
        window.parent.postMessage({
          type: 'prez-event',
          event: eventName,
          detail: e.detail
        }, '*');
      });
    });
  <\/script>
</body>
</html>`
})

const iframeRef = ref<HTMLIFrameElement>()

// Handle messages from iframe
onMounted(() => {
  window.addEventListener('message', (e) => {
    if (e.data?.type === 'prez-event') {
      addEvent(e.data.event, e.data.detail)
    }
  })
})

// Update iframe when preview changes
watch(previewHtml, () => {
  if (iframeRef.value) {
    const doc = iframeRef.value.contentDocument
    if (doc) {
      doc.open()
      doc.write(previewHtml.value)
      doc.close()
    }
  }
}, { flush: 'post' })

onMounted(() => {
  // Small delay to ensure attributes are initialized
  setTimeout(() => {
    if (iframeRef.value) {
      const doc = iframeRef.value.contentDocument
      if (doc) {
        doc.open()
        doc.write(previewHtml.value)
        doc.close()
      }
    }
  }, 100)
})

// Code display
const codeExample = computed(() => {
  return `<${tag.value}
    ${attrsString.value}
></${tag.value}>`
})

async function copyCode() {
  await navigator.clipboard.writeText(codeExample.value)
}
</script>

<template>
  <div class="grid lg:grid-cols-2 gap-6">
    <!-- Left: Controls & Code -->
    <div class="space-y-6">
      <!-- Attribute Controls -->
      <UCard>
        <template #header>
          <h3 class="font-semibold">Attributes</h3>
        </template>

        <div class="space-y-4">
          <div v-for="attr in attributes" :key="attr.name" class="flex items-center justify-between gap-4">
            <div class="flex-1 min-w-0">
              <label class="text-sm font-medium">{{ attr.name }}</label>
              <p class="text-xs text-muted truncate">{{ attr.description }}</p>
            </div>
            <div class="flex-shrink-0">
              <UCheckbox
                v-if="attr.type === 'boolean'"
                v-model="attrValues[attr.name]"
              />
              <UInput
                v-else-if="attr.type === 'number'"
                v-model.number="attrValues[attr.name]"
                type="number"
                :min="attr.min"
                :max="attr.max"
                class="w-20"
                size="sm"
              />
              <UInput
                v-else
                v-model="attrValues[attr.name]"
                class="w-40"
                size="sm"
              />
            </div>
          </div>
        </div>
      </UCard>

      <!-- Generated Code -->
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="font-semibold">Code</h3>
            <UButton
              icon="i-heroicons-clipboard"
              size="xs"
              variant="ghost"
              @click="copyCode"
            >
              Copy
            </UButton>
          </div>
        </template>

        <pre class="bg-gray-900 text-gray-100 rounded-lg p-4 text-sm overflow-x-auto"><code>{{ codeExample }}</code></pre>
      </UCard>
    </div>

    <!-- Right: Preview & Events -->
    <div class="space-y-6">
      <!-- Live Preview -->
      <UCard>
        <template #header>
          <h3 class="font-semibold">Live Preview</h3>
        </template>

        <div class="border border-gray-200 rounded-lg overflow-hidden bg-white">
          <iframe
            ref="iframeRef"
            title="Component Preview"
            class="w-full"
            :style="{ height: component === 'tree' || component === 'list' ? '320px' : '200px' }"
            style="border: none;"
            sandbox="allow-scripts allow-same-origin"
          />
        </div>
      </UCard>

      <!-- Event Log -->
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="font-semibold">Events</h3>
            <UButton
              v-if="eventLog.length"
              size="xs"
              variant="ghost"
              @click="clearEvents"
            >
              Clear
            </UButton>
          </div>
        </template>

        <div class="h-48 overflow-y-auto font-mono text-xs">
          <div v-if="eventLog.length === 0" class="text-muted text-center py-8">
            Interact with the component to see events
          </div>
          <div
            v-for="(entry, i) in eventLog"
            :key="i"
            class="border-b border-gray-100 py-2 last:border-0"
          >
            <div class="flex items-center gap-2 mb-1">
              <span class="text-muted">{{ entry.time }}</span>
              <UBadge
                :color="entry.event === 'prez-error' ? 'error' : entry.event === 'prez-load' ? 'success' : 'primary'"
                size="xs"
              >
                {{ entry.event }}
              </UBadge>
            </div>
            <pre class="text-xs text-muted overflow-x-auto whitespace-pre-wrap">{{ entry.detail }}</pre>
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>
