<template>
  <Card class="glass glass-hover transition-all duration-200 group">
    <CardHeader class="pb-3">
      <div class="flex items-center justify-between">
        <CardTitle class="text-base">{{ team.name }}</CardTitle>
        <div v-if="team.name !== 'Free Agent'" class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button size="icon" variant="ghost" class="h-8 w-8" @click="$emit('edit')">
            <Pencil class="w-3.5 h-3.5" />
          </Button>
          <Button size="icon" variant="ghost" class="h-8 w-8 text-destructive" @click="$emit('delete')">
            <Trash2 class="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
      <CardDescription v-if="team.description">{{ team.description }}</CardDescription>
    </CardHeader>
    <CardContent>
      <div class="flex items-center gap-2 text-sm text-muted-foreground">
        <Users class="w-4 h-4" />
        <span>{{ team.team_players?.length ?? 0 }} players</span>
      </div>
      <div v-if="team.team_players?.length" class="mt-3 flex flex-wrap gap-1.5">
        <Badge
          v-for="tp in team.team_players.slice(0, 5)"
          :key="tp.id"
          variant="secondary"
          class="text-xs"
        >
          {{ tp.player?.name ?? 'Unknown' }}
          <span v-if="tp.offense_position" class="ml-1 text-primary">{{ tp.offense_position }}</span>
          <span v-if="tp.defense_position" class="ml-1 text-destructive">{{ tp.defense_position }}</span>
        </Badge>
        <Badge v-if="(team.team_players?.length ?? 0) > 5" variant="outline" class="text-xs">
          +{{ (team.team_players?.length ?? 0) - 5 }} more
        </Badge>
      </div>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import type { Team } from '~/lib/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Pencil, Trash2, Users } from 'lucide-vue-next'

defineProps<{
  team: Team
}>()

defineEmits<{
  edit: []
  delete: []
}>()
</script>
