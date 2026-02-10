<template>
  <div class="flex items-center gap-1.5 px-3 py-2 bg-background/80 backdrop-blur-lg rounded-xl border border-border/50 shadow-lg">
    <!-- Select tool -->
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger as-child>
          <Button
            size="icon"
            :variant="selectedTool === 'select' ? 'default' : 'ghost'"
            class="h-8 w-8"
            @click="$emit('select-tool', 'select')"
          >
            <MousePointer2 class="w-3.5 h-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top"><p>Select & Move</p></TooltipContent>
      </Tooltip>
    </TooltipProvider>

    <Separator orientation="vertical" class="h-5 mx-0.5" />

    <!-- Route drawing tools -->
    <TooltipProvider v-for="tool in routeTools" :key="tool.id">
      <Tooltip>
        <TooltipTrigger as-child>
          <Button
            size="icon"
            :variant="selectedTool === tool.id ? 'default' : 'ghost'"
            class="h-8 w-8"
            @click="$emit('select-tool', tool.id)"
          >
            <component :is="tool.icon" class="w-3.5 h-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top"><p>{{ tool.label }}</p></TooltipContent>
      </Tooltip>
    </TooltipProvider>

    <Separator orientation="vertical" class="h-5 mx-0.5" />

    <!-- Motion / Rollout -->
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger as-child>
          <Button
            size="icon"
            :variant="selectedTool === 'motion' ? 'default' : 'ghost'"
            class="h-8 w-8"
            @click="$emit('select-tool', 'motion')"
          >
            <Move class="w-3.5 h-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top"><p>QB Rollout / Motion</p></TooltipContent>
      </Tooltip>
    </TooltipProvider>

    <!-- Read Order -->
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger as-child>
          <Button
            size="icon"
            :variant="selectedTool === 'readorder' ? 'default' : 'ghost'"
            class="h-8 w-8"
            @click="$emit('select-tool', 'readorder')"
          >
            <ListOrdered class="w-3.5 h-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top"><p>Read Progression (1, 2, 3…)</p></TooltipContent>
      </Tooltip>
    </TooltipProvider>

    <!-- Erase -->
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger as-child>
          <Button
            size="icon"
            :variant="selectedTool === 'erase' ? 'default' : 'ghost'"
            class="h-8 w-8"
            @click="$emit('select-tool', 'erase')"
          >
            <Eraser class="w-3.5 h-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top"><p>Erase Route</p></TooltipContent>
      </Tooltip>
    </TooltipProvider>

    <Separator orientation="vertical" class="h-5 mx-0.5" />

    <!-- Quick actions -->
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger as-child>
          <Button size="icon" variant="ghost" class="h-8 w-8" @click="$emit('clear-routes')">
            <RotateCcw class="w-3.5 h-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top"><p>Clear all routes</p></TooltipContent>
      </Tooltip>
    </TooltipProvider>

    <div class="w-2" />

    <!-- Save -->
    <Button
      size="sm"
      class="h-8 px-3"
      variant="outline"
      @click="$emit('save')"
      :disabled="!isDirty"
    >
      <Check class="w-3.5 h-3.5 mr-1" />
      Save
    </Button>
  </div>
</template>

<script setup lang="ts">
import type { CanvasTool } from '~/lib/types'
import { Button } from '~/components/ui/button'
import { Separator } from '~/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip'
import {
  MousePointer2,
  Minus,
  Spline,
  GitBranch,
  Move,
  ListOrdered,
  Eraser,
  RotateCcw,
  Check,
} from 'lucide-vue-next'

defineProps<{
  selectedTool: CanvasTool
  isDirty: boolean
}>()

defineEmits<{
  'select-tool': [tool: CanvasTool]
  'clear-routes': []
  'save': []
}>()

const routeTools = [
  { id: 'straight' as CanvasTool, label: 'Straight Route', icon: Minus },
  { id: 'curve' as CanvasTool, label: 'Curve Route', icon: Spline },
  { id: 'option' as CanvasTool, label: 'Option Route (dashed)', icon: GitBranch },
]
</script>
