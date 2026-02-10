<script setup lang="ts">
// Site configuration - can be customized per deployment
const siteConfig = {
  name: 'Prez Lite',
  logo: null as string | null, // Path to logo image
  tagline: 'Vocabulary Publishing Platform',
  footerText: 'An open source vocabulary publishing system',
  footerLinks: [
    { label: 'GitHub', href: 'https://github.com/hjohns/prez-lite' },
    { label: 'Documentation', href: '/about' }
  ]
}

// Build navigation from content frontmatter
const { data: navPages } = await useAsyncData('navigation', async () => {
  const pages = await queryCollection('pages').all()
  return pages
    .filter(p => p.navigation === true)
    .sort((a, b) => (a.order ?? 99) - (b.order ?? 99))
})

const navLinks = computed(() =>
  (navPages.value ?? []).map(page => ({
    label: page.navTitle || page.title,
    to: page.path === '/index' ? '/' : page.path
  }))
)
</script>

<template>
  <UApp>
    <UHeader class="border-b border-default">
      <template #left>
        <NuxtLink to="/" class="flex items-center gap-3">
          <img
            v-if="siteConfig.logo"
            :src="siteConfig.logo"
            :alt="siteConfig.name"
            class="h-10 w-auto"
          />
          <UIcon v-else name="i-heroicons-book-open" class="size-8 text-primary" />
          <div class="flex flex-col">
            <span class="font-bold text-lg text-highlighted leading-tight">{{ siteConfig.name }}</span>
            <span class="text-xs text-muted hidden sm:block">{{ siteConfig.tagline }}</span>
          </div>
        </NuxtLink>
      </template>

      <UNavigationMenu :items="navLinks" />

      <template #right>
        <GitHubAuthButton />
        <UColorModeButton variant="ghost" />
      </template>

      <template #body>
        <UNavigationMenu :items="navLinks" orientation="vertical" class="-mx-2.5" />
      </template>
    </UHeader>

    <UMain class="min-h-[calc(100vh-12rem)]">
      <UContainer>
        <NuxtPage />
      </UContainer>
    </UMain>

    <footer class="border-t border-default bg-muted">
      <UContainer>
        <div class="py-8">
          <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div class="flex items-center gap-3">
              <UIcon name="i-heroicons-book-open" class="size-6 text-muted" />
              <div>
                <p class="font-semibold text-default">{{ siteConfig.name }}</p>
                <p class="text-sm text-muted">{{ siteConfig.footerText }}</p>
              </div>
            </div>

            <div class="flex items-center gap-6">
              <a
                v-for="link in siteConfig.footerLinks"
                :key="link.label"
                :href="link.href"
                class="text-sm text-muted hover:text-primary transition-colors"
              >
                {{ link.label }}
              </a>
            </div>
          </div>

          <USeparator class="my-6" />

          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm text-muted">
            <p>&copy; {{ new Date().getFullYear() }} All rights reserved.</p>
            <p>
              Powered by
              <a
                href="https://github.com/Kurrawong/prez-lite"
                target="_blank"
                class="text-primary hover:underline"
              >
                Prez Lite
              </a>
            </p>
          </div>
        </div>
      </UContainer>
    </footer>
  </UApp>
</template>
