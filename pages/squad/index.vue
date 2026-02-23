<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-semibold tracking-tight font-display">Locker Room</h2>
        <p class="text-muted-foreground text-sm mt-1">Manage your teams, roster, and player attributes.</p>
      </div>

    </div>

    <!-- Team tracking slots -->
    <div class="space-y-2">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-medium text-muted-foreground uppercase tracking-wide font-display">Teams</h3>
        <Button size="sm" variant="ghost" class="text-xs h-8" @click="teamDialogOpen = true">
          <Plus class="w-3 h-3 mr-1.5" />
          New Team
        </Button>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <!-- Filled slots -->
        <div
          v-for="team in trackedTeams"
          :key="team.id"
          class="rounded-lg border bg-card p-4 min-h-[80px] flex flex-col justify-center shadow hover:shadow-md transition-shadow min-w-0"
          :style="{ borderColor: (teamColorMap.get(team.id) ?? '#888') + '40' }"
        >
          <div class="space-y-1">
            <div class="flex items-center justify-between">
              <span
                class="font-semibold text-sm"
                :style="{ color: teamColorMap.get(team.id) ?? '#888' }"
              >
                {{ team.name }}
              </span>
              <Button size="icon" variant="ghost" class="h-6 w-6" @click="removeTrackedTeam(team.id)">
                <X class="w-3 h-3" />
              </Button>
            </div>
            <div class="flex gap-3 text-xs text-muted-foreground">
              <span>OVR <span class="font-semibold text-primary">{{ slotScores[team.id]?.overall ?? 0 }}</span></span>
              <span>OFF <span class="font-semibold text-chart-1">{{ slotScores[team.id]?.off ?? 0 }}</span></span>
              <span>DEF <span class="font-semibold text-chart-4">{{ slotScores[team.id]?.def ?? 0 }}</span></span>
              <span>{{ slotPlayerCounts[team.id] ?? 0 }} players</span>
            </div>
          </div>
        </div>

        <!-- Empty slot (Add Team) - Only show if < 3 teams -->
        <div
          v-if="trackedTeams.length < 3"
          class="rounded-lg border-2 border-dashed border-muted-foreground/15 p-4 min-h-[80px] flex flex-col justify-center min-w-0"
        >
          <Select :model-value="''" @update:model-value="(v: any) => addTrackedTeam(String(v ?? ''))">
            <SelectTrigger class="border-none bg-transparent shadow-none h-auto p-0 text-muted-foreground">
              <SelectValue placeholder="+ Select team" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="t in availableTeamsForSlot"
                :key="t.id"
                :value="t.id"
              >
                {{ t.name }}
              </SelectItem>
              <SelectItem value="__new__">+ New Team</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>

      <div class="space-y-4 min-w-0">
        <div class="flex items-center justify-between flex-wrap gap-2">
          <div class="flex items-center gap-4 min-w-0 flex-wrap">
            <h3 class="text-sm font-medium text-muted-foreground uppercase tracking-wide font-display">Players</h3>
            <div class="relative w-[200px]">
              <Search class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input v-model="searchQuery" placeholder="Search..." class="pl-9 h-9" />
            </div>
            <Button variant="ghost" size="sm" class="h-9" :class="showFilters ? 'bg-muted' : ''" @click="showFilters = !showFilters">
              <Filter class="w-4 h-4 mr-2" />
              Filters
              <Badge v-if="hasActiveFilters" variant="secondary" class="ml-2 h-5 px-1.5 text-[11px] tabular-nums">Active</Badge>
            </Button>
          </div>

          <div v-if="players.length > 0" class="flex flex-wrap items-center gap-2">
          <TooltipProvider>
            <Tooltip>
               <TooltipTrigger as-child>
                  <Button variant="outline" size="sm" class="h-8 text-xs" @click="handleResetStarters" :disabled="resettingStarters || autoingStarters || loading || players.length === 0">
                    <Loader2 v-if="resettingStarters" class="w-3 h-3 mr-2 animate-spin" />
                    <RotateCcw v-else class="w-3 h-3 mr-2" />
                    Reset
                  </Button>
               </TooltipTrigger>
               <TooltipContent>
                  <p>Clear all starter assignments. Does not affect locked players.</p>
               </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
             <Tooltip>
                <TooltipTrigger as-child>
                   <Button variant="outline" size="sm" class="h-8 text-xs" @click="handleAutoStarters" :disabled="autoingStarters || resettingStarters || loading || players.length === 0">
                     <Loader2 v-if="autoingStarters" class="w-3 h-3 mr-2 animate-spin" />
                     <Zap v-else class="w-3 h-3 mr-2" />
                     Auto
                   </Button>
                </TooltipTrigger>
                <TooltipContent>
                   <p>Automatically assign best starters based on attributes. Does not affect locked players.</p>
                </TooltipContent>
             </Tooltip>
          </TooltipProvider>
            <Button variant="outline" size="sm" class="h-8 text-xs" @click="exportPlayers(filteredPlayers)" :disabled="filteredPlayers.length === 0">
              <Download class="w-3 h-3 mr-2" />
              Export
            </Button>
            <Button variant="outline" size="sm" class="h-8 text-xs" @click="openDialog(null)">
              <Plus class="w-3 h-3 mr-2" />
              Add Player
            </Button>
            <Button size="sm" class="h-8 text-xs" @click="bulkImportOpen = true">
              <Plus class="w-3 h-3 mr-2" />
              Add Players
            </Button>
          </div>
        </div>

        <!-- Filters Row -->
        <div v-if="showFilters && players.length > 0" class="flex flex-wrap items-center gap-2 p-3 bg-muted/30 rounded-lg border animate-in slide-in-from-top-2 fade-in duration-200">
          <div class="text-xs font-medium text-muted-foreground mr-2 uppercase tracking-wide">Filter by:</div>
          <Select v-model="filterPosition">
            <SelectTrigger class="h-8 w-[130px] text-xs bg-background">
              <SelectValue placeholder="Position" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Positions</SelectItem>
              <SelectItem v-for="pos in ALL_POSITIONS" :key="pos" :value="pos">{{ pos }}</SelectItem>
            </SelectContent>
          </Select>
          <Select v-model="filterOff">
            <SelectTrigger class="h-8 w-[120px] text-xs bg-background">
              <SelectValue placeholder="OFF" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All OFF</SelectItem>
              <SelectItem value="starter">OFF Starter</SelectItem>
              <SelectItem value="bench">OFF Bench</SelectItem>
            </SelectContent>
          </Select>
          <Select v-model="filterDef">
            <SelectTrigger class="h-8 w-[120px] text-xs bg-background">
              <SelectValue placeholder="DEF" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All DEF</SelectItem>
              <SelectItem value="starter">DEF Starter</SelectItem>
              <SelectItem value="bench">DEF Bench</SelectItem>
            </SelectContent>
          </Select>
          <Select v-model="filterTeam">
            <SelectTrigger class="h-8 w-[130px] text-xs bg-background">
              <SelectValue placeholder="Team" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Teams</SelectItem>
              <SelectItem v-for="t in teams" :key="t.id" :value="t.id">{{ t.name }}</SelectItem>
            </SelectContent>
          </Select>
          <Button
            v-if="hasActiveFilters"
            variant="ghost"
            size="sm"
            class="h-8 px-2 text-xs text-muted-foreground ml-auto"
            @click="clearFilters"
          >
            <X class="w-3 h-3 mr-1" />
            Clear Filters
          </Button>
        </div>
      </div>

    <!-- Selection toolbar -->
    <div v-if="selectedIds.size > 0" class="flex items-center gap-3 px-3 py-2 rounded-md bg-muted/50 border">
      <span class="text-sm font-medium">{{ selectedIds.size }} selected</span>
      <Button size="sm" variant="destructive" @click="handleBulkDelete" :disabled="bulkDeleting">
        <Loader2 v-if="bulkDeleting" class="w-3.5 h-3.5 mr-1.5 animate-spin" />
        <Trash2 v-else class="w-3.5 h-3.5 mr-1.5" />
        Delete Selected
      </Button>
      <Button size="sm" variant="ghost" @click="deselectAll">Deselect All</Button>
    </div>

    <div v-if="loading && players.length === 0" class="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead class="w-8"></TableHead>
            <TableHead class="w-10"></TableHead>
            <TableHead class="w-16">#</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Off Position</TableHead>
            <TableHead>Def Position</TableHead>
            <TableHead class="text-center">Off Starter</TableHead>
            <TableHead class="text-center">Def Starter</TableHead>
            <TableHead class="text-center">Teams</TableHead>
            <TableHead class="w-24"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="i in 8" :key="i">
            <TableCell><Skeleton class="h-4 w-4" /></TableCell>
            <TableCell><Skeleton class="h-4 w-4 rounded" /></TableCell>
            <TableCell><Skeleton class="h-4 w-8" /></TableCell>
            <TableCell><Skeleton class="h-4 w-24" /></TableCell>
            <TableCell><Skeleton class="h-5 w-12 rounded-full" /></TableCell>
            <TableCell><Skeleton class="h-5 w-12 rounded-full" /></TableCell>
            <TableCell><Skeleton class="h-4 w-8 mx-auto" /></TableCell>
            <TableCell><Skeleton class="h-4 w-8 mx-auto" /></TableCell>
            <TableCell><Skeleton class="h-5 w-16 mx-auto rounded-full" /></TableCell>
            <TableCell><Skeleton class="h-8 w-8 rounded ml-auto" /></TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <div v-else-if="players.length === 0" class="text-center py-12">
      <Users class="w-12 h-12 text-muted-foreground mx-auto mb-3" />
      <h3 class="font-medium text-lg font-display">No players yet</h3>
      <p class="text-muted-foreground text-sm mt-1">Add your first player to get started.</p>
      <div class="flex items-center justify-center gap-2 mt-4">
        <Button @click="openDialog(null)">
          <Plus class="w-4 h-4 mr-2" />
          Add Player
        </Button>
        <Button variant="outline" @click="bulkImportOpen = true">
          <Plus class="w-4 h-4 mr-2" />
          Add Players
        </Button>
      </div>
    </div>

    <div v-else-if="filteredPlayers.length === 0" class="text-center py-8">
      <p class="text-muted-foreground text-sm">No players match the current filters.</p>
      <Button variant="ghost" size="sm" class="mt-2 text-xs" @click="clearFilters">Clear filters</Button>
    </div>

    <div v-else class="rounded-md border bg-card shadow">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead class="w-8"></TableHead>
            <TableHead class="w-10" @click.stop>
              <Checkbox
                :model-value="allFilteredSelected"
                @update:model-value="toggleSelectAll"
              />
            </TableHead>
            <TableHead class="w-16">
              <button class="inline-flex items-center gap-1 hover:text-foreground transition-colors" @click="toggleSort('number')">
                #
                <ArrowUp v-if="sortKey === 'number' && sortDir === 'asc'" class="w-3 h-3" />
                <ArrowDown v-else-if="sortKey === 'number' && sortDir === 'desc'" class="w-3 h-3" />
                <ArrowUpDown v-else class="w-3 h-3 opacity-30" />
              </button>
            </TableHead>
            <TableHead>
              <button class="inline-flex items-center gap-1 hover:text-foreground transition-colors" @click="toggleSort('name')">
                Name
                <ArrowUp v-if="sortKey === 'name' && sortDir === 'asc'" class="w-3 h-3" />
                <ArrowDown v-else-if="sortKey === 'name' && sortDir === 'desc'" class="w-3 h-3" />
                <ArrowUpDown v-else class="w-3 h-3 opacity-30" />
              </button>
            </TableHead>
            <TableHead>Off Position</TableHead>
            <TableHead>Def Position</TableHead>
            <TableHead class="text-center">
              <button class="inline-flex items-center gap-1 hover:text-foreground transition-colors" @click="toggleSort('off')">
                Off Starter
                <ArrowUp v-if="sortKey === 'off' && sortDir === 'asc'" class="w-3 h-3" />
                <ArrowDown v-else-if="sortKey === 'off' && sortDir === 'desc'" class="w-3 h-3" />
                <ArrowUpDown v-else class="w-3 h-3 opacity-30" />
              </button>
            </TableHead>
            <TableHead class="text-center">
              <button class="inline-flex items-center gap-1 hover:text-foreground transition-colors" @click="toggleSort('def')">
                Def Starter
                <ArrowUp v-if="sortKey === 'def' && sortDir === 'asc'" class="w-3 h-3" />
                <ArrowDown v-else-if="sortKey === 'def' && sortDir === 'desc'" class="w-3 h-3" />
                <ArrowUpDown v-else class="w-3 h-3 opacity-30" />
              </button>
            </TableHead>
            <TableHead class="text-center">Teams</TableHead>
            <TableHead class="w-24"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <template v-for="p in filteredPlayers" :key="p.id">
            <TableRow
              class="cursor-pointer hover:bg-muted/50 transition-colors"
              :class="[
                selectedIds.has(p.id) ? 'bg-muted/30' : '',
                expandedPlayerId === p.id ? 'bg-muted/40 border-b-0' : ''
              ]"
              @click="toggleExpand(p)"
            >
              <TableCell class="p-2 text-center" @click.stop="toggleExpand(p)">
                <component :is="expandedPlayerId === p.id ? ChevronDown : ChevronRight" class="w-4 h-4 text-muted-foreground" />
              </TableCell>
            <TableCell @click.stop>
              <Checkbox
                :model-value="selectedIds.has(p.id)"
                @update:model-value="toggleSelectPlayer(p.id)"
              />
            </TableCell>
            <TableCell class="font-bold text-primary">{{ p.number }}</TableCell>
            <TableCell class="font-medium">{{ p.name }}</TableCell>
            <TableCell>
              <div class="flex gap-1.5 flex-wrap">
                <Badge
                  v-for="pos in p.offense_positions"
                  :key="'o-' + pos"
                  variant="secondary"
                  class="text-xs"
                  :style="getStartingPositions(p.id).has(pos)
                    ? { borderColor: '#fbbf24', color: '#fbbf24', backgroundColor: 'rgba(251, 191, 36, 0.15)' }
                    : {}"
                >
                  {{ pos }}<span v-if="getStartingPositions(p.id).has(pos)" class="ml-0.5">&#9733;</span>
                </Badge>
                <span v-if="p.offense_positions.length === 0" class="text-xs text-muted-foreground/40">—</span>
              </div>
            </TableCell>
            <TableCell>
              <div class="flex gap-1.5 flex-wrap">
                <Badge
                  v-for="pos in p.defense_positions"
                  :key="'d-' + pos"
                  variant="outline"
                  class="text-xs"
                  :style="getStartingPositions(p.id).has(pos)
                    ? { borderColor: '#fbbf24', color: '#fbbf24', backgroundColor: 'rgba(251, 191, 36, 0.15)' }
                    : {}"
                >
                  {{ pos }}<span v-if="getStartingPositions(p.id).has(pos)" class="ml-0.5">&#9733;</span>
                </Badge>
                <span v-if="p.defense_positions.length === 0" class="text-xs text-muted-foreground/40">—</span>
              </div>
            </TableCell>
            <TableCell class="text-center">
              <span
                class="text-xs font-medium tabular-nums"
                :class="starterRatio(p.id, 'offense').starting > 0 ? 'text-green-400' : 'text-muted-foreground'"
              >
                {{ starterRatio(p.id, 'offense').starting }}/{{ starterRatio(p.id, 'offense').total }}
              </span>
            </TableCell>
            <TableCell class="text-center">
              <span
                class="text-xs font-medium tabular-nums"
                :class="starterRatio(p.id, 'defense').starting > 0 ? 'text-green-400' : 'text-muted-foreground'"
              >
                {{ starterRatio(p.id, 'defense').starting }}/{{ starterRatio(p.id, 'defense').total }}
              </span>
            </TableCell>
            <TableCell class="text-center" @click.stop>
              <div class="flex gap-1 justify-center flex-wrap">
                <span
                  v-for="team in getPlayerTeams(p.id)"
                  :key="team.id || 'fa'"
                  class="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium"
                  :class="team.name === 'Free Agent' ? 'bg-muted text-muted-foreground' : ''"
                  :style="team.color ? { backgroundColor: team.color + '20', color: team.color } : {}"
                >
                  {{ team.name }}
                </span>
              </div>
            </TableCell>
              <TableCell>
                <div class="flex gap-1 justify-end">
                  <Button size="icon" variant="ghost" class="h-8 w-8 text-destructive" @click.stop="handleDelete(p.id)" :disabled="deletingId === p.id">
                    <Loader2 v-if="deletingId === p.id" class="w-3.5 h-3.5 animate-spin" />
                    <Trash2 v-else class="w-3.5 h-3.5" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
            <TableRow v-if="expandedPlayerId === p.id" class="bg-muted/40 hover:bg-muted/40">
              <TableCell :colspan="10" class="p-0">
                <div class="p-6 space-y-6 border-b bg-muted/30 shadow-inner">
                  
                  <!-- Toolbar -->
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-4">
                      <h3 class="text-sm font-semibold tracking-wide font-display uppercase text-foreground">
                        {{ p.name }} Attributes
                      </h3>
                      <div class="flex items-center gap-2">
                        <Badge variant="outline" class="text-xs font-mono">
                          {{ isEditing ? 'EDITING' : 'READ ONLY' }}
                        </Badge>
                        <template v-if="!isEditing">
                          <Button size="sm" variant="outline" @click="startEditing">
                            <Pencil class="w-3.5 h-3.5 mr-2" />
                            Edit Attributes
                          </Button>
                        </template>
                        <template v-if="isEditing">
                         <Button size="sm" :disabled="!hasChanges || savingInline" @click="saveInlineEdit">
                            <Loader2 v-if="savingInline" class="w-3.5 h-3.5 mr-2 animate-spin" />
                            <Save v-else class="w-3.5 h-3.5 mr-2" />
                            Save Changes
                         </Button>
                         <Button size="sm" variant="ghost" @click="cancelInlineEdit">
                            Cancel
                         </Button>
                      </template>
                      </div>
                    </div>
                  </div>

                  <div v-if="inlineEdits" class="space-y-8">
                    
                    <!-- Top Section: Physical & Teams Row -->
                    <div class="flex flex-col gap-6">
                       
                       <!-- Metadata Row -->
                       <div class="flex flex-col sm:flex-row gap-4 items-start">
                          <!-- Height -->
                          <div class="space-y-1.5 w-32 shrink-0">
                             <label class="text-xs text-muted-foreground uppercase font-medium tracking-wide">Height</label>
                             <div class="relative">
                                <!-- Edit Mode: Split Inputs -->
                                <div v-if="isEditing" class="flex gap-2">
                                   <div class="relative flex-1">
                                      <Input
                                         type="text"
                                         inputmode="numeric"
                                         pattern="[0-9]*"
                                         placeholder="Ft"
                                         class="pr-6 h-9 text-center"
                                         :model-value="inlineEdits?.height != null ? Math.floor(inlineEdits.height / 12) : ''"
                                         @input="(e: Event) => {
                                            let val = parseInt((e.target as HTMLInputElement).value)
                                            if (isNaN(val)) val = 0
                                            const currentIn = (inlineEdits!.height ?? 0) % 12
                                            inlineEdits!.height = (val * 12) + currentIn
                                            if (inlineEdits!.height === 0 && (e.target as HTMLInputElement).value === '') inlineEdits!.height = null
                                         }"
                                      />
                                      <span class="absolute right-2 top-2.5 text-xs text-muted-foreground">ft</span>
                                   </div>
                                   <div class="relative flex-1">
                                      <Input
                                         type="text"
                                         inputmode="numeric"
                                         pattern="[0-9]*"
                                         placeholder="In"
                                         class="pr-6 h-9 text-center"
                                         :model-value="inlineEdits?.height != null ? (inlineEdits.height % 12) : ''"
                                         @input="(e: Event) => {
                                            let val = parseInt((e.target as HTMLInputElement).value)
                                            if (isNaN(val)) val = 0
                                            const currentFt = Math.floor((inlineEdits!.height ?? 0) / 12)
                                            inlineEdits!.height = (currentFt * 12) + val
                                            if (inlineEdits!.height === 0 && (e.target as HTMLInputElement).value === '') inlineEdits!.height = null
                                         }"
                                      />
                                      <span class="absolute right-2 top-2.5 text-xs text-muted-foreground">in</span>
                                   </div>
                                </div>
                                
                                <!-- Read-Only Mode -->
                                <div v-else class="w-full h-9 flex items-center justify-center text-center text-sm font-medium rounded-md bg-muted/50 text-muted-foreground cursor-default">
                                   {{ p.height ? Math.floor(p.height / 12) + "'" + (p.height % 12) + '"' : '-' }}
                                </div>
                             </div>
                          </div>

                          <!-- Weight -->
                          <div class="space-y-1.5 w-32 shrink-0">
                             <label class="text-xs text-muted-foreground uppercase font-medium tracking-wide">Weight</label>
                             <div class="relative">
                                <component
                                  :is="isEditing ? 'input' : 'div'"
                                  inputmode="numeric"
                                  :value="isEditing ? inlineEdits.weight : (p.weight ?? '-')"
                                  @input="(e: Event) => inlineEdits!.weight = (e.target as HTMLInputElement).value ? parseInt((e.target as HTMLInputElement).value) : null"
                                  class="w-full h-9 flex items-center justify-center text-center text-sm font-medium rounded-md"
                                  :class="isEditing 
                                     ? 'border border-input bg-background focus:ring-2 focus:ring-ring' 
                                     : 'bg-muted/50 text-muted-foreground cursor-default'"
                                >
                                   {{ !isEditing ? (p.weight ? p.weight : '-') : '' }}
                                </component>
                                <span v-if="isEditing" class="absolute right-2 top-2.5 text-xs text-muted-foreground">lbs</span>
                                <span v-else-if="p.weight" class="absolute right-2 top-2.5 text-xs text-muted-foreground">lbs</span>
                             </div>
                          </div>

                          <!-- Offense Positions -->
                          <div class="space-y-1.5 w-40 shrink-0">
                             <label class="text-xs text-muted-foreground uppercase font-medium tracking-wide">Offense Pos</label>
                             
                             <div v-if="isEditing" class="relative" ref="offPosDropdownRef">
                                <Button 
                                   variant="outline" 
                                   class="w-full justify-between h-9 text-left font-normal px-2"
                                   :class="!inlineEdits.offense_positions.length && 'text-muted-foreground'"
                                   @click="offPosDropdownOpen = !offPosDropdownOpen"
                                >
                                   <span class="truncate text-xs">
                                      {{ inlineEdits.offense_positions.length > 0 
                                         ? inlineEdits.offense_positions.join(', ') 
                                         : 'Select...' }}
                                   </span>
                                   <ChevronDown class="w-3 h-3 opacity-50" />
                                </Button>
                                
                                <div v-if="offPosDropdownOpen" class="absolute z-50 w-full mt-1 bg-popover text-popover-foreground rounded-md border shadow-md max-h-60 overflow-y-auto p-1">
                                   <div 
                                      v-for="pos in OFFENSE_POSITIONS" 
                                      :key="pos" 
                                      class="flex items-center gap-2 px-2 py-1.5 hover:bg-muted/50 rounded-sm cursor-pointer"
                                      @click.stop="() => {
                                         if (inlineEdits!.offense_positions.includes(pos)) {
                                            inlineEdits!.offense_positions = inlineEdits!.offense_positions.filter(p => p !== pos)
                                         } else {
                                            inlineEdits!.offense_positions.push(pos)
                                         }
                                         resetAttributesForPosition('offense', pos, inlineEdits!.offense, inlineEdits!.defense)
                                      }"
                                   >
                                      <div 
                                         class="h-3.5 w-3.5 shrink-0 rounded-sm border border-primary flex items-center justify-center transition-colors shadow-sm"
                                         :class="inlineEdits!.offense_positions.includes(pos) ? 'bg-primary text-primary-foreground' : 'bg-transparent'"
                                      >
                                         <Check v-if="inlineEdits!.offense_positions.includes(pos)" class="h-2.5 w-2.5" />
                                      </div>
                                      <span class="text-xs">{{ pos }}</span>
                                   </div>
                                </div>
                             </div>

                             <div v-else class="flex flex-wrap gap-1 min-h-[36px] items-center">
                                <Badge v-for="pos in p.offense_positions" :key="pos" variant="secondary" class="text-[11px] h-5 px-1.5 pointer-events-none">
                                   {{ pos }}
                                </Badge>
                                <span v-if="!p.offense_positions.length" class="text-xs text-muted-foreground italic">-</span>
                             </div>
                          </div>

                          <!-- Defense Positions -->
                          <div class="space-y-1.5 w-40 shrink-0">
                             <label class="text-xs text-muted-foreground uppercase font-medium tracking-wide">Defense Pos</label>
                             
                             <div v-if="isEditing" class="relative" ref="defPosDropdownRef">
                                <Button 
                                   variant="outline" 
                                   class="w-full justify-between h-9 text-left font-normal px-2"
                                   :class="!inlineEdits.defense_positions.length && 'text-muted-foreground'"
                                   @click="defPosDropdownOpen = !defPosDropdownOpen"
                                >
                                   <span class="truncate text-xs">
                                      {{ inlineEdits.defense_positions.length > 0 
                                         ? inlineEdits.defense_positions.join(', ') 
                                         : 'Select...' }}
                                   </span>
                                   <ChevronDown class="w-3 h-3 opacity-50" />
                                </Button>
                                
                                <div v-if="defPosDropdownOpen" class="absolute z-50 w-full mt-1 bg-popover text-popover-foreground rounded-md border shadow-md max-h-60 overflow-y-auto p-1">
                                   <div 
                                      v-for="pos in DEFENSE_POSITIONS" 
                                      :key="pos" 
                                      class="flex items-center gap-2 px-2 py-1.5 hover:bg-muted/50 rounded-sm cursor-pointer"
                                      @click.stop="() => {
                                         if (inlineEdits!.defense_positions.includes(pos)) {
                                            inlineEdits!.defense_positions = inlineEdits!.defense_positions.filter(p => p !== pos)
                                         } else {
                                            inlineEdits!.defense_positions.push(pos)
                                         }
                                         resetAttributesForPosition('defense', pos, inlineEdits!.offense, inlineEdits!.defense)
                                      }"
                                   >
                                      <div 
                                         class="h-3.5 w-3.5 shrink-0 rounded-sm border border-primary flex items-center justify-center transition-colors shadow-sm"
                                         :class="inlineEdits!.defense_positions.includes(pos) ? 'bg-primary text-primary-foreground' : 'bg-transparent'"
                                      >
                                         <Check v-if="inlineEdits!.defense_positions.includes(pos)" class="h-2.5 w-2.5" />
                                      </div>
                                      <span class="text-xs">{{ pos }}</span>
                                   </div>
                                </div>
                             </div>

                             <div v-else class="flex flex-wrap gap-1 min-h-[36px] items-center">
                                <Badge v-for="pos in p.defense_positions" :key="pos" variant="secondary" class="text-[11px] h-5 px-1.5 pointer-events-none">
                                   {{ pos }}
                                </Badge>
                                <span v-if="!p.defense_positions.length" class="text-xs text-muted-foreground italic">-</span>
                             </div>
                          </div>
                          <div class="space-y-1.5 flex-1 min-w-[200px] max-w-sm">
                             <label class="text-xs text-muted-foreground uppercase font-medium tracking-wide">Teams</label>
                             
                             <!-- Edit Mode: Custom Dropdown -->
                             <div v-if="isEditing" class="relative" ref="teamDropdownRef">
                                <Button 
                                   variant="outline" 
                                   class="w-full justify-between h-9 text-left font-normal"
                                   :class="!inlineEdits.team_ids.length && 'text-muted-foreground'"
                                   @click="teamDropdownOpen = !teamDropdownOpen"
                                >
                                   <span class="truncate">
                                      {{ inlineEdits.team_ids.length > 0 
                                         ? `${inlineEdits.team_ids.length} selected` 
                                         : 'Select teams...' }}
                                   </span>
                                   <ChevronDown class="w-4 h-4 opacity-50" />
                                </Button>
                                
                                <div v-if="teamDropdownOpen" class="absolute z-50 w-full mt-1 bg-popover text-popover-foreground rounded-md border shadow-md max-h-60 overflow-y-auto p-1">
                                   <div 
                                      v-for="team in teams.filter(t => t.name !== 'Free Agent')" 
                                      :key="team.id" 
                                      class="flex items-center gap-2 px-2 py-1.5 hover:bg-muted/50 rounded-sm cursor-pointer"
                                      @click.stop="() => {
                                         if (inlineEdits!.team_ids.includes(team.id)) {
                                            inlineEdits!.team_ids = inlineEdits!.team_ids.filter(id => id !== team.id)
                                         } else {
                                            inlineEdits!.team_ids.push(team.id)
                                         }
                                      }"
                                   >
                                      <div 
                                         class="h-4 w-4 shrink-0 rounded-sm border border-primary flex items-center justify-center transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                         :class="inlineEdits!.team_ids.includes(team.id) ? 'bg-primary text-primary-foreground' : 'bg-transparent'"
                                      >
                                         <Check v-if="inlineEdits!.team_ids.includes(team.id)" class="h-3 w-3" />
                                      </div>
                                      <span class="text-sm">{{ team.name }}</span>
                                   </div>
                                   <div v-if="teams.filter(t => t.name !== 'Free Agent').length === 0" class="p-2 text-sm text-muted-foreground text-center">
                                      No teams available
                                   </div>
                                </div>
                             </div>

                             <!-- Read-Only Mode: Badges -->
                             <div v-else class="flex flex-wrap gap-2 min-h-[36px] items-center px-1">
                                <template v-if="getPlayerTeams(p.id).filter(t => t.name !== 'Free Agent').length > 0">
                                  <Badge
                                    v-for="team in getPlayerTeams(p.id).filter(t => t.name !== 'Free Agent')"
                                    :key="team.id"
                                    variant="outline"
                                    class="text-xs font-medium border-0"
                                    :style="{ backgroundColor: team.color + '20', color: team.color }"
                                  >
                                    {{ team.name }}
                                  </Badge>
                                </template>
                                <span v-else class="text-xs text-muted-foreground italic pl-1">No teams assigned</span>
                             </div>
                          </div>
                       </div>

                       <!-- Roster Status (Moved Down, Shrunk) -->
                       <div v-if="getPlayerTeams(p.id).filter(t => t.name !== 'Free Agent').length > 0" class="space-y-3 max-w-2xl">
                          <div class="flex items-center gap-2 border-b pb-1">
                             <h4 class="text-xs font-bold text-primary uppercase tracking-wider">Roster Status</h4>
                          </div>
                          <div class="space-y-2">
                             <div
                                v-for="team in getPlayerTeams(p.id).filter(t => t.name !== 'Free Agent')"
                                :key="team.id"
                                class="flex items-center justify-between p-3 rounded-md border bg-background/50 hover:bg-background transition-colors text-xs"
                             >
                                <!-- Team Info -->
                                <div class="flex items-center gap-3 min-w-0 flex-1">
                                   <span class="flex-shrink-0 w-2.5 h-2.5 rounded-full" :style="{ backgroundColor: team.color }"></span>
                                   <span class="font-medium text-sm truncate">{{ team.name }}</span>
                                </div>
                                
                                <!-- Status Actions -->
                                <div class="flex items-center gap-6 flex-shrink-0">
                                   <!-- OFFENSE -->
                                   <div class="flex items-center gap-2">
                                      <span class="text-[11px] text-muted-foreground font-bold uppercase w-12 text-right">Offense</span>
                                      <div class="flex items-center bg-muted rounded-md p-0.5 border">
                                          <TooltipProvider>
                                             <Tooltip>
                                                <TooltipTrigger as-child>
                                                   <button
                                                      class="px-2 py-1 rounded-sm text-[11px] font-medium transition-all"
                                                      :class="[
                                                         isTeamStarter(p.id, team.id, 'offense') 
                                                            ? 'bg-background shadow-sm text-foreground' 
                                                            : 'text-muted-foreground hover:text-foreground',
                                                         isStarterLocked(p.id, team.id, 'offense') && 'opacity-50 cursor-not-allowed'
                                                      ]"
                                                      :disabled="isStarterLocked(p.id, team.id, 'offense')"
                                                      @click="!isTeamStarter(p.id, team.id, 'offense') && toggleStarter(team.id, p.id, 'offense')"
                                                   >
                                                      Starter
                                                   </button>
                                                </TooltipTrigger>
                                                <TooltipContent v-if="isStarterLocked(p.id, team.id, 'offense')">
                                                   <p>Status is locked. Unlock to change.</p>
                                                </TooltipContent>
                                             </Tooltip>
                                          </TooltipProvider>

                                          <TooltipProvider>
                                             <Tooltip>
                                                <TooltipTrigger as-child>
                                                   <button
                                                      class="px-2 py-1 rounded-sm text-[11px] font-medium transition-all"
                                                      :class="[
                                                         !isTeamStarter(p.id, team.id, 'offense') 
                                                            ? 'bg-background shadow-sm text-foreground' 
                                                            : 'text-muted-foreground hover:text-foreground',
                                                         isStarterLocked(p.id, team.id, 'offense') && 'opacity-50 cursor-not-allowed'
                                                      ]"
                                                      :disabled="isStarterLocked(p.id, team.id, 'offense')"
                                                      @click="isTeamStarter(p.id, team.id, 'offense') && toggleStarter(team.id, p.id, 'offense')"
                                                   >
                                                      Bench
                                                   </button>
                                                </TooltipTrigger>
                                                <TooltipContent v-if="isStarterLocked(p.id, team.id, 'offense')">
                                                   <p>Status is locked. Unlock to change.</p>
                                                </TooltipContent>
                                             </Tooltip>
                                          </TooltipProvider>
                                      </div>
                                      <TooltipProvider>
                                          <Tooltip>
                                             <TooltipTrigger as-child>
                                                <button
                                                   class="h-6 w-6 flex items-center justify-center rounded-sm hover:bg-muted transition-colors ml-1"
                                                   :class="isStarterLocked(p.id, team.id, 'offense') ? 'text-primary' : 'text-muted-foreground/30'"
                                                   @click="toggleLock(team.id, p.id, 'offense')"
                                                >
                                                   <Lock v-if="isStarterLocked(p.id, team.id, 'offense')" class="w-3.5 h-3.5" />
                                                   <Unlock v-else class="w-3.5 h-3.5" />
                                                </button>
                                             </TooltipTrigger>
                                             <TooltipContent>
                                                <p>{{ isStarterLocked(p.id, team.id, 'offense') ? 'Unlock to allow changes' : 'Lock to prevent changes' }}</p>
                                             </TooltipContent>
                                          </Tooltip>
                                       </TooltipProvider>
                                   </div>
                                   
                                   <!-- DEFENSE -->
                                   <div class="flex items-center gap-2 border-l pl-6">
                                      <span class="text-[11px] text-muted-foreground font-bold uppercase w-12 text-right">Defense</span>
                                      <div class="flex items-center bg-muted rounded-md p-0.5 border">
                                          <TooltipProvider>
                                             <Tooltip>
                                                <TooltipTrigger as-child>
                                                   <button
                                                      class="px-2 py-1 rounded-sm text-[11px] font-medium transition-all"
                                                      :class="[
                                                         isTeamStarter(p.id, team.id, 'defense') 
                                                            ? 'bg-background shadow-sm text-foreground' 
                                                            : 'text-muted-foreground hover:text-foreground',
                                                         isStarterLocked(p.id, team.id, 'defense') && 'opacity-50 cursor-not-allowed'
                                                      ]"
                                                      :disabled="isStarterLocked(p.id, team.id, 'defense')"
                                                      @click="!isTeamStarter(p.id, team.id, 'defense') && toggleStarter(team.id, p.id, 'defense')"
                                                   >
                                                      Starter
                                                   </button>
                                                </TooltipTrigger>
                                                <TooltipContent v-if="isStarterLocked(p.id, team.id, 'defense')">
                                                   <p>Status is locked. Unlock to change.</p>
                                                </TooltipContent>
                                             </Tooltip>
                                          </TooltipProvider>

                                          <TooltipProvider>
                                             <Tooltip>
                                                <TooltipTrigger as-child>
                                                   <button
                                                      class="px-2 py-1 rounded-sm text-[11px] font-medium transition-all"
                                                      :class="[
                                                         !isTeamStarter(p.id, team.id, 'defense') 
                                                            ? 'bg-background shadow-sm text-foreground' 
                                                            : 'text-muted-foreground hover:text-foreground',
                                                         isStarterLocked(p.id, team.id, 'defense') && 'opacity-50 cursor-not-allowed'
                                                      ]"
                                                      :disabled="isStarterLocked(p.id, team.id, 'defense')"
                                                      @click="isTeamStarter(p.id, team.id, 'defense') && toggleStarter(team.id, p.id, 'defense')"
                                                   >
                                                      Bench
                                                   </button>
                                                </TooltipTrigger>
                                                <TooltipContent v-if="isStarterLocked(p.id, team.id, 'defense')">
                                                   <p>Status is locked. Unlock to change.</p>
                                                </TooltipContent>
                                             </Tooltip>
                                          </TooltipProvider>
                                      </div>
                                      <TooltipProvider>
                                          <Tooltip>
                                             <TooltipTrigger as-child>
                                                <button
                                                   class="h-6 w-6 flex items-center justify-center rounded-sm hover:bg-muted transition-colors ml-1"
                                                   :class="isStarterLocked(p.id, team.id, 'defense') ? 'text-primary' : 'text-muted-foreground/30'"
                                                   @click="toggleLock(team.id, p.id, 'defense')"
                                                >
                                                   <Lock v-if="isStarterLocked(p.id, team.id, 'defense')" class="w-3.5 h-3.5" />
                                                   <Unlock v-else class="w-3.5 h-3.5" />
                                                </button>
                                             </TooltipTrigger>
                                             <TooltipContent>
                                                <p>{{ isStarterLocked(p.id, team.id, 'defense') ? 'Unlock to allow changes' : 'Lock to prevent changes' }}</p>
                                             </TooltipContent>
                                          </Tooltip>
                                       </TooltipProvider>
                                   </div>
                                </div>
                             </div>
                          </div>
                       </div>
                    </div>

                    <!-- Universal Attributes -->
                    <div class="space-y-3">
                       <div class="flex items-center gap-2 border-b pb-1">
                          <h4 class="text-xs font-bold text-primary uppercase tracking-wider">Universal</h4>
                       </div>
                       <div class="grid grid-cols-3 sm:grid-cols-6 gap-4">
                         <div v-for="attr in UNIVERSAL_ATTRIBUTE_GROUP.attrs" :key="attr.key" class="space-y-1.5">
                           <label class="text-xs text-muted-foreground uppercase font-medium tracking-wide block truncate" :title="attr.label">{{ attr.label }}</label>
                           <component
                             :is="isEditing ? 'input' : 'div'"
                             inputmode="numeric"
                             :value="inlineEdits.universal[attr.key]"
                             @input="(e: Event) => inlineEdits!.universal[attr.key] = (e.target as HTMLInputElement).value as any"
                             @blur="(e: Event) => inlineEdits!.universal[attr.key] = clampAttr((e.target as HTMLInputElement).value)"
                             class="w-full h-9 flex items-center justify-center text-center text-sm font-medium rounded-md"
                             :class="isEditing 
                                ? 'border border-input bg-background focus:ring-2 focus:ring-ring' 
                                : 'bg-muted/50 text-muted-foreground cursor-default'"
                           >
                              {{ !isEditing ? inlineEdits.universal[attr.key] : '' }}
                           </component>
                         </div>
                       </div>
                    </div>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <!-- Offense Attributes (only when player has offense positions) -->
                      <div v-if="inlineEdits.offense_positions.length > 0" class="space-y-4 p-4 rounded-lg border bg-background/40">
                        <div class="flex items-center gap-2 border-b pb-2 mb-2">
                           <Badge variant="secondary" class="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border-blue-500/20">OFFENSE</Badge>
                        </div>
                        <div class="space-y-5">
                          <div v-for="group in getVisibleOffenseGroups(inlineEdits.offense_positions)" :key="group.label" class="space-y-2">
                            <span class="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{{ group.label }}</span>
                            <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
                              <div v-for="attr in group.attrs" :key="attr.key" class="space-y-1">
                                <label class="text-[11px] text-muted-foreground uppercase font-medium block truncate" :title="attr.label">{{ attr.label }}</label>
                                <component
                                  :is="isEditing ? 'input' : 'div'"
                                  inputmode="numeric"
                                  :value="inlineEdits.offense[attr.key]"
                                  @input="(e: Event) => inlineEdits!.offense[attr.key] = (e.target as HTMLInputElement).value as any"
                                  @blur="(e: Event) => inlineEdits!.offense[attr.key] = clampAttr((e.target as HTMLInputElement).value)"
                                  class="w-full h-9 flex items-center justify-center text-center text-sm rounded-md"
                                  :class="isEditing 
                                    ? 'border border-input bg-background focus:ring-2 focus:ring-ring' 
                                    : 'bg-muted/30 text-foreground/80 cursor-default'"
                                >
                                   {{ !isEditing ? inlineEdits.offense[attr.key] : '' }}
                                </component>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>



                      <!-- Defense Attributes (only when player has defense positions) -->
                      <div v-if="inlineEdits.defense_positions.length > 0" class="space-y-4 p-4 rounded-lg border bg-background/40">
                        <div class="flex items-center gap-2 border-b pb-2 mb-2">
                           <Badge variant="secondary" class="bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20">DEFENSE</Badge>
                        </div>
                        <div class="space-y-5">
                          <div v-for="group in getVisibleDefenseGroups(inlineEdits.defense_positions)" :key="group.label" class="space-y-2">
                            <span class="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{{ group.label }}</span>
                            <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
                              <div v-for="attr in group.attrs" :key="attr.key" class="space-y-1">
                                <label class="text-[11px] text-muted-foreground uppercase font-medium block truncate" :title="attr.label">{{ attr.label }}</label>
                                <component
                                  :is="isEditing ? 'input' : 'div'"
                                  inputmode="numeric"
                                  :value="inlineEdits.defense[attr.key]"
                                  @input="(e: Event) => inlineEdits!.defense[attr.key] = (e.target as HTMLInputElement).value as any"
                                  @blur="(e: Event) => inlineEdits!.defense[attr.key] = clampAttr((e.target as HTMLInputElement).value)"
                                  class="w-full h-9 flex items-center justify-center text-center text-sm rounded-md"
                                  :class="isEditing 
                                    ? 'border border-input bg-background focus:ring-2 focus:ring-ring' 
                                    : 'bg-muted/30 text-foreground/80 cursor-default'"
                                >
                                   {{ !isEditing ? inlineEdits.defense[attr.key] : '' }}
                                </component>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </TableCell>
            </TableRow>
          </template>
        </TableBody>
      </Table>
    </div>

    <PlayerDialog
      :open="dialogOpen"
      :player="editingPlayer"
      :teams="teams"
      :player-team-ids="editingPlayer ? getPlayerTeamIds(editingPlayer.id) : []"
      :all-players="players"
      @update:open="dialogOpen = $event"
      @submit="handleSubmit"
    />

    <TeamDialog
      :open="teamDialogOpen"
      :team="null"
      @update:open="teamDialogOpen = $event"
      @submit="handleCreateTeam"
    />

    <BulkImportDialog
      :open="bulkImportOpen"
      :teams="teams"
      @update:open="bulkImportOpen = $event"
      @imported="handleBulkImported"
    />

  </div>
</template>

<script setup lang="ts">
import type { Player, Team } from '~/lib/types'
import {
  POSITION_COLORS,
  UNIVERSAL_ATTRIBUTE_GROUP,
  OFFENSE_ATTRIBUTE_GROUPS,
  DEFENSE_ATTRIBUTE_GROUPS,
  OFFENSE_POSITIONS,
  DEFENSE_POSITIONS,
  DEFAULT_UNIVERSAL_ATTRIBUTES,
  DEFAULT_OFFENSE_ATTRIBUTES,
  DEFAULT_DEFENSE_ATTRIBUTES,
} from '~/lib/constants'
import { getVisibleOffenseGroups, getVisibleDefenseGroups, resetAttributesForPosition, sanitizeAttributesForPositions } from '~/lib/playerAttributes'
import { Button } from '~/components/ui/button'
import { Badge } from '~/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table'
import { Checkbox } from '~/components/ui/checkbox'
import { onClickOutside } from '@vueuse/core'
import { Skeleton } from '~/components/ui/skeleton'
import { Input } from '~/components/ui/input'
import {
  Plus,
  Users,
  Pencil,
  Trash2,
  Zap,
  RotateCcw,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Upload,
  ChevronDown,
  ChevronRight,
  Save,
  Search,
  Lock,
  Unlock,
  Loader2,
  Download,
  Filter,
  Check,
} from 'lucide-vue-next'

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip'

const SLOT_COLORS = ['#f97316', '#22c55e', '#a855f7']
const ALL_POSITIONS = ['QB', 'WR', 'C', 'DB', 'RSH', 'MLB'] // Keep for filter compatibility if needed

const { players, loading, fetchPlayers, createPlayer, updatePlayer, deletePlayer, teamScore } = usePlayers()
const { teams, fetchTeams, createTeam, addPlayerToTeam, removePlayerFromTeam, removePlayerFromTeamByPlayerId, autoAssignTeamStarters, resetTeamStarters, updateTeamPlayer } = useTeams()
const { settings: fieldSettings, fetchSettings: fetchFieldSettings } = useFieldSettings()
const { exportPlayers } = usePlayerExport()
const { confirm } = useConfirm()

function getRandomItem<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function generateRandomPlayer() {
  const firstNames = ['James', 'John', 'Robert', 'Michael', 'William', 'David', 'Richard', 'Joseph', 'Thomas', 'Charles', 'Christopher', 'Daniel', 'Matthew', 'Anthony', 'Donald', 'Mark', 'Paul', 'Steven', 'Andrew', 'Kenneth', 'George', 'Joshua', 'Kevin', 'Brian', 'Edward', 'Ronald', 'Timothy', 'Jason', 'Jeffrey', 'Ryan', 'Jacob', 'Gary', 'Nicholas', 'Eric', 'Stephen', 'Jonathan', 'Larry', 'Justin', 'Scott', 'Brandon', 'Frank', 'Benjamin', 'Gregory', 'Samuel', 'Raymond', 'Patrick', 'Alexander', 'Jack', 'Dennis', 'Jerry']
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores', 'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts']
  
  const name = `${getRandomItem(firstNames)} ${getRandomItem(lastNames)}`
  const number = Math.floor(Math.random() * 100)
  const height = 65 + Math.floor(Math.random() * 15) // 5'5" to 6'8"
  const weight = 150 + Math.floor(Math.random() * 100) // 150 to 250 lbs
  
  // Random positions
  const offPosCount = Math.floor(Math.random() * 2) + 1
  const defPosCount = Math.floor(Math.random() * 2) + 1
  const offense_positions = []
  const defense_positions = []
  
  const availOff = [...OFFENSE_ATTRIBUTE_GROUPS.flatMap(g => g.attrs.map(a => a.label.split(' ')[0])).filter(p => !['Speed', 'Agility', 'Strength', 'IQ'].includes(p)), 'QB', 'C', 'WR', 'RB', 'TE']
  const availDef = ['RSH', 'LB', 'CB', 'S', 'DB']
  
  // Simple random types
  const offType = Math.random() > 0.5 ? 'Skill' : 'Line'
  
  if (offType === 'Skill') {
    if (Math.random() > 0.7) offense_positions.push('QB')
    if (Math.random() > 0.3) offense_positions.push(Math.random() > 0.5 ? 'WR' : 'RB')
  } else {
    offense_positions.push('C')
    if (Math.random() > 0.5) offense_positions.push('TE')
  }
  
  defense_positions.push(getRandomItem(availDef))
  if (Math.random() > 0.6) defense_positions.push(getRandomItem(availDef))
  

  const offAttrs = (OFFENSE_ATTRIBUTE_GROUPS as any).flatMap((g: any) => g.attrs).reduce((acc: Record<string, number>, a: any) => ({ ...acc, [a.key]: Math.floor(Math.random() * 5) + 3 }), {} as Record<string, number>)
  const defAttrs = (DEFENSE_ATTRIBUTE_GROUPS as any).flatMap((g: any) => g.attrs).reduce((acc: Record<string, number>, a: any) => ({ ...acc, [a.key]: Math.floor(Math.random() * 5) + 3 }), {} as Record<string, number>)
  
  return {
    name,
    number,
    height,
    weight,
    offense_positions: [...new Set(offense_positions)],
    defense_positions: [...new Set(defense_positions)],
    universal_attributes: { ...UNIVERSAL_ATTRIBUTE_GROUP.attrs.reduce((acc, a) => ({ ...acc, [a.key]: Math.floor(Math.random() * 5) + 3 }), {} as Record<string, number>) },
    offense_attributes: offAttrs as any,
    defense_attributes: defAttrs as any,
    team_ids: []
  }
}

async function handleAddSample() {
  const p = generateRandomPlayer()
  await createPlayer(p as any)
}

const dialogOpen = ref(false)
const editingPlayer = ref<Player | null>(null)
const teamDialogOpen = ref(false)
const editingTeam = ref<Team | null>(null)
const pendingSlotIndex = ref(-1)
const bulkImportOpen = ref(false)

function handleBulkImported() {
  fetchPlayers()
  bulkImportOpen.value = false
}

// Loading states for action buttons
const autoingStarters = ref(false)
const resettingStarters = ref(false)
const deletingId = ref<string | null>(null)
const bulkDeleting = ref(false)
const savingInline = ref(false)

// Inline editing state
const expandedPlayerId = ref<string | null>(null)
const isEditing = ref(false)

// Custom Dropdown State
const teamDropdownRef = ref(null)
const teamDropdownOpen = ref(false)
onClickOutside(teamDropdownRef, () => {
   teamDropdownOpen.value = false
})

// Position Dropdown State
const offPosDropdownRef = ref(null)
const offPosDropdownOpen = ref(false)
onClickOutside(offPosDropdownRef, () => {
   offPosDropdownOpen.value = false
})

const defPosDropdownRef = ref(null)
const defPosDropdownOpen = ref(false)
onClickOutside(defPosDropdownRef, () => {
   defPosDropdownOpen.value = false
})

const inlineEdits = ref<{
  universal: Record<string, number>
  offense: Record<string, number>
  defense: Record<string, number>
  height: number | null
  weight: number | null
  team_ids: string[]
  offense_positions: string[]
  defense_positions: string[]
} | null>(null)

// Selection state
const selectedIds = ref(new Set<string>())

const allFilteredSelected = computed(() =>
  filteredPlayers.value.length > 0 && filteredPlayers.value.every((p) => selectedIds.value.has(p.id))
)

const hasChanges = computed(() => {
  if (!expandedPlayerId.value || !inlineEdits.value || !editingPlayerSnapshot.value) return false
  
  // Check attributes
  if (JSON.stringify(inlineEdits.value.universal) !== JSON.stringify(editingPlayerSnapshot.value.universal)) return true
  if (JSON.stringify(inlineEdits.value.offense) !== JSON.stringify(editingPlayerSnapshot.value.offense)) return true
  if (JSON.stringify(inlineEdits.value.defense) !== JSON.stringify(editingPlayerSnapshot.value.defense)) return true
  if (inlineEdits.value.height !== editingPlayerSnapshot.value.height) return true
  if (inlineEdits.value.weight !== editingPlayerSnapshot.value.weight) return true
  
  // Check teams
  const currentTeams = new Set(inlineEdits.value.team_ids)
  const originalTeams = new Set(editingPlayerSnapshot.value.team_ids)
  if (currentTeams.size !== originalTeams.size) return true
  for (const id of currentTeams) {
    if (!originalTeams.has(id)) return true
  }

  // Check positions
  const currentOff = new Set(inlineEdits.value.offense_positions)
  const originalOff = new Set(editingPlayerSnapshot.value.offense_positions)
  if (currentOff.size !== originalOff.size) return true
  for (const p of currentOff) if (!originalOff.has(p)) return true

  const currentDef = new Set(inlineEdits.value.defense_positions)
  const originalDef = new Set(editingPlayerSnapshot.value.defense_positions)
  if (currentDef.size !== originalDef.size) return true
  for (const p of currentDef) if (!originalDef.has(p)) return true
  
  return false
})

const editingPlayerSnapshot = ref<{
  universal: Record<string, number>
  offense: Record<string, number>
  defense: Record<string, number>
  height: number | null
  weight: number | null
  team_ids: string[]
  offense_positions: string[]
  defense_positions: string[]
} | null>(null)

function clampAttr(v: string | number): number {
  const n = typeof v === 'string' ? parseInt(v, 10) : v
  if (isNaN(n)) return 1
  return Math.min(10, Math.max(1, n))
}

function toggleExpand(p: Player) {
  if (expandedPlayerId.value === p.id) {
    // If clicking the currently expanded row, collapse it
    expandedPlayerId.value = null
    isEditing.value = false
    inlineEdits.value = null
    editingPlayerSnapshot.value = null
  } else {
    expandedPlayerId.value = p.id
    isEditing.value = false
    const teamIds = getPlayerTeamIds(p.id)
    
    // Initialize edits with sanitized attributes (non-position attrs default to 5)
    const sanitized = sanitizeAttributesForPositions(
      p.offense_positions,
      p.defense_positions,
      p.universal_attributes ?? {},
      p.offense_attributes ?? {},
      p.defense_attributes ?? {},
    )
    inlineEdits.value = {
      universal: { ...sanitized.universal_attributes },
      offense: { ...sanitized.offense_attributes },
      defense: { ...sanitized.defense_attributes },
      height: p.height ?? null,
      weight: p.weight ?? null,
      team_ids: [...teamIds],
      offense_positions: [...p.offense_positions],
      defense_positions: [...p.defense_positions],
    }
    
    // Snapshot for change detection
    editingPlayerSnapshot.value = {
      universal: { ...inlineEdits.value!.universal },
      offense: { ...inlineEdits.value!.offense },
      defense: { ...inlineEdits.value!.defense },
      height: inlineEdits.value!.height,
      weight: inlineEdits.value!.weight,
      team_ids: [...inlineEdits.value!.team_ids],
      offense_positions: [...inlineEdits.value!.offense_positions],
      defense_positions: [...inlineEdits.value!.defense_positions],
    }
  }
}

function startEditing() {
  isEditing.value = true
}

async function saveInlineEdit() {
  if (!expandedPlayerId.value || !inlineEdits.value) return
  savingInline.value = true
  try {
    const sanitized = sanitizeAttributesForPositions(
      inlineEdits.value.offense_positions,
      inlineEdits.value.defense_positions,
      inlineEdits.value.universal,
      inlineEdits.value.offense,
      inlineEdits.value.defense,
    )
    // 1. Update Attributes & Positions
    await updatePlayer(expandedPlayerId.value, {
      universal_attributes: sanitized.universal_attributes,
      offense_attributes: sanitized.offense_attributes,
      defense_attributes: sanitized.defense_attributes,
      height: inlineEdits.value.height,
      weight: inlineEdits.value.weight,
      offense_positions: inlineEdits.value.offense_positions,
      defense_positions: inlineEdits.value.defense_positions,
    } as unknown as Partial<Player>)


    // 2. Update Teams
    if (editingPlayerSnapshot.value) {
      const original = new Set(editingPlayerSnapshot.value.team_ids)
      const current = new Set(inlineEdits.value.team_ids)
      const freeAgentTeam = teams.value.find(t => t.name === 'Free Agent')

      // Removed teams
      for (const tid of original) {
        if (!current.has(tid)) {
          // Fix: Use removing by player ID
          await removePlayerFromTeamByPlayerId(tid, expandedPlayerId.value)
        }
      }
      // Added teams
      for (const tid of current) {
        if (!original.has(tid)) {
          await addPlayerToTeam(tid, expandedPlayerId.value, 'QB', 'DB')
        }
      }

      // 3. Free Agent Logic
      if (freeAgentTeam) {
        // If no teams selected, ensure they are in Free Agent team
        if (current.size === 0) {
           // Check if already in FA team (might not be in original snapshot if it was empty)
           // But safe to just try adding or checking
           const isFa = getPlayerTeams(expandedPlayerId.value).some(t => t.id === freeAgentTeam.id)
           if (!isFa) {
              await addPlayerToTeam(freeAgentTeam.id, expandedPlayerId.value, 'QB', 'DB')
           }
        } 
        // If teams ARE selected, ensure they are NOT in Free Agent team
        else if (current.size > 0) {
           const isFa = getPlayerTeams(expandedPlayerId.value).some(t => t.id === freeAgentTeam.id)
           if (isFa) {
              await removePlayerFromTeamByPlayerId(freeAgentTeam.id, expandedPlayerId.value)
           }
        }
      }
    }

    // Refresh data to show team changes in table
    await fetchPlayers()
    await fetchTeams()

    isEditing.value = false
    // We don't need to update snapshot manually if we refetch, but good for safety
    // However, since we refetch, toggleExpand logic might reset things if we close/open
    // But we are staying expanded.
    
    // Re-initialize snapshot from new data? 
    // Actually, after fetchPlayers, the `expandedPlayerId` is still set, but `inlineEdits` might be stale?
    // Let's just update snapshot to matches what we just saved
    editingPlayerSnapshot.value = JSON.parse(JSON.stringify(inlineEdits.value))

  } catch (e) {
    console.error('Failed to save inline edit', e)
  } finally {
    savingInline.value = false
  }
}

function cancelInlineEdit() {
  // Revert to snapshot but keep expanded
  if (editingPlayerSnapshot.value && expandedPlayerId.value) {
    inlineEdits.value = JSON.parse(JSON.stringify(editingPlayerSnapshot.value))
  }
  isEditing.value = false
}

function toggleSelectAll(checked: boolean | 'indeterminate') {
  if (checked === 'indeterminate') return
  // Create a new Set to trigger reactivity
  const newSelected = new Set(selectedIds.value)
  
  if (checked) {
    // Select all filtered players
    for (const p of filteredPlayers.value) {
      newSelected.add(p.id)
    }
  } else {
    // Deselect all filtered players
    for (const p of filteredPlayers.value) {
      newSelected.delete(p.id)
    }
  }
  
  selectedIds.value = newSelected
}

function toggleSelectPlayer(id: string) {
  const newSelected = new Set(selectedIds.value)
  if (newSelected.has(id)) newSelected.delete(id)
  else newSelected.add(id)
  selectedIds.value = newSelected
}

function deselectAll() {
  selectedIds.value = new Set()
}

// Filters
const searchQuery = ref('')
const showFilters = ref(false)
const filterPosition = ref('all')
const filterOff = ref('all')
const filterDef = ref('all')
const filterTeam = ref('all')

// Sort
type SortKey = 'number' | 'name' | 'off' | 'def' | 'height' | 'weight'
const sortKey = ref<SortKey | null>(null)
const sortDir = ref<'asc' | 'desc'>('asc')

function toggleSort(key: SortKey) {
  if (sortKey.value === key) {
    if (sortDir.value === 'asc') sortDir.value = 'desc'
    else { sortKey.value = null; sortDir.value = 'asc' }
  } else {
    sortKey.value = key
    sortDir.value = 'asc'
  }
}

const hasActiveFilters = computed(() =>
  filterPosition.value !== 'all' || filterOff.value !== 'all' || filterDef.value !== 'all' || filterTeam.value !== 'all'
)

function clearFilters() {
  filterPosition.value = 'all'
  filterOff.value = 'all'
  filterDef.value = 'all'
  filterTeam.value = 'all'
}

const filteredPlayers = computed(() => {
  let result = players.value.filter((p) => {
    // Position filter
    if (filterPosition.value !== 'all') {
      const pos = filterPosition.value
      if (!p.offense_positions.includes(pos as any) && !p.defense_positions.includes(pos as any)) return false
    }
    // OFF starter filter
    if (filterOff.value !== 'all') {
      const isOff = starterRatio(p.id, 'offense').starting > 0
      if (filterOff.value === 'starter' && !isOff) return false
      if (filterOff.value === 'bench' && isOff) return false
    }
    // DEF starter filter
    if (filterDef.value !== 'all') {
      const isDef = starterRatio(p.id, 'defense').starting > 0
      if (filterDef.value === 'starter' && !isDef) return false
      if (filterDef.value === 'bench' && isDef) return false
    }
    // Team filter
    if (filterTeam.value !== 'all') {
      const team = teams.value.find((t) => t.id === filterTeam.value)
      if (!team?.team_players?.some((tp) => tp.player_id === p.id)) return false
    }

    // Search filter
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase()
      return p.name.toLowerCase().includes(q) || p.number.toString().includes(q)
    }

    return true
  })

  // Sort
  if (sortKey.value) {
    const dir = sortDir.value === 'asc' ? 1 : -1
    result = [...result].sort((a, b) => {
      switch (sortKey.value) {
        case 'number': return (a.number - b.number) * dir
        case 'height': return ((a.height ?? 0) - (b.height ?? 0)) * dir
        case 'weight': return ((a.weight ?? 0) - (b.weight ?? 0)) * dir
        case 'name': return a.name.localeCompare(b.name) * dir
        case 'off': {
          const aR = starterRatio(a.id, 'offense')
          const bR = starterRatio(b.id, 'offense')
          return (aR.starting - bR.starting || aR.total - bR.total) * dir
        }
        case 'def': {
          const aR = starterRatio(a.id, 'defense')
          const bR = starterRatio(b.id, 'defense')
          return (aR.starting - bR.starting || aR.total - bR.total) * dir
        }
        default: return 0
      }
    })
  }

  return result
})

// Up to 3 tracked team IDs — persisted to localStorage
const STORAGE_KEY = 'flagos:tracked-teams'
const trackedTeamIds = ref<string[]>([])

if (import.meta.client) {
  // Sanitize: filter out empty strings immediately
  const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
  trackedTeamIds.value = raw.filter((id: any) => typeof id === 'string' && id)
}

watch(trackedTeamIds, (ids) => {
  if (import.meta.client) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
  }
}, { deep: true })

const trackedTeams = computed(() => {
  // Return the actual Team objects for the IDs we have
  return trackedTeamIds.value
    .map(id => teams.value.find(t => t.id === id))
    .filter((t): t is Team => !!t)
})

const availableTeamsForSlot = computed(() =>
  teams.value.filter((t) => !trackedTeamIds.value.includes(t.id) && t.name !== 'Free Agent')
)

// Player sets per tracked team
const trackedPlayerSets = computed(() => {
  const map = new Map<string, Set<string>>()
  for (const team of trackedTeams.value) {
    if (!team) continue
    const ids = new Set<string>()
    for (const tp of team.team_players ?? []) {
      ids.add(tp.player_id)
    }
    map.set(team.id, ids)
  }
  return map
})

// Scores per slot (keyed by teamId)
const slotScores = computed(() => {
  const scores: Record<string, { off: number, def: number, overall: number }> = {}
  
  for (const team of trackedTeams.value) {
    if (!team?.team_players) {
       scores[team.id] = { off: 0, def: 0, overall: 0 }
       continue
    }

    const ids = trackedPlayerSets.value.get(team.id)
    if (!ids || ids.size === 0) {
       scores[team.id] = { off: 0, def: 0, overall: 0 }
       continue
    }

    const teamPlayers = players.value.filter((p) => ids.has(p.id))

    // Build position/starter data
    const offData = team.team_players.map((tp) => ({
      player_id: tp.player_id,
      position: tp.offense_position,
      starter: tp.offense_starter,
    }))
    const defData = team.team_players.map((tp) => ({
      player_id: tp.player_id,
      position: tp.defense_position,
      starter: tp.defense_starter,
    }))

    const off = teamScore(teamPlayers, 'offense', offData)
    const def = teamScore(teamPlayers, 'defense', defData)
    const overall = teamPlayers.length > 0 ? Math.round(((off + def) / 2) * 10) / 10 : 0
    scores[team.id] = { off, def, overall }
  }
  return scores
})

const slotPlayerCounts = computed(() => {
  const counts: Record<string, number> = {}
  for (const id of trackedTeamIds.value) {
    counts[id] = trackedPlayerSets.value.get(id)?.size ?? 0
  }
  return counts
})

function isPlayerOnTeam(playerId: string, teamId: string): boolean {
  return trackedPlayerSets.value.get(teamId)?.has(playerId) ?? false
}

function isTeamStarter(playerId: string, teamId: string, side?: 'offense' | 'defense'): boolean {
  const team = teams.value.find((t) => t.id === teamId)
  if (!team?.team_players) return false
  const tp = team.team_players.find((tp) => tp.player_id === playerId)
  if (!tp) return false
  
  if (side === 'offense') return tp.offense_starter
  if (side === 'defense') return tp.defense_starter
  return tp.offense_starter || tp.defense_starter
}

function isStarterLocked(playerId: string, teamId: string, side: 'offense' | 'defense'): boolean {
  const team = teams.value.find((t) => t.id === teamId)
  if (!team?.team_players) return false
  const tp = team.team_players.find((tp) => tp.player_id === playerId)
  if (!tp) return false
  return side === 'offense' ? tp.offense_starter_locked : tp.defense_starter_locked
}

async function toggleStarter(teamId: string, playerId: string, side: 'offense' | 'defense') {
  const team = teams.value.find((t) => t.id === teamId)
  const tp = team?.team_players?.find((tp) => tp.player_id === playerId)
  if (!tp) return

  const isStarter = side === 'offense' ? tp.offense_starter : tp.defense_starter
  const isLocked = side === 'offense' ? tp.offense_starter_locked : tp.defense_starter_locked
  
  // If locked, do not allow manual toggle
  if (isLocked) return

  const updates: any = {
    [side === 'offense' ? 'offense_starter' : 'defense_starter']: !isStarter,
    // Ensure lock is removed by default when status is manually changed
    [side === 'offense' ? 'offense_starter_locked' : 'defense_starter_locked']: false
  }
  
  await updateTeamPlayer(tp.id, updates)
  await fetchTeams() // Refresh to see changes
}

async function toggleLock(teamId: string, playerId: string, side: 'offense' | 'defense') {
  const team = teams.value.find((t) => t.id === teamId)
  const tp = team?.team_players?.find((tp) => tp.player_id === playerId)
  if (!tp) return

  const isLocked = side === 'offense' ? tp.offense_starter_locked : tp.defense_starter_locked
  
  await updateTeamPlayer(tp.id, {
    [side === 'offense' ? 'offense_starter_locked' : 'defense_starter_locked']: !isLocked
  })
  await fetchTeams()
}

// Returns set of positions this player is starting at across all teams
function getStartingPositions(playerId: string): Set<string> {
  const positions = new Set<string>()
  for (const team of teams.value) {
    if (!team.team_players) continue
    const tp = team.team_players.find((tp) => tp.player_id === playerId)
    if (!tp) continue
    if (tp.offense_starter && tp.offense_position) positions.add(tp.offense_position)
    if (tp.defense_starter && tp.defense_position) positions.add(tp.defense_position)
  }
  return positions
}

// Count how many teams a player starts for vs how many they're on
function starterRatio(playerId: string, side: 'offense' | 'defense'): { starting: number; total: number } {
  let starting = 0, total = 0
  for (const team of teams.value) {
    const tp = team.team_players?.find((tp) => tp.player_id === playerId)
    if (!tp) continue
    total++
    if (side === 'offense' && tp.offense_starter) starting++
    if (side === 'defense' && tp.defense_starter) starting++
  }
  return { starting, total }
}

const TEAM_COLORS = ['#f97316', '#22c55e', '#a855f7', '#3b82f6', '#ef4444', '#ec4899', '#f59e0b', '#14b8a6']

const teamColorMap = computed(() => {
  const map = new Map<string, string>()
  let i = 0
  for (const t of teams.value) {
    if (t.name === 'Free Agent') continue
    map.set(t.id, TEAM_COLORS[i % TEAM_COLORS.length])
    i++
  }
  return map
})

function getPlayerTeams(playerId: string): { id: string; name: string; color: string }[] {
  const result: { id: string; name: string; color: string }[] = []
  for (const team of teams.value) {
    if (team.team_players?.some((tp) => tp.player_id === playerId)) {
      if (team.name === 'Free Agent') {
        result.push({ id: team.id, name: 'Free Agent', color: '' })
      } else {
        result.push({ id: team.id, name: team.name, color: teamColorMap.value.get(team.id) ?? '#888' })
      }
    }
  }
  return result.length > 0 ? result : [{ id: '', name: 'Free Agent', color: '' }]
}

function getPlayerTeamNames(playerId: string): string[] {
  return getPlayerTeams(playerId).map((t) => t.name)
}

function getPlayerTeamIds(playerId: string): string[] {
  const ids: string[] = []
  for (const team of teams.value) {
    if (team.team_players?.some((tp) => tp.player_id === playerId)) {
      ids.push(team.id)
    }
  }
  return ids
}

const freeAgentTeam = computed(() => teams.value.find((t) => t.name === 'Free Agent'))

function getTeamInitial(name: string): string {
  return name.charAt(0).toUpperCase()
}

function addTrackedTeam(teamId: string) {
  if (teamId === '__new__') {
    pendingSlotIndex.value = -1 // No specific index anymore
    teamDialogOpen.value = true
    return
  }
  if (trackedTeamIds.value.includes(teamId)) return
  if (trackedTeamIds.value.length >= 3) return

  trackedTeamIds.value = [...trackedTeamIds.value, teamId]
}

function removeTrackedTeam(teamId: string) {
  trackedTeamIds.value = trackedTeamIds.value.filter(id => id !== teamId)
}

async function togglePlayerTeam(player: Player, teamId: string) {
  const team = teams.value.find((t) => t.id === teamId)
  if (!team) return
  const tp = team.team_players?.find((tp) => tp.player_id === player.id)
  if (tp) {
    await removePlayerFromTeam(teamId, tp.id)
  } else {
    await addPlayerToTeam(
      teamId,
      player.id,
      player.offense_positions[0] ?? null,
      player.defense_positions[0] ?? null,
    )
  }
}

function openDialog(player: Player | null) {
  editingPlayer.value = player
  dialogOpen.value = true
}

async function handleSubmit(data: {
  name: string
  number: number
  height: number | null
  weight: number | null
  offense_positions: string[]
  defense_positions: string[]
  universal_attributes: Record<string, number>
  offense_attributes: Record<string, number>
  defense_attributes: Record<string, number>
  team_ids: string[]
}) {
  const { team_ids, ...playerData } = data
  if (editingPlayer.value) {
    await updatePlayer(editingPlayer.value.id, playerData as unknown as Partial<Player>)
    // Sync team memberships
    await syncPlayerTeams(editingPlayer.value.id, team_ids, playerData)
  } else {
    const newPlayer = await createPlayer(playerData as any)
    if (newPlayer) {
      // Assign to selected teams, or Free Agent if no teams chosen
      const assignTeams = team_ids.length > 0 ? team_ids : (freeAgentTeam.value ? [freeAgentTeam.value.id] : [])
      for (const teamId of assignTeams) {
        await addPlayerToTeam(
          teamId,
          newPlayer.id,
          playerData.offense_positions[0] ?? null,
          playerData.defense_positions[0] ?? null,
        )
      }
    }
  }
}

async function syncPlayerTeams(playerId: string, newTeamIds: string[], playerData: { offense_positions: string[]; defense_positions: string[] }) {
  const fa = freeAgentTeam.value
  const currentTeamIds = getPlayerTeamIds(playerId)
  // Filter out Free Agent from both lists for comparison
  const currentReal = currentTeamIds.filter((id) => id !== fa?.id)
  const newReal = newTeamIds

  // Remove from teams no longer selected
  for (const teamId of currentReal) {
    if (!newReal.includes(teamId)) {
      const team = teams.value.find((t) => t.id === teamId)
      const tp = team?.team_players?.find((tp) => tp.player_id === playerId)
      if (tp) await removePlayerFromTeam(teamId, tp.id)
    }
  }
  // Add to newly selected teams
  for (const teamId of newReal) {
    if (!currentReal.includes(teamId)) {
      await addPlayerToTeam(
        teamId,
        playerId,
        playerData.offense_positions[0] ?? null,
        playerData.defense_positions[0] ?? null,
      )
    }
  }
  // If player now has real teams, remove from Free Agent
  if (newReal.length > 0 && fa) {
    const faTp = fa.team_players?.find((tp) => tp.player_id === playerId)
    if (faTp) await removePlayerFromTeam(fa.id, faTp.id)
  }
  // If player has no real teams, add to Free Agent
  if (newReal.length === 0 && fa) {
    const alreadyFA = fa.team_players?.some((tp) => tp.player_id === playerId)
    if (!alreadyFA) {
      await addPlayerToTeam(
        fa.id,
        playerId,
        playerData.offense_positions[0] ?? null,
        playerData.defense_positions[0] ?? null,
      )
    }
  }
}

async function handleAutoStarters() {
  autoingStarters.value = true
  try {
    if (!fieldSettings.value) await fetchFieldSettings()
    const offCount = fieldSettings.value?.default_offense_starter_count ?? 5
    const defCount = fieldSettings.value?.default_defense_starter_count ?? 5
    for (const team of teams.value) {
      await autoAssignTeamStarters(team.id, { offenseCount: offCount, defenseCount: defCount })
    }
  } finally {
    autoingStarters.value = false
  }
}

async function handleResetStarters() {
  resettingStarters.value = true
  try {
    for (const team of teams.value) {
      await resetTeamStarters(team.id)
    }
  } finally {
    resettingStarters.value = false
  }
}

async function handleDelete(id: string) {
  const ok = await confirm({
    title: 'Delete Player',
    description: 'Are you sure you want to delete this player? This action cannot be undone.',
    actionLabel: 'Delete',
  })
  if (!ok) return
  deletingId.value = id
  try {
    await deletePlayer(id)
  } finally {
    deletingId.value = null
  }
}

async function handleCreateTeam(data: { name: string; description: string }) {
  const team = await createTeam(data.name, data.description)
  if (team) {
    // If we were adding via the new team slot, auto-select it if possible
    if (trackedTeamIds.value.length < 3) {
      trackedTeamIds.value = [...trackedTeamIds.value, team.id]
    }
  }
}



async function handleBulkDelete() {
  const count = selectedIds.value.size
  const ok = await confirm({
    title: `Delete ${count} Player${count !== 1 ? 's' : ''}`,
    description: `Are you sure you want to delete ${count} player${count !== 1 ? 's' : ''}? This action cannot be undone.`,
    actionLabel: 'Delete',
  })
  if (!ok) return
  bulkDeleting.value = true
  try {
    for (const id of selectedIds.value) {
      await deletePlayer(id)
    }
    selectedIds.value = new Set()
  } finally {
    bulkDeleting.value = false
  }
}

watch([dialogOpen, bulkImportOpen], ([dialog, bulk]) => {
  if (dialog || bulk) fetchTeams() // Ensure teams list is fresh when Add Player or Add Players opens
}, { immediate: false })

onMounted(() => {
  fetchPlayers()
  fetchTeams()
})
</script>
