<script setup lang="ts">
const props = withDefaults(defineProps<{
  modelValue: string
  readonly?: boolean
  height?: string
}>(), {
  readonly: false,
  height: '400px',
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

// Monaco editor configuration for Turtle syntax
const editorOptions = computed(() => ({
  minimap: { enabled: false },
  lineNumbers: 'on' as const,
  wordWrap: 'on' as const,
  scrollBeyondLastLine: false,
  fontSize: 13,
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  tabSize: 4,
  readOnly: props.readonly,
  automaticLayout: true,
  scrollbar: {
    verticalScrollbarSize: 8,
    horizontalScrollbarSize: 8,
  },
}))

// Handle editor mount to register Turtle language
function onEditorMount(editor: unknown, monaco: { languages: { register: (arg0: { id: string }) => void; setMonarchTokensProvider: (arg0: string, arg1: { tokenizer: { root: (string | RegExp)[][] } }) => void } }) {
  // Register Turtle language if not already registered
  monaco.languages.register({ id: 'turtle' })

  // Simple Turtle/TTL syntax highlighting
  monaco.languages.setMonarchTokensProvider('turtle', {
    tokenizer: {
      root: [
        // Comments
        [/#.*$/, 'comment'],

        // Prefixes and base
        [/@prefix\b/, 'keyword'],
        [/@base\b/, 'keyword'],
        [/\bPREFIX\b/i, 'keyword'],
        [/\bBASE\b/i, 'keyword'],

        // IRIs
        [/<[^>]*>/, 'string.link'],

        // Prefixed names
        [/[a-zA-Z_][\w-]*:[\w-]*/, 'type.identifier'],

        // Literals
        [/"([^"\\]|\\.)*"(@[a-z-]+)?/, 'string'],
        [/'([^'\\]|\\.)*'(@[a-z-]+)?/, 'string'],
        [/"""[\s\S]*?"""/, 'string'],
        [/'''[\s\S]*?'''/, 'string'],

        // Typed literals
        [/\^\^/, 'delimiter'],

        // Blank nodes
        [/_:[\w-]+/, 'variable'],
        [/\[/, 'delimiter.bracket'],
        [/\]/, 'delimiter.bracket'],

        // Punctuation
        [/[.,;]/, 'delimiter'],
        [/\(/, 'delimiter.parenthesis'],
        [/\)/, 'delimiter.parenthesis'],

        // Booleans
        [/\b(true|false)\b/, 'keyword'],

        // Numbers
        [/-?\d+(\.\d+)?([eE][+-]?\d+)?/, 'number'],

        // a (rdf:type shorthand)
        [/\ba\b/, 'keyword'],
      ],
    },
  })
}

const content = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})
</script>

<template>
  <ClientOnly>
    <MonacoEditor
      v-model="content"
      lang="turtle"
      :style="{ height }"
      :options="editorOptions"
      class="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
      @mount="onEditorMount"
    />
    <template #fallback>
      <div
        class="bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4"
        :style="{ height }"
      >
        <div class="flex items-center justify-center h-full text-gray-500">
          Loading editor...
        </div>
      </div>
    </template>
  </ClientOnly>
</template>
