// Returns buffered Teams messages received via the Power Automate webhook.
// GET /api/teams               — all messages
// GET /api/teams?channel=xxx   — filtered by channel name

import { getMessages } from '@/lib/teamsStore'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const channel = searchParams.get('channel') ?? undefined
  return Response.json(getMessages(channel))
}
