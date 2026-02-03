<script setup lang="ts">
import { getLabel } from '~/composables/useVocabData'
import { PAGE_SIZE_ALL } from '~/composables/useVocabs'

const {
  status,
  viewMode,
  searchQuery,
  sortBy,
  sortOrder,
  currentPage,
  pageSize,
  totalPages,
  filteredSchemes,
  paginatedSchemes,
  tableData,
  tableColumns,
  toggleSort
} = useVocabs()

const pageSizeOptions = [
  { label: '12', value: 12 },
  { label: '24', value: 24 },
  { label: '48', value: 48 },
  { label: 'All', value: PAGE_SIZE_ALL }
]

const sortOptions = [
  { label: 'Name', value: 'name' },
  { label: 'Modified', value: 'modified' },
  { label: 'Concepts', value: 'concepts' }
]
</script>

<template>
  <div class="py-8">
    <h1 class="text-3xl font-bold mb-2">Vocabularies</h1>
    <p class="text-muted mb-8">Browse available concept schemes and vocabularies.</p>

    <!-- Controls -->
    <div class="flex flex-col sm:flex-row gap-4 mb-6">
      <UInput
        v-model="searchQuery"
        icon="i-heroicons-magnifying-glass"
        placeholder="Search vocabularies..."
        class="flex-1"
      />

      <div class="flex items-center gap-2">
        <USelectMenu
          v-model="sortBy"
          :items="sortOptions"
          value-key="value"
          class="w-36"
        >
          <template #leading>
            <UIcon name="i-heroicons-arrows-up-down" class="size-4 text-muted" />
          </template>
        </USelectMenu>

        <UButton
          :icon="sortOrder === 'asc' ? 'i-heroicons-arrow-up' : 'i-heroicons-arrow-down'"
          color="neutral"
          variant="ghost"
          @click="sortOrder = sortOrder === 'asc' ? 'desc' : 'asc'"
        />

        <div class="inline-flex rounded-md shadow-sm">
          <UButton
            icon="i-heroicons-squares-2x2"
            :color="viewMode === 'cards' ? 'primary' : 'neutral'"
            :variant="viewMode === 'cards' ? 'solid' : 'ghost'"
            class="rounded-r-none"
            @click="viewMode = 'cards'"
          />
          <UButton
            icon="i-heroicons-table-cells"
            :color="viewMode === 'table' ? 'primary' : 'neutral'"
            :variant="viewMode === 'table' ? 'solid' : 'ghost'"
            class="rounded-l-none -ml-px"
            @click="viewMode = 'table'"
          />
        </div>
      </div>
    </div>

    <div v-if="status === 'pending' || status === 'idle'" class="space-y-4">
      <USkeleton class="h-32 w-full" v-for="i in 3" :key="i" />
    </div>

    <UAlert
      v-else-if="status === 'error'"
      color="error"
      icon="i-heroicons-exclamation-triangle"
      title="Error"
      description="Failed to load vocabularies"
    />

    <!-- Card View -->
    <div v-else-if="viewMode === 'cards' && paginatedSchemes.length" class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <NuxtLink
        v-for="scheme in paginatedSchemes"
        :key="scheme.iri"
        :to="{ path: '/scheme', query: { uri: scheme.iri } }"
        class="block"
      >
        <UCard class="h-full hover:ring-2 hover:ring-primary hover:bg-muted/30 transition-all cursor-pointer">
          <template #header>
            <h2 class="text-lg font-semibold text-primary truncate">
              {{ getLabel(scheme.prefLabel) }}
            </h2>
          </template>

          <p v-if="scheme.definition" class="text-sm text-muted line-clamp-3">
            {{ getLabel(scheme.definition) }}
          </p>

          <template #footer>
            <div class="flex items-center justify-between text-sm">
              <UBadge color="neutral" variant="subtle">
                {{ scheme.conceptCount }} concepts
              </UBadge>
              <div class="flex items-center gap-2">
                <UBadge v-if="scheme.version" color="primary" variant="subtle" size="xs">
                  v{{ scheme.version }}
                </UBadge>
                <span v-if="scheme.modified" class="text-muted text-xs">
                  {{ scheme.modified }}
                </span>
              </div>
            </div>
          </template>
        </UCard>
      </NuxtLink>
    </div>

    <!-- Table View -->
    <UCard v-else-if="viewMode === 'table' && paginatedSchemes.length">
      <UTable :data="tableData" :columns="tableColumns">
        <template #prefLabel-header="{ column }">
          <button
            class="flex items-center gap-1 hover:text-primary"
            @click="toggleSort('name')"
          >
            {{ column.columnDef.header }}
            <UIcon
              v-if="sortBy === 'name'"
              :name="sortOrder === 'asc' ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
              class="size-4"
            />
          </button>
        </template>

        <template #conceptCount-header="{ column }">
          <button
            class="flex items-center gap-1 hover:text-primary"
            @click="toggleSort('concepts')"
          >
            {{ column.columnDef.header }}
            <UIcon
              v-if="sortBy === 'concepts'"
              :name="sortOrder === 'asc' ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
              class="size-4"
            />
          </button>
        </template>

        <template #modified-header="{ column }">
          <button
            class="flex items-center gap-1 hover:text-primary"
            @click="toggleSort('modified')"
          >
            {{ column.columnDef.header }}
            <UIcon
              v-if="sortBy === 'modified'"
              :name="sortOrder === 'asc' ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
              class="size-4"
            />
          </button>
        </template>

        <template #prefLabel-cell="{ row }">
          <NuxtLink
            :to="{ path: '/scheme', query: { uri: row.original.iri } }"
            class="text-primary hover:underline font-medium"
          >
            {{ row.original.prefLabel }}
          </NuxtLink>
        </template>

        <template #conceptCount-cell="{ row }">
          <UBadge color="neutral" variant="subtle" size="sm">
            {{ row.original.conceptCount }}
          </UBadge>
        </template>

        <template #version-cell="{ row }">
          <UBadge v-if="row.original.version" color="primary" variant="subtle" size="xs">
            v{{ row.original.version }}
          </UBadge>
        </template>

        <template #publisher-cell="{ row }">
          <span class="text-muted text-sm">{{ row.original.publisher || '-' }}</span>
        </template>
      </UTable>
    </UCard>

    <!-- No vocabularies loaded -->
    <UAlert
      v-else-if="!searchQuery"
      color="info"
      icon="i-heroicons-information-circle"
      title="No vocabularies"
      description="Add TTL files to data/vocabs/ and run the build script"
    />

    <!-- No search results -->
    <div v-else class="text-center py-12">
      <UIcon name="i-heroicons-magnifying-glass" class="size-16 text-muted mb-4" />
      <p class="text-lg text-muted mb-2">No vocabularies match "{{ searchQuery }}"</p>
      <p class="text-sm text-muted">Try different keywords</p>
    </div>

    <!-- Pagination -->
    <div v-if="filteredSchemes.length > 0" class="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
      <div class="text-sm text-muted">
        Showing {{ (currentPage - 1) * pageSize + 1 }}-{{ Math.min(currentPage * pageSize, filteredSchemes.length) }} of {{ filteredSchemes.length }}
      </div>
      <div class="flex items-center gap-4">
        <div class="flex items-center gap-2">
          <span class="text-sm text-muted">Per page:</span>
          <USelectMenu
            v-model="pageSize"
            :items="pageSizeOptions"
            value-key="value"
            class="w-20"
          />
        </div>
        <UPagination
          v-if="totalPages > 1"
          v-model:page="currentPage"
          :total="filteredSchemes.length"
          :items-per-page="pageSize"
        />
      </div>
    </div>
  </div>
</template>
