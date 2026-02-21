<template>
  <div class="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
    <div class="p-4 rounded-full bg-muted/50">
      <Gamepad2 class="w-12 h-12 text-muted-foreground" />
    </div>
    <div>
      <h2 class="text-2xl font-bold tracking-tight font-display">Game Simulation</h2>
      <p class="text-muted-foreground mt-2 max-w-md mx-auto">
        Full game simulation engine is coming soon. Test your playbooks against AI opponents.
      </p>
    </div>
    <div class="flex gap-3">
      <Button @click="$router.push('/simulation/scenario')">
        Try Play Simulation
      </Button>
      <Button variant="outline" @click="$router.push('/')">Return Home</Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Gamepad2 } from 'lucide-vue-next'
import { Button } from '~/components/ui/button'
</script>
