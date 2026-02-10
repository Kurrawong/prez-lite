/**
 * Register custom Monaco themes matching the site's blue/slate palette.
 * Runs once on client startup so themes are available before any editor mounts.
 */
export default defineNuxtPlugin(async () => {
  const { useMonaco } = await import('nuxt-monaco-editor/dist/runtime/composables')
  const monaco = await useMonaco()

  monaco.editor.defineTheme('prez-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '64748b', fontStyle: 'italic' },
      { token: 'keyword', foreground: '93c5fd' },        // blue-300
      { token: 'string', foreground: '86efac' },          // green-300
      { token: 'string.link', foreground: '7dd3fc' },     // sky-300
      { token: 'number', foreground: 'fca5a5' },          // red-300
      { token: 'type.identifier', foreground: 'c4b5fd' }, // violet-300
      { token: 'variable', foreground: 'fcd34d' },        // yellow-300
      { token: 'delimiter', foreground: '94a3b8' },       // slate-400
    ],
    colors: {
      'editor.background': '#080e1e',                      // deeper than slate-950
      'editor.foreground': '#e2e8f0',                      // slate-200
      'editor.lineHighlightBackground': '#1e293b',         // slate-800
      'editor.selectionBackground': '#334155',             // slate-700
      'editorCursor.foreground': '#60a5fa',                // blue-400
      'editorLineNumber.foreground': '#475569',            // slate-600
      'editorLineNumber.activeForeground': '#94a3b8',      // slate-400
      'editorIndentGuide.background': '#1e293b',
      'editorWidget.background': '#1e293b',
      'editorWidget.border': '#334155',
      'input.background': '#1e293b',
      'input.border': '#334155',
      'dropdown.background': '#1e293b',
      'dropdown.border': '#334155',
    },
  })

  monaco.editor.defineTheme('prez-light', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '64748b', fontStyle: 'italic' },
      { token: 'keyword', foreground: '2563eb' },         // blue-600
      { token: 'string', foreground: '16a34a' },          // green-600
      { token: 'string.link', foreground: '0284c7' },     // sky-600
      { token: 'number', foreground: 'dc2626' },          // red-600
      { token: 'type.identifier', foreground: '7c3aed' }, // violet-600
      { token: 'variable', foreground: 'ca8a04' },        // yellow-600
      { token: 'delimiter', foreground: '64748b' },       // slate-500
    ],
    colors: {
      'editor.background': '#ffffff',
      'editor.foreground': '#1e293b',                      // slate-800
      'editor.lineHighlightBackground': '#f1f5f9',         // slate-100
      'editor.selectionBackground': '#bfdbfe',             // blue-200
      'editorCursor.foreground': '#2563eb',                // blue-600
      'editorLineNumber.foreground': '#94a3b8',            // slate-400
      'editorLineNumber.activeForeground': '#475569',      // slate-600
    },
  })
})
