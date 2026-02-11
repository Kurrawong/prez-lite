<template>
  <div>
    <SiteHeader />
    <UMain class="min-h-[calc(100vh-12rem)]">
      <UContainer>
        <slot />
      </UContainer>
    </UMain>
    <SiteFooter />
  </div>
</template>
