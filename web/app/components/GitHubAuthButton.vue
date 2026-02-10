<script setup lang="ts">
const { isAuthenticated, isEnabled, user, loading, login, logout, init } = useGitHubAuth()

onMounted(() => init())
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

    <UDropdownMenu v-else-if="isAuthenticated && user" :items="[[{ label: 'Sign out', icon: 'i-heroicons-arrow-right-on-rectangle', onSelect: logout }]]">
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
