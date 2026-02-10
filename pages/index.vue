<template>
  <div class="space-y-8">
    <div>
      <h2 class="text-2xl font-semibold tracking-tight font-display">Dashboard</h2>
      <p class="text-muted-foreground text-sm mt-1">Welcome to FlagOS. Here's your overview.</p>
    </div>

    <!-- Stats Grid -->
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card v-for="stat in stats" :key="stat.label" class="glass">
        <CardContent class="p-5">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-muted-foreground">{{ stat.label }}</p>
              <p class="text-3xl font-bold mt-1 text-foreground">{{ stat.value }}</p>
            </div>
            <div class="w-10 h-10 rounded-lg flex items-center justify-center" :class="stat.colorBg">
              <component :is="stat.icon" class="w-5 h-5" :class="stat.colorText" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- Quick Actions -->
    <div>
      <h3 class="text-lg font-semibold mb-4 font-display">Quick Actions</h3>
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <NuxtLink to="/playbooks">
          <Card class="glass glass-hover transition-all duration-200 cursor-pointer">
            <CardContent class="p-5 flex items-center gap-4">
              <div class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <BookOpen class="w-5 h-5 text-primary" />
              </div>
              <div>
                <p class="font-medium text-sm">Manage Playbooks</p>
                <p class="text-xs text-muted-foreground mt-0.5">Create and organize your plays</p>
              </div>
            </CardContent>
          </Card>
        </NuxtLink>

        <NuxtLink to="/players">
          <Card class="glass glass-hover transition-all duration-200 cursor-pointer">
            <CardContent class="p-5 flex items-center gap-4">
              <div class="w-10 h-10 rounded-lg bg-chart-2/10 flex items-center justify-center">
                <Users class="w-5 h-5 text-chart-2" />
              </div>
              <div>
                <p class="font-medium text-sm">Manage Players</p>
                <p class="text-xs text-muted-foreground mt-0.5">Add players and set attributes</p>
              </div>
            </CardContent>
          </Card>
        </NuxtLink>

        <NuxtLink to="/teams">
          <Card class="glass glass-hover transition-all duration-200 cursor-pointer">
            <CardContent class="p-5 flex items-center gap-4">
              <div class="w-10 h-10 rounded-lg bg-chart-3/10 flex items-center justify-center">
                <Shield class="w-5 h-5 text-chart-3" />
              </div>
              <div>
                <p class="font-medium text-sm">Manage Teams</p>
                <p class="text-xs text-muted-foreground mt-0.5">Build your teams and roster</p>
              </div>
            </CardContent>
          </Card>
        </NuxtLink>
      </div>
    </div>

    <!-- Recent Playbooks -->
    <div v-if="playbooks.length > 0">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold font-display">Recent Playbooks</h3>
        <NuxtLink to="/playbooks" class="text-sm text-primary hover:underline">View all</NuxtLink>
      </div>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <PlaybookCard
          v-for="pb in playbooks.slice(0, 3)"
          :key="pb.id"
          :playbook="pb"
          @edit="() => {}"
          @delete="() => {}"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Card, CardContent } from '~/components/ui/card'
import { BookOpen, Users, Shield, Swords } from 'lucide-vue-next'

const { playbooks, fetchPlaybooks } = usePlaybooks()
const { players, fetchPlayers } = usePlayers()
const { teams, fetchTeams } = useTeams()

const stats = computed(() => [
  { label: 'Playbooks', value: playbooks.value.length, icon: BookOpen, colorBg: 'bg-primary/10', colorText: 'text-primary' },
  { label: 'Total Plays', value: playbooks.value.reduce((acc, pb) => acc + (pb.plays?.length ?? 0), 0), icon: Swords, colorBg: 'bg-chart-1/10', colorText: 'text-chart-1' },
  { label: 'Players', value: players.value.length, icon: Users, colorBg: 'bg-chart-2/10', colorText: 'text-chart-2' },
  { label: 'Teams', value: teams.value.length, icon: Shield, colorBg: 'bg-chart-4/10', colorText: 'text-chart-4' },
])

onMounted(() => {
  fetchPlaybooks()
  fetchPlayers()
  fetchTeams()
})
</script>
