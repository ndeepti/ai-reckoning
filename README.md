# AI Reckoning — Incident Investigation Platform

> Turn 88 minutes of manual incident investigation into a 4-minute structured post-mortem.

AI Reckoning is an AI-powered incident analysis tool that correlates logs, metrics, Teams messages, and deploy diffs to automatically generate a structured root cause report — using GPT-4o with streaming reasoning steps.

---

## What it does

1. **Load data** — paste logs, metrics, a Teams thread, and a deploy diff (or drag in a real Loki export)
2. **Run analysis** — one click sends all four sources to GPT-4o for cross-source correlation
3. **Get a post-mortem** — root cause with exact file/line, confidence rating, causal chain, timeline, and prioritised actions

Built on a real production incident: `fn-connect-service` stock code sync failure traced to `EntityIdMappingUtil.java:590`.

---

## Stack

- **Next.js 15** (App Router, TypeScript)
- **OpenAI GPT-4o** — streaming with `step:` / `result:` protocol
- **Tailwind CSS** — dark terminal aesthetic
- **Recharts** — error rate time-series chart
- **python-pptx + Pillow** — presentation deck generator

---

## Getting started

```bash
npm install
cp .env.local.example .env.local   # add your OPENAI_API_KEY
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | GPT-4o API key |
| `GRAFANA_URL` | No | Grafana instance URL for live log fetch |
| `GRAFANA_TOKEN` | No | Grafana service account token |
| `PA_TEAMS_FETCH_URL` | No | Power Automate flow URL for Teams history |

---

## Features

- **Drag-and-drop logs** — drop a raw Loki TSV export; server filters to ERROR/WARN + context lines (max 150)
- **Paste your own diff** — replace mock deploy diff with a real `git diff` inline
- **Add context** — free-text note sent to the AI before analysis (e.g. known infra changes, ruled-out causes)
- **Export report** — copy full post-mortem as Markdown with one click
- **Live data mode** — fetches real logs from Grafana + Teams messages via Power Automate

---

## Generating the presentation deck

```bash
pip install python-pptx pillow
python3 make_deck.py
# → AI-Reckoning-Demo.pptx
```

---

## Project structure

```
app/
  api/
    analyze/route.ts     # GPT-4o streaming endpoint
    logs/parse/route.ts  # Loki TSV → filtered lines
    logs/route.ts        # Live Grafana log fetch
    teams/route.ts       # Live Teams message fetch
components/
  AutopsyDashboard.tsx   # Main layout + state
  InputPanel.tsx         # Logs / Metrics / Teams / Diff tabs
  AgentSteps.tsx         # Streaming reasoning steps
  PostMortem.tsx         # Structured report + export
  MetricsChart.tsx       # Recharts error rate chart
lib/
  mockData.ts            # Mock incident data
  liveData.ts            # Live data helpers
  types.ts               # Shared TypeScript types
assets/                  # Illustration PNGs for the deck
make_deck.py             # Presentation generator
```
