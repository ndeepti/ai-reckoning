import { loadFileConfig } from './config'

interface GraphAttachment {
  id?: string
  contentType?: string
  name?: string
  content?: string  // JSON string for adaptive cards etc.
}

interface GraphMessage {
  id: string
  createdDateTime: string
  lastModifiedDateTime: string
  body: { content: string; contentType: string }
  from?: { user?: { displayName?: string } }
  channelIdentity?: { channelId?: string; teamId?: string }
  chatId?: string
  attachments?: GraphAttachment[]
  subject?: string
}

// Get an access token using client credentials flow
export async function getGraphToken(): Promise<string> {
  const file = loadFileConfig()
  const tenantId    = file.graphTenantId   || process.env.GRAPH_TENANT_ID   || ''
  const clientId    = file.graphClientId   || process.env.GRAPH_CLIENT_ID   || ''
  const clientSecret = process.env.GRAPH_CLIENT_SECRET || ''

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error(
      'Graph API not configured — set graphTenantId, graphClientId in Integrations and GRAPH_CLIENT_SECRET in .env.local'
    )
  }

  const params = new URLSearchParams({
    grant_type:    'client_credentials',
    client_id:     clientId,
    client_secret: clientSecret,
    scope:         'https://graph.microsoft.com/.default',
  })

  const res = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    { method: 'POST', body: params, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  )

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Graph auth failed: ${err.slice(0, 200)}`)
  }

  const data = await res.json() as { access_token: string }
  return data.access_token
}

// Fetch messages from a chat (group chat) — id starts with "19:"
async function fetchChatMessages(token: string, chatId: string): Promise<GraphMessage[]> {
  const url = `https://graph.microsoft.com/v1.0/chats/${chatId}/messages?$top=20&$orderby=createdDateTime desc`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Graph chats fetch failed (${chatId}): ${err.slice(0, 200)}`)
  }
  const data = await res.json() as { value: GraphMessage[] }
  return data.value ?? []
}

// Fetch messages from a team channel — id format "teamId:channelId"
// Note: $filter and $select are not supported for application permissions on this endpoint
async function fetchChannelMessages(token: string, teamId: string, channelId: string): Promise<GraphMessage[]> {
  const url = `https://graph.microsoft.com/v1.0/teams/${teamId}/channels/${channelId}/messages?$top=20`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Graph channel fetch failed (${teamId}/${channelId}): ${err.slice(0, 200)}`)
  }
  const data = await res.json() as { value: GraphMessage[] }
  return data.value ?? []
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function extractAdaptiveCardText(obj: unknown, depth = 0): string {
  if (depth > 6 || !obj || typeof obj !== 'object') return ''
  if (Array.isArray(obj)) return obj.map(i => extractAdaptiveCardText(i, depth + 1)).filter(Boolean).join(' | ')
  const o = obj as Record<string, unknown>
  const parts: string[] = []
  // O365 connector card: summary + sections[].facts[].name/value
  if (typeof o.summary === 'string' && o.summary) parts.push(stripHtml(o.summary))
  // Adaptive card text blocks
  if (typeof o.text === 'string' && o.text) parts.push(stripHtml(o.text))
  if (typeof o.title === 'string' && o.title) parts.push(stripHtml(o.title))
  // Fact value (O365 connector)
  if (typeof o.name === 'string' && typeof o.value === 'string') {
    parts.push(`${o.name}: ${stripHtml(o.value)}`)
  } else if (typeof o.value === 'string' && o.value) {
    parts.push(stripHtml(o.value))
  }
  for (const key of ['sections', 'body', 'items', 'facts', 'columns', 'actions']) {
    if (o[key]) parts.push(extractAdaptiveCardText(o[key], depth + 1))
  }
  return parts.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim().slice(0, 500)
}

export interface FetchedMessage {
  id: string
  createdAt: string
  text: string
  role: string
  channel: string  // display name derived from chatId or channelId
}

// Parse configured graphTeamIds into source descriptors
// Supports:
//   19:xxx@thread.v2          → group chat
//   teamId:channelId          → team channel
export function parseGraphSources(
  graphTeamIds: string
): Array<{ type: 'chat' | 'channel'; id: string; teamId?: string; channelId?: string; displayName: string }> {
  return graphTeamIds
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .map(s => {
      if (s.startsWith('19:')) {
        // Group chat — id is the full 19:xxx@thread.v2
        return { type: 'chat' as const, id: s, displayName: s.slice(0, 20) + '…' }
      }
      // Team channel format: {teamGUID}:{channelId} where channelId may contain colons (19:xxx@...)
      // Split only on the first colon — everything after is the channelId
      const firstColon = s.indexOf(':')
      if (firstColon > 0) {
        const teamId    = s.slice(0, firstColon)
        const channelId = s.slice(firstColon + 1)
        return { type: 'channel' as const, id: s, teamId, channelId, displayName: channelId.slice(0, 20) }
      }
      // Plain ID — assume chat
      return { type: 'chat' as const, id: s, displayName: s.slice(0, 20) }
    })
}

export async function fetchAllGraphMessages(
  _since?: string
): Promise<{ messages: FetchedMessage[]; errors: string[]; rawTotal: number }> {
  const file = loadFileConfig()
  const graphTeamIds = file.graphTeamIds || process.env.GRAPH_TEAM_IDS || ''
  if (!graphTeamIds) return { messages: [], errors: [], rawTotal: 0 }

  const token = await getGraphToken()
  const sources = parseGraphSources(graphTeamIds)

  // Override displayNames with friendly channel names stored in teamsChannels (parallel array)
  const channelNames = (file.teamsChannels || '').split(',').map((s: string) => s.trim()).filter(Boolean)
  sources.forEach((src, i) => {
    if (channelNames[i]) src.displayName = channelNames[i]
  })
  const messages: FetchedMessage[] = []
  const errors: string[] = []
  let rawTotal = 0

  for (const src of sources) {
    try {
      let raw: GraphMessage[] = []
      if (src.type === 'chat') {
        raw = await fetchChatMessages(token, src.id)
      } else {
        raw = await fetchChannelMessages(token, src.teamId!, src.channelId!)
      }

      rawTotal += raw.length

      for (const m of raw) {
        let text =
          m.body.contentType === 'html'
            ? m.body.content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
            : m.body.content.trim()

        // If body is empty, try to extract text from attachments (adaptive cards, alerts)
        if (!text) {
          for (const att of m.attachments ?? []) {
            if (att.content) {
              try {
                const card = JSON.parse(att.content) as Record<string, unknown>
                // Adaptive card: flatten all text items recursively
                const cardText = extractAdaptiveCardText(card)
                if (cardText) { text = cardText; break }
              } catch {
                if (att.name) text = att.name
              }
            } else if (att.name) {
              text = att.name
            }
          }
        }

        if (!text) continue

        messages.push({
          id:        m.id,
          createdAt: m.createdDateTime,
          text,
          role:      'Engineer',
          channel:   src.displayName,
        })
      }
    } catch (e) {
      const msg = (e as Error).message
      errors.push(`${src.displayName}: ${msg.slice(0, 300)}`)
    }
  }

  return { messages, errors, rawTotal }
}
