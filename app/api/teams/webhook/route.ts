// Power Automate posts here when a new message arrives in a configured Teams channel.
// Accepts channel by display name OR by GUID (Power Automate sends the channelIdentity GUID).
// Channel names are configured via TEAMS_CHANNELS env var (comma-separated).

import { pushMessage } from '@/lib/teamsStore'
import { config } from '@/lib/config'

const SECRET = config.teams.webhookSecret

// Seed channel map from TEAMS_CHANNELS config — supports any channel names
// Keys: normalised (lowercase, no hyphens) → display name
const channelMap = new Map<string, string>(
  config.teams.channels.flatMap(ch => [
    [ch.toLowerCase().replace(/[-_\s]/g, ''), ch],
    [ch.toLowerCase(), ch],
  ])
)

// GUIDs we've seen but couldn't map — logged so user can register them
export const unknownChannels = new Set<string>()

function resolveChannel(raw: string): string {
  if (!raw) return 'unknown'
  // Exact match first
  if (channelMap.has(raw)) return channelMap.get(raw)!
  // Normalised match (lowercase, strip hyphens/spaces — handles GUIDs and display names)
  const normalised = raw.toLowerCase().replace(/[-_\s]/g, '')
  for (const [key, val] of channelMap) {
    if (key === normalised) return val
  }
  // Partial substring match against configured channel names (catches GUID fragments)
  for (const ch of config.teams.channels) {
    const fragment = ch.toLowerCase().replace(/[-_\s]/g, '')
    if (normalised.includes(fragment) || fragment.includes(normalised)) return ch
  }
  // Unknown — accept as-is so we never drop messages
  return raw
}

export function registerChannel(guid: string, displayName: string) {
  channelMap.set(guid, displayName)
  unknownChannels.delete(guid)
}

// Last raw body received — used for debugging PA expression paths
let lastRawBody: unknown = null

export async function POST(request: Request) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'invalid json' }, { status: 400 })
  }

  lastRawBody = body

  if (SECRET && body.secret !== SECRET) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  // PA sends the full HTTP action definition as the body (Code view wrapping).
  // Unwrap it: the real payload is in body.body
  if (body.method && body.uri && body.body !== undefined) {
    const inner = body.body
    body = (typeof inner === 'object' && inner !== null ? inner : {}) as Record<string, unknown>
  }

  // Handle Graph API change notification format: {"value":[{teamId, channelId, messageId, ...}]}
  if (Array.isArray(body.value) && body.value.length > 0) {
    const notif = body.value[0] as Record<string, unknown>
    const rawCh = String(notif.channelId ?? '')
    const msgId = String(notif.messageId ?? '')
    const link  = String(notif.linkToMessage ?? '')
    // Convert messageId (epoch ms) to HH:MM if numeric
    const ts = Number(msgId)
    const timeStr = ts > 0
      ? (() => { const d = new Date(ts); return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}` })()
      : ''
    body = {
      channel: rawCh || 'TestChannel1',
      author:  'Teams',
      role:    '',
      time:    timeStr,
      text:    link ? `New message → ${link}` : `New message (id: ${msgId})`,
      isAlert: false,
    }
  }

  // PA "Get message details" body token sends the full Graph API JSON as our text field.
  // Detect and unpack: {"@odata.context":"https://graph.microsoft.com/...","from":{...},"body":{...}}
  const rawTextPrecheck = String(body.text ?? '')
  if (rawTextPrecheck.startsWith('{"@odata.context":"https://graph.microsoft.com')) {
    try {
      const graphMsg = JSON.parse(rawTextPrecheck) as Record<string, unknown>
      const from = graphMsg.from as Record<string, unknown> | undefined
      const user = from?.user as Record<string, unknown> | undefined
      const msgBody = graphMsg.body as Record<string, unknown> | undefined
      const plainText = String(msgBody?.plainTextContent ?? '')
      const htmlContent = String(msgBody?.content ?? '')
      // Try plain text first, then strip HTML, then check attachments for card text
      let content = plainText || htmlContent.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim()
      if (!content) {
        const attachments = graphMsg.attachments as Array<Record<string, unknown>> | undefined
        if (attachments?.length) {
          const texts = attachments.map(a => {
            const raw = String(a.content ?? a.text ?? a.name ?? '')
            // Forwarded/reposted messages have JSON body with originalMessageContent
            try {
              const parsed = JSON.parse(raw) as Record<string, unknown>
              if (parsed.originalMessageContent) {
                return String(parsed.originalMessageContent)
                  .replace(/<[^>]+>/g, '')
                  .replace(/\n{3,}/g, '\n')
                  .replace(/&nbsp;/g, ' ')
                  .trim()
              }
            } catch { /* not JSON */ }
            return raw.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim()
          }).filter(Boolean)
          content = texts.join('\n') || '📎 Attachment'
        }
      }
      const channelId = (graphMsg.channelIdentity as Record<string, unknown>)?.channelId as string | undefined
      body = {
        channel: channelId ?? body.channel ?? 'TestChannel1',
        author:  String(user?.displayName ?? body.author ?? 'Teams User'),
        role:    '',
        text:    content || 'Message posted in channel',
        isAlert: false,
      }
    } catch { /* leave body as-is */ }
  }

  // Handle raw Graph message format (channelIdentity or from.user present)
  if (body.channelIdentity || (body.from && typeof body.from === 'object')) {
    const from = body.from as Record<string, unknown> | undefined
    const user = from?.user as Record<string, unknown> | undefined
    const bodyContent = body.body as Record<string, unknown> | undefined
    const channelId = (body.channelIdentity as Record<string, unknown>)?.channelId as string | undefined
    body = {
      channel:  channelId ?? body.channel ?? 'TestChannel1',
      author:   String(user?.displayName ?? 'Teams User'),
      role:     '',
      text:     String(bodyContent?.plainTextContent ?? bodyContent?.content ?? ''),
      isAlert:  false,
    }
  }

  const rawChannel = String(body.channel ?? '')
  const channel = resolveChannel(rawChannel)

  // Track GUIDs we couldn't resolve for diagnostics
  if (rawChannel && rawChannel !== channel && rawChannel.length > 20) {
    unknownChannels.add(rawChannel)
  }

  const now = new Date()
  const time = body.time
    ? String(body.time)
    : `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

  // Strip HTML tags that Teams/Power Automate may include in body content
  const rawText = String(body.text ?? '')
  let text = rawText.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim()

  // Parse [channel-name] prefix so reposted messages show the correct source channel
  // e.g. "[chip1-releases] Jenkins deployed v3.7.2" → channel=chip1-releases, text=Jenkins deployed...
  let finalChannel = channel
  const prefixMatch = text.match(/^\[([^\]]+)\]\s*([\s\S]*)$/)
  if (prefixMatch) {
    const prefixChannel = resolveChannel(prefixMatch[1].trim())
    if (prefixChannel !== prefixMatch[1].trim() || prefixMatch[1].trim().toLowerCase().includes('chip1')) {
      finalChannel = prefixChannel || prefixMatch[1].trim()
      text = prefixMatch[2].trim()
    }
  }

  // Never store real names — use role label or generic fallback
  const roleLabel = String(body.role ?? '').trim() || 'Engineer'

  const msg = pushMessage({
    channel: finalChannel,
    author:  roleLabel,
    role:    roleLabel,
    time,
    text,
    isAlert: Boolean(body.isAlert ?? false),
  })

  return Response.json({ ok: true, id: msg.id, channel, unknownGUIDs: [...unknownChannels] })
}

// GET returns diagnostics + last raw body received (for PA expression debugging)
export async function GET() {
  return Response.json({
    channelMap: Object.fromEntries(channelMap),
    unknownChannels: [...unknownChannels],
    lastRawBody,
  })
}
