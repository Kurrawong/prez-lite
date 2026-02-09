<script setup lang="ts">
import { useShare } from '~/composables/useShare'
import InteractivePreview from '~/components/share/InteractivePreview.vue'

const route = useRoute()
const componentName = computed(() => route.params.component as string)

// Parse initial options from query param
const initialOptions = computed(() => {
  const optionsParam = route.query.options as string | undefined
  if (optionsParam) {
    try {
      return JSON.parse(optionsParam)
    } catch {
      return {}
    }
  }
  return {}
})

const { vocabs, status } = useShare()

// Pick first vocab for demo
const demoVocab = computed(() => vocabs.value[0])

const baseUrl = computed(() => {
  if (typeof window !== 'undefined') {
    return window.location.origin
  }
  return ''
})

// Component metadata
interface ComponentMeta {
  tag: string
  title: string
  description: string
  useCases: string[]
  properties: { name: string; type: string; default: string; description: string }[]
  methods: { name: string; description: string }[]
  cssProperties: { name: string; default: string; description: string }[]
  modes?: { name: string; description: string }[]
  fields?: { name: string; description: string }[]
}

const components: Record<string, ComponentMeta> = {
  list: {
    tag: 'prez-list',
    title: 'List',
    description: 'A unified vocabulary list/selection component supporting multiple display modes: tree, dropdown, radio, and table.',
    useCases: [
      'Form inputs requiring concept selection',
      'Browsing hierarchical vocabularies',
      'Quick search in large vocabularies',
      'Multi-select scenarios',
      'Tabular display of vocabulary data'
    ],
    properties: [
      { name: 'vocab', type: 'string', default: '—', description: 'Vocabulary slug for auto-resolved URL' },
      { name: 'vocab-url', type: 'string', default: '—', description: 'Direct URL to vocabulary JSON (overrides vocab)' },
      { name: 'base-url', type: 'string', default: 'auto', description: 'Base URL for vocab resolution' },
      { name: 'type', type: 'string', default: '"select"', description: 'Display type: select, dropdown, radio, or table' },
      { name: 'value', type: 'string', default: '—', description: 'Selected concept IRI (single mode)' },
      { name: 'values', type: 'string[]', default: '[]', description: 'Selected IRIs as JSON array (multiple mode)' },
      { name: 'flat', type: 'boolean', default: 'false', description: 'Render as flat list instead of tree hierarchy' },
      { name: 'search', type: 'boolean', default: 'false', description: 'Show search/filter input' },
      { name: 'multiple', type: 'boolean', default: 'false', description: 'Enable multiple selection' },
      { name: 'horizontal', type: 'boolean', default: 'false', description: 'Horizontal layout (radio type only)' },
      { name: 'fields', type: 'string', default: '—', description: 'Comma-separated fields for table columns (table type)' },
      { name: 'max-level', type: 'number', default: '1', description: 'Tree expansion depth (-1=all, 0=collapsed)' },
      { name: 'show-count', type: 'boolean', default: 'false', description: 'Show descendant count on parent nodes' },
      { name: 'show-description', type: 'boolean', default: 'false', description: 'Show concept descriptions' },
      { name: 'show-selected', type: 'boolean', default: 'true', description: 'Highlight selected items' },
      { name: 'placeholder', type: 'string', default: '"Select..."', description: 'Placeholder text (dropdown mode)' },
      { name: 'disabled', type: 'boolean', default: 'false', description: 'Disable the component' },
      { name: 'lang', type: 'string', default: '"en"', description: 'Preferred language for labels' },
      { name: 'theme', type: 'string', default: '"auto"', description: 'Color theme: "light", "dark", or "auto" (follows system)' },
      { name: 'sparql-endpoint', type: 'string', default: '—', description: 'SPARQL endpoint URL — enables dynamic SPARQL mode' },
      { name: 'vocab-iri', type: 'string', default: '—', description: 'ConceptScheme IRI (required in SPARQL mode)' },
      { name: 'named-graph', type: 'string', default: '—', description: 'Named graph to query within (optional, SPARQL mode)' },
      { name: 'timeout', type: 'number', default: '10000', description: 'Request timeout in ms (SPARQL mode)' },
      { name: 'label-predicates', type: 'string', default: '"skos:prefLabel,dcterms:title,rdfs:label"', description: 'Comma-separated label predicates for SPARQL resolution' },
      { name: 'description-predicates', type: 'string', default: '"skos:definition,dcterms:description"', description: 'Comma-separated description predicates for SPARQL resolution' }
    ],
    methods: [
      { name: 'loadVocab()', description: 'Manually trigger vocabulary reload' }
    ],
    cssProperties: [
      { name: 'font-family', default: 'system-ui, sans-serif', description: 'Font family inherited into shadow DOM' },
      { name: 'font-size', default: '0.875rem', description: 'Base font size' },
      { name: '--prez-bg', default: 'auto', description: 'Background color (auto-themed)' },
      { name: '--prez-text', default: 'auto', description: 'Primary text color (auto-themed)' },
      { name: '--prez-border', default: 'auto', description: 'Border color (auto-themed)' },
      { name: '--prez-primary', default: 'auto', description: 'Primary brand color (auto-themed)' }
    ],
    modes: [
      { name: 'select (default)', description: 'Tree view with expand/collapse. Best for browsing hierarchical vocabularies.' },
      { name: 'dropdown', description: 'Dropdown button with tree popover. Best for form inputs.' },
      { name: 'radio', description: 'Radio button selection. Best for small vocabularies.' },
      { name: 'table', description: 'Tabular display with configurable columns. Best for data-heavy views.' }
    ],
    fields: [
      { name: 'iri', description: 'Concept IRI' },
      { name: 'label', description: 'Concept preferred label' },
      { name: 'notation', description: 'Concept notation' },
      { name: 'description', description: 'Concept description' },
      { name: 'altLabels', description: 'Alternative labels' },
      { name: 'broader', description: 'Broader concept IRIs' },
      { name: 'narrower', description: 'Narrower concept IRIs' }
    ]
  }
}

const componentData = computed(() => components[componentName.value as keyof typeof components])

// Events depend on component type
const events = computed(() => {
  const common = [
    {
      name: 'prez-load',
      description: 'Fired when vocabulary loads successfully',
      detail: [
        { property: 'vocab', type: 'string', description: 'Vocabulary slug' },
        { property: 'url', type: 'string', description: 'Resolved vocabulary URL' },
        { property: 'conceptCount', type: 'number', description: 'Number of concepts loaded' }
      ]
    },
    {
      name: 'prez-error',
      description: 'Fired when loading fails',
      detail: [
        { property: 'vocab', type: 'string', description: 'Vocabulary slug' },
        { property: 'url', type: 'string', description: 'Attempted URL' },
        { property: 'error', type: 'string', description: 'Error message' }
      ]
    }
  ]

  if (componentName.value === 'list') {
    return [
      {
        name: 'prez-change',
        description: 'Fired when selection changes',
        detail: [
          { property: 'value', type: 'string | string[]', description: 'Selected IRI(s)' },
          { property: 'vocab', type: 'string', description: 'Vocabulary slug' },
          { property: 'concepts', type: 'object | object[]', description: 'Full concept data for selection' }
        ]
      },
      ...common
    ]
  } else {
    return [
      {
        name: 'prez-click',
        description: 'Fired when an item is clicked (requires link attribute)',
        detail: [
          { property: 'iri', type: 'string', description: 'Clicked concept IRI' },
          { property: 'concept', type: 'object', description: 'Full concept data' }
        ]
      },
      ...common
    ]
  }
})

// Framework code examples
const frameworkExamples = computed(() => {
  if (!componentData.value || !demoVocab.value) return []
  const tag = componentData.value.tag
  const vocab = demoVocab.value.slug

  return [
    {
      id: 'html',
      label: 'HTML',
      code: `<script src="${baseUrl.value}/web-components/prez-lite.min.js" type="module"><\/script>

<${tag} vocab="${vocab}"${componentName.value === 'list' ? ' search' : ' searchable'}></${tag}>

<script>
  document.querySelector('${tag}')
    .addEventListener('${componentName.value === 'list' ? 'prez-change' : 'prez-click'}', (e) => {
      console.log('${componentName.value === 'list' ? 'Selected' : 'Clicked'}:', e.detail)
    })
<\/script>`
    },
    {
      id: 'react',
      label: 'React',
      code: `import { useRef, useEffect, useState } from 'react'
import '@prez-lite/web-components'

function VocabComponent() {
  const ref = useRef<HTMLElement>(null)
  const [result, setResult] = useState<string | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const handleEvent = (e: CustomEvent) => {
      setResult(${componentName.value === 'list' ? 'e.detail.value' : 'e.detail.iri'})
    }

    el.addEventListener('${componentName.value === 'list' ? 'prez-change' : 'prez-click'}', handleEvent)
    return () => el.removeEventListener('${componentName.value === 'list' ? 'prez-change' : 'prez-click'}', handleEvent)
  }, [])

  return (
    <>
      <${tag}
        ref={ref}
        vocab="${vocab}"
        ${componentName.value === 'list' ? 'search' : 'searchable link'}
      />
      {result && <p>${componentName.value === 'list' ? 'Selected' : 'Clicked'}: {result}</p>}
    </>
  )
}`
    },
    {
      id: 'vue',
      label: 'Vue',
      code: `<script setup lang="ts">
import { ref, onMounted } from 'vue'
import '@prez-lite/web-components'

const elRef = ref<HTMLElement | null>(null)
const result = ref<string | null>(null)

onMounted(() => {
  elRef.value?.addEventListener('${componentName.value === 'list' ? 'prez-change' : 'prez-click'}', (e: CustomEvent) => {
    result.value = ${componentName.value === 'list' ? 'e.detail.value' : 'e.detail.iri'}
  })
})
<\/script>

<template>
  <${tag}
    ref="elRef"
    vocab="${vocab}"
    ${componentName.value === 'list' ? 'search' : 'searchable link'}
  />
  <p v-if="result">${componentName.value === 'list' ? 'Selected' : 'Clicked'}: {{ result }}</p>
</template>`
    },
    {
      id: 'angular',
      label: 'Angular',
      code: `import { Component, ElementRef, ViewChild, AfterViewInit } from '@angular/core'
import '@prez-lite/web-components'

@Component({
  selector: 'app-vocab-component',
  template: \`
    <${tag}
      #vocabEl
      vocab="${vocab}"
      ${componentName.value === 'list' ? 'search' : 'searchable link'}
    ></${tag}>
    <p *ngIf="result">${componentName.value === 'list' ? 'Selected' : 'Clicked'}: {{ result }}</p>
  \`
})
export class VocabComponent implements AfterViewInit {
  @ViewChild('vocabEl') elRef!: ElementRef

  result: string | null = null

  ngAfterViewInit() {
    this.elRef.nativeElement.addEventListener('${componentName.value === 'list' ? 'prez-change' : 'prez-click'}', (e: CustomEvent) => {
      this.result = ${componentName.value === 'list' ? 'e.detail.value' : 'e.detail.iri'}
    })
  }
}`
    }
  ]
})

const selectedFramework = ref('html')

// Styling examples
const stylingExamples = computed(() => {
  if (!componentData.value) return []
  const tag = componentData.value.tag
  return [
    {
      title: 'Basic Styling',
      description: 'Override inherited CSS properties',
      code: `${tag} {
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  width: 300px;
}`
    },
    {
      title: 'Full Width',
      description: 'Set component to fill container',
      code: `${tag} {
  width: 100%;
  max-width: 400px;
}`
    },
    {
      title: 'Container Styling',
      description: 'Style the containing element',
      code: `.vocab-container {
  padding: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
}

.vocab-container ${tag} {
  width: 100%;
}`
    }
  ]
})

const componentTypes = ['list']
</script>

<template>
  <div class="py-8">
    <!-- Back link -->
    <NuxtLink to="/share" class="inline-flex items-center gap-1 text-sm text-muted hover:text-primary mb-4">
      <UIcon name="i-heroicons-arrow-left" class="size-4" />
      Back to Share
    </NuxtLink>

    <div v-if="!componentData">
      <UAlert
        color="warning"
        icon="i-heroicons-exclamation-triangle"
        title="Component not found"
        :description="`Unknown component: ${componentName}`"
      />
    </div>

    <div v-else>
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold mb-2">{{ componentData.title }} Component</h1>
        <p class="text-lg text-muted mb-4">{{ componentData.description }}</p>
        <code class="text-primary bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-sm">
          &lt;{{ componentData.tag }}&gt;
        </code>
      </div>

      <!-- Interactive Preview -->
      <h2 class="text-xl font-semibold mb-4">Interactive Preview</h2>
      <div v-if="status === 'pending' || !demoVocab" class="mb-8">
        <USkeleton class="h-64 w-full" />
      </div>
      <div v-else class="mb-8">
        <InteractivePreview
          :component="componentName as 'list'"
          :vocab="demoVocab"
          :base-url="baseUrl"
          :initial-options="initialOptions"
        />
      </div>

      <!-- Use Cases -->
      <UCard class="mb-8">
        <template #header>
          <h2 class="text-lg font-semibold">When to Use</h2>
        </template>
        <ul class="list-disc list-inside space-y-1 text-muted">
          <li v-for="useCase in componentData.useCases" :key="useCase">{{ useCase }}</li>
        </ul>
      </UCard>

      <!-- Modes (select only) -->
      <UCard v-if="componentData.modes" class="mb-8">
        <template #header>
          <h2 class="text-lg font-semibold">Display Modes</h2>
        </template>
        <div class="space-y-3">
          <div v-for="mode in componentData.modes" :key="mode.name">
            <div class="font-medium text-sm">{{ mode.name }}</div>
            <div class="text-sm text-muted">{{ mode.description }}</div>
          </div>
        </div>
      </UCard>

      <!-- Available Fields (list only) -->
      <UCard v-if="componentData.fields" class="mb-8">
        <template #header>
          <h2 class="text-lg font-semibold">Available Fields</h2>
        </template>
        <p class="text-sm text-muted mb-3">
          Use the <code class="bg-gray-100 dark:bg-gray-800 px-1 rounded">fields</code> attribute to specify which fields to display (comma-separated).
        </p>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b">
                <th class="text-left py-2 pr-4 font-medium">Field</th>
                <th class="text-left py-2 font-medium">Description</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="field in componentData.fields" :key="field.name" class="border-b border-gray-100">
                <td class="py-2 pr-4">
                  <code class="text-primary text-xs">{{ field.name }}</code>
                </td>
                <td class="py-2 text-muted">{{ field.description }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </UCard>

      <!-- Framework Code Examples -->
      <UCard class="mb-8">
        <template #header>
          <h2 class="text-lg font-semibold">Code Examples</h2>
        </template>

        <div class="flex gap-2 mb-4 flex-wrap">
          <UButton
            v-for="fw in frameworkExamples"
            :key="fw.id"
            :color="selectedFramework === fw.id ? 'primary' : 'neutral'"
            :variant="selectedFramework === fw.id ? 'solid' : 'outline'"
            size="xs"
            @click="selectedFramework = fw.id"
          >
            {{ fw.label }}
          </UButton>
        </div>

        <pre class="bg-gray-900 text-gray-100 rounded-lg p-4 text-xs overflow-x-auto"><code>{{ frameworkExamples.find(f => f.id === selectedFramework)?.code }}</code></pre>

        <div class="mt-4 text-xs text-muted">
          <p v-if="selectedFramework === 'html'">
            Include the script tag in your HTML head or before the component. The component will auto-detect its base URL.
          </p>
          <p v-else-if="selectedFramework === 'react'">
            Install: <code class="bg-gray-100 dark:bg-gray-800 px-1 rounded">npm install @prez-lite/web-components</code>
            <br>Add custom element types to avoid TypeScript errors (see README).
          </p>
          <p v-else-if="selectedFramework === 'vue'">
            Install: <code class="bg-gray-100 dark:bg-gray-800 px-1 rounded">npm install @prez-lite/web-components</code>
            <br>Configure Vite to recognize <code class="bg-gray-100 dark:bg-gray-800 px-1 rounded">prez-*</code> as custom elements.
          </p>
          <p v-else-if="selectedFramework === 'angular'">
            Install: <code class="bg-gray-100 dark:bg-gray-800 px-1 rounded">npm install @prez-lite/web-components</code>
            <br>Add <code class="bg-gray-100 dark:bg-gray-800 px-1 rounded">CUSTOM_ELEMENTS_SCHEMA</code> to your module.
          </p>
        </div>
      </UCard>

      <!-- Properties -->
      <UCard class="mb-8">
        <template #header>
          <h2 class="text-lg font-semibold">Properties</h2>
        </template>

        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b">
                <th class="text-left py-2 pr-4 font-medium">Property</th>
                <th class="text-left py-2 pr-4 font-medium">Type</th>
                <th class="text-left py-2 pr-4 font-medium">Default</th>
                <th class="text-left py-2 font-medium">Description</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="prop in componentData.properties" :key="prop.name" class="border-b border-gray-100">
                <td class="py-2 pr-4">
                  <code class="text-primary text-xs">{{ prop.name }}</code>
                </td>
                <td class="py-2 pr-4">
                  <code class="text-xs text-muted">{{ prop.type }}</code>
                </td>
                <td class="py-2 pr-4">
                  <code class="text-xs">{{ prop.default }}</code>
                </td>
                <td class="py-2 text-muted">{{ prop.description }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </UCard>

      <!-- Methods -->
      <UCard class="mb-8">
        <template #header>
          <h2 class="text-lg font-semibold">Methods</h2>
        </template>

        <div class="space-y-3">
          <div v-for="method in componentData.methods" :key="method.name" class="flex gap-4">
            <code class="text-primary text-sm flex-shrink-0">{{ method.name }}</code>
            <span class="text-muted text-sm">{{ method.description }}</span>
          </div>
        </div>

        <div class="mt-4 text-sm text-muted">
          <p>Access methods via JavaScript:</p>
          <pre class="bg-gray-900 text-gray-100 rounded-lg p-3 mt-2 text-xs overflow-x-auto"><code>const el = document.querySelector('{{ componentData.tag }}');
el.loadVocab(); // Reload vocabulary data</code></pre>
        </div>
      </UCard>

      <!-- Events -->
      <UCard class="mb-8">
        <template #header>
          <h2 class="text-lg font-semibold">Events</h2>
        </template>

        <div class="space-y-6">
          <div v-for="event in events" :key="event.name">
            <div class="flex items-start gap-3 mb-2">
              <UBadge :color="event.name === 'prez-error' ? 'error' : event.name === 'prez-load' ? 'success' : 'primary'">
                {{ event.name }}
              </UBadge>
              <span class="text-sm text-muted">{{ event.description }}</span>
            </div>
            <div class="ml-4">
              <p class="text-xs font-medium text-muted mb-1">Event Detail:</p>
              <table class="text-xs w-full">
                <tbody>
                  <tr v-for="d in event.detail" :key="d.property" class="border-b border-gray-100">
                    <td class="py-1 pr-3">
                      <code class="text-primary">{{ d.property }}</code>
                    </td>
                    <td class="py-1 pr-3">
                      <code class="text-muted">{{ d.type }}</code>
                    </td>
                    <td class="py-1 text-muted">{{ d.description }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="mt-4">
          <p class="text-sm font-medium mb-2">Example:</p>
          <pre class="bg-gray-900 text-gray-100 rounded-lg p-3 text-xs overflow-x-auto"><code>document.querySelector('{{ componentData.tag }}')
  .addEventListener('{{ componentName === 'select' ? 'prez-change' : 'prez-click' }}', (e) => {
    console.log('{{ componentName === 'select' ? 'Selected' : 'Clicked' }}:', e.detail);
  });</code></pre>
        </div>
      </UCard>

      <!-- Styling -->
      <UCard class="mb-8">
        <template #header>
          <h2 class="text-lg font-semibold">Styling</h2>
        </template>

        <p class="text-sm text-muted mb-4">
          Components use Shadow DOM with encapsulated styles. Customize appearance using inherited CSS properties
          or by wrapping in a styled container.
        </p>

        <!-- CSS Custom Properties -->
        <div class="mb-6">
          <h3 class="font-medium mb-2">Inherited Properties</h3>
          <table class="text-sm w-full">
            <thead>
              <tr class="border-b">
                <th class="text-left py-2 pr-4 font-medium">Property</th>
                <th class="text-left py-2 pr-4 font-medium">Default</th>
                <th class="text-left py-2 font-medium">Description</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="prop in componentData.cssProperties" :key="prop.name" class="border-b border-gray-100">
                <td class="py-2 pr-4">
                  <code class="text-xs">{{ prop.name }}</code>
                </td>
                <td class="py-2 pr-4">
                  <code class="text-xs text-muted">{{ prop.default }}</code>
                </td>
                <td class="py-2 text-muted text-xs">{{ prop.description }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Examples -->
        <div class="space-y-4">
          <h3 class="font-medium">Examples</h3>
          <div v-for="example in stylingExamples" :key="example.title" class="border border-gray-200 rounded-lg p-4">
            <h4 class="font-medium text-sm mb-1">{{ example.title }}</h4>
            <p class="text-xs text-muted mb-2">{{ example.description }}</p>
            <pre class="bg-gray-900 text-gray-100 rounded-lg p-3 text-xs overflow-x-auto"><code>{{ example.code }}</code></pre>
          </div>
        </div>
      </UCard>

      <!-- Installation -->
      <UCard>
        <template #header>
          <h2 class="text-lg font-semibold">Installation</h2>
        </template>

        <div class="space-y-4 text-sm">
          <div>
            <h3 class="font-medium mb-2">CDN / Script Tag</h3>
            <pre class="bg-gray-900 text-gray-100 rounded-lg p-3 text-xs overflow-x-auto"><code>&lt;script src="{{ baseUrl }}/web-components/prez-lite.min.js" type="module"&gt;&lt;/script&gt;</code></pre>
          </div>

          <div>
            <h3 class="font-medium mb-2">npm (from GitHub)</h3>
            <pre class="bg-gray-900 text-gray-100 rounded-lg p-3 text-xs overflow-x-auto"><code># Public repo
npm install hjohns/prez-lite#subdirectory:packages/web-components

# Private repo (with token)
npm install git+https://&lt;TOKEN&gt;@github.com/hjohns/prez-lite.git#subdirectory:packages/web-components</code></pre>
          </div>

          <div>
            <h3 class="font-medium mb-2">npm (when published)</h3>
            <pre class="bg-gray-900 text-gray-100 rounded-lg p-3 text-xs overflow-x-auto"><code>npm install @prez-lite/web-components</code></pre>
          </div>
        </div>

        <p class="text-xs text-muted mt-4">
          See the <a href="https://github.com/hjohns/prez-lite/tree/main/packages/web-components" target="_blank" class="text-primary hover:underline">README</a> for full installation and configuration details.
        </p>
      </UCard>
    </div>
  </div>
</template>
