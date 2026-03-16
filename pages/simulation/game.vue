<template>
  <div class="flex flex-col min-h-[60vh]">
    <div
      v-if="!hasSimulationAccess"
      class="flex flex-1 flex-col items-center justify-center p-8 text-center"
    >
      <h2 class="text-2xl font-semibold tracking-tight font-display mb-2">Upgrade to Pro</h2>
      <p class="text-muted-foreground max-w-md mb-6">
        Simulation features are available on Pro. Upgrade to run game simulations and test your playbooks.
      </p>
      <NuxtLink to="/settings?tab=billing">
        <Button>Upgrade to Pro</Button>
      </NuxtLink>
    </div>
    <div
      v-else
      class="flex flex-col items-center justify-center flex-1 text-center space-y-4"
    >
      <div class="p-4 rounded-full bg-muted/50">
        <Gamepad2 class="w-12 h-12 text-muted-foreground" />
      </div>
      <div>
        <h2 class="text-2xl font-bold tracking-tight font-display">Game Simulation</h2>
        <p class="text-muted-foreground mt-2 max-w-md mx-auto">
          Full game simulation engine is coming soon. Test your playbooks against AI opponents.
        </p>
      </div>
      <div class="flex flex-col gap-3 items-center">
        <div class="flex gap-3">
          <Button
            :disabled="engine.rateLimited"
            @click="$router.push('/simulation/play-lab')"
          >
            Try Play Lab
          </Button>
          <Button variant="outline" @click="$router.push('/')">Return Home</Button>
        </div>
        <p v-if="engine.rateLimited" class="text-sm text-amber-600 dark:text-amber-500">
          You've submitted too many simulations. Try again in {{ engine.retryAfterSeconds }} seconds.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Gamepad2 } from 'lucide-vue-next'
import { Button } from '~/components/ui/button'

const { hasSimulationAccess } = usePlanAccess()
const engine = useEngineClient()
</script>
