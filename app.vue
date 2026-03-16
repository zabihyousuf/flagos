<template>
  <NuxtLayout>
    <NuxtPage />
    <ClientOnly>
      <UiSonner />
    </ClientOnly>
  </NuxtLayout>
</template>

<script setup lang="ts">
import UiSonner from '~/components/ui/sonner'
</script>
