type Entry = { iso: string; lvl: string; logger: string; msg: string; st: string }

function parseLokiTSV(raw: string): Entry[] {
  const entries: Entry[] = []
  for (const line of raw.split('\n')) {
    const parts = line.trim().split('\t')
    if (parts.length < 3) continue
    const [, iso, rest] = parts
    try {
      const obj = JSON.parse(rest) as Record<string, unknown>
      entries.push({
        iso:    String(iso ?? '').slice(0, 19),
        lvl:    String(obj.level ?? 'INFO'),
        logger: String(obj.logger ?? '').split('.').pop() ?? '',
        msg:    String(obj.message ?? '').slice(0, 200),
        st:     String(obj.stackTrace ?? ''),
      })
    } catch { /* skip unparseable */ }
  }
  return entries
}

function entriesToLines(entries: Entry[]): string[] {
  const errors  = entries.filter(e => e.lvl === 'ERROR' || e.lvl === 'WARN')
  const infos   = entries.filter(e => e.lvl === 'INFO')
  const context = [...infos.slice(0, 5), ...infos.slice(-5)]

  return [...context, ...errors]
    .sort((a, b) => a.iso.localeCompare(b.iso))
    .slice(0, 150)
    .map(e => {
      let line = `${e.iso} ${e.lvl.padEnd(5)} [fn-connect-svc:${e.logger}] ${e.msg}`
      if (e.st) {
        const frame = e.st.split('\n').map(s => s.trim())
          .find(s => s.startsWith('co.altir') || s.startsWith('org.spring'))
        if (frame) line += `\n  at ${frame}`
      }
      return line
    })
}

// Accepts raw Loki TSV export as request body (text/plain).
// Applies the same filtering as GET /api/logs: ERROR/WARN + first/last 5 INFO, cap 150.
export async function POST(request: Request) {
  try {
    const raw = await request.text()
    if (!raw.trim()) return Response.json({ error: 'Empty body' }, { status: 400 })

    const entries = parseLokiTSV(raw)

    if (entries.length === 0) {
      // Plain text fallback — last 150 non-empty lines
      const plain = raw.split('\n').filter(l => l.trim())
      const kept  = plain.slice(-150)
      return Response.json({ lines: kept, count: kept.length, total: plain.length })
    }

    const lines = entriesToLines(entries)
    return Response.json({ lines, count: lines.length, total: entries.length })
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 })
  }
}
