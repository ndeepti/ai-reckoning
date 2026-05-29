# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Security Rules — NON-NEGOTIABLE

- **NEVER** print, log, or output environment variable values (API keys, passwords, tokens) in any response, terminal output, or tool call. Read and use them silently in code only.
- When testing credentials, use values inline and only print success/failure status (HTTP status code). Never echo, cat, or grep `.env.local` contents.
- To verify a variable is set: `grep -c VARNAME .env.local` (prints count only, never value).
- **NEVER** display, reference, or output real people's names anywhere — not in the UI, not in terminal output, not in AI prompts, not in responses. Replace all names with `***`.
- In Teams messages and incident data, replace author names with roles (e.g. "Engineer", "On-call", "Support") before display or analysis. Names must never be stored.

---

## Privacy Rules — NON-NEGOTIABLE

- All Teams message authors are stripped to role labels at push time in `lib/teamsStore.ts`. This must never be relaxed.
- Config values shown in the Settings UI must never display secret values — only show whether a field is set.

---

## Commands

```bash
npm run dev        # dev server on localhost:3000
npm run build      # production build
npx tsc --noEmit   # type-check (only static check — no test suite)
```

### Validation before reporting any task done

Run **all five checks** — not just tsc:

```bash
# 1. Type check
npx tsc --noEmit

# 2. Config endpoint (with dev server running)
curl -s http://localhost:3000/api/config | python3 -c "import json,sys; d=json.load(sys.stdin); print('channels:', d['channels']); print('lokiQuery:', d.get('lokiQuery',''))"

# 3. Logs + integrations
curl -s http://localhost:3000/api/logs   | python3 -c "import json,sys; d=json.load(sys.stdin); print('Logs:', d.get('count'), d.get('error','OK'))"
curl -s http://localhost:3000/api/diff/jenkins | python3 -c "import json,sys; d=json.load(sys.stdin); print('Jenkins:', d.get('buildNumber'), d.get('result'), d.get('error','OK'))"
curl -s http://localhost:3000/api/diff/github  | python3 -c "import json,sys; d=json.load(sys.stdin); print('GitHub:', d.get('commits'), 'commits', d.get('error','OK'))"

# 4. UI smoke: open browser, select project, load data, click Run Reckoning
# 5. Teams tab: authors must show roles (Engineer/On-call), never real names
```

---

## Environment variables (`.env.local`)

| Variable | Required | Purpose |
|----------|----------|---------|
| `OPENAI_API_KEY` | Yes | GPT-4o streaming |
| `LOKI_URL` | No | Loki endpoint — enables live log fetch |
| `LOKI_TOKEN` | No | Bearer auth for Loki |
| `LOKI_USERNAME` / `LOKI_PASSWORD` | No | Basic auth alternative |
| `LOKI_QUERY` | No | Default LogQL (overridden by project config at runtime) |
| `LOKI_LOOKBACK_HOURS` | No | Log window (default: 2) |
| `LOKI_LIMIT` | No | Max entries fetched (default: 500) |
| `GH_DIFF_TOKEN` | No | GitHub PAT for diff + branch list APIs |
| `GITHUB_TOKEN` | No | Fallback GitHub token |
| `JENKINS_TOKEN` / `JENKINS_PASSWORD` | No | Jenkins auth (secrets — env only) |
| `TEAMS_WEBHOOK_SECRET` | No | Shared secret for PA webhook auth |
| `OPENAI_MODEL` | No | Override model (default: gpt-4o) |

Non-secret config (service name, Loki URL, channels, etc.) is stored in `config.json` and managed via the Settings UI. Secrets stay in `.env.local` only.

---

## Architecture

### Core loop

Click **Run Reckoning** → `POST /api/analyze` with logs + metrics + Teams messages + deploy diff → GPT-4o streams two line types only:
- `step: <text>` — one reasoning step, streamed live → sidebar Agent Steps
- `result: <json>` — single-line `IncidentReport` JSON → PostMortem panel

### Per-project configuration model

Projects live in `config.json` as a `projects: ProjectConfig[]` array. Each project has:

```typescript
interface ProjectConfig {
  id: string          // e.g. "chip1", "fn"
  name: string        // display name
  services: string[]  // shown in sidebar service multi-select
  channels: string[]  // Teams channels for this project
  branchFilter: string[]  // keywords for GitHub branch filter
  lokiQuery: string   // default LogQL stream selector
  lokiUrl?: string    // Loki endpoint (overrides top-level)
  jenkinsJob: string  // Jenkins job name
  githubRepo: string  // GitHub repo URL
  githubBase: string  // base branch for diff
  lastBranch?: string // persisted from last branch picker selection
}
```

When a project is selected in the sidebar, `AutopsyDashboard` writes that project's config to the top-level `config.json` fields via `POST /api/config`. All API routes read per-request from `loadFileConfig()` and pick up the change immediately.

**Admin UI**: Settings → Projects tab (`components/ProjectsSettings.tsx`) — create/edit/delete projects with chip inputs for array fields.

### Config system — critical architectural rule

`lib/config.ts` exports two things:

1. `config` object — **module-level, cached at startup**. Safe ONLY for env-var secrets that never change at runtime. **Do NOT use `config.loki`, `config.teams.channels`, `config.service`, or `config.jenkins` in API routes** — they freeze at server start and won't see UI-driven changes.

2. `loadFileConfig()` — reads `config.json` fresh on every call. **Use this in all API routes that need runtime-changeable values.**

`/api/config`, `lib/lokiClient.ts`, and all project/diff routes already use `loadFileConfig()` correctly. If you edit any route, grep for `config.loki` / `config.teams` / `config.jenkins` and replace with `loadFileConfig()` calls.

**Known deferred issue**: `app/api/teams/webhook/route.ts` still uses module-level `config.teams.channels` and `config.teams.webhookSecret`. Channel changes require server restart. Fix is to move those reads into the POST handler body.

### UI layout (`components/AutopsyDashboard.tsx`)

**Left sidebar (248px fixed)**:
- **Project** — full-width labelled dropdown. Switching project auto-writes that project's lokiQuery, lokiUrl, channels, jenkins, github to `config.json` and resets service selection.
- **Services** — checkbox multi-select list from `currentProject.services`. Selected services appear as teal chips above the list. Supports picking multiple services — builds `{service_name=~"svc1|svc2"}` Loki regex.
- **From / To** datetime pickers
- **Load Live Data** — calls `loadLiveData()` which writes lokiQuery + lokiUrl + serviceName to config *before* fetching logs (fixes stale-config race condition)
- **Evidence nav** — Logs / Metrics / Teams / Jenkins / GitHub / Live
- **Agent Steps** — streams in during analysis
- **Investigation** — context textarea + **Run Reckoning** (pinned at bottom)

**Main area**:
- Evidence / Report toggle appears after analysis runs (auto-switches to Report)
- Evidence: `InputPanel` in controlled-tab mode (`hideTabs`, `activeTab` props from sidebar nav)
- Report: `PostMortem` component

**FetchOverlay**: full-screen modal with 5-step progress (Saving config → Logs → Teams → Metrics → Diff). Appears while `loadLiveData()` runs.

### Service selection and Loki query

`loadLiveData()` always writes before fetching — this is the core fix for wrong-service logs:

```typescript
function buildLokiQuery(services: string[], proj: ProjectConfig | null): string {
  if (services.length === 0) return proj?.lokiQuery ?? ''
  if (services.length === 1) return `{service_name="${services[0]}"}`
  return `{service_name=~"${services.join('|')}"}`
}
// Also writes: serviceName = selectedServices.join(', ')
// This drives the log line prefix in lokiClient.formatEntry()
```

### Project sync effect

```typescript
useEffect(() => {
  if (projects.length === 0) return
  const proj = projects.find(p => p.id === selectedProject)
  if (!proj) return
  // Clear service selection only when project actually changes (not on data refresh)
  if (proj.id !== lastAppliedProjectId.current) setSelectedServices([])
  lastAppliedProjectId.current = proj.id
  setCurrentProject(proj)
  // Always re-apply — catches edits saved in Settings → Projects
  const updates = { lokiQuery, lokiUrl, teamsChannels, jenkinsJob, githubRepoUrl, githubBranch, serviceName }
  fetch('/api/config', { method: 'POST', body: JSON.stringify(updates) })
}, [projects, selectedProject])
```

### API routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/analyze` | POST | GPT-4o streaming. Dynamic system prompt from `loadFileConfig()` service fields. |
| `/api/config` | GET | Browser-safe config: `{ serviceName, channels, lokiConfigured, lokiHealthy, lokiQuery, settings{...} }` |
| `/api/config` | POST | Writes non-secret values to `config.json`. Allowlist-filtered. |
| `/api/projects` | GET/POST | List and create `ProjectConfig` |
| `/api/projects/[id]` | PUT/DELETE | Edit and delete project |
| `/api/logs` | GET | Loki live logs via `lib/lokiClient.ts` — 503 if not configured |
| `/api/logs/parse` | POST | Drag-drop TSV → same filtering pipeline |
| `/api/loki/metrics` | GET | Error-rate time series from Loki |
| `/api/loki/services` | GET | Service names from Loki labels |
| `/api/teams` | GET | Buffered Teams messages (optional `?channel=` filter) |
| `/api/teams/webhook` | POST | Power Automate push — resolves channel, strips author to role ⚠ uses module-level cache |
| `/api/teams/stream` | GET | SSE stream for live Teams updates |
| `/api/teams/graph-poll` | POST | Polls Microsoft Graph for Teams messages |
| `/api/teams/graph-discover` | GET | Discovers Teams channels via Graph |
| `/api/diff/github` | GET | GitHub PR/branch diff text |
| `/api/diff/github/branches` | GET | Branch list with 5-min server-side cache, project-aware filter |
| `/api/diff/jenkins` | GET | Latest Jenkins build info |
| `/api/diff/jenkins/jobs` | GET | Jenkins job list |
| `/api/diff/jenkins/check` | GET | Jenkins connectivity check |
| `/api/grafana` | GET | Optional Grafana proxy |
| `/api/validate` | GET | Pre-flight health check for all integrations |

### Teams integration (`lib/teamsStore.ts`)

In-memory ring buffer (max 200), persisted to `/tmp/teams-messages.json`. Two sources:
- **Power Automate webhook**: `POST /api/teams/webhook` — channel resolved by display name or GUID, author stripped to role at push time
- **Microsoft Graph poll**: `POST /api/teams/graph-poll` — reads Graph API for configured team/channels

### Log filtering logic (`lib/lokiClient.ts`)

Two-phase on every `/api/logs` call:
1. Phase 1: error sweep — up to 200 entries matching `ERROR|WARN|exception|stacktrace|fatal`
2. If errors found → Phase 2: ±10–15 min context window around first error, merge + dedup, cap 150
3. If no errors → first 5 + last 5 INFO entries, cap 150

Log line format: `{iso} {LEVEL} [{serviceName}:{logger}] {message}` — `serviceName` comes from `config.json` `serviceName` field, which `loadLiveData()` writes from selected services before fetching.

### GitHub branch cache

`/api/diff/github/branches` — in-memory `Map<string, { branches, fetchedAt }>` with 5-min TTL, keyed by `repo::filterParam`. `?force=1` busts cache. When `?projectId=` is passed, reads project from `loadProjects()` for repo + branchFilter.

---

## Known deferred work

1. **Teams webhook module cache** — `webhook/route.ts` uses `config.teams.channels` at module scope. Channel changes need server restart. Fix: move into POST handler body with `loadFileConfig()`.

2. **Loading state clarity** — after project/service selection, no loading indicator shows during downstream config write. Add spinners to combo-box interactions.

3. **Mock data** — `lib/mockData.ts` is present but not actively used. Remove when live integrations are confirmed stable.

---

## File map

```
lib/
  config.ts             — loadFileConfig(), saveFileConfig(), loadProjects(), saveProject(), deleteProject()
  lokiClient.ts         — fetchLokiLogs(), checkLokiHealth() — always uses loadFileConfig()
  teamsStore.ts         — ring buffer, pushMessage(), SSE pub/sub, author-to-role stripping
  graphClient.ts        — Microsoft Graph API client (Teams polling)
  types.ts              — AgentStep, IncidentReport, MockIncident, ProjectConfig, LiveFetchState, etc.
  liveData.ts           — liveDeployDiff, liveMetrics helpers

components/
  AutopsyDashboard.tsx  — all UI state; project/service selection; loadLiveData(); runAutopsy()
  InputPanel.tsx        — tab panel (Logs/Metrics/Teams/Jenkins/GitHub/Live); controlled via activeTab+hideTabs
  PostMortem.tsx        — renders IncidentReport; Markdown export
  SettingsPanel.tsx     — General settings + Projects tab (modal overlay)
  ProjectsSettings.tsx  — CRUD UI for ProjectConfig with ChipInput for array fields
  IntegrationsPanel.tsx — Teams / GitHub / Jenkins / Loki integration config (modal overlay)
  AgentSteps.tsx        — streaming step list
  MetricsChart.tsx      — Recharts LineChart for error-rate time series

app/api/
  config/route.ts             — GET + POST (allowlist-filtered write to config.json)
  projects/route.ts           — GET + POST projects
  projects/[id]/route.ts      — PUT + DELETE project (Next.js 15 async params)
  analyze/route.ts            — GPT-4o streaming with dynamic system prompt
  logs/route.ts               — Loki log fetch via lokiClient
  teams/webhook/route.ts      — PA push (⚠ uses module-level cache for channelMap)
  diff/github/branches/route.ts — branch list with TTL cache
```
