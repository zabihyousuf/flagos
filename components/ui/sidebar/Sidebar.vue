<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { cn } from "@/lib/utils"

defineProps<{
  class?: HTMLAttributes["class"]
}>()
</script>

<template>
  <aside data-slot="sidebar" :class="cn('flex flex-col', $props.class)">
    <slot />
  </aside>
</template>
