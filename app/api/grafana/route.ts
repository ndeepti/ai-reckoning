// Proxy for Grafana datasource queries (Loki + Prometheus)
// Requires GRAFANA_URL and GRAFANA_TOKEN in .env.local

const GRAFANA_URL  = process.env.GRAFANA_URL      ?? ''
const GRAFANA_TOKEN = process.env.GRAFANA_TOKEN    ?? ''
const GRAFANA_USER  = process.env.GRAFANA_USER     ?? ''
const GRAFANA_PASS  = process.env.GRAFANA_PASSWORD ?? ''

const LOKI_UID = 'P8E80F9AEF21F6940'

function grafanaHeaders() {
  const auth = GRAFANA_TOKEN
    ? `Bearer ${GRAFANA_TOKEN}`
    : GRAFANA_USER
      ? `Basic ${Buffer.from(`${GRAFANA_USER}:${GRAFANA_PASS}`).toString('base64')}`
      : undefined
  return {
    'Content-Type': 'application/json',
    ...(auth ? { Authorization: auth } : {}),
  }
}

async function queryLoki(query: string, startNs: string, endNs: string, limit = 500) {
  const url = `${GRAFANA_URL}/api/datasources/proxy/uid/${LOKI_UID}/loki/api/v1/query_range`
  const params = new URLSearchParams({ query, start: startNs, end: endNs, limit: String(limit), direction: 'backward' })
  const res = await fetch(`${url}?${params}`, { headers: grafanaHeaders() })
  if (!res.ok) throw new Error(`Loki ${res.status}: ${await res.text()}`)
  return res.json()
}

async function queryPrometheus(expr: string, start: number, end: number, step = '60') {
  // Try to find a Prometheus/Mimir datasource via the search API
  const dsRes = await fetch(`${GRAFANA_URL}/api/datasources`, { headers: grafanaHeaders() })
  if (!dsRes.ok) throw new Error(`Datasources ${dsRes.status}`)
  const datasources: any[] = await dsRes.json()
  const prom = datasources.find((d: any) => d.type === 'prometheus' || d.type === 'grafana-mimir-datasource')
  if (!prom) throw new Error('No Prometheus datasource found')

  const url = `${GRAFANA_URL}/api/datasources/proxy/uid/${prom.uid}/api/v1/query_range`
  const params = new URLSearchParams({ query: expr, start: String(start), end: String(end), step })
  const res = await fetch(`${url}?${params}`, { headers: grafanaHeaders() })
  if (!res.ok) throw new Error(`Prometheus ${res.status}: ${await res.text()}`)
  return res.json()
}

export async function GET(request: Request) {
  if (!GRAFANA_URL) return Response.json({ error: 'GRAFANA_URL not configured' }, { status: 500 })

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') // 'logs' | 'metrics' | 'alerts' | 'datasources'
  const service = searchParams.get('service') ?? 'chip1-transaction'
  const traceId = searchParams.get('traceId') ?? ''
  const nowNs = String(Date.now() * 1_000_000)
  const oneHourAgoNs = String((Date.now() - 3600_000) * 1_000_000)
  const nowSec = Math.floor(Date.now() / 1000)
  const oneHourAgoSec = nowSec - 3600

  try {
    if (type === 'datasources') {
      const res = await fetch(`${GRAFANA_URL}/api/datasources`, { headers: grafanaHeaders() })
      if (!res.ok) return Response.json({ error: `${res.status}` }, { status: res.status })
      return Response.json(await res.json())
    }

    if (type === 'logs') {
      const traceFilter = traceId ? ` |= \`${traceId}\`` : ''
      const query = `{service_name="${service}"}${traceFilter}`
      const data = await queryLoki(query, oneHourAgoNs, nowNs, 200)
      // Flatten Loki streams into sorted log lines
      const lines: { ts: string; text: string }[] = []
      for (const stream of data?.data?.result ?? []) {
        for (const [tsNs, line] of stream.values ?? []) {
          const ms = Math.floor(Number(tsNs) / 1_000_000)
          lines.push({ ts: new Date(ms).toISOString().replace('T', ' ').slice(0, 23), text: line })
        }
      }
      lines.sort((a, b) => a.ts.localeCompare(b.ts))
      return Response.json({ lines, raw: data })
    }

    if (type === 'metrics') {
      const expr = `sum(rate(http_server_requests_seconds_count{application="${service}",status=~"5.."}[1m])) / sum(rate(http_server_requests_seconds_count{application="${service}"}[1m])) * 100`
      const data = await queryPrometheus(expr, oneHourAgoSec, nowSec, '60')
      const points = (data?.data?.result?.[0]?.values ?? []).map(([t, v]: [number, string]) => ({
        time: new Date(t * 1000).toTimeString().slice(0, 5),
        errorRate: parseFloat(parseFloat(v).toFixed(2)),
      }))
      return Response.json({ points, raw: data })
    }

    if (type === 'alerts') {
      const res = await fetch(`${GRAFANA_URL}/api/alerts?state=alerting&limit=10`, { headers: grafanaHeaders() })
      if (!res.ok) return Response.json({ error: `${res.status}` }, { status: res.status })
      return Response.json(await res.json())
    }

    return Response.json({ error: 'type must be logs | metrics | alerts | datasources' }, { status: 400 })
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 })
  }
}
