import { lokiConfigured } from '@/lib/config'
import { fetchLokiLogs } from '@/lib/lokiClient'

export async function GET() {
  if (!lokiConfigured()) {
    return Response.json(
      { error: 'LOKI_URL not configured. Set it in .env.local or drag-drop a log file.' },
      { status: 503 }
    )
  }

  try {
    const { lines, count, source } = await fetchLokiLogs()
    return Response.json({ lines, count, source })
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 })
  }
}
