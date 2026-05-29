import { fetchAllGraphMessages } from '@/lib/graphClient'
import { pushMessage, getAllMessages } from '@/lib/teamsStore'
import { loadFileConfig, saveFileConfig } from '@/lib/config'

export async function POST() {
  try {
    const file = loadFileConfig()
    const lastPoll = file.graphLastPoll || ''

    const { messages, errors, rawTotal } = await fetchAllGraphMessages(lastPoll || undefined)

    // Deduplicate against already-stored messages
    const existing = new Set(getAllMessages().map(m => m.id).filter(Boolean))
    let newCount = 0

    for (const m of messages) {
      if (existing.has(m.id)) continue
      pushMessage({
        id:         m.id,
        role:       m.role,
        author:     m.role,
        time:       new Date(m.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        text:       m.text,
        channel:    m.channel,
        receivedAt: new Date(m.createdAt).getTime(),
        isAlert:    /\b(P1|P2|incident|down|outage|error|alert)\b/i.test(m.text),
      })
      newCount++
    }

    saveFileConfig({ graphLastPoll: new Date().toISOString() })

    return Response.json({
      ok: true,
      fetched: messages.length,
      rawTotal,
      new: newCount,
      lastPoll: lastPoll || 'first run',
      ...(errors.length > 0 && { warnings: errors }),
    })
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 })
  }
}

// GET: just returns status — when was last poll, how many messages stored
export async function GET() {
  const file = loadFileConfig()
  const messages = getAllMessages()
  return Response.json({
    lastPoll:        file.graphLastPoll || null,
    storedMessages:  messages.length,
    graphConfigured: !!(file.graphTenantId && file.graphClientId && process.env.GRAPH_CLIENT_SECRET),
  })
}
