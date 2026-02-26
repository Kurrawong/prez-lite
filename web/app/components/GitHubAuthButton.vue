<script setup lang="ts">
const { isAuthenticated, isEnabled, user, loading, login, logout } = useGitHubAuth()
const workspace = useWorkspace()

const menuItems = computed(() => [
  [
    ...(workspace.isEnabled.value
      ? [{
          label: workspace.hasWorkspace.value ? `Workspace: ${workspace.workspaceLabel.value}` : 'Select workspace',
          icon: 'i-heroicons-folder-open',
          onSelect: () => navigateTo('/workspace'),
        }]
      : []),
    {
      label: 'Sign out',
      icon: 'i-heroicons-arrow-right-on-rectangle',
      onSelect: handleLogout,
    },
  ],
])

function handleLogout() {
  workspace.clearWorkspace()
  logout()
}

// Navigate to workspace page after fresh login (no workspace selected yet)
watch(isAuthenticated, (authenticated) => {
  if (authenticated && workspace.isEnabled.value && !workspace.hasWorkspace.value) {
    navigateTo('/workspace')
  }
})
</script>

<template>
  <template v-if="isEnabled">
    <UButton
      v-if="loading"
      variant="ghost"
      size="sm"
      disabled
    >
      <UIcon name="i-heroicons-arrow-path" class="size-4 animate-spin" />
    </UButton>

    <UDropdownMenu v-else-if="isAuthenticated && user" :items="menuItems" :ui="{ content: 'z-50' }">
      <UButton variant="ghost" size="sm" class="gap-2">
        <img :src="user.avatar_url" :alt="user.login" class="size-5 rounded-full" />
        <span class="hidden sm:inline text-sm">{{ user.login }}</span>
      </UButton>
    </UDropdownMenu>

    <UButton
      v-else
      variant="ghost"
      size="sm"
      icon="i-simple-icons-github"
      @click="login"
    >
      Sign in
    </UButton>
  </template>
</template>
