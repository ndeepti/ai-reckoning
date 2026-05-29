import { loadFileConfig } from '@/lib/config'

async function checkUrl(url: string): Promise<boolean> {
  if (!url) return false
  try {
    const r = await fetch(`${url}/loki/api/v1/labels`, { signal: AbortSignal.timeout(5000) })
    return r.ok
  } catch {
    return false
  }
}

async function countLogs(lokiUrl: string, query: string, fromMs: number, toMs: number): Promise<number> {
  if (!lokiUrl || !query) return 0
  try {
    const params = new URLSearchParams({
      query,
      start: String(Math.floor(fromMs)) + '000000',
      end:   String(Math.floor(toMs))   + '000000',
      limit: '10',
    })
    const r = await fetch(`${lokiUrl}/loki/api/v1/query_range?${params}`, { signal: AbortSignal.timeout(8000) })
    if (!r.ok) return 0
    const d = await r.json() as { data?: { result?: Array<{ values: unknown[] }> } }
    return d.data?.result?.reduce((n, s) => n + s.values.length, 0) ?? 0
  } catch {
    return 0
  }
}

export async function GET() {
  const file = loadFileConfig()

  // chip1 Loki: always from env (never overwritten by service picker)
  const chip1Url  = process.env.LOKI_URL   || ''
  // altir Loki: stored as lokiUrl2 (written once by Settings panel or POST /api/config)
  const altirUrl  = file.lokiUrl2 || process.env.LOKI_URL_2 || ''
  // Active: whichever Loki the service picker last switched to
  const activeUrl = file.lokiUrl  || chip1Url
  const activeQuery = file.lokiQuery || process.env.LOKI_QUERY || ''

  const nowMs  = Date.now()
  const fromMs = nowMs - 2 * 3_600_000

  const [chip1Healthy, altirHealthy, logCount] = await Promise.all([
    checkUrl(chip1Url),
    checkUrl(altirUrl),
    countLogs(activeUrl, activeQuery, fromMs, nowMs),
  ])

  return Response.json({
    loki: {
      chip1: { url: chip1Url  || null, healthy: chip1Healthy, label: 'service_name' },
      altir: { url: altirUrl  || null, healthy: altirHealthy, label: 'app / service_name' },
      active: { url: activeUrl || null, query: activeQuery || null },
    },
    logsInLastTwoHours: logCount,
    openai:       !!process.env.OPENAI_API_KEY,
    teamsWebhook: !!process.env.TEAMS_WEBHOOK_SECRET,
    dataMode: {
      logs:    activeUrl && activeQuery ? 'live' : 'mock',
      metrics: activeUrl ? 'live-from-loki' : 'none',
      diff:    'user-provided (paste in Diff tab)',
      teams:   process.env.TEAMS_WEBHOOK_SECRET ? 'live-webhook' : 'empty-until-webhook',
    },
    checks: {
      canRunAnalysis: !!process.env.OPENAI_API_KEY,
      hasLiveLogs:    logCount > 0,
      hasLokiAccess:  chip1Healthy || altirHealthy,
    },
  })
}
