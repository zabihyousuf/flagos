
import { 
  UNIVERSAL_ATTRIBUTE_GROUP, 
  OFFENSE_ATTRIBUTE_GROUPS, 
  DEFENSE_ATTRIBUTE_GROUPS 
} from '~/lib/constants'
import type { Player } from '~/lib/types'

export function usePlayerExport() {
  const { teams } = useTeams()

  function exportPlayers(players: Player[]) {
    if (!players.length) return

    // 1. Build Headers
    const headers = [
      'Name', 
      'Number', 
      'Height', 
      'Weight', 
      'Offense Positions', 
      'Defense Positions',
      'Teams'
    ]

    // Universal Attributes
    UNIVERSAL_ATTRIBUTE_GROUP.attrs.forEach(a => headers.push(a.label))

    // Offense Attributes
    OFFENSE_ATTRIBUTE_GROUPS.forEach(g => {
      g.attrs.forEach(a => headers.push(a.label))
    })

    // Defense Attributes
    DEFENSE_ATTRIBUTE_GROUPS.forEach(g => {
      g.attrs.forEach(a => headers.push(a.label))
    })

    // 2. Build Rows
    const rows = players.map(player => {
      const row: string[] = []

      // Basic Info
      row.push(escapeCsv(player.name))
      row.push(player.number?.toString() ?? '')
      row.push(player.height?.toString() ?? '')
      row.push(player.weight?.toString() ?? '')
      
      // Positions
      row.push(escapeCsv(player.offense_positions.join('/')))
      row.push(escapeCsv(player.defense_positions.join('/')))

      // Teams
      // Find all teams this player belongs to
      const playerTeams = teams.value
        .filter(t => t.team_players?.some(tp => tp.player_id === player.id))
        .map(t => t.name)
        .filter(name => name !== 'Free Agents') // Optional: exclude FA if desired, or keep it
      
      row.push(escapeCsv(playerTeams.join('; ')))

      // Universal Attributes
      UNIVERSAL_ATTRIBUTE_GROUP.attrs.forEach(attr => {
        const val = player.universal_attributes?.[attr.key] ?? 5
        row.push(val.toString())
      })

      // Offense Attributes
      OFFENSE_ATTRIBUTE_GROUPS.forEach(g => {
        g.attrs.forEach(attr => {
          const val = player.offense_attributes?.[attr.key] ?? 5
          row.push(val.toString())
        })
      })

      // Defense Attributes
      DEFENSE_ATTRIBUTE_GROUPS.forEach(g => {
        g.attrs.forEach(attr => {
          const val = player.defense_attributes?.[attr.key] ?? 5
          row.push(val.toString())
        })
      })

      return row.join(',')
    })

    // 3. Combine and Download
    const csvContent = [headers.join(','), ...rows].join('\n')
    downloadCsv(csvContent, `flagos_roster_export_${new Date().toISOString().split('T')[0]}.csv`)
  }

  function escapeCsv(str: string): string {
    if (!str) return ''
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  function downloadCsv(content: string, filename: string) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', filename)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  return {
    exportPlayers
  }
}
