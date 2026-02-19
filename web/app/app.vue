<script setup lang="ts">
const { init } = useGitHubAuth()

// Detect OAuth callback before first client render to prevent home page flash.
// The inline head script hides pre-rendered HTML instantly (before hydration).
// Vue then hydrates with the spinner visible, and onMounted restores visibility.
const isOAuthCallback = ref(
  import.meta.client && window.location.hash.includes('gh_token=')
)

useHead({
  script: [{
    key: 'auth-callback',
    innerHTML: "if(location.hash.indexOf('gh_token=')>-1)document.documentElement.style.visibility='hidden'",
  }],
})

onMounted(async () => {
  // Restore visibility — Vue has hydrated and shows spinner (or normal content)
  document.documentElement.style.visibility = ''
  await init()
  isOAuthCallback.value = false
})
</script>

<template>
  <UApp>
    <NuxtLayout>
      <div v-if="isOAuthCallback" class="flex items-center justify-center min-h-screen">
        <UIcon name="i-heroicons-arrow-path" class="size-6 animate-spin text-muted" />
      </div>
      <NuxtPage v-else />
    </NuxtLayout>
  </UApp>
</template>
