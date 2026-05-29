import { loadFileConfig } from '@/lib/config'

export async function GET() {
  const file = loadFileConfig()
  const lokiUrl   = file.lokiUrl   || process.env.LOKI_URL   || ''
  const lokiQuery = file.lokiQuery || process.env.LOKI_QUERY || ''
  if (!lokiUrl || !lokiQuery) return Response.json({ points: [], debug: 'no url or query' })

  const nowMs  = Date.now()
  const toMs   = file.lokiTo   ? new Date(file.lokiTo).getTime()   : nowMs
  const fromMs = file.lokiFrom ? new Date(file.lokiFrom).getTime() : toMs - 2 * 3_600_000

  // Stream selector = everything before the first pipe
  const streamSelector = lokiQuery.split('|')[0].trim()
  const metricQuery    = `sum(count_over_time(${streamSelector}[5m]))`

  // Step: aim for ~60 points across the range
  const rangeS = Math.floor((toMs - fromMs) / 1000)
  const step   = Math.max(60, Math.floor(rangeS / 60))

  try {
    const params = new URLSearchParams({
      query: metricQuery,
      start: String(Math.floor(fromMs / 1000)),
      end:   String(Math.floor(toMs   / 1000)),
      step:  String(step),
    })

    const res = await fetch(`${lokiUrl}/loki/api/v1/query_range?${params}`, {
      signal: AbortSignal.timeout(30_000),
    })

    if (!res.ok) {
      const body = await res.text()
      return Response.json({ points: [], debug: `Loki ${res.status}: ${body.slice(0, 200)}` })
    }

    const data = await res.json() as {
      data?: { resultType?: string; result?: Array<{ values: [string, string][] }> }
    }

    const result = data?.data?.result ?? []
    if (result.length === 0) {
      return Response.json({
        points: [],
        debug: `resultType=${data?.data?.resultType} result=[] query=${metricQuery}`,
      })
    }

    // Merge all streams (sum may return multiple series if labels differ)
    const allValues: [string, string][] = result.flatMap(r => r.values ?? [])
    allValues.sort((a, b) => Number(a[0]) - Number(b[0]))

    const points = allValues.map(([ts, val]) => ({
      time:   new Date(Number(ts) * 1000).toISOString().slice(11, 16),
      errors: Number(val),
    }))

    return Response.json({ points })
  } catch (e) {
    return Response.json({ points: [], debug: (e as Error).message })
  }
}
