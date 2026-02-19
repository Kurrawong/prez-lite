<script setup lang="ts">
const fluid = provideFluidLayout()
</script>

<template>
  <div>
    <SiteHeader />
    <UMain class="min-h-[calc(100vh-12rem)]">
      <UContainer :class="{ 'max-w-full': fluid }">
        <slot />
      </UContainer>
    </UMain>
    <SiteFooter />
  </div>
</template>
