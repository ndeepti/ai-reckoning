import { loadFileConfig } from './config'

type Entry = { iso: string; tsMs: number; lvl: string; logger: string; msg: string; st: string }

// Read fresh from env + config.json on every call — never uses the module-level cached config object.
// File wins over env for url/query so the service picker can switch Loki at runtime.
function getLokiConfig() {
  const file = loadFileConfig()
  return {
    url:          file.lokiUrl          || process.env.LOKI_URL           || '',
    query:        file.lokiQuery        || process.env.LOKI_QUERY         || '',
    lookbackHours:Number(file.lokiLookbackHours || process.env.LOKI_LOOKBACK_HOURS || '2'),
    limit:        Number(file.lokiLimit  || process.env.LOKI_LIMIT        || '500'),
    token:        process.env.LOKI_TOKEN    || '',
    username:     process.env.LOKI_USERNAME || '',
    password:     process.env.LOKI_PASSWORD || '',
    serviceName:  file.serviceName || process.env.SERVICE_NAME            || '',
    from:         file.lokiFrom || '',
    to:           file.lokiTo   || '',
  }
}

function authHeader(token: string, username: string, password: string): Record<string, string> {
  if (token) return { Authorization: `Bearer ${token}` }
  if (username) {
    const encoded = Buffer.from(`${username}:${password}`).toString('base64')
    return { Authorization: `Basic ${encoded}` }
  }
  return {}
}

function parseLogLine(raw: string, tsNs: string): Entry {
  let iso = '', lvl = 'INFO', logger = '', msg = raw, st = ''
  let tsMs = parseInt(tsNs.slice(0, -6), 10)

  try {
    const obj = JSON.parse(raw) as Record<string, unknown>
    const isoRaw = String(obj.timestamp ?? obj.time ?? obj['@timestamp'] ?? '')
    iso    = isoRaw.slice(0, 19).replace('T', ' ')
    if (isoRaw) tsMs = new Date(isoRaw).getTime() || tsMs
    lvl    = String(obj.level ?? obj.severity ?? obj.lvl ?? 'INFO').toUpperCase()
    logger = String(obj.logger ?? obj.class ?? '').split('.').pop() ?? ''
    msg    = String(obj.message ?? obj.msg ?? raw).slice(0, 200)
    st     = String(obj.stackTrace ?? obj.stack_trace ?? obj.exception ?? '')
  } catch {
    const levelMatch = raw.match(/\b(ERROR|WARN|INFO|DEBUG|TRACE)\b/)
    lvl = levelMatch?.[1] ?? 'INFO'
    const isoMatch = raw.match(/\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}/)
    iso = isoMatch?.[0]?.replace('T', ' ') ?? ''
    msg = raw.slice(0, 200)
  }

  if (!iso) iso = new Date(tsMs).toISOString().replace('T', ' ').slice(0, 19)

  return { iso, tsMs, lvl, logger, msg, st }
}

function msToNs(ms: number): string {
  return String(Math.floor(ms)) + '000000'
}

async function queryLoki(
  url: string,
  query: string,
  startMs: number,
  endMs: number,
  limit: number,
  headers: Record<string, string>
): Promise<Entry[]> {
  const params = new URLSearchParams({
    query,
    start:     msToNs(startMs),
    end:       msToNs(endMs),
    limit:     String(limit),
    direction: 'forward',
  })
  const res = await fetch(`${url}/loki/api/v1/query_range?${params}`, { headers })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Loki ${res.status}: ${body.slice(0, 200)}`)
  }
  const data = await res.json() as {
    data?: { result?: Array<{ values: [string, string][] }> }
  }
  const entries: Entry[] = []
  for (const stream of data?.data?.result ?? []) {
    for (const [tsNs, raw] of stream.values ?? []) {
      entries.push(parseLogLine(raw, tsNs))
    }
  }
  return entries
}

function formatEntry(e: Entry, serviceName: string): string {
  let out = `${e.iso} ${e.lvl.padEnd(5)} [${serviceName || 'app'}:${e.logger || 'app'}] ${e.msg}`
  if (e.st) {
    const frame = e.st.split('\n').map(s => s.trim())
      .find(s => /^at (co\.|org\.spring)/.test(s) || /^(co\.|org\.spring)/.test(s))
    if (frame) out += `\n  at ${frame}`
  }
  return out
}

export async function fetchLokiLogs(): Promise<{ lines: string[]; count: number; source: string }> {
  const cfg = getLokiConfig()
  const nowMs  = Date.now()
  const toMs   = cfg.to   ? new Date(cfg.to).getTime()   : nowMs
  const fromMs = cfg.from ? new Date(cfg.from).getTime() : toMs - cfg.lookbackHours * 3_600_000
  const rangeHours = (toMs - fromMs) / 3_600_000
  const auth = authHeader(cfg.token, cfg.username, cfg.password)
  const hdrs = { 'Content-Type': 'application/json', ...auth }

  // ── Phase 1: error sweep across full range ─────────────────────────────────
  // Appending a line filter keeps the limit meaningful regardless of range width.
  const errorFilter = ' |~ "(?i)(error|warn|exception|stacktrace|fatal)"'
  const errorQuery  = cfg.query + errorFilter

  let errorEntries: Entry[] = []
  try {
    errorEntries = await queryLoki(cfg.url, errorQuery, fromMs, toMs, 200, hdrs)
  } catch {
    // If the filter syntax isn't supported, fall back to unfiltered
    errorEntries = []
  }

  let finalEntries: Entry[]

  if (errorEntries.length > 0) {
    // ── Phase 2: context window around the first error ─────────────────────
    const firstErrorMs = Math.min(...errorEntries.map(e => e.tsMs))
    const contextWindowMs = rangeHours > 24 ? 15 * 60_000 : 10 * 60_000  // ±15 min for wide, ±10 for narrow
    const ctxFrom = Math.max(fromMs, firstErrorMs - contextWindowMs)
    const ctxTo   = Math.min(toMs,   firstErrorMs + contextWindowMs)

    let contextEntries: Entry[] = []
    try {
      contextEntries = await queryLoki(cfg.url, cfg.query, ctxFrom, ctxTo, 100, hdrs)
    } catch { /* context is optional */ }

    // Merge: deduplicate by (iso + msg), errors take priority
    const seen = new Set<string>()
    const merged: Entry[] = []
    for (const e of [...errorEntries, ...contextEntries]) {
      const key = `${e.iso}|${e.msg.slice(0, 60)}`
      if (!seen.has(key)) { seen.add(key); merged.push(e) }
    }

    finalEntries = merged
      .sort((a, b) => a.tsMs - b.tsMs)
      .slice(0, 150)
  } else {
    // No errors found — fall back: first 5 + last 5 INFO as context, cap 150
    let allEntries: Entry[] = []
    try {
      allEntries = await queryLoki(cfg.url, cfg.query, fromMs, toMs, cfg.limit, hdrs)
    } catch (err) {
      throw err
    }
    const errors  = allEntries.filter(e => e.lvl === 'ERROR' || e.lvl === 'WARN')
    const infos   = allEntries.filter(e => e.lvl === 'INFO')
    const context = [...infos.slice(0, 5), ...infos.slice(-5)]
    finalEntries  = [...context, ...errors].sort((a, b) => a.tsMs - b.tsMs).slice(0, 150)
  }

  const lines = finalEntries.map(e => formatEntry(e, cfg.serviceName))
  return { lines, count: lines.length, source: `${cfg.serviceName || 'service'} via Loki` }
}

export async function checkLokiHealth(): Promise<boolean> {
  const cfg = getLokiConfig()
  if (!cfg.url) return false
  try {
    const res = await fetch(
      `${cfg.url}/loki/api/v1/labels`,
      { headers: authHeader(cfg.token, cfg.username, cfg.password), signal: AbortSignal.timeout(5000) }
    )
    return res.ok
  } catch {
    return false
  }
}
