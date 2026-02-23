<template>
  <div class="border border-border rounded-lg overflow-hidden">
    <button
      type="button"
      class="w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium bg-muted/50 hover:bg-muted/70 transition-colors"
      @click="open = !open"
    >
      <span>{{ title }}</span>
      <ChevronDown
        class="w-4 h-4 text-muted-foreground transition-transform duration-200"
        :class="{ 'rotate-180': open }"
      />
    </button>
    <Transition
      enter-active-class="transition-all duration-200 ease-out"
      enter-from-class="max-h-0 opacity-0"
      enter-to-class="max-h-[2000px] opacity-100"
      leave-active-class="transition-all duration-150 ease-in"
      leave-from-class="max-h-[2000px] opacity-100"
      leave-to-class="max-h-0 opacity-0"
    >
      <div v-show="open" class="overflow-hidden">
        <div class="px-3 pb-3 pt-0">
          <slot />
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ChevronDown } from 'lucide-vue-next'

defineProps<{
  title: string
}>()

const open = defineModel<boolean>('open', { default: true })
</script>
