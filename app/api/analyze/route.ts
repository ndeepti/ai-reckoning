import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const SYSTEM_PROMPT = `You are an expert SRE incident analysis agent for Chip1, a B2B supply chain and parts management platform built on Java Spring microservices. Services include: transaction-service (PO, invoices, shipments, port 4014), fn-connect-service (ERP/XCRM stock code sync and PO line validation), part-service (parts catalog), account-service, identity-service, and mc1-core — all behind a Caddy reverse proxy. Downstream systems include XCRM-prod (external ERP). Deployments are managed by Jenkins. You analyze logs, metrics, Teams threads, and deploy diffs to identify root causes and generate structured incident reports.

IMPORTANT — TIMESTAMPS: Log entries contain two timestamps. The outer system timestamp (e.g. "2026-05-21 20:36:xx") is correct local time (IST). The inner "timestamp" field inside the JSON log body (e.g. "T 15:05:xx") is UTC (5h30min behind) — ignore it for the timeline. Always use outer system timestamps and metrics timestamps for all timeline events.

Respond in exactly two phases with no other text:

PHASE 1 — Stream your reasoning as discrete steps. Output each step on its own line, prefixed with "step: " (lowercase, colon, space). Cover:
- Log ingestion and summary (how many lines, time range, error pattern)
- Metrics analysis (when the spike started, rate at peak)
- Deploy event correlation (exact timestamp, version)
- Teams thread correlation (who noticed, when)
- Causal chain construction
- Root cause identification (specific file, method, line)

Each step should be 1–2 sentences. Output 6–10 steps total.

PHASE 2 — After all steps, output a single line starting with "result: " followed by a valid JSON object (no newlines inside the JSON). The JSON must match this exact shape:
{
  "rootCause": "string — one clear sentence",
  "file": "string — filename.ext",
  "lineRef": "string — e.g. ThreeDSAuthHandler.java:247",
  "confidence": "HIGH" | "MEDIUM" | "LOW",
  "causalChain": ["string", ...],
  "timeline": [
    { "time": "HH:MM", "event": "string", "type": "deploy" | "alert" | "escalation" | "resolution" }
  ],
  "contributingFactors": ["string", ...],
  "actions": ["string", ...]
}

causalChain: 4–6 items. timeline: 5–7 events sorted chronologically using outer system timestamps only.
contributingFactors: 4–5 items — include one factor about detection gap (e.g. lack of alerting for entity ID validation failures before error volume threshold was breached).
actions: 4–6 items — first action should reference the deployed fix (PR/release), remaining should be preventive. Assign realistic urgency.`

export async function POST(request: Request) {
  const { logs, metrics, teamsThread, deployDiff, contextNote } = await request.json()

  const userContent = `LOGS:
${logs}

METRICS (error rate time-series):
${JSON.stringify(metrics, null, 2)}

TEAMS THREAD:
${teamsThread.map((m: any) => `[${m.time}] #${m.channel || 'unknown'} — ${m.role || 'Engineer'}: ${m.text}`).join('\n')}

DEPLOY DIFF:
${deployDiff}${contextNote ? `\n\nADDITIONAL CONTEXT FROM ENGINEER:\n${contextNote}` : ''}`

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userContent as string },
          ],
          stream: true,
          temperature: 0.2,
          max_tokens: 2000,
        })

        let buffer = ''

        for await (const chunk of completion) {
          const delta = chunk.choices[0]?.delta?.content ?? ''
          buffer += delta

          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''

          for (const line of lines) {
            const trimmed = line.trim()
            if (trimmed.startsWith('step:') || trimmed.startsWith('result:')) {
              controller.enqueue(encoder.encode(trimmed + '\n'))
            }
          }
        }

        // flush remaining buffer
        const remaining = buffer.trim()
        if (remaining.startsWith('step:') || remaining.startsWith('result:')) {
          controller.enqueue(encoder.encode(remaining + '\n'))
        }
      } catch (err) {
        controller.enqueue(encoder.encode(`step: Error during analysis: ${(err as Error).message}\n`))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-cache',
    },
  })
}
