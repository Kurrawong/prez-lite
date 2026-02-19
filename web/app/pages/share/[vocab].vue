<script setup lang="ts">
import { useShare } from '~/composables/useShare'
import type { ExportFormat } from '~/composables/useShare'
import InteractivePreview from '~/components/share/InteractivePreview.vue'

const route = useRoute()
const vocabSlug = computed(() => route.params.vocab as string)

const { vocabs, status, getDownloadUrl, getFullDownloadUrl, formats } = useShare()
const { githubRepo, githubBranch, githubVocabPath } = useRuntimeConfig().public

const vocab = computed(() => vocabs.value.find(v => v.slug === vocabSlug.value))

const githubEditUrl = computed(() => {
  if (!githubRepo || !vocab.value) return null
  return `https://github.dev/${githubRepo}/blob/${githubBranch}/${githubVocabPath}/${vocab.value.slug}.ttl`
})

// --- Inline Editor ---
const { isAuthenticated } = useGitHubAuth()

const [editorOwner, editorRepoName] = (githubRepo as string).split('/')
const editorPath = `${githubVocabPath}/${route.params.vocab}.ttl`
const editorEnabled = !!(editorOwner && editorRepoName && githubRepo)

const githubFile = editorEnabled
  ? useGitHubFile(editorOwner, editorRepoName, editorPath, githubBranch as string)
  : null

const colorMode = useColorMode()
const monacoTheme = computed(() => colorMode.value === 'dark' ? 'prez-dark' : 'prez-light')

const editorOpen = ref(false)
const editorContent = ref('')
const editorLoaded = ref(false)
const saveMessage = ref('')
const saveStatus = ref<'idle' | 'saving' | 'success' | 'error'>('idle')

async function toggleEditor() {
  editorOpen.value = !editorOpen.value
  if (editorOpen.value && !editorLoaded.value) {
    await loadEditor()
  }
}

async function loadEditor() {
  if (!githubFile || editorLoaded.value) return
  await githubFile.load()
  if (!githubFile.error.value) {
    editorContent.value = githubFile.content.value
    editorLoaded.value = true
  }
}

async function saveEditor() {
  if (!githubFile) return
  saveStatus.value = 'saving'
  const msg = saveMessage.value.trim() || `Update ${vocabSlug.value}.ttl`
  const ok = await githubFile.save(editorContent.value, msg)
  saveStatus.value = ok ? 'success' : 'error'
  if (ok) saveMessage.value = ''
  setTimeout(() => { saveStatus.value = 'idle' }, 3000)
}


const baseUrl = computed(() => {
  if (typeof window !== 'undefined') {
    return window.location.origin
  }
  return ''
})

// We only have one component now (prez-list) with different types
const selectedComponent = ref<'list'>('list')

const breadcrumbs = computed(() => [
  { label: 'Vocabularies', to: '/vocabs' },
  ...(vocab.value
    ? [{ label: vocab.value.label, to: { path: '/scheme', query: { uri: vocab.value.iri } } }]
    : []),
  { label: 'Share' }
])

async function copyUrl(url: string) {
  await navigator.clipboard.writeText(url)
}

// Preview state — default to first format (ttl-anot) once vocab loads
const previewFormatId = ref<string | null>(null)
const previewContent = ref<string>('')
const previewLoading = ref(false)
type ViewMode = 'source' | 'rendered'
const viewMode = ref<ViewMode>('source')

// Auto-load preview for first format when vocab becomes available
const hasAutoLoaded = ref(false)
watch(vocab, (v) => {
  if (v && !hasAutoLoaded.value) {
    hasAutoLoaded.value = true
    loadPreview(formats[0])
  }
})

// Determine which formats support a rendered view
function hasRenderedView(formatId: string): boolean {
  return ['html', 'json', 'jsonld', 'jsonld-anot', 'csv'].includes(formatId)
}

function getRenderedLabel(formatId: string): string {
  if (formatId === 'html') return 'Rendered'
  if (formatId === 'json' || formatId === 'jsonld' || formatId === 'jsonld-anot') return 'Tree'
  if (formatId === 'csv') return 'Table'
  return 'Rendered'
}

// Parse CSV string into rows
function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let current = ''
  let inQuotes = false
  let row: string[] = []
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        current += '"'
        i++
      } else if (ch === '"') {
        inQuotes = false
      } else {
        current += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === ',') {
        row.push(current)
        current = ''
      } else if (ch === '\n' || (ch === '\r' && text[i + 1] === '\n')) {
        row.push(current)
        current = ''
        if (row.some(c => c !== '')) rows.push(row)
        row = []
        if (ch === '\r') i++
      } else {
        current += ch
      }
    }
  }
  if (current || row.length) {
    row.push(current)
    if (row.some(c => c !== '')) rows.push(row)
  }
  return rows
}

const csvRows = computed(() => {
  if (!previewContent.value || !previewFormatId.value?.includes('csv')) return []
  return parseCsv(previewContent.value)
})

// Parse JSON for tree view
const jsonData = computed(() => {
  if (!previewContent.value || !['json', 'jsonld', 'jsonld-anot'].includes(previewFormatId.value || '')) return null
  try {
    return JSON.parse(previewContent.value)
  } catch {
    return null
  }
})

async function loadPreview(format: ExportFormat) {
  if (previewFormatId.value === format.id) return
  if (!vocab.value) return
  previewFormatId.value = format.id
  viewMode.value = 'source'
  previewLoading.value = true
  previewContent.value = ''
  try {
    const url = getDownloadUrl(vocab.value.slug, format.id)
    const res = await fetch(url)
    let text = await res.text()
    // Pretty-print minified JSON
    if (['json', 'jsonld', 'jsonld-anot'].includes(format.id)) {
      try { text = JSON.stringify(JSON.parse(text), null, 2) } catch { /* keep raw */ }
    }
    previewContent.value = text.length > 200000 ? text.slice(0, 200000) + '\n\n… (truncated)' : text
  } catch {
    previewContent.value = 'Failed to load preview.'
  } finally {
    previewLoading.value = false
  }
}
</script>

<template>
  <div class="py-8">
    <UBreadcrumb :items="breadcrumbs" class="mb-6" />

    <div v-if="status === 'pending' || status === 'idle'">
      <USkeleton class="h-8 w-64 mb-4" />
      <USkeleton class="h-4 w-full mb-8" />
      <USkeleton class="h-64 w-full" />
    </div>

    <div v-else-if="!vocab">
      <UAlert
        color="warning"
        icon="i-heroicons-exclamation-triangle"
        title="Vocabulary not found"
        :description="`No vocabulary with slug '${vocabSlug}' was found.`"
      />
    </div>

    <div v-else>
      <h1 class="text-3xl font-bold mb-2">{{ vocab.label }}</h1>
      <p v-if="vocab.description" class="text-muted mb-4">{{ vocab.description }}</p>

      <div class="flex flex-wrap items-center gap-3 text-sm text-muted mb-8">
        <UBadge color="neutral" variant="subtle">
          {{ vocab.conceptCount }} concepts
        </UBadge>
        <UBadge v-if="vocab.version" color="primary" variant="subtle">
          v{{ vocab.version }}
        </UBadge>
        <span v-if="vocab.modified">Updated {{ vocab.modified }}</span>
        <UButton
          v-if="isAuthenticated && githubFile"
          size="xs"
          variant="ghost"
          :icon="editorOpen ? 'i-heroicons-x-mark' : 'i-heroicons-pencil-square'"
          @click="toggleEditor"
        >
          {{ editorOpen ? 'Close Editor' : 'Edit' }}
        </UButton>
        <UButton
          v-else-if="githubEditUrl"
          :to="githubEditUrl"
          target="_blank"
          size="xs"
          variant="ghost"
          icon="i-heroicons-pencil-square"
        >
          Edit on GitHub
        </UButton>
      </div>

      <!-- Inline Editor (toggle) -->
      <div v-if="editorOpen && githubFile" class="mb-8">
        <UAlert
          v-if="githubFile.error.value"
          color="error"
          icon="i-heroicons-exclamation-circle"
          :title="githubFile.error.value"
          class="mb-4"
        />

        <template v-if="editorLoaded">
          <div class="border border-default rounded-lg overflow-hidden">
            <MonacoEditor
              v-model="editorContent"
              lang="turtle"
              :options="{ theme: monacoTheme, minimap: { enabled: false }, wordWrap: 'on', scrollBeyondLastLine: false }"
              class="h-[28rem]"
            />
          </div>

          <div class="flex items-center gap-3 mt-3">
            <input
              v-model="saveMessage"
              type="text"
              placeholder="Commit message (optional)"
              class="flex-1 px-3 py-1.5 text-sm border border-default rounded-md bg-default"
            />
            <UButton
              icon="i-heroicons-check"
              :loading="saveStatus === 'saving'"
              :disabled="saveStatus === 'saving'"
              @click="saveEditor"
            >
              Save to GitHub
            </UButton>
          </div>

          <p v-if="saveStatus === 'success'" class="text-sm text-success mt-2">
            Saved successfully.
          </p>
          <p v-if="saveStatus === 'error' && githubFile.error.value" class="text-sm text-error mt-2">
            {{ githubFile.error.value }}
          </p>
        </template>

        <div v-else-if="githubFile.loading.value" class="flex items-center gap-2 text-muted">
          <UIcon name="i-heroicons-arrow-path" class="size-4 animate-spin" />
          <span class="text-sm">Loading file from GitHub...</span>
        </div>
      </div>

      <!-- Export Formats -->
      <div class="mb-8">
        <h2 class="text-xl font-semibold mb-4">Export Formats</h2>

        <div class="flex flex-col lg:flex-row border border-default rounded-lg overflow-hidden">
          <!-- Preview panel (left, larger) -->
          <div class="flex-1 min-w-0 flex flex-col">
            <!-- Preview toolbar — fixed height to align with Downloads heading -->
            <div class="flex items-center gap-3 px-3 py-2 h-[37px] border-b border-default bg-gray-50 dark:bg-gray-900/50">
              <template v-if="previewFormatId">
                <span class="text-sm font-semibold">{{ formats.find(f => f.id === previewFormatId)?.label }}</span>
                <div v-if="hasRenderedView(previewFormatId)" class="flex items-center gap-1">
                  <UButton
                    size="xs"
                    :variant="viewMode === 'source' ? 'solid' : 'ghost'"
                    @click="viewMode = 'source'"
                  >
                    Source
                  </UButton>
                  <UButton
                    size="xs"
                    :variant="viewMode === 'rendered' ? 'solid' : 'ghost'"
                    @click="viewMode = 'rendered'"
                  >
                    {{ getRenderedLabel(previewFormatId) }}
                  </UButton>
                </div>
              </template>
              <span v-else class="text-sm text-muted">Preview</span>
            </div>

            <!-- Preview content -->
            <div class="flex-1 min-h-[24rem]">
              <div v-if="!previewFormatId" class="flex items-center justify-center h-full text-muted text-sm">
                Select a format to preview
              </div>

              <div v-else-if="previewLoading" class="flex items-center justify-center h-full">
                <UIcon name="i-heroicons-arrow-path" class="w-5 h-5 animate-spin text-muted" />
              </div>

              <template v-else-if="viewMode === 'source'">
                <pre class="bg-gray-900 text-gray-100 p-4 text-xs overflow-auto h-full max-h-[32rem]"><code>{{ previewContent }}</code></pre>
              </template>

              <template v-else>
                <iframe
                  v-if="previewFormatId === 'html'"
                  :srcdoc="previewContent"
                  class="w-full h-full min-h-[24rem]"
                  sandbox="allow-same-origin"
                />
                <div
                  v-else-if="['json', 'jsonld', 'jsonld-anot'].includes(previewFormatId) && jsonData"
                  class="bg-gray-50 dark:bg-gray-900 p-4 overflow-auto max-h-[32rem] text-sm"
                >
                  <ShareJsonTreeNode :data="jsonData" :label="'root'" :expanded="true" :depth="0" />
                </div>
                <div
                  v-else-if="previewFormatId === 'csv' && csvRows.length"
                  class="overflow-auto max-h-[32rem]"
                >
                  <table class="w-full text-sm">
                    <thead class="bg-gray-100 dark:bg-gray-800 sticky top-0">
                      <tr>
                        <th v-for="(cell, i) in csvRows[0]" :key="i" class="px-3 py-2 text-left font-medium text-muted">{{ cell }}</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-default">
                      <tr v-for="(row, ri) in csvRows.slice(1)" :key="ri" class="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td v-for="(cell, ci) in row" :key="ci" class="px-3 py-2">{{ cell }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </template>
            </div>
          </div>

          <!-- Format list (right, narrower) -->
          <div class="lg:w-64 shrink-0 border-t lg:border-t-0 lg:border-l border-default bg-gray-50/50 dark:bg-gray-900/30">
            <div class="flex items-center px-3 py-2 h-[37px] text-sm font-semibold border-b border-default">Downloads</div>
            <div class="divide-y divide-default">
              <div
                v-for="format in formats"
                :key="format.id"
                class="flex items-center gap-2 py-2 px-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                :class="{ 'bg-primary/5 border-l-2 border-l-primary': previewFormatId === format.id }"
                @click="loadPreview(format)"
              >
                <span
                  class="text-sm truncate flex-1"
                  :class="previewFormatId === format.id ? 'font-medium text-primary' : ''"
                >
                  {{ format.label }}
                </span>
                <UButton
                  icon="i-heroicons-arrow-down-tray"
                  size="xs"
                  variant="ghost"
                  :to="getDownloadUrl(vocab.slug, format.id)"
                  target="_blank"
                  @click.stop
                />
                <UButton
                  icon="i-heroicons-clipboard"
                  size="xs"
                  variant="ghost"
                  @click.stop="copyUrl(getFullDownloadUrl(vocab.slug, format.id))"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Interactive Preview -->
      <div class="mb-8">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-xl font-semibold">Interactive Preview</h2>
          <NuxtLink
            to="/share/components/list"
            class="text-sm text-primary hover:underline"
          >
            View prez-list documentation →
          </NuxtLink>
        </div>

        <InteractivePreview
          :component="selectedComponent"
          :vocab="vocab"
          :base-url="baseUrl"
        />
      </div>

      <!-- Quick Reference -->
      <UCard>
        <template #header>
          <h2 class="text-lg font-semibold">Quick Reference</h2>
        </template>

        <div class="space-y-4">
          <div>
            <h3 class="font-medium mb-2">Vocab Slug</h3>
            <code class="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-sm">{{ vocab.slug }}</code>
          </div>

          <div>
            <h3 class="font-medium mb-2">Vocab IRI</h3>
            <code class="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-xs break-all">{{ vocab.iri }}</code>
          </div>

          <div>
            <h3 class="font-medium mb-2">Basic Usage</h3>
            <pre class="bg-gray-900 text-gray-100 rounded-lg p-3 text-sm overflow-x-auto"><code>&lt;script src="{{ baseUrl }}/web-components/prez-lite.min.js" type="module"&gt;&lt;/script&gt;

&lt;prez-list vocab="{{ vocab.slug }}"&gt;&lt;/prez-list&gt;</code></pre>
          </div>

          <div>
            <h3 class="font-medium mb-2">Component Documentation</h3>
            <UButton
              to="/share/components/list"
              size="sm"
              variant="outline"
            >
              prez-list Docs
            </UButton>
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>
