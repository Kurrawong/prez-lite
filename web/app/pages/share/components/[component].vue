<script setup lang="ts">
import { useShare } from '~/composables/useShare'
import InteractivePreview from '~/components/share/InteractivePreview.vue'

const route = useRoute()
const componentName = computed(() => route.params.component as string)

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
const components = {
  select: {
    tag: 'prez-vocab-select',
    title: 'Select',
    description: 'A dropdown select menu for choosing vocabulary concepts. Supports single and multiple selection modes.',
    useCases: [
      'Form inputs requiring concept selection',
      'Compact UI where space is limited',
      'Single or multiple value selection'
    ],
    properties: [
      { name: 'vocab', type: 'string', default: '—', description: 'Vocabulary slug for auto-resolved URL' },
      { name: 'vocab-url', type: 'string', default: '—', description: 'Direct URL to vocabulary JSON (overrides vocab)' },
      { name: 'base-url', type: 'string', default: 'auto', description: 'Base URL for vocab resolution' },
      { name: 'value', type: 'string', default: '—', description: 'Selected concept IRI (single mode)' },
      { name: 'values', type: 'string[]', default: '[]', description: 'Selected IRIs as JSON array (multiple mode)' },
      { name: 'multiple', type: 'boolean', default: 'false', description: 'Enable multiple selection' },
      { name: 'placeholder', type: 'string', default: '"Select a concept..."', description: 'Placeholder text when nothing selected' },
      { name: 'max-selections', type: 'number', default: '—', description: 'Maximum selections allowed (multiple mode)' },
      { name: 'show-iri', type: 'boolean', default: 'false', description: 'Show IRI in option display' },
      { name: 'disabled', type: 'boolean', default: 'false', description: 'Disable the component' },
      { name: 'lang', type: 'string', default: '"en"', description: 'Preferred language for labels' }
    ],
    methods: [
      { name: 'loadVocab()', description: 'Manually trigger vocabulary reload' }
    ],
    cssProperties: [
      { name: 'font-family', default: 'system-ui, sans-serif', description: 'Font family inherited into shadow DOM' },
      { name: 'font-size', default: '0.875rem', description: 'Base font size' }
    ]
  },
  tree: {
    tag: 'prez-vocab-tree',
    title: 'Tree',
    description: 'A hierarchical tree view for exploring vocabulary concept hierarchies with expand/collapse functionality.',
    useCases: [
      'Browsing hierarchical vocabularies',
      'Exploring broader/narrower relationships',
      'Visual navigation of concept structures'
    ],
    properties: [
      { name: 'vocab', type: 'string', default: '—', description: 'Vocabulary slug for auto-resolved URL' },
      { name: 'vocab-url', type: 'string', default: '—', description: 'Direct URL to vocabulary JSON' },
      { name: 'base-url', type: 'string', default: 'auto', description: 'Base URL for vocab resolution' },
      { name: 'value', type: 'string', default: '—', description: 'Currently selected concept IRI' },
      { name: 'expand-all', type: 'boolean', default: 'false', description: 'Expand all nodes on load' },
      { name: 'expand-level', type: 'number', default: '1', description: 'Expand to this depth (0 = collapsed)' },
      { name: 'selectable', type: 'boolean', default: 'true', description: 'Allow node selection' },
      { name: 'show-count', type: 'boolean', default: 'false', description: 'Show descendant count on parent nodes' },
      { name: 'disabled', type: 'boolean', default: 'false', description: 'Disable the component' },
      { name: 'lang', type: 'string', default: '"en"', description: 'Preferred language for labels' }
    ],
    methods: [
      { name: 'loadVocab()', description: 'Manually trigger vocabulary reload' },
      { name: 'expandAll()', description: 'Expand all tree nodes' },
      { name: 'collapseAll()', description: 'Collapse all tree nodes' }
    ],
    cssProperties: [
      { name: 'font-family', default: 'system-ui, sans-serif', description: 'Font family' },
      { name: 'font-size', default: '0.875rem', description: 'Base font size' }
    ]
  },
  list: {
    tag: 'prez-vocab-list',
    title: 'List',
    description: 'A flat, searchable list of all concepts with optional definitions and alternative labels.',
    useCases: [
      'Browsing all concepts in a vocabulary',
      'Filtering large concept sets',
      'Displaying concept metadata inline'
    ],
    properties: [
      { name: 'vocab', type: 'string', default: '—', description: 'Vocabulary slug for auto-resolved URL' },
      { name: 'vocab-url', type: 'string', default: '—', description: 'Direct URL to vocabulary JSON' },
      { name: 'base-url', type: 'string', default: 'auto', description: 'Base URL for vocab resolution' },
      { name: 'value', type: 'string', default: '—', description: 'Currently selected concept IRI' },
      { name: 'searchable', type: 'boolean', default: 'true', description: 'Show search/filter input' },
      { name: 'placeholder', type: 'string', default: '"Filter concepts..."', description: 'Search input placeholder' },
      { name: 'show-definitions', type: 'boolean', default: 'false', description: 'Show concept definitions' },
      { name: 'show-alt-labels', type: 'boolean', default: 'false', description: 'Show alternative labels' },
      { name: 'max-items', type: 'number', default: '0', description: 'Maximum items to display (0 = all)' },
      { name: 'disabled', type: 'boolean', default: 'false', description: 'Disable the component' },
      { name: 'lang', type: 'string', default: '"en"', description: 'Preferred language for labels' }
    ],
    methods: [
      { name: 'loadVocab()', description: 'Manually trigger vocabulary reload' }
    ],
    cssProperties: [
      { name: 'font-family', default: 'system-ui, sans-serif', description: 'Font family' },
      { name: 'font-size', default: '0.875rem', description: 'Base font size' }
    ]
  },
  autocomplete: {
    tag: 'prez-vocab-autocomplete',
    title: 'Autocomplete',
    description: 'A typeahead search input with dropdown suggestions for quick concept selection.',
    useCases: [
      'Quick selection in large vocabularies',
      'Search-first user experience',
      'Inline form inputs'
    ],
    properties: [
      { name: 'vocab', type: 'string', default: '—', description: 'Vocabulary slug for auto-resolved URL' },
      { name: 'vocab-url', type: 'string', default: '—', description: 'Direct URL to vocabulary JSON' },
      { name: 'base-url', type: 'string', default: 'auto', description: 'Base URL for vocab resolution' },
      { name: 'value', type: 'string', default: '—', description: 'Currently selected concept IRI' },
      { name: 'placeholder', type: 'string', default: '"Type to search..."', description: 'Input placeholder text' },
      { name: 'min-chars', type: 'number', default: '1', description: 'Minimum characters before showing suggestions' },
      { name: 'max-suggestions', type: 'number', default: '10', description: 'Maximum suggestions to display' },
      { name: 'show-definitions', type: 'boolean', default: 'false', description: 'Show definitions in suggestions' },
      { name: 'disabled', type: 'boolean', default: 'false', description: 'Disable the component' },
      { name: 'lang', type: 'string', default: '"en"', description: 'Preferred language for labels' }
    ],
    methods: [
      { name: 'loadVocab()', description: 'Manually trigger vocabulary reload' },
      { name: 'clear()', description: 'Clear the current selection and input' }
    ],
    cssProperties: [
      { name: 'font-family', default: 'system-ui, sans-serif', description: 'Font family' },
      { name: 'font-size', default: '0.875rem', description: 'Base font size' }
    ]
  }
}

const componentData = computed(() => components[componentName.value as keyof typeof components])

// Events are the same for all components
const events = [
  {
    name: 'prez-change',
    description: 'Fired when selection changes',
    detail: [
      { property: 'value', type: 'string | string[]', description: 'Selected IRI(s)' },
      { property: 'vocab', type: 'string', description: 'Vocabulary slug' },
      { property: 'concepts', type: 'object | object[]', description: 'Full concept data for selection' }
    ]
  },
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
      title: 'Custom Width',
      description: 'Set component width',
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

const componentTypes = ['select', 'tree', 'list', 'autocomplete']
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

      <!-- Component Navigation -->
      <div class="flex gap-2 mb-8 flex-wrap">
        <UButton
          v-for="comp in componentTypes"
          :key="comp"
          :to="`/share/components/${comp}`"
          :color="componentName === comp ? 'primary' : 'neutral'"
          :variant="componentName === comp ? 'solid' : 'outline'"
          size="sm"
        >
          {{ comp.charAt(0).toUpperCase() + comp.slice(1) }}
        </UButton>
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

      <!-- Interactive Preview -->
      <h2 class="text-xl font-semibold mb-4">Interactive Preview</h2>
      <div v-if="status === 'pending' || !demoVocab" class="mb-8">
        <USkeleton class="h-64 w-full" />
      </div>
      <div v-else class="mb-8">
        <InteractivePreview
          :component="componentName as 'select' | 'tree' | 'list' | 'autocomplete'"
          :vocab="demoVocab"
          :base-url="baseUrl"
        />
      </div>

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
  .addEventListener('prez-change', (e) => {
    console.log('Selected:', e.detail.value);
    console.log('Concept:', e.detail.concepts);
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

      <!-- Full Example -->
      <UCard>
        <template #header>
          <h2 class="text-lg font-semibold">Full Example</h2>
        </template>

        <pre class="bg-gray-900 text-gray-100 rounded-lg p-4 text-xs overflow-x-auto"><code>&lt;!DOCTYPE html&gt;
&lt;html lang="en"&gt;
&lt;head&gt;
  &lt;meta charset="UTF-8"&gt;
  &lt;title&gt;{{ componentData.title }} Example&lt;/title&gt;
  &lt;script src="{{ baseUrl }}/web-components/prez-vocab.min.js" type="module"&gt;&lt;/script&gt;
  &lt;style&gt;
    body { font-family: system-ui, sans-serif; padding: 2rem; }
    {{ componentData.tag }} { width: 300px; }
  &lt;/style&gt;
&lt;/head&gt;
&lt;body&gt;
  &lt;h1&gt;Vocabulary Selection&lt;/h1&gt;

  &lt;{{ componentData.tag }} vocab="your-vocab-slug"&gt;&lt;/{{ componentData.tag }}&gt;

  &lt;script&gt;
    document.querySelector('{{ componentData.tag }}')
      .addEventListener('prez-change', (e) =&gt; {
        console.log('Selected:', e.detail.value);
      });
  &lt;/script&gt;
&lt;/body&gt;
&lt;/html&gt;</code></pre>
      </UCard>
    </div>
  </div>
</template>
