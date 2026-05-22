// Triggers the PA "Fetch Channel History" flow which lists last 24h messages
// from chip1-releases and Chip1-Integration and posts them to our webhook.

export async function POST() {
  const paUrl = process.env.PA_TEAMS_FETCH_URL

  if (!paUrl) {
    return Response.json({ ok: false, reason: 'PA_TEAMS_FETCH_URL not set — using seeded messages' })
  }

  try {
    const res = await fetch(paUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
    if (!res.ok) {
      const text = await res.text()
      return Response.json({ ok: false, reason: `PA returned ${res.status}: ${text.slice(0, 200)}` })
    }
    return Response.json({ ok: true, reason: 'PA fetch triggered — messages arriving shortly' })
  } catch (err) {
    return Response.json({ ok: false, reason: (err as Error).message })
  }
}
