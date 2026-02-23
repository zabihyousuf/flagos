const SYSTEM_PROMPT = `You are a creative flag football offensive coordinator. You design plays that use the tools available in our play designer.

Available route types (use exactly one of these for each player's routeType). These are translated into drawable routes (straight, curved, or option branches) on the canvas:
- fly: go route, vertical
- post: break toward goal post
- corner: break to corner of end zone
- in: break inside (toward middle)
- out: break outside (toward sideline)
- curl: come back to QB
- slant: quick slant to middle
- center: center release to flat (left or right)
- center_seam: center short seam up the middle
- option_out_in: option route — break out or in (drawn as two branches)

You may also suggest QB motion (rollout). Return qbMotion as one of: "none", "roll_left", "roll_right", "boot_left", "boot_right".

Respond with valid JSON only, no markdown or extra text. Use this exact shape:
{
  "playName": "string (creative name)",
  "scenario": "string (e.g. 3rd and short, red zone, two-minute)",
  "reason": "string (1-2 sentences why this play is effective for flag football)",
  "routes": [
    { "position": "C|WR", "designation": "C|WR", "routeType": "fly|post|corner|in|out|curl|slant|center|center_seam|option_out_in" }
  ],
  "primaryTargetDesignation": "X",
  "readOrderDesignations": ["X", "C", "Z", "Y"],
  "qbMotion": "none|roll_left|roll_right|boot_left|boot_right"
}

Rules:
- Include exactly one route per player listed above, in the SAME order (first player in the list = first route in the routes array, etc.).
- primaryTargetDesignation is the read 1 / who to throw to first.
- readOrderDesignations is the full read progression in order.
- Use the yard line and alignment (from sideline) of each receiver to design routes that fit the formation (e.g. slot at 35 yd gets different concepts than outside WRs).
- Set qbMotion to add a QB rollout when it helps the play (e.g. boot to get outside, roll to throw on the run); use "none" when QB stays in pocket.
- Be creative and varied. Keep plays suitable for flag football (no blocking schemes, quick timing).`

// Canonical offense order: C first, then WR by x (left to right). Matches formation QB, C, WR, WR, WR.
function sortOffense<T extends { position?: string; designation?: string; x?: number }>(list: T[]): T[] {
  return [...list].sort((a, b) => {
    const aIsC = (a.position || a.designation || '').toUpperCase() === 'C'
    const bIsC = (b.position || b.designation || '').toUpperCase() === 'C'
    if (aIsC && !bIsC) return -1
    if (!aIsC && bIsC) return 1
    return (a.x ?? 0) - (b.x ?? 0)
  })
}

function yardLineFromY(y: number, fieldLength: number, endzoneSize: number): number {
  const totalLength = fieldLength + endzoneSize * 2
  const yardFromTop = y * totalLength
  const relativeYard = yardFromTop - endzoneSize
  const displayYard = fieldLength - relativeYard
  return Math.max(0, Math.min(fieldLength, Math.round(displayYard)))
}

function sidelineFromX(x: number, fieldWidth: number): number {
  const distFromLeft = x * fieldWidth
  return Math.min(distFromLeft, fieldWidth - distFromLeft)
}

function buildUserPrompt(
  players: { id?: string; position?: string; designation?: string; name?: string; number?: number; side?: string; x?: number; y?: number }[],
  roster: { id?: string; name?: string; number?: number; universal_attributes?: Record<string, unknown>; offense_attributes?: Record<string, unknown> }[],
  fieldSettings: { field_length: number; field_width: number; endzone_size: number }
): string {
  const { field_length, field_width, endzone_size } = fieldSettings
  const qb = players.find((p) => p.side === 'offense' && ((p.position || '').toUpperCase() === 'QB' || (p.designation || '').toUpperCase() === 'Q'))
  const offense = players.filter(
    (p) => p.side === 'offense' && (p.position || '').toUpperCase() !== 'QB' && (p.designation || '').toUpperCase() !== 'Q'
  )
  const offenseSorted = sortOffense(offense)
  const qbLine = qb != null && typeof qb.y === 'number'
    ? `QB at yard line ${yardLineFromY(qb.y, field_length, endzone_size)}, ${sidelineFromX(qb.x ?? 0.5, field_width).toFixed(1)} yd from sideline.\n\n`
    : ''
  const lines = offenseSorted.map((p) => {
    const r = roster.find(
      (x) => x.id === p.id || (x.name === p.name && x.number === p.number)
    )
    const u = r?.universal_attributes
    const o = r?.offense_attributes
    const yl = typeof p.y === 'number' ? yardLineFromY(p.y, field_length, endzone_size) : '?'
    const sid = typeof p.x === 'number' ? sidelineFromX(p.x, field_width).toFixed(1) : '?'
    return `- ${p.position} ${p.designation}: yard line ${yl}, ${sid} yd from sideline, speed ${u?.speed ?? '?'}, route running ${o?.route_running ?? '?'}, name ${p.name ?? '?'}`
  })
  return `${qbLine}Receivers (use this EXACT order for the routes array). Each is listed with yard line and distance from sideline so you can design routes and QB motion to fit the formation:\n${lines.join('\n')}\n\nGenerate one creative flag football play: routes for every receiver above (same order) and optionally qbMotion (none, roll_left, roll_right, boot_left, boot_right). Respond with JSON only.`
}

import { serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey?.trim()) {
    throw createError({ statusCode: 503, statusMessage: 'Suggest Play is not configured (missing OPENAI_API_KEY).' })
  }
  const body = await readBody<{
    players: { id?: string; position?: string; designation?: string; name?: string; number?: number; side?: string; x?: number; y?: number }[]
    roster: { id?: string; name?: string; number?: number; universal_attributes?: Record<string, unknown>; offense_attributes?: Record<string, unknown> }[]
    fieldSettings?: { field_length: number; field_width: number; endzone_size: number }
  }>(event)
  const { players = [], roster = [], fieldSettings: fs } = body || {}
  const fieldSettings = fs ?? { field_length: 50, field_width: 25, endzone_size: 7 }
  const userPrompt = buildUserPrompt(players, roster, fieldSettings)
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.9,
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw createError({ statusCode: res.status, statusMessage: err || 'OpenAI API error' })
  }
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] }
  const raw = data.choices?.[0]?.message?.content
  if (!raw) {
    throw createError({ statusCode: 502, statusMessage: 'Empty response from OpenAI' })
  }
  const parsed = JSON.parse(raw) as {
    playName?: string
    scenario?: string
    reason?: string
    routes?: { position: string; designation: string; routeType: string }[]
    primaryTargetDesignation?: string
    readOrderDesignations?: string[]
    qbMotion?: string
  }
  if (!parsed.routes || !Array.isArray(parsed.routes)) {
    throw createError({ statusCode: 502, statusMessage: 'Invalid play format from OpenAI' })
  }
  if (!parsed.readOrderDesignations?.length) {
    parsed.readOrderDesignations = parsed.routes.map((r) => r.designation)
  }
  if (!parsed.primaryTargetDesignation && parsed.readOrderDesignations[0]) {
    parsed.primaryTargetDesignation = parsed.readOrderDesignations[0]
  }
  if (!parsed.qbMotion || !['none', 'roll_left', 'roll_right', 'boot_left', 'boot_right'].includes(parsed.qbMotion)) {
    parsed.qbMotion = 'none'
  }
  return parsed
})
