<script setup lang="ts">
const site = useSiteConfig()
const { navLinks } = useNavigation()
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
      <UNavigationMenu :items="navLinks" />
    </slot>

    <template #right>
      <slot name="actions">
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
