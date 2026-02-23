<template>
  <div class="flex items-center gap-3">
    <Label class="text-sm text-muted-foreground shrink-0 min-w-[140px]">{{ label }}</Label>
    <div class="flex-1 flex items-center gap-2">
      <Slider
        :model-value="[modelValue]"
        :min="1"
        :max="10"
        :step="1"
        class="flex-1"
        @update:model-value="$emit('update:modelValue', ($event as number[])[0])"
      />
      <span class="w-6 text-xs font-medium text-muted-foreground text-right">{{ modelValue }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Slider } from '~/components/ui/slider'
import { Label } from '~/components/ui/label'

defineProps<{
  label: string
  modelValue: number
}>()

defineEmits<{
  'update:modelValue': [value: number]
}>()
</script>
