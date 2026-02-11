<script setup lang="ts">
const site = useSiteConfig()
</script>

<template>
  <footer class="border-t border-default bg-muted">
    <UContainer>
      <div class="py-8">
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <slot name="brand">
            <div class="flex items-center gap-3">
              <UIcon :name="site.icon" class="size-6 text-muted" />
              <div>
                <p class="font-semibold text-default">{{ site.name }}</p>
                <p class="text-sm text-muted">{{ site.footerText }}</p>
              </div>
            </div>
          </slot>

          <slot name="links">
            <div class="flex items-center gap-6">
              <a
                v-for="link in site.footerLinks"
                :key="link.label"
                :href="link.href"
                class="text-sm text-muted hover:text-primary transition-colors"
              >
                {{ link.label }}
              </a>
            </div>
          </slot>
        </div>

        <USeparator class="my-6" />

        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm text-muted">
          <slot name="copyright">
            <p>&copy; {{ new Date().getFullYear() }} All rights reserved.</p>
          </slot>
          <slot name="attribution">
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
          </slot>
        </div>
      </div>
    </UContainer>
  </footer>
</template>
