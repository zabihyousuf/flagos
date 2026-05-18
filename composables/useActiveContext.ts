export interface TeamContext {
  id: string
  name: string
  role: 'coach' | 'player'
}

export function useActiveContext() {
  const { teams } = useTeams()
  const { memberships, activeTeamId: storedActiveTeamId, setActiveTeam } = useTeamMemberships()
  const { profile } = useProfile()
  const user = useSupabaseUser()

  const allTeams = computed<TeamContext[]>(() => {
    const seen = new Set<string>()
    const result: TeamContext[] = []

    // Memberships come first — they carry the authoritative role from the DB
    for (const m of memberships.value) {
      if (m.team && !seen.has(m.team_id)) {
        seen.add(m.team_id)
        result.push({ id: m.team_id, name: m.team!.name, role: m.role === 'coach' ? 'coach' : 'player' })
      }
    }

    // Owned teams not yet covered by memberships (user is the creator → coach)
    for (const t of teams.value) {
      if (t.name !== 'Free Agent' && !seen.has(t.id) && t.user_id === user.value?.id) {
        seen.add(t.id)
        result.push({ id: t.id, name: t.name, role: 'coach' })
      }
    }

    return result
  })

  const activeTeam = computed<TeamContext | null>(() => {
    if (!allTeams.value.length) return null

    // 1. Session override — user explicitly switched via sidebar this session
    if (storedActiveTeamId.value) {
      const found = allTeams.value.find((t) => t.id === storedActiveTeamId.value)
      if (found) return found
    }

    // 2. Saved preference — profile.default_team_id persists across logins
    if (profile.value?.default_team_id) {
      const found = allTeams.value.find((t) => t.id === profile.value!.default_team_id)
      if (found) return found
    }

    return allTeams.value[0] ?? null
  })

  const activeTeamId = computed<string | null>(() => activeTeam.value?.id ?? null)

  /** True when the user has an explicit team selection (session or saved default). */
  const hasExplicitSelection = computed(() => {
    if (storedActiveTeamId.value && allTeams.value.some((t) => t.id === storedActiveTeamId.value)) return true
    if (profile.value?.default_team_id && allTeams.value.some((t) => t.id === profile.value!.default_team_id)) return true
    return false
  })

  /**
   * True when the user is acting as a coach.
   * Priority: active team role → profile.account_type fallback.
   */
  const isManager = computed(() => {
    if (activeTeam.value?.role === 'player') return false
    if (activeTeam.value?.role === 'coach') return true
    // No active team: fall back to profile account_type
    return profile.value?.account_type !== 'player'
  })

  const isPlayer = computed(() => !isManager.value)

  return {
    allTeams,
    activeTeam,
    activeTeamId,
    hasExplicitSelection,
    isManager,
    isPlayer,
    setActiveTeam,
  }
}
