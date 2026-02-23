<script setup lang="ts">
import type { TourMenuItem } from '~/components/tour/TourMenu.vue'

const site = useSiteConfig()
const { navLinks } = useNavigation()
const { isAuthenticated } = useGitHubAuth()

const availableTours = computed<TourMenuItem[]>(() => {
  const tours: TourMenuItem[] = [
    { id: 'site-overview', label: 'Site Overview', icon: 'i-heroicons-play-circle' },
  ]
  if (isAuthenticated.value) {
    tours.push({ id: 'editor-guide', label: 'Editor Guide', icon: 'i-heroicons-pencil-square' })
  }
  return tours
})
</script>

<template>
  <UHeader class="border-b border-default">
    <template #left>
      <slot name="branding">
        <NuxtLink to="/" class="flex items-center gap-3">
          <img
            v-if="site.logo"
            :src="site.logo"
            :alt="site.name"
            class="h-10 w-auto"
          />
          <UIcon v-else :name="site.icon" class="size-8 text-primary" />
          <div class="flex flex-col">
            <span class="font-bold text-lg text-highlighted leading-tight">{{ site.name }}</span>
            <span class="text-xs text-muted hidden sm:block">{{ site.tagline }}</span>
          </div>
        </NuxtLink>
      </slot>
    </template>

    <slot name="navigation">
      <UNavigationMenu :items="navLinks" :ui="{ viewportWrapper: 'z-[60]' }" />
    </slot>

    <template #right>
      <slot name="actions">
        <TourMenu :tours="availableTours" />
        <UButton
          to="/search"
          icon="i-heroicons-magnifying-glass"
          color="neutral"
          variant="ghost"
          aria-label="Search vocabularies"
        />
        <GitHubAuthButton />
        <UColorModeButton variant="ghost" />
      </slot>
    </template>

    <template #body>
      <slot name="mobile-navigation">
        <UNavigationMenu :items="navLinks" orientation="vertical" class="-mx-2.5" />
      </slot>
    </template>
  </UHeader>
</template>
