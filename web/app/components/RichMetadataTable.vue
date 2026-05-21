<script setup lang="ts">
import type { RenderedProperty, PropertyValue } from '~/utils/annotated-properties'

defineProps<{
  properties: RenderedProperty[]
}>()

/**
 * Predicates whose literal values are displayed in a monospace `<code>`
 * block in read mode. The edit-mode textarea stays plain — only the
 * rendered output gets the code styling (#27).
 */
const SKOS_EXAMPLE = 'http://www.w3.org/2004/02/skos/core#example'
const CODE_RENDERED_PREDICATES = new Set([SKOS_EXAMPLE])

function isCodeRendered(predicate: string): boolean {
  return CODE_RENDERED_PREDICATES.has(predicate)
}
</script>

<template>
  <div class="overflow-x-auto">
    <table class="w-full text-sm">
      <tbody class="divide-y divide-default">
        <tr v-for="prop in properties" :key="prop.predicate" class="group">
          <!-- Property Header -->
          <th class="py-3 pr-4 text-left align-top font-medium text-muted w-48 whitespace-nowrap">
            <span class="mr-1">{{ prop.predicateLabel }}</span>
            <a
              :href="prop.predicate"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center text-muted hover:text-primary"
              :title="prop.predicateDescription"
            >
              <UIcon name="i-heroicons-arrow-top-right-on-square" class="w-3.5 h-3.5" />
            </a>
          </th>

          <!-- Property Value -->
          <td class="py-3 text-left align-top">
            <!-- Inline rendering for literals and IRIs (comma-separated) -->
            <template v-if="prop.values.every(v => v.type !== 'nested')">
              <span class="inline">
                <template v-for="(val, idx) in prop.values" :key="idx">
                  <span v-if="val.type === 'literal' && val.datatypeLabel" class="flex items-center justify-between gap-2">
                    <component :is="isCodeRendered(prop.predicate) ? 'code' : 'span'" :class="isCodeRendered(prop.predicate) ? 'font-mono text-xs whitespace-pre-wrap break-words bg-muted/40 rounded px-1.5 py-0.5' : ''">{{ val.value }}</component>
                    <UBadge as="a" :href="val.datatype" target="_blank" rel="noopener noreferrer" :title="val.datatype" color="neutral" variant="subtle" size="xs" class="shrink-0 no-underline gap-0.5">
                      {{ val.datatypeLabel }}
                      <UIcon name="i-heroicons-arrow-top-right-on-square" class="w-3 h-3" />
                    </UBadge>
                  </span>
                  <code v-else-if="val.type === 'literal' && isCodeRendered(prop.predicate)" class="font-mono text-xs whitespace-pre-wrap break-words bg-muted/40 rounded px-1.5 py-0.5">{{ val.value }}</code>
                  <span v-else-if="val.type === 'literal'">{{ val.value }}</span>
                  <span v-else-if="val.type === 'iri'" class="inline-flex items-center gap-1">
                    <a
                      :href="val.value"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="text-primary hover:underline"
                      :title="val.description"
                    >{{ val.label }}</a>
                    <a
                      :href="val.value"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="text-muted hover:text-primary"
                      :title="val.description"
                    ><UIcon name="i-heroicons-arrow-top-right-on-square" class="w-3.5 h-3.5" /></a>
                  </span><span v-if="idx < prop.values.length - 1">, </span>
                </template>
              </span>
            </template>

            <!-- Block rendering for nested values (e.g., qualifiedAttribution) -->
            <template v-else>
              <div v-for="(val, idx) in prop.values" :key="idx" class="mb-2 last:mb-0 mr-0.5">
                <template v-if="val.type === 'nested' && val.nestedProperties">
                  <UCard class="bg-elevated">
                    <table class="w-full text-sm">
                      <tbody>
                        <tr v-for="nested in val.nestedProperties" :key="nested.predicate">
                          <th class="py-1 pr-3 text-left font-medium text-muted w-24">
                            {{ nested.predicateLabel }}
                          </th>
                          <td class="py-1">
                            <span class="inline">
                              <template v-for="(nv, nidx) in nested.values" :key="nidx">
                                <span v-if="nv.type === 'literal' && nv.datatypeLabel" class="flex items-center justify-between gap-2">
                                  <component :is="isCodeRendered(nested.predicate) ? 'code' : 'span'" :class="isCodeRendered(nested.predicate) ? 'font-mono text-xs whitespace-pre-wrap break-words bg-muted/40 rounded px-1.5 py-0.5' : ''">{{ nv.value }}</component>
                                  <UBadge as="a" :href="nv.datatype" target="_blank" rel="noopener noreferrer" :title="nv.datatype" color="neutral" variant="subtle" size="xs" class="shrink-0 no-underline gap-0.5">
                                    {{ nv.datatypeLabel }}
                                    <UIcon name="i-heroicons-arrow-top-right-on-square" class="w-3 h-3" />
                                  </UBadge>
                                </span>
                                <code v-else-if="nv.type === 'literal' && isCodeRendered(nested.predicate)" class="font-mono text-xs whitespace-pre-wrap break-words bg-muted/40 rounded px-1.5 py-0.5">{{ nv.value }}</code>
                                <span v-else-if="nv.type === 'literal'">{{ nv.value }}</span>
                                <span v-else-if="nv.type === 'iri'" class="inline-flex items-center gap-1">
                                  <a
                                    :href="nv.value"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    class="text-primary hover:underline"
                                    :title="nv.description"
                                  >{{ nv.label }}</a>
                                  <a
                                    :href="nv.value"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    class="text-muted hover:text-primary"
                                  ><UIcon name="i-heroicons-arrow-top-right-on-square" class="w-3.5 h-3.5" /></a>
                                </span><span v-if="nidx < nested.values.length - 1">, </span>
                              </template>
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </UCard>
                </template>
              </div>
            </template>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
