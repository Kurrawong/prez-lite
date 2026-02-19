# Prez-Lite Web Components

Vocabulary list web component for embedding in any web application. Built with [Lit](https://lit.dev/), works natively in HTML, React, Vue, Angular, and any other framework.

## Installation

### From npm (when published)

```bash
npm install @prez-lite/web-components
```

## Component

| Tag | Description |
|-----|-------------|
| `<prez-list>` | Interactive vocabulary list with multiple display modes |

## Usage

### HTML / Vanilla JS

```html
<!DOCTYPE html>
<html>
<head>
  <script type="module">
    import '@prez-lite/web-components'
  </script>
</head>
<body>
  <prez-list
    vocab="anzsrc-for"
    base-url="https://example.com/vocabs"
  ></prez-list>

  <script>
    const list = document.querySelector('prez-list')

    list.addEventListener('prez-change', (e) => {
      console.log('Selected:', e.detail.value)
      console.log('Concept:', e.detail.concepts)
    })

    list.addEventListener('prez-load', (e) => {
      console.log('Loaded:', e.detail.conceptCount, 'concepts')
    })
  </script>
</body>
</html>
```

### React

```tsx
import { useRef, useEffect, useState } from 'react'
import '@prez-lite/web-components'

// TypeScript: declare the custom element
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'prez-list': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          vocab?: string
          'base-url'?: string
          'vocab-url'?: string
          type?: 'select' | 'dropdown' | 'radio' | 'table'
          flat?: boolean
          search?: boolean
          multiple?: boolean
          value?: string
        },
        HTMLElement
      >
    }
  }
}

function VocabSelector() {
  const listRef = useRef<HTMLElement>(null)
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    const el = listRef.current
    if (!el) return

    const handleChange = (e: CustomEvent) => {
      setSelected(e.detail.value)
    }

    el.addEventListener('prez-change', handleChange as EventListener)
    return () => el.removeEventListener('prez-change', handleChange as EventListener)
  }, [])

  return (
    <div>
      <prez-list
        ref={listRef}
        vocab="anzsrc-for"
        base-url="https://example.com/vocabs"
        type="dropdown"
      />
      {selected && <p>Selected: {selected}</p>}
    </div>
  )
}

export default VocabSelector
```

### Vue 3

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import '@prez-lite/web-components'

const listRef = ref<HTMLElement | null>(null)
const selected = ref<string | null>(null)

onMounted(() => {
  listRef.value?.addEventListener('prez-change', (e: CustomEvent) => {
    selected.value = e.detail.value
  })
})
</script>

<template>
  <prez-list
    ref="listRef"
    vocab="anzsrc-for"
    base-url="https://example.com/vocabs"
  />
  <p v-if="selected">Selected: {{ selected }}</p>
</template>
```

To avoid Vue warnings about custom elements, configure in `vite.config.ts`:

```ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: {
          isCustomElement: (tag) => tag.startsWith('prez-')
        }
      }
    })
  ]
})
```

## Component Reference

### `<prez-list>`

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `vocab` | string | - | Vocabulary slug name |
| `vocab-url` | string | - | Direct URL to vocabulary JSON (overrides `vocab` + `base-url`) |
| `base-url` | string | auto | Base URL for vocab resolution |
| `type` | string | `"select"` | Display type: `select`, `dropdown`, `radio`, `table` |
| `flat` | boolean | `false` | Render as flat list instead of tree hierarchy |
| `search` | boolean | `false` | Show search/filter input |
| `multiple` | boolean | `false` | Allow multiple selections |
| `horizontal` | boolean | `false` | Horizontal layout (radio type only) |
| `fields` | string | - | Comma-separated fields for table columns |
| `value` | string | - | Currently selected value (single mode) |
| `values` | string[] | `[]` | Selected values (multiple mode) |
| `max-level` | number | `1` | Tree expansion depth (-1=all, 0=collapsed) |
| `show-count` | boolean | `false` | Show descendant count on parent nodes |
| `show-description` | boolean | `false` | Show concept descriptions |
| `show-selected` | boolean | `true` | Highlight selected items |
| `placeholder` | string | `"Select..."` | Placeholder text (dropdown mode) |
| `disabled` | boolean | `false` | Disable the component |
| `lang` | string | `"en"` | Language preference |

### Display Types

| Type | Description |
|------|-------------|
| `select` | Tree view with expand/collapse (default) |
| `dropdown` | Dropdown button with tree popover |
| `radio` | Radio button selection |
| `table` | Tabular display with configurable columns |

### Events

| Event | Detail |
|-------|--------|
| `prez-change` | `{ value: string \| string[], vocab: string, concepts: Concept \| Concept[] }` |
| `prez-load` | `{ vocab: string, url: string, conceptCount: number }` |
| `prez-error` | `{ vocab: string, url: string, error: string }` |
| `prez-expand` | `{ iri: string, expanded: boolean, vocab: string }` |
| `prez-filter` | `{ text: string, vocab: string }` |

### Table Fields

Available field names for `fields` attribute in table mode:

| Field | Description |
|-------|-------------|
| `iri` | Concept IRI |
| `label` | Preferred label |
| `notation` | Concept notation |
| `description` | Concept description |
| `altLabels` | Alternative labels |
| `broader` | Broader concept IRIs |
| `narrower` | Narrower concept IRIs |

## Vocabulary JSON Format

Components expect vocabulary data in this format:

```json
{
  "iri": "https://example.com/vocab/my-vocab",
  "label": "My Vocabulary",
  "concepts": [
    {
      "iri": "https://example.com/concept/1",
      "label": "Concept One",
      "notation": "01",
      "description": "Description of concept one",
      "altLabels": ["Alt Name", "Other Name"]
    }
  ],
  "tree": [
    {
      "iri": "https://example.com/concept/1",
      "label": "Parent Concept",
      "notation": "01",
      "children": [
        {
          "iri": "https://example.com/concept/1.1",
          "label": "Child Concept",
          "children": []
        }
      ]
    }
  ]
}
```

## Styling

Components use Shadow DOM for style encapsulation. CSS custom properties can be used to customize appearance.

## License

MIT
