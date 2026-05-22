import fs from 'fs'

const LOG_FILES = [
  process.env.LOG_FILE_PATH  ?? '/Users/dnagboth/Downloads/Logs-2026-05-21 20_36_37.txt',
  process.env.LOG_FILE_PATH2 ?? '/Users/dnagboth/Downloads/Logs-2026-05-21 21_14_38.txt',
]

type Entry = { iso: string; lvl: string; logger: string; msg: string; st: string; src: number }

function parseFile(path: string, srcIndex: number): Entry[] {
  try {
    const raw = fs.readFileSync(path, 'utf8')
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
          src:    srcIndex,
        })
      } catch { /* skip unparseable */ }
    }
    return entries
  } catch { return [] }
}

// Keep ERROR/WARN lines + first/last 5 INFO per file for context. Cap at 150 total.
export async function GET() {
  try {
    const allParsed: Entry[] = []
    for (let i = 0; i < LOG_FILES.length; i++) {
      allParsed.push(...parseFile(LOG_FILES[i], i))
    }

    if (allParsed.length === 0) {
      return Response.json({ error: 'No log files found or all empty' }, { status: 500 })
    }

    const errors  = allParsed.filter(e => e.lvl === 'ERROR' || e.lvl === 'WARN')
    const infos   = allParsed.filter(e => e.lvl === 'INFO')
    const context = [...infos.slice(0, 5), ...infos.slice(-5)]

    const selected = [...context, ...errors]
      .sort((a, b) => a.iso.localeCompare(b.iso))
      .slice(0, 150)

    const FILE_LABELS = ['fn-connect-svc [file1]', 'fn-connect-svc [file2]']

    const lines = selected.map(e => {
      let entry = `${e.iso} ${e.lvl.padEnd(5)} [${FILE_LABELS[e.src] ?? 'unknown'}:${e.logger}] ${e.msg}`
      if (e.st) {
        const frame = e.st.split('\n').map(s => s.trim())
          .find(s => s.startsWith('co.altir') || s.startsWith('org.spring'))
        if (frame) entry += `\n  at ${frame}`
      }
      return entry
    })

    return Response.json({ lines, count: lines.length, files: LOG_FILES.length })
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 })
  }
}
