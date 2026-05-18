import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'

interface InsightItem {
  icon: string
  title: string
  detail: string
  sentiment: 'positive' | 'negative' | 'neutral'
}

async function assertCanAccessJob(supabase: any, jobId: string, userId: string): Promise<string> {
  const { data: job, error: jobError } = await supabase
    .from('sim_jobs')
    .select('id, user_id')
    .eq('id', jobId)
    .maybeSingle()

  if (jobError) {
    throw createError({ statusCode: 400, statusMessage: jobError.message })
  }
  if (!job) {
    throw createError({ statusCode: 404, statusMessage: 'Job not found' })
  }
  if (job.user_id === userId) {
    return job.user_id
  }

  const { data: shares, error: shareError } = await supabase
    .from('sim_job_team_shares')
    .select('team_id')
    .eq('job_id', jobId)

  if (shareError) {
    throw createError({ statusCode: 400, statusMessage: shareError.message })
  }

  const teamIds = [...new Set((shares ?? []).map((share: { team_id: string }) => share.team_id).filter(Boolean))]
  if (teamIds.length === 0) {
    throw createError({ statusCode: 403, statusMessage: 'Not authorized for this job' })
  }

  const [{ data: membership, error: membershipError }, { data: ownedTeam, error: ownedTeamError }] = await Promise.all([
    supabase
      .from('team_memberships')
      .select('id')
      .eq('user_id', userId)
      .in('team_id', teamIds)
      .limit(1)
      .maybeSingle(),
    supabase
      .from('teams')
      .select('id')
      .eq('user_id', userId)
      .in('id', teamIds)
      .limit(1)
      .maybeSingle(),
  ])

  const accessError = membershipError ?? ownedTeamError
  if (accessError) {
    throw createError({ statusCode: 400, statusMessage: accessError.message })
  }

  if (!membership && !ownedTeam) {
    throw createError({ statusCode: 403, statusMessage: 'Not authorized for this job' })
  }

  return job.user_id ?? userId
}

function formatBreakdown(buckets: Record<string, any>): string {
  return Object.entries(buckets)
    .map(([key, v]: [string, any]) => {
      const sr = ((v.success_rate ?? 0) * 100).toFixed(1)
      const yds = v.yards_gained_stats?.mean?.toFixed(1) ?? 'n/a'
      const n = v.n_iterations ?? 0
      const dist = v.outcome_distribution ?? {}
      return `  ${key}: ${sr}% success, ${yds} avg yds, ${n} runs, outcomes=${JSON.stringify(dist)}`
    })
    .join('\n')
}

function buildPrompt(body: {
  play_name?: string
  defense_name?: string
  result_data: Record<string, any>
  receiver_names?: Record<string, string>
}): string {
  const { result_data: d, play_name, defense_name, receiver_names } = body
  const overallSuccess = ((d.overall_success_rate ?? 0) * 100).toFixed(1)
  const overallCompletion = ((d.overall_completion_rate ?? 0) * 100).toFixed(1)
  const scenariosTotal = d.scenarios_total ?? 0
  const receivers = d.per_receiver ?? []
  const worst = d.worst_10_scenarios ?? []

  const receiverLines = receivers
    .map((r: any, i: number) => {
      const name = receiver_names?.[r.receiver_id] ?? `Receiver ${i + 1}`
      return `  ${name}: ${r.targets} targets, ${(r.completion_rate * 100).toFixed(1)}% comp, ${r.yards_gained_mean?.toFixed(1)} avg yds, ${r.touchdowns} TDs, ${r.interceptions} INTs`
    })
    .join('\n')

  const worstLines = worst
    .slice(0, 5)
    .map((s: any) => {
      const sr = ((s.success_rate ?? s.completion_rate ?? 0) * 100).toFixed(1)
      return `  ${s.label ?? s.scenario_id}: ${sr}% success, failure=${s.most_common_failure ?? 'unknown'}`
    })
    .join('\n')

  return `You are a flag football analytics coach. Analyze these simulation results for the play "${play_name ?? 'Unknown'}" vs defense "${defense_name ?? 'Unknown'}".

Overall: ${overallSuccess}% success rate, ${overallCompletion}% completion rate, ${scenariosTotal} scenarios tested.

By Down:
${formatBreakdown(d.aggregated_by_down ?? {})}

By Field Zone:
${formatBreakdown(d.aggregated_by_field_zone ?? {})}

By Rush Count:
${formatBreakdown(d.aggregated_by_rush_count ?? {})}

Per Receiver:
${receiverLines}

Worst Situations:
${worstLines}

Provide 4 to 6 thorough tactical insights. Be comprehensive: cover strengths, weaknesses, situational trends, and actionable recommendations. Each insight must be specific and reference actual numbers from the data. Format as JSON array:
[{"icon":"emoji","title":"short title (max 10 words)","detail":"1-2 sentence explanation with concrete stats","sentiment":"positive|negative|neutral"}]

Rules:
- Include at least one strong positive finding and one risk or weakness
- Include at least one actionable recommendation (play-calling, receiver usage, or situation to avoid)
- Add insights on down-and-distance, field zone, or rush-count patterns when the data supports them
- Use flag football terminology (flag pull, not tackle)
- Reference specific receivers by name, downs, zones, or rush counts where relevant
- Detail can be 1-2 sentences (up to 50 words) so insights are thorough
- Return ONLY the JSON array, no markdown`
}

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const body = await readBody<{
    job_id: string
    result_data: Record<string, any>
    play_name?: string
    defense_name?: string
    receiver_names?: Record<string, string>
    regenerate?: boolean
    cache_only?: boolean
  }>(event)

  const { job_id, result_data, regenerate, cache_only } = body ?? {}
  if (!job_id || !result_data) {
    throw createError({ statusCode: 400, statusMessage: 'Missing job_id or result_data' })
  }

  const supabase = serverSupabaseServiceRole(event)
  const jobOwnerId = await assertCanAccessJob(supabase, job_id, user.id)

  if (!regenerate) {
    const { data: existing } = await supabase
      .from('sim_insights')
      .select('insights')
      .eq('job_id', job_id)
      .maybeSingle()

    if (existing?.insights) {
      setResponseHeader(event, 'Content-Type', 'text/event-stream')
      setResponseHeader(event, 'Cache-Control', 'no-cache')
      setResponseHeader(event, 'Connection', 'keep-alive')
      const items = existing.insights as InsightItem[]
      let sse = ''
      for (const item of items) {
        sse += `data: ${JSON.stringify(item)}\n\n`
      }
      sse += `data: [DONE]\n\n`
      return sse
    }
  }

  if (cache_only) {
    setResponseHeader(event, 'Content-Type', 'text/event-stream')
    setResponseHeader(event, 'Cache-Control', 'no-cache')
    setResponseHeader(event, 'Connection', 'keep-alive')
    return `data: [DONE]\n\n`
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey?.trim()) {
    throw createError({ statusCode: 503, statusMessage: 'Insights not configured (missing OPENAI_API_KEY).' })
  }

  const prompt = buildPrompt(body)

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4,
      max_tokens: 1500,
      stream: true,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw createError({ statusCode: res.status, statusMessage: err || 'OpenAI API error' })
  }

  setResponseHeader(event, 'Content-Type', 'text/event-stream')
  setResponseHeader(event, 'Cache-Control', 'no-cache')
  setResponseHeader(event, 'Connection', 'keep-alive')

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      let fullContent = ''
      const allEmittedItems: InsightItem[] = []
      const emittedTitles = new Set<string>()

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })

          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''

          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed.startsWith('data: ')) continue
            const payload = trimmed.slice(6)
            if (payload === '[DONE]') continue
            try {
              const parsed = JSON.parse(payload)
              const delta = parsed.choices?.[0]?.delta?.content
              if (delta) {
                fullContent += delta
                const completed = extractCompletedInsights(fullContent)
                for (const item of completed.items) {
                  if (allEmittedItems.length >= 6) break
                  const titleKey = item.title.toLowerCase().trim()
                  if (emittedTitles.has(titleKey)) continue
                  emittedTitles.add(titleKey)
                  allEmittedItems.push(item)
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify(item)}\n\n`))
                }
                if (completed.items.length > 0) {
                  fullContent = completed.remaining
                }
              }
            } catch { /* skip malformed chunks */ }
          }
        }

        if (fullContent.trim() && allEmittedItems.length < 6) {
          try {
            const finalItems = JSON.parse(ensureValidJson(fullContent.trim())) as InsightItem[]
            for (const item of finalItems) {
              if (allEmittedItems.length >= 6) break
              const titleKey = item.title.toLowerCase().trim()
              if (emittedTitles.has(titleKey)) continue
              emittedTitles.add(titleKey)
              allEmittedItems.push(item)
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(item)}\n\n`))
            }
          } catch { /* already sent what we could */ }
        }

        controller.enqueue(encoder.encode(`data: [DONE]\n\n`))
        controller.close()
      } catch (err) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Stream error' })}\n\n`))
        controller.close()
      }

      if (allEmittedItems.length > 0) {
        try {
          await supabase.from('sim_insights').upsert(
            { job_id, user_id: jobOwnerId, insights: allEmittedItems, model: 'gpt-4o-mini' },
            { onConflict: 'job_id' },
          )
        } catch { /* best effort save */ }
      }
    },
  })

  return sendStream(event, stream)
})

/** Extract fully-formed JSON objects from a partial JSON array string, emitting them one at a time. */
function extractCompletedInsights(content: string): { items: InsightItem[]; remaining: string } {
  const items: InsightItem[] = []
  let str = content.trim()
  if (str.startsWith('[')) str = str.slice(1).trim()

  while (str.length > 0) {
    const objStart = str.indexOf('{')
    if (objStart === -1) break

    let depth = 0
    let inString = false
    let escape = false
    let objEnd = -1

    for (let i = objStart; i < str.length; i++) {
      const ch = str[i]
      if (escape) { escape = false; continue }
      if (ch === '\\') { escape = true; continue }
      if (ch === '"') { inString = !inString; continue }
      if (inString) continue
      if (ch === '{') depth++
      else if (ch === '}') {
        depth--
        if (depth === 0) { objEnd = i; break }
      }
    }

    if (objEnd === -1) break

    try {
      const obj = JSON.parse(str.slice(objStart, objEnd + 1))
      if (obj.icon && obj.title && obj.detail && obj.sentiment) {
        items.push(obj as InsightItem)
      }
    } catch { /* incomplete */ break }

    str = str.slice(objEnd + 1).trim()
    if (str.startsWith(',')) str = str.slice(1).trim()
  }

  return { items, remaining: items.length > 0 ? str : content }
}

function ensureValidJson(s: string): string {
  let trimmed = s.trim()
  if (!trimmed.startsWith('[')) trimmed = '[' + trimmed
  if (!trimmed.endsWith(']')) trimmed = trimmed + ']'
  // Remove trailing comma before ]
  trimmed = trimmed.replace(/,\s*\]$/, ']')
  return trimmed
}
