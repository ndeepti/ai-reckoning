// Server-Sent Events stream — browser subscribes and gets new Teams messages in real time.

import { getMessages, subscribe } from '@/lib/teamsStore'

export async function GET() {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      // Send all buffered messages immediately on connect
      const existing = getMessages()
      for (const msg of [...existing].reverse()) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(msg)}\n\n`))
      }

      // Then push new ones as they arrive
      const unsub = subscribe((msg) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(msg)}\n\n`))
        } catch {
          unsub()
        }
      })

      // Heartbeat every 25s to keep the connection alive
      const hb = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': ping\n\n'))
        } catch {
          clearInterval(hb)
          unsub()
        }
      }, 25_000)
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection:      'keep-alive',
    },
  })
}
