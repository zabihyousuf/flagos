<template>
  <div class="flex items-center gap-1">
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
        <TooltipContent side="bottom"><p>Select & Move</p></TooltipContent>
      </Tooltip>
    </TooltipProvider>

    <Separator orientation="vertical" class="h-5 mx-0.5" />

    <!-- Route drawing tools (offense only; defense uses coverage/rush path) -->
    <TooltipProvider v-for="tool in routeTools" :key="tool.id">
      <Tooltip>
        <TooltipTrigger as-child>
          <Button
            size="icon"
            :variant="selectedTool === tool.id ? 'default' : 'ghost'"
            class="h-8 w-8"
            :disabled="routeToolsDisabled"
            @click="$emit('select-tool', tool.id)"
          >
            <component :is="tool.icon" class="w-3.5 h-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>{{ routeToolsDisabled ? 'Route tools (offense only)' : tool.label }}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>

    <Separator orientation="vertical" class="h-5 mx-0.5" />

    <!-- Motion / Rollout (C cannot motion; QB only rollout via Suggest Play) -->
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger as-child>
          <Button
            size="icon"
            :variant="selectedTool === 'motion' ? 'default' : 'ghost'"
            class="h-8 w-8"
            :disabled="motionToolDisabled"
            @click="$emit('select-tool', 'motion')"
          >
            <Move class="w-3.5 h-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>{{ motionToolDisabled ? 'Motion (offense only)' : 'Motion (C cannot; QB = rollout)' }}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>

    <!-- Read Order (offense only) -->
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger as-child>
          <Button
            size="icon"
            :variant="selectedTool === 'readorder' ? 'default' : 'ghost'"
            class="h-8 w-8"
            :disabled="readOrderDisabled"
            @click="$emit('select-tool', 'readorder')"
          >
            <ListOrdered class="w-3.5 h-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>{{ readOrderDisabled ? 'Read progression (offense only)' : 'Read Progression (1, 2, 3…)' }}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>

    <!-- Zone position (defense only, coverage player selected): Locked to player / Unlocked — drag on field -->
    <TooltipProvider v-if="showZonePositionButton">
      <Tooltip>
        <TooltipTrigger as-child>
          <Button
            size="icon"
            :variant="zonePositionUnlocked ? 'default' : 'ghost'"
            class="h-8 w-8"
            @click="$emit('toggle-zone-position')"
          >
            <Crosshair class="w-3.5 h-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>{{ zonePositionUnlocked ? 'Zone unlocked — drag on field' : 'Zone locked to player' }}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>

    <!-- QB throws here (primary target) - offense only, when a receiver is selected -->
    <TooltipProvider v-if="canSetPrimaryTarget">
      <Tooltip>
        <TooltipTrigger as-child>
          <Button
            size="icon"
            :variant="selectedPlayerIsPrimary ? 'default' : 'ghost'"
            class="h-8 w-8 text-amber-600 hover:text-amber-700"
            @click="$emit('set-primary-target')"
          >
            <Target class="w-3.5 h-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom"><p>{{ selectedPlayerIsPrimary ? 'QB throws here' : 'QB throws here (set as primary)' }}</p></TooltipContent>
      </Tooltip>
    </TooltipProvider>

    <!-- Erase Route (offense only) -->
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger as-child>
          <Button
            size="icon"
            :variant="selectedTool === 'erase' ? 'default' : 'ghost'"
            class="h-8 w-8"
            :disabled="eraseToolDisabled"
            @click="$emit('select-tool', 'erase')"
          >
            <Eraser class="w-3.5 h-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>{{ eraseToolDisabled ? 'Erase route (offense only)' : 'Erase Route' }}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>

    <Separator orientation="vertical" class="h-5 mx-0.5" />

    <!-- Suggest Play (offense only) -->
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger as-child>
          <Button
            size="icon"
            variant="ghost"
            class="h-8 w-8 text-primary"
            :disabled="suggestPlayDisabled"
            @click="$emit('ai-action', 'suggest-play')"
          >
            <Sparkles class="w-3.5 h-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>{{ suggestPlayDisabled ? 'Suggest Play (offense only)' : 'Suggest Play' }}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>

    <Separator orientation="vertical" class="h-5 mx-0.5" />

    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger as-child>
          <Button size="icon" variant="ghost" class="h-8 w-8" @click="$emit('clear-routes')">
            <Trash2 class="w-3.5 h-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom"><p>Clear all routes</p></TooltipContent>
      </Tooltip>
    </TooltipProvider>
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
  Crosshair,
  Eraser,
  Trash2,
  Sparkles,
  Target,
} from 'lucide-vue-next'

const props = defineProps<{
  selectedTool: CanvasTool
  /** Show "QB throws here" button when an offense receiver is selected */
  canSetPrimaryTarget?: boolean
  /** Selected player is currently the primary target */
  selectedPlayerIsPrimary?: boolean
  /** Disable Suggest Play (e.g. for defense) */
  suggestPlayDisabled?: boolean
  /** Disable Motion tool (e.g. on defense, or when C or QB selected) */
  motionToolDisabled?: boolean
  /** Disable Read Progression tool (e.g. on defense) */
  readOrderDisabled?: boolean
  /** Disable route drawing tools (straight, curve, option) e.g. when in defense mode */
  routeToolsDisabled?: boolean
  /** Disable Erase Route tool (e.g. on defense) */
  eraseToolDisabled?: boolean
  /** Show Zone position toggle (defense, coverage player selected) */
  showZonePositionButton?: boolean
  /** Selected coverage player's zone is unlocked (drag on field) */
  zonePositionUnlocked?: boolean
}>()

defineEmits<{
  'select-tool': [tool: CanvasTool]
  'clear-routes': []
  'ai-action': [action: string]
  'set-primary-target': []
  'toggle-zone-position': []
}>()

const routeTools = [
  { id: 'straight' as CanvasTool, label: 'Straight Route', icon: Minus },
  { id: 'curve' as CanvasTool, label: 'Curve Route', icon: Spline },
  { id: 'option' as CanvasTool, label: 'Option Route (dashed)', icon: GitBranch },
]
</script>
