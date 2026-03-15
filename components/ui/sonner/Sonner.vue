<script setup lang="ts">
import { Toaster } from 'vue-sonner'
</script>

<template>
  <Toaster
    position="top-center"
    theme="dark"
    :toast-options="{
      class: 'sonner-toast',
    }"
  />
</template>
