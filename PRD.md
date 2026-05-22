# Product Requirements Document
## AI Reckoning — Automated Incident Investigation

**Version:** 1.0  
**Date:** 2026-05-22  
**Status:** Draft  
**Team:** Chip1 Engineering

---

## 1. Problem Statement

When a production incident occurs at Chip1, the on-call engineer must manually investigate across four disconnected tools — Loki (logs), Grafana (metrics), Microsoft Teams (channel thread), and GitLab (deploy diff). There is no single view. The engineer reads hundreds of log lines, correlates timestamps by hand, cross-references conversations, and forms a hypothesis over 60–90 minutes — while the incident is still active and errors are still rising.

**The investigation itself is the bottleneck. Not the fix.**

A real incident on 2026-05-21 demonstrated this clearly:

| Time  | Event |
|-------|-------|
| 20:34 | Deploy goes out |
| 20:36 | Errors begin spiking |
| 20:48 | Engineer notices and raises alarm |
| 20:55 | Root cause confirmed |

88 minutes from deploy to confirmed root cause. Error rate tripled during that window. The fix itself (switching from `Optional` to `List` with a UNION ALL query) took minutes once the right line was found.

---

## 2. Goal

Build a tool that takes the four data sources an engineer already has during an incident — logs, metrics, Teams thread, deploy diff — and produces a structured root-cause report automatically, in under 5 minutes.

**The engineer still makes the decision. The AI does the detective work.**

---

## 3. Users

**Primary:** On-call engineers at Chip1  
**Secondary:** Engineering leads reviewing incident reports  
**Context:** High-stress, time-sensitive environment. The tool must be fast, obvious, and require zero setup during an incident.

---

## 4. Success Criteria

| Metric | Target |
|--------|--------|
| Time to root cause (AI) | ≤ 5 minutes |
| Accuracy — root cause matches engineer verdict | ≥ 80% on past incidents |
| Confidence signal surfaced | HIGH / MEDIUM / LOW on every report |
| Report includes actionable next steps | Always |
| Zero manual correlation required | User clicks one button |

---

## 5. Scope

### In Scope (v1)
- Ingest logs from file upload or pre-loaded data
- Ingest error-rate metrics as time-series data
- Ingest Teams channel messages via webhook
- Ingest deploy diff (git unified diff format)
- Stream AI reasoning steps live to the UI as analysis runs
- Generate structured incident report: root cause, causal chain, timeline, insights, actionables
- Single-page web app, runs locally

### Out of Scope (v1)
- Direct Loki API integration (manual export for now)
- Automatic alert-triggered analysis
- Multi-service correlation across more than one service simultaneously
- Historical incident database or trend analysis
- Mobile or native app

---

## 6. Functional Requirements

### 6.1 Data Input

| ID | Requirement |
|----|-------------|
| F-01 | System must accept production log text (plain text, up to 200 lines) |
| F-02 | System must accept error-rate time-series as structured data (time + count pairs) |
| F-03 | System must accept Teams channel messages with timestamp, role, and channel |
| F-04 | System must accept a deploy diff in unified diff format |
| F-05 | Each data source must be viewable in a separate tab before analysis runs |
| F-06 | Metrics must be rendered as a line chart with baseline and spike annotations |
| F-07 | Log lines containing errors must be visually highlighted |

### 6.2 Analysis

| ID | Requirement |
|----|-------------|
| F-08 | A single "Run" button must trigger the full analysis |
| F-09 | AI reasoning steps must stream to the UI in real time as they are generated |
| F-10 | Analysis must cover all four data sources in a single pass |
| F-11 | Analysis must produce a structured JSON result: rootCause, file, lineRef, confidence, causalChain, timeline, contributingFactors, actions |
| F-12 | Confidence must be one of: HIGH, MEDIUM, LOW |
| F-13 | Timeline must use outer log timestamps (local time), not inner UTC fields |
| F-14 | Causal chain must contain 4–6 steps tracing from trigger to user-visible error |
| F-15 | At least one contributing factor must address detection gap (alerting or observability) |
| F-16 | First action item must reference the deployed fix if one exists in the data |

### 6.3 Report Output

| ID | Requirement |
|----|-------------|
| F-17 | Report must be presented in four tabs: Root Cause, Timeline, Insights, Actionables |
| F-18 | Root Cause tab must show: confidence badge, root cause sentence, file:line reference, full causal chain |
| F-19 | Timeline tab must show events in chronological order with type-coded visual indicators (deploy / alert / escalation / resolution) |
| F-20 | Insights tab must show contributing factors with visual severity coding |
| F-21 | Actionables tab must assign URGENT / WATCH / TODO badge to each action |
| F-22 | Report must appear without page reload — rendered from streaming response |

### 6.4 Teams Integration

| ID | Requirement |
|----|-------------|
| F-23 | App must expose a POST `/api/teams/webhook` endpoint to receive messages |
| F-24 | Messages must persist across requests (file + in-memory store) |
| F-25 | Messages must include: role (not author name), channel, text, timestamp, alert flag |
| F-26 | Privacy: author names must never be stored or displayed — role only |

---

## 7. Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| NF-01 | Analysis must complete within 60 seconds under normal conditions |
| NF-02 | Streaming must begin within 3 seconds of clicking Run |
| NF-03 | UI must be usable on a projected screen at 1080p minimum |
| NF-04 | App must run on localhost without any cloud dependency beyond the AI API |
| NF-05 | API keys must never be logged or exposed in responses |
| NF-06 | No real names of engineers or customers in any data, prompt, or output |
| NF-07 | App must be startable with a single command: `npm run dev` |

---

## 8. Technical Approach

### Stack
| Layer | Technology |
|-------|------------|
| Frontend | Next.js (App Router), TypeScript, Tailwind CSS |
| Charts | Recharts |
| AI | OpenAI GPT-4o, streaming (text/plain SSE) |
| Teams integration | Power Automate HTTP webhook |
| Local tunnel (optional) | Cloudflare Tunnel |
| Runtime | Node.js, localhost |

### AI Protocol
The API route (`POST /api/analyze`) sends all four data sources to GPT-4o in a single prompt and streams the response. The model outputs in two phases:

**Phase 1** — reasoning steps, one per line, prefixed `step: `  
**Phase 2** — structured JSON result on a single line, prefixed `result: `

The UI parses each line as it arrives: `step:` lines are appended to the agent reasoning panel; the `result:` line triggers the incident report render.

### Data Flow
```
Logs (file/API)   ─┐
Metrics (CSV)     ─┼──► /api/analyze ──► GPT-4o (streaming) ──► UI
Teams (webhook)   ─┤         ↑
Deploy diff       ─┘    system prompt
                         + all four sources
                         in single user message
```

### Prompt Design Constraints
- Temperature: 0.2 (deterministic, factual)
- Max tokens: 2000
- Timestamp instruction: use outer log timestamp (IST), ignore inner UTC field
- Contributing factors: must include detection gap item
- Actions: first item must reference deployed fix if present in diff/Teams data

---

## 9. UI Layout

```
┌──────────────────────────────────────────────────────────────────┐
│  AI RECKONING                                  [Run Reckoning ▶] │
├─────────────────┬──────────────────┬─────────────────────────────┤
│  INPUT DATA     │  AI REASONING    │  INCIDENT REPORT            │
│  ─────────────  │  ─────────────   │  ──────────────────────     │
│  Logs | Metrics │  step 1: ...     │  [Root Cause][Timeline]     │
│  Teams | Diff   │  step 2: ...     │  [Insights][Actionables]    │
│                 │  step 3: ...     │                             │
│  (tab content)  │  ...             │  (report content)           │
│                 │  ✓ step 8        │                             │
├─────────────────┴──────────────────┴─────────────────────────────┤
│  Manual investigation  88 min  →  ~4 min  with AI Reckoning      │
└──────────────────────────────────────────────────────────────────┘
```

**Panel 1 — Input Data**
- Four tabs: Logs, Metrics, Teams, Diff
- Logs: scrollable monospace, error lines in red
- Metrics: Recharts line chart, spike annotation, threshold line
- Teams: role-labelled messages with timestamps and channel
- Diff: unified diff with red/green line highlights

**Panel 2 — AI Reasoning**
- Steps appear one by one as stream arrives
- Each step: visible immediately, checkmark on completion
- Empty state: "Waiting for analysis"

**Panel 3 — Incident Report**
- Four tabs as specified in F-17 to F-21
- Empty state until `result:` line arrives
- Fade-in animation per section

---

## 10. Privacy & Security Requirements

| Rule | Detail |
|------|--------|
| No author names | Teams messages stored and displayed by role only (Engineer, On-call, Jenkins) |
| No secret logging | API keys read from environment, never printed or returned in responses |
| No PII in prompts | Log lines sent to AI must not contain customer identifiers beyond system IDs |
| Local-first | All data stays on the engineer's machine; only the structured prompt leaves via the AI API |

---

## 11. Demo Requirements

The v1 product is validated via live demo on real incident data from 2026-05-21 (fn-connect STOCK_CODE_010 incident). The demo must:

- Load in under 10 seconds from `npm run dev`
- Seed Teams messages via pre-written curl commands (PA integration optional)
- Complete full analysis in under 5 minutes on the real log/metric data
- Show root cause matching the engineer-confirmed verdict: `EntityIdMappingUtil.java:590`
- Require no live internet beyond the OpenAI API call

---

## 12. Out of Scope — Explicitly

- Writing post-mortems or incident review documents (different workflow, different audience)
- Replacing the on-call engineer — this is a decision-support tool
- Predicting incidents before they occur
- Code search or fix suggestion
- Integration with PagerDuty, OpsGenie, or ticketing systems (v2+)
