import { loadFileConfig } from '@/lib/config'

interface ServiceEntry {
  value:    string  // service name
  lokiLabel: string  // label key to use in LogQL (service_name or app)
  lokiUrl:  string  // which Loki instance to query
}

async function fetchLabelValues(lokiUrl: string, label: string): Promise<string[]> {
  if (!lokiUrl) return []
  try {
    const res = await fetch(
      `${lokiUrl}/loki/api/v1/label/${label}/values`,
      { signal: AbortSignal.timeout(5000) }
    )
    if (!res.ok) return []
    const data: { data?: string[] } = await res.json()
    return data.data ?? []
  } catch {
    return []
  }
}

export async function GET() {
  const file = loadFileConfig()
  const url1 = process.env.LOKI_URL   || file.lokiUrl  || ''
  const url2 = process.env.LOKI_URL_2 || file.lokiUrl2 || ''

  // Fetch service_name values from both Lokis in parallel
  const [svcFromUrl1, svcFromUrl2, appFromUrl2] = await Promise.all([
    url1 ? fetchLabelValues(url1, 'service_name') : Promise.resolve([]),
    url2 ? fetchLabelValues(url2, 'service_name') : Promise.resolve([]),
    url2 ? fetchLabelValues(url2, 'app')          : Promise.resolve([]),
  ])

  const services: ServiceEntry[] = []
  const seen = new Set<string>()

  // Primary Loki (chip1) — service_name label
  for (const v of svcFromUrl1) {
    if (!seen.has(v)) { seen.add(v); services.push({ value: v, lokiLabel: 'service_name', lokiUrl: url1 }) }
  }

  // Secondary Loki (altir) — service_name label (deduplicated)
  for (const v of svcFromUrl2) {
    if (!seen.has(v)) { seen.add(v); services.push({ value: v, lokiLabel: 'service_name', lokiUrl: url2 }) }
  }

  // Secondary Loki (altir) — app label (deduplicated)
  for (const v of appFromUrl2) {
    if (!seen.has(v)) { seen.add(v); services.push({ value: v, lokiLabel: 'app', lokiUrl: url2 }) }
  }

  return Response.json({ services })
}
