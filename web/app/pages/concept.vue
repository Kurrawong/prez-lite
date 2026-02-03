<script setup lang="ts">
import { getLabel } from '~/composables/useVocabData'

const route = useRoute()
const uri = computed(() => route.query.uri as string)

const {
  concept,
  status,
  scheme,
  coreProperties,
  notes,
  relationships,
  mappings,
  citations,
  breadcrumbs,
  resolveLabelFor
} = useConcept(uri)

// Share functionality
const { getShareUrl } = useShare()
const shareUrl = computed(() => scheme.value ? getShareUrl(scheme.value.iri) : undefined)

function copyUriToClipboard() {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(uri.value).catch(() => {})
  }
}
</script>

<template>
  <div class="py-8">
    <UBreadcrumb :items="breadcrumbs" class="mb-6" />

    <div v-if="!uri" class="text-center py-12">
      <UAlert color="warning" title="No concept selected" description="Please select a concept from a vocabulary" />
    </div>

    <div v-else-if="status === 'pending'" class="space-y-4">
      <USkeleton class="h-12 w-1/2" />
      <USkeleton class="h-6 w-3/4" />
      <USkeleton class="h-64 w-full" />
    </div>

    <template v-else-if="concept">
      <!-- Header with IRI -->
      <div class="mb-8">
        <div class="flex items-start justify-between gap-4">
          <div class="flex-1">
            <h1 class="text-3xl font-bold mb-2">{{ getLabel(concept.prefLabel) }}</h1>

            <!-- IRI right under heading -->
            <div class="flex items-center gap-2 mb-4">
              <a :href="uri" target="_blank" class="text-sm text-primary hover:underline break-all">
                {{ uri }}
              </a>
              <UButton
                icon="i-heroicons-clipboard"
                color="neutral"
                variant="ghost"
                size="xs"
                @click="copyUriToClipboard"
              />
              <UButton
                v-if="shareUrl"
                :to="shareUrl"
                icon="i-heroicons-share"
                color="neutral"
                variant="ghost"
                size="xs"
                aria-label="Share vocabulary"
              />
            </div>

            <p v-if="concept.definition" class="text-lg text-muted">
              {{ getLabel(concept.definition) }}
            </p>
          </div>
          <UBadge v-if="concept.notation" size="lg" color="primary" variant="subtle">
            {{ concept.notation }}
          </UBadge>
        </div>
      </div>

      <!-- Two column layout: Relationships left, Properties right -->
      <div class="grid gap-6 lg:grid-cols-12">
        <!-- Left column: Relationships -->
        <div class="lg:col-span-5 space-y-6">
          <!-- In Scheme -->
          <UCard v-if="scheme">
            <template #header>
              <h2 class="font-semibold flex items-center gap-2">
                <UIcon name="i-heroicons-folder" />
                In Scheme
              </h2>
            </template>

            <NuxtLink
              :to="{ path: '/scheme', query: { uri: scheme.iri } }"
              class="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50"
            >
              <UIcon name="i-heroicons-book-open" class="text-primary size-5" />
              <div>
                <div class="font-medium">{{ getLabel(scheme.prefLabel) }}</div>
                <div class="text-sm text-muted truncate">{{ scheme.iri }}</div>
              </div>
            </NuxtLink>
          </UCard>

          <!-- Relationships -->
          <UCard v-for="rel in relationships" :key="rel.title">
            <template #header>
              <h2 class="font-semibold flex items-center gap-2">
                <UIcon :name="rel.icon" />
                {{ rel.title }}
                <UBadge color="neutral" variant="subtle" size="xs">{{ rel.items.length }}</UBadge>
              </h2>
            </template>

            <ul class="space-y-1">
              <li v-for="item in rel.items" :key="item.uri">
                <NuxtLink
                  v-if="item.isInternal"
                  :to="{ path: '/concept', query: { uri: item.uri } }"
                  class="flex items-center gap-2 p-2 rounded hover:bg-muted/50 text-primary text-sm"
                >
                  <UIcon name="i-heroicons-link" class="size-4 shrink-0" />
                  <span class="truncate">{{ item.label }}</span>
                </NuxtLink>
                <a
                  v-else
                  :href="item.uri"
                  target="_blank"
                  class="flex items-center gap-2 p-2 rounded hover:bg-muted/50 text-primary text-sm"
                >
                  <UIcon name="i-heroicons-arrow-top-right-on-square" class="size-4 shrink-0" />
                  <span class="truncate">{{ item.label }}</span>
                </a>
              </li>
            </ul>
          </UCard>

          <!-- Notes -->
          <UCard v-for="note in notes" :key="note.title">
            <template #header>
              <h3 class="font-semibold text-sm">{{ note.title }}</h3>
            </template>
            <p class="text-sm text-muted whitespace-pre-wrap">{{ note.content }}</p>
          </UCard>
        </div>

        <!-- Right column: Properties -->
        <div class="lg:col-span-7 space-y-6">
          <!-- Core Properties -->
          <UCard>
            <template #header>
              <h2 class="font-semibold flex items-center gap-2">
                <UIcon name="i-heroicons-document-text" />
                Properties
              </h2>
            </template>

            <div class="divide-y divide-default">
              <div v-for="prop in coreProperties" :key="prop.property" class="py-3 first:pt-0 last:pb-0">
                <div class="font-medium text-sm text-muted mb-1">{{ prop.property }}</div>
                <div class="space-y-1">
                  <div
                    v-for="(val, idx) in prop.values"
                    :key="idx"
                    class="flex items-center gap-2"
                  >
                    <span>{{ val.value }}</span>
                    <UBadge v-if="val.lang" color="neutral" variant="subtle" size="xs">
                      {{ val.lang }}
                    </UBadge>
                  </div>
                </div>
              </div>
            </div>
          </UCard>

          <!-- Mappings -->
          <div v-if="mappings.length" class="space-y-4">
            <h2 class="text-lg font-semibold">Mappings</h2>
            <UCard v-for="mapping in mappings" :key="mapping.title">
              <template #header>
                <div class="flex items-center gap-2">
                  <UBadge :color="mapping.color" variant="subtle" size="xs">{{ mapping.title }}</UBadge>
                  <span class="text-sm text-muted">({{ mapping.items.length }})</span>
                </div>
              </template>

              <ul class="space-y-1">
                <li v-for="iri in mapping.items" :key="iri">
                  <a
                    :href="iri"
                    target="_blank"
                    class="flex items-center gap-2 p-2 rounded hover:bg-muted/50 text-primary text-sm"
                  >
                    <UIcon name="i-heroicons-arrow-top-right-on-square" class="size-4 shrink-0" />
                    <span class="truncate">{{ resolveLabelFor(iri) }}</span>
                  </a>
                </li>
              </ul>
            </UCard>
          </div>

          <!-- Citations -->
          <UCard v-if="citations.length">
            <template #header>
              <h2 class="font-semibold flex items-center gap-2">
                <UIcon name="i-heroicons-academic-cap" />
                Citations
              </h2>
            </template>

            <ul class="space-y-1">
              <li v-for="cite in citations" :key="cite">
                <a
                  :href="cite"
                  target="_blank"
                  class="flex items-center gap-2 p-2 rounded hover:bg-muted/50 text-primary text-sm"
                >
                  <UIcon name="i-heroicons-link" class="size-4 shrink-0" />
                  <span class="break-all">{{ cite }}</span>
                </a>
              </li>
            </ul>
          </UCard>
        </div>
      </div>
    </template>

    <UAlert v-else color="error" title="Concept not found" :description="`No concept found with IRI: ${uri}`" />
  </div>
</template>
