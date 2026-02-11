<template>
  <div class="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
    <div class="p-4 rounded-full bg-muted/50">
      <FlaskConical class="w-12 h-12 text-muted-foreground" />
    </div>
    <div>
      <h2 class="text-2xl font-bold tracking-tight font-display">Scenario Test</h2>
      <p class="text-muted-foreground mt-2 max-w-md mx-auto">
        Scenario testing lab is coming soon. Configure specific game situations and analyze outcomes.
      </p>
    </div>
    <Button variant="outline" @click="$router.push('/')">Return Home</Button>
  </div>
</template>

<script setup lang="ts">
import { FlaskConical } from 'lucide-vue-next'
import { Button } from '~/components/ui/button'
</script>
