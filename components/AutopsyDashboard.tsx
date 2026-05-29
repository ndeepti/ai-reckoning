'use client'

import { useState, useRef, useEffect } from 'react'
import { AgentStep, IncidentReport, MockIncident, LiveFetchState, ProjectConfig } from '@/lib/types'
import InputPanel from './InputPanel'
import PostMortem from './PostMortem'
import SettingsPanel from './SettingsPanel'
import IntegrationsPanel from './IntegrationsPanel'

type EvidenceTab = 'Logs' | 'Metrics' | 'Teams' | 'Jenkins' | 'GitHub' | 'Live'
type MainView = 'evidence' | 'report'

interface LoadStep {
  label: string
  status: 'pending' | 'loading' | 'done' | 'error'
  detail?: string
}

function FetchOverlay({ steps, service }: { steps: LoadStep[]; service: string }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 50,
      background: 'rgba(0,0,0,0.72)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(2px)',
    }}>
      <div style={{
        background: 'var(--panel)', border: '1px solid var(--border)',
        borderRadius: 12, padding: '32px 40px', minWidth: 360, maxWidth: 440,
        boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
      }}>
        <div className="flex items-center gap-3 mb-6">
          <span className="spin" style={{ fontSize: 18, color: 'var(--accent)' }}>⟳</span>
          <div>
            <p style={{ color: 'var(--white)', fontSize: 14, fontWeight: 700 }}>Loading live data</p>
            <p style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 2 }}>{service}</p>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          {steps.map((s, i) => (
            <div key={i} className="flex items-start gap-3">
              <span style={{
                width: 16, flexShrink: 0, marginTop: 1, fontSize: 12,
                color: s.status === 'done' ? 'var(--accent)'
                  : s.status === 'error' ? 'var(--error)'
                  : s.status === 'loading' ? 'var(--warning)'
                  : 'var(--text-dim)',
              }}>
                {s.status === 'done' ? '✓' : s.status === 'error' ? '✗' : s.status === 'loading' ? '⟳' : '○'}
              </span>
              <div>
                <p style={{
                  fontSize: 12, fontWeight: 500,
                  color: s.status === 'pending' ? 'var(--text-dim)' : 'var(--text)',
                }}>{s.label}</p>
                {s.detail && (
                  <p style={{ fontSize: 11, color: s.status === 'error' ? 'var(--error)' : 'var(--text-muted)', marginTop: 1 }}>
                    {s.detail}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function LiveBanner({ state, onDismiss }: { state: LiveFetchState; onDismiss: () => void }) {
  if (state.status === 'idle' || state.status === 'loading') return null
  const colors = {
    done:  { bg: 'var(--accent-bg)',  border: 'var(--accent-border)',   text: 'var(--accent)' },
    error: { bg: 'var(--error-bg)',   border: 'var(--error-border)',    text: 'var(--error)' },
  }[state.status] ?? { bg: 'var(--card)', border: 'var(--border)', text: 'var(--text)' }

  return (
    <div className="flex items-center gap-3 px-5 py-2 flex-shrink-0 fade-in"
      style={{ background: colors.bg, borderBottom: `1px solid ${colors.border}` }}>
      <span style={{ color: colors.text }}>{state.status === 'done' ? '✓' : '✗'}</span>
      <span style={{ color: colors.text, fontSize: 12, flex: 1 }}>
        {state.status === 'done' && `Live data loaded · ${state.source}`}
        {state.status === 'error' && `${state.source}: ${state.error}`}
      </span>
      <button onClick={onDismiss}
        style={{ color: 'var(--text-dim)', fontSize: 14, background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
    </div>
  )
}

type LokiService = { value: string; lokiLabel: string; lokiUrl: string }

const KNOWN_SERVICES: LokiService[] = [
  ...['chip1-account','chip1-agent-registry','chip1-company-research-assistant','chip1-config-server',
      'chip1-crm-webui','chip1-general-agent','chip1-lookup','chip1-mc1-core','chip1-merger-agent',
      'chip1-mysql-agent','chip1-outreach-agent-backend','chip1-outreach-agent-frontend','chip1-part',
      'chip1-planner-agent','chip1-sql-assistant','chip1-transaction','chip1-webui',
  ].map(v => ({ value: v, lokiLabel: 'service_name', lokiUrl: 'https://loki.chip1.info' })),
  ...['fn-connect','fn-events-gateway','fn-events-service','fn-notification-common-service',
      'fn-notification-dispatcher','fn-notification-publisher','fn-timeline-service',
  ].map(v => ({ value: v, lokiLabel: 'service_name', lokiUrl: 'https://loki.altir.net' })),
]

const EVIDENCE_ITEMS: { id: EvidenceTab; icon: string | null; label: string }[] = [
  { id: 'Logs',    icon: '≡',  label: 'Logs'    },
  { id: 'Metrics', icon: '∿',  label: 'Metrics' },
  { id: 'Teams',   icon: '⊛',  label: 'Teams'   },
  { id: 'Jenkins', icon: '⚙',  label: 'Jenkins' },
  { id: 'GitHub',  icon: '⑂',  label: 'GitHub'  },
  { id: 'Live',    icon: null, label: 'Live'    },
]

export default function AutopsyDashboard() {
  const [incident, setIncident] = useState<MockIncident | null>(null)
  const [steps, setSteps] = useState<AgentStep[]>([])
  const [postMortem, setPostMortem] = useState<IncidentReport | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [done, setDone] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [liveFetch, setLiveFetch] = useState<LiveFetchState>({ status: 'idle' })
  const [dataLoaded, setDataLoaded] = useState(false)
  const [loadingSteps, setLoadingSteps] = useState<LoadStep[]>([])
  const [contextNote, setContextNote] = useState('')
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [showSettings, setShowSettings] = useState(false)
  const [showIntegrations, setShowIntegrations] = useState(false)
  const [appConfig, setAppConfig] = useState<{ serviceName: string | null; lokiConfigured: boolean; lokiHealthy: boolean; openaiConfigured: boolean } | null>(null)
  const [lokiServices, setLokiServices] = useState<LokiService[]>(KNOWN_SERVICES)
  const [selectedProject, setSelectedProject] = useState<string>('fn')
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [evidenceTab, setEvidenceTab] = useState<EvidenceTab>('Logs')
  const [mainView, setMainView] = useState<MainView>('evidence')
  const [projects, setProjects] = useState<ProjectConfig[]>([])
  const [currentProject, setCurrentProject] = useState<ProjectConfig | null>(null)
  const lastAppliedProjectId = useRef<string | null>(null)
  const stepIdRef = useRef(0)
  const startTimeRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  useEffect(() => {
    if (postMortem && !isRunning) setMainView('report')
  }, [postMortem, isRunning])

  useEffect(() => {
    fetch('/api/projects')
      .then(r => r.json())
      .then((data: ProjectConfig[]) => setProjects(data))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (projects.length === 0) return
    const proj = projects.find(p => p.id === selectedProject)
    if (!proj) return

    // Clear service selection only when the project actually changes
    if (proj.id !== lastAppliedProjectId.current) {
      setSelectedServices([])
    }
    lastAppliedProjectId.current = proj.id
    setCurrentProject(proj)

    // Always re-apply project config (catches edits saved in Settings)
    const updates: Record<string, string> = {}
    if (proj.lokiQuery) updates.lokiQuery = proj.lokiQuery
    if (proj.lokiUrl)   updates.lokiUrl   = proj.lokiUrl
    if (proj.channels.length) updates.teamsChannels = proj.channels.join(',')
    if (proj.jenkinsJob)  updates.jenkinsJob    = proj.jenkinsJob
    if (proj.githubRepo)  updates.githubRepoUrl = proj.githubRepo
    if (proj.githubBase)  updates.githubBranch  = proj.githubBase
    if (proj.name)        updates.serviceName   = proj.name
    if (Object.keys(updates).length) {
      fetch('/api/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates) }).catch(() => {})
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects, selectedProject])

  useEffect(() => {
    fetch('/api/config')
      .then(r => r.json())
      .then((cfg: { serviceName: string | null; lokiConfigured: boolean; lokiHealthy: boolean; openaiConfigured: boolean; settings?: { lokiFrom?: string; lokiTo?: string; lokiQuery?: string } }) => {
        setAppConfig(cfg)
        const match = cfg.settings?.lokiQuery?.match(/service_name[=~]+"([^"]+)"/)
        if (match) {
          const svc = match[1]
          if (svc.startsWith('fn-'))       setSelectedProject('fn')
          else if (svc.includes('chip1-')) setSelectedProject('chip1')
        }
        if (cfg.settings?.lokiFrom) setDateFrom(cfg.settings.lokiFrom)
        if (cfg.settings?.lokiTo)   setDateTo(cfg.settings.lokiTo)
        if (cfg.lokiConfigured) {
          fetch('/api/loki/services')
            .then(r => r.json())
            .then((d: { services: LokiService[] }) => {
              const known = new Set(KNOWN_SERVICES.map(s => s.value))
              const extras = d.services.filter(s => !known.has(s.value))
              if (extras.length) setLokiServices([...KNOWN_SERVICES, ...extras])
            })
            .catch(() => {})
        }
      })
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function buildLokiQuery(services: string[], proj: ProjectConfig | null): string {
    if (services.length === 0) return proj?.lokiQuery ?? ''
    if (services.length === 1) return `{service_name="${services[0]}"}`
    return `{service_name=~"${services.join('|')}"}`
  }

  async function loadLiveData() {
    const svcLabel = selectedServices.length > 0
      ? (selectedServices.length === 1 ? selectedServices[0] : `${selectedServices.length} services`)
      : (currentProject?.name ?? appConfig?.serviceName ?? 'service')

    const STEPS: LoadStep[] = [
      { label: 'Saving config',                    status: 'pending' },
      { label: `Fetching logs · ${svcLabel}`,      status: 'pending' },
      { label: 'Polling Teams messages',            status: 'pending' },
      { label: 'Fetching metrics',                  status: 'pending' },
      { label: 'Fetching deploy diff',              status: 'pending' },
    ]

    const update = (idx: number, patch: Partial<LoadStep>) =>
      setLoadingSteps(prev => prev.map((s, i) => i === idx ? { ...s, ...patch } : s))

    setLoadingSteps(STEPS)
    setLiveFetch({ status: 'loading', source: svcLabel })

    const liveIncident: MockIncident = {
      title: svcLabel, version: new Date().toISOString().slice(0, 10),
      logs: '', metrics: [], teamsThread: [], deployDiff: '',
    }

    try {
      update(0, { status: 'loading' })
      // Always write the correct lokiQuery + serviceName before fetching
      const configUpdates: Record<string, string> = {}
      const lokiQuery = buildLokiQuery(selectedServices, currentProject)
      if (lokiQuery) configUpdates.lokiQuery = lokiQuery
      if (currentProject?.lokiUrl) configUpdates.lokiUrl = currentProject.lokiUrl
      // serviceName drives the log line prefix — use selected service(s) so logs show correct name
      if (selectedServices.length > 0) configUpdates.serviceName = selectedServices.join(', ')
      if (dateFrom) configUpdates.lokiFrom = dateFrom
      if (dateTo)   configUpdates.lokiTo   = dateTo
      if (Object.keys(configUpdates).length) {
        await fetch('/api/config', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(configUpdates),
        })
      }
      update(0, { status: 'done', detail: lokiQuery || 'Config saved' })

      update(1, { status: 'loading' })
      let logCount = 0
      try {
        const logsRes = await fetch('/api/logs')
        if (logsRes.ok) {
          const { lines } = await logsRes.json() as { lines?: string[] }
          if (lines?.length) { liveIncident.logs = lines.join('\n'); logCount = lines.length }
          update(1, { status: logCount > 0 ? 'done' : 'error',
            detail: logCount > 0 ? `${logCount} lines` : 'No logs returned' })
        } else {
          const err = await logsRes.json().catch(() => ({})) as { error?: string }
          update(1, { status: 'error', detail: err.error ?? `HTTP ${logsRes.status}` })
        }
      } catch (e) {
        update(1, { status: 'error', detail: (e as Error).message })
      }

      update(2, { status: 'loading' })
      try {
        await fetch('/api/teams/graph-poll', { method: 'POST' })
        const teamsRes = await fetch('/api/teams')
        if (teamsRes.ok) {
          const messages: Record<string, unknown>[] = await teamsRes.json()
          if (messages?.length) {
            liveIncident.teamsThread = messages
              .sort((a, b) => (a.receivedAt as number) - (b.receivedAt as number))
              .map(m => ({
                author:  (m.role    as string) || 'Engineer',
                role:    (m.role    as string) || 'Engineer',
                time:    (m.time    as string) || '',
                text:    (m.text    as string) || '',
                channel: (m.channel as string) || '',
                isAlert: (m.isAlert as boolean) ?? false,
              }))
            update(2, { status: 'done', detail: `${messages.length} messages` })
          } else {
            update(2, { status: 'done', detail: 'No messages in store' })
          }
        }
      } catch (e) {
        update(2, { status: 'error', detail: (e as Error).message })
      }

      update(3, { status: 'loading' })
      try {
        const metricsRes = await fetch('/api/loki/metrics')
        if (metricsRes.ok) {
          const { points } = await metricsRes.json() as { points: { time: string; errors: number }[] }
          if (points?.length) {
            liveIncident.metrics = points.map(p => ({ time: p.time, errorRate: p.errors }))
            update(3, { status: 'done', detail: `${points.length} data points` })
          } else {
            update(3, { status: 'done', detail: 'No metrics data' })
          }
        }
      } catch { update(3, { status: 'error', detail: 'Metrics unavailable' }) }

      update(4, { status: 'loading' })
      try {
        const cfgRes = await fetch('/api/config')
        if (cfgRes.ok) {
          const cfg = await cfgRes.json() as { settings?: { jenkinsUrl?: string; jenkinsJob?: string; githubRepoUrl?: string; githubBranch?: string; githubHead?: string } }
          const results: string[] = []

          if (cfg.settings?.jenkinsUrl && cfg.settings?.jenkinsJob) {
            try {
              const r = await fetch('/api/diff/jenkins')
              if (r.ok) {
                const d = await r.json() as { buildNumber?: number; date?: string; result?: string | null; changeCount?: number; text?: string }
                if (d.buildNumber) {
                  liveIncident.jenkinsBuild = { buildNumber: d.buildNumber, date: d.date ?? '', result: d.result ?? null, changeCount: d.changeCount ?? 0, text: d.text ?? '' }
                  results.push(`Jenkins #${d.buildNumber} ${d.result ?? ''}`)
                }
              }
            } catch { /* Jenkins optional */ }
          }

          if (cfg.settings?.githubRepoUrl && cfg.settings?.githubHead) {
            try {
              const params = new URLSearchParams({ repo: cfg.settings.githubRepoUrl, base: cfg.settings.githubBranch || 'main', head: cfg.settings.githubHead })
              const r = await fetch(`/api/diff/github?${params}`)
              if (r.ok) {
                const d = await r.json() as { text?: string; commits?: number }
                if (d.text) { liveIncident.deployDiff = d.text; results.push(`GitHub ${d.commits ?? 0} commits`) }
              }
            } catch { /* GitHub optional */ }
          }

          update(4, { status: 'done', detail: results.length ? results.join(' · ') : 'Not configured' })
        }
      } catch { update(4, { status: 'error', detail: 'Diff unavailable' }) }

      setIncident(liveIncident)
      setDataLoaded(true)
      const summary = logCount > 0
        ? `${svcLabel} · ${logCount} logs`
        : '0 logs — check service selection or LogQL in Settings'
      setLiveFetch({ status: logCount > 0 ? 'done' : 'error', source: summary, error: logCount > 0 ? undefined : summary })
    } catch (e) {
      setLiveFetch({ status: 'error', source: svcLabel, error: (e as Error).message })
    } finally {
      setTimeout(() => setLoadingSteps([]), 1200)
    }
  }

  async function runAutopsy() {
    if (!incident || isRunning) return
    setSteps([])
    setPostMortem(null)
    setDone(false)
    setIsRunning(true)
    setElapsed(0)
    setMainView('evidence')
    stepIdRef.current = 0
    startTimeRef.current = Date.now()
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000))
    }, 1000)

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          logs: incident.logs,
          metrics: incident.metrics,
          teamsThread: incident.teamsThread,
          deployDiff: incident.deployDiff,
          contextNote: contextNote.trim() || undefined,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
        throw new Error(err.error ?? `HTTP ${res.status}`)
      }
      if (!res.body) throw new Error('No response body from /api/analyze')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done: streamDone, value } = await reader.read()
        if (streamDone) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          const t = line.trim()
          if (!t) continue
          if (t.startsWith('step:')) {
            const text = t.slice(5).trim()
            setSteps((prev) => [...prev.map((s) => ({ ...s, done: true })), { id: stepIdRef.current++, text, done: false }])
          } else if (t.startsWith('result:')) {
            try {
              setPostMortem(JSON.parse(t.slice(7).trim()))
              setSteps((prev) => prev.map((s) => ({ ...s, done: true })))
            } catch { console.error('bad json') }
          }
        }
      }
    } catch (e) {
      const msg = (e as Error).message ?? 'Unknown error'
      setSteps((prev) => [
        ...prev.map((s) => ({ ...s, done: true })),
        { id: stepIdRef.current++, text: `Error: ${msg}`, done: true },
      ])
    } finally {
      setIsRunning(false)
      setDone(true)
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    }
  }

  const elapsedStr = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')}`
  const svcDisplay = selectedServices.length > 0
    ? (selectedServices.length === 1 ? selectedServices[0] : `${selectedServices.length} services`)
    : (currentProject?.name ?? appConfig?.serviceName ?? '')

  const serviceList = currentProject?.services.length
    ? currentProject.services
    : lokiServices
        .filter(s => selectedProject === 'chip1' ? s.value.includes('chip1-') : s.value.startsWith('fn-'))
        .map(s => s.value)

  const evidenceBadge: Record<EvidenceTab, string | null> = {
    Logs:    incident?.logs ? String(incident.logs.split('\n').filter(Boolean).length) : null,
    Metrics: incident?.metrics?.length ? String(incident.metrics.length) : null,
    Teams:   incident?.teamsThread?.length ? String(incident.teamsThread.length) : null,
    Jenkins: incident?.jenkinsBuild ? `#${incident.jenkinsBuild.buildNumber}` : null,
    GitHub:  incident?.deployDiff ? '✓' : null,
    Live:    null,
  }

  const selectStyle: React.CSSProperties = {
    background: 'var(--panel-hover)', color: 'var(--text)',
    border: '1px solid var(--border)', borderRadius: 5,
    padding: '5px 8px', fontSize: 11, outline: 'none',
    cursor: 'pointer', width: '100%',
  }

  const inputStyle: React.CSSProperties = {
    background: 'var(--panel-hover)', color: 'var(--text)',
    border: '1px solid var(--border)', borderRadius: 5,
    padding: '5px 8px', fontSize: 11, outline: 'none',
    colorScheme: theme as 'dark' | 'light',
    width: '100%',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 9, fontWeight: 700, letterSpacing: '0.1em',
    textTransform: 'uppercase', color: 'var(--label)',
  }

  const btnUtilStyle: React.CSSProperties = {
    background: 'var(--panel-hover)', color: 'var(--text-muted)',
    border: '1px solid var(--border)', borderRadius: 6,
    padding: '5px 10px', fontSize: 11, cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: 5,
    textDecoration: 'none', fontWeight: 500,
  }

  return (
    <>
    <div className="flex flex-col h-screen" style={{ background: 'var(--bg)' }}>

      {/* ── Slim header ── */}
      <header style={{
        height: 48, flexShrink: 0,
        background: 'var(--sidebar)', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', padding: '0 20px', gap: 10,
      }}>
        <div style={{ width: 26, height: 26, background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ color: 'var(--accent)', fontSize: 12, fontWeight: 800 }}>R</span>
        </div>
        <span style={{ color: 'var(--white)', fontSize: 13, fontWeight: 700, letterSpacing: '-0.01em' }}>AI Reckoning</span>
        {svcDisplay && (
          <>
            <span style={{ color: 'var(--border)', fontSize: 14, margin: '0 2px' }}>›</span>
            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{svcDisplay}</span>
            {dataLoaded && (
              <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: 'var(--accent-bg)', color: 'var(--accent)', border: '1px solid var(--accent-border)', letterSpacing: '0.08em' }}>
                LIVE
              </span>
            )}
          </>
        )}

        <div style={{ flex: 1 }} />

        {appConfig && (
          <span title={appConfig.lokiHealthy ? 'Loki connected' : appConfig.lokiConfigured ? 'Loki unreachable' : 'Loki not configured'}
            style={{
              fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 4, cursor: 'default',
              background: appConfig.lokiHealthy ? 'var(--accent-bg)' : 'var(--panel-hover)',
              color: appConfig.lokiHealthy ? 'var(--accent)' : 'var(--text-dim)',
              border: `1px solid ${appConfig.lokiHealthy ? 'var(--accent-border)' : 'var(--border)'}`,
            }}>
            {appConfig.lokiHealthy ? '⬤ Loki' : '◯ Loki'}
          </span>
        )}
        <button onClick={() => setShowIntegrations(true)} style={btnUtilStyle}>⚡ Integrations</button>
        <button onClick={() => setShowSettings(true)} style={btnUtilStyle}>⚙ Settings</button>
        <button onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} style={{ ...btnUtilStyle, padding: '5px 9px' }}>
          {theme === 'dark' ? '☀' : '☽'}
        </button>
        <a href="https://grafana.altir.net" target="_blank" rel="noopener noreferrer" style={btnUtilStyle}>
          <span style={{ fontSize: 10 }}>↗</span> Grafana
        </a>
      </header>

      {/* OpenAI warning */}
      {appConfig && !appConfig.openaiConfigured && (
        <div style={{ padding: '7px 20px', background: 'var(--warning-bg)', borderBottom: '1px solid rgba(245,158,11,0.25)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span style={{ color: 'var(--warning)', fontSize: 12 }}>⚠</span>
          <span style={{ color: 'var(--warning)', fontSize: 11 }}>
            OPENAI_API_KEY is not set — Run Reckoning will fail. Add it to <code style={{ fontFamily: 'monospace' }}>.env.local</code> and restart.
          </span>
        </div>
      )}

      {/* ── Workspace ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative', minHeight: 0 }}>

        {loadingSteps.length > 0 && (
          <FetchOverlay steps={loadingSteps} service={svcDisplay || 'service'} />
        )}

        {/* ── LEFT SIDEBAR ── */}
        <aside style={{
          width: 248, flexShrink: 0,
          borderRight: '1px solid var(--border)',
          background: 'var(--sidebar)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}>

          {/* Service config */}
          <div style={{ padding: '12px 14px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>

            {/* Project selector — full width, clearly labelled */}
            <p style={{ ...labelStyle, marginBottom: 5 }}>Project</p>
            <select value={selectedProject}
              onChange={e => {
                const pid = e.target.value
                setSelectedProject(pid)
                // project sync effect will handle config update + service reset
              }}
              style={{ ...selectStyle, width: '100%', marginBottom: 10, fontSize: 12, padding: '6px 8px' }}>
              {projects.length > 0
                ? projects.map(p => <option key={p.id} value={p.id}>{p.name || p.id}</option>)
                : <><option value="chip1">chip1</option><option value="fn">fn</option></>
              }
            </select>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: selectedServices.length > 0 ? 5 : 6 }}>
              <p style={labelStyle}>Services{selectedServices.length > 0 ? ` · ${selectedServices.length}` : ''}</p>
              {selectedServices.length > 0 && (
                <button onClick={() => setSelectedServices([])}
                  style={{ fontSize: 9, color: 'var(--text-dim)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  clear all
                </button>
              )}
            </div>

            {/* Selected service chips — always visible */}
            {selectedServices.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
                {selectedServices.map(svc => (
                  <span key={svc} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    fontSize: 10, fontWeight: 600,
                    padding: '2px 7px', borderRadius: 4,
                    background: 'var(--accent-bg)', color: 'var(--accent)',
                    border: '1px solid var(--accent-border)',
                  }}>
                    {svc.replace(/^(chip1-|fn-)/, '')}
                    <button onClick={() => setSelectedServices(prev => prev.filter(s => s !== svc))}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', fontSize: 10, padding: 0, lineHeight: 1 }}>
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Multi-select service checkboxes */}
            <div style={{ maxHeight: 96, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 5, background: 'var(--bg)', marginBottom: 8 }}>
              {serviceList.length === 0 ? (
                <p style={{ fontSize: 10, color: 'var(--text-dim)', padding: '8px 10px' }}>No services — configure in Settings → Projects</p>
              ) : serviceList.map(svc => {
                const checked = selectedServices.includes(svc)
                return (
                  <label key={svc} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '4px 8px', cursor: 'pointer', userSelect: 'none', background: checked ? 'rgba(0,194,168,0.06)' : 'transparent' }}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={e => setSelectedServices(prev =>
                        e.target.checked ? [...prev, svc] : prev.filter(s => s !== svc)
                      )}
                      style={{ accentColor: 'var(--accent)', cursor: 'pointer', width: 12, height: 12, flexShrink: 0 }}
                    />
                    <span style={{ fontSize: 11, color: checked ? 'var(--accent)' : 'var(--text-dim)', lineHeight: 1.4, fontWeight: checked ? 500 : 400 }}>
                      {svc.replace(/^(chip1-|fn-)/, '')}
                    </span>
                  </label>
                )
              })}
            </div>
            <div style={{ marginBottom: 6 }}>
              <p style={{ ...labelStyle, marginBottom: 4 }}>From</p>
              <input type="datetime-local" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ marginBottom: 8 }}>
              <p style={{ ...labelStyle, marginBottom: 4 }}>To</p>
              <input type="datetime-local" value={dateTo} onChange={e => setDateTo(e.target.value)} style={inputStyle} />
            </div>
            <button
              onClick={() => loadLiveData()}
              disabled={liveFetch.status === 'loading'}
              style={{
                width: '100%', height: 32, borderRadius: 6,
                background: liveFetch.status === 'loading' ? 'var(--panel-hover)' : dataLoaded ? 'var(--card)' : 'var(--panel-hover)',
                color: liveFetch.status === 'loading' ? 'var(--text-dim)' : dataLoaded ? 'var(--text)' : 'var(--text-muted)',
                border: `1px solid ${dataLoaded ? 'var(--border)' : 'var(--border)'}`,
                fontSize: 11, fontWeight: 600, cursor: liveFetch.status === 'loading' ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
              {liveFetch.status === 'loading'
                ? <><span className="spin" style={{ display: 'inline-block', fontSize: 10 }}>⟳</span> Fetching…</>
                : dataLoaded ? <><span style={{ fontSize: 10 }}>↺</span> Refresh Data</>
                : <><span style={{ fontSize: 10 }}>⬇</span> Load Live Data</>
              }
            </button>
          </div>

          {/* Evidence nav */}
          <div style={{ flexShrink: 0, paddingTop: 10, paddingBottom: 4 }}>
            <p style={{ ...labelStyle, padding: '0 16px 6px' }}>Evidence</p>
            {EVIDENCE_ITEMS.map(({ id, icon, label }) => {
              const active = evidenceTab === id && mainView === 'evidence'
              const badge = evidenceBadge[id]
              const isLive = id === 'Live'
              return (
                <button key={id}
                  onClick={() => { setEvidenceTab(id); setMainView('evidence') }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 9,
                    padding: '7px 14px 7px 10px', width: '100%',
                    background: active ? 'rgba(0,194,168,0.07)' : 'none',
                    border: 'none',
                    borderLeft: `2px solid ${active ? 'var(--accent)' : 'transparent'}`,
                    cursor: 'pointer', textAlign: 'left',
                  }}>
                  {isLive
                    ? <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--error)', display: 'inline-block', flexShrink: 0, animation: 'pulse 1.5s ease-in-out infinite' }} />
                    : <span style={{ fontSize: 11, color: active ? 'var(--accent)' : badge ? 'var(--text)' : 'var(--text-dim)', width: 14, textAlign: 'center', flexShrink: 0 }}>{icon}</span>
                  }
                  <span style={{ fontSize: 11, color: active ? 'var(--accent)' : badge ? 'var(--text)' : 'var(--text-dim)', flex: 1, fontWeight: active ? 600 : 400 }}>
                    {label}
                  </span>
                  {badge ? (
                    <span style={{
                      fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3,
                      background: active ? 'var(--accent-bg)' : 'rgba(255,255,255,0.06)',
                      color: active ? 'var(--accent)' : 'var(--text-dim)',
                      border: `1px solid ${active ? 'var(--accent-border)' : 'rgba(255,255,255,0.08)'}`,
                    }}>
                      {badge}
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>

          {/* Agent steps — flex fills middle space */}
          <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {steps.length > 0 && (
              <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px 6px', flexShrink: 0 }}>
                  <p style={labelStyle}>Agent Steps</p>
                  {isRunning
                    ? <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--warning)', letterSpacing: '0.08em' }}>STREAMING</span>
                    : <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.08em' }}>COMPLETE</span>
                  }
                </div>
                <div style={{ flex: 1, overflow: 'auto', padding: '0 10px 10px' }}>
                  {steps.map((step, i) => {
                    const isActive = i === steps.length - 1 && isRunning
                    return (
                      <div key={step.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 7, padding: '4px 6px', marginBottom: 2, borderRadius: 5, background: isActive ? 'var(--warning-bg)' : 'transparent' }}>
                        <span style={{ fontSize: 10, marginTop: 1, flexShrink: 0, color: step.done ? 'var(--accent)' : 'var(--warning)' }}>
                          {step.done ? '✓' : '⟳'}
                        </span>
                        <span style={{ fontSize: 10, color: isActive ? 'var(--text)' : 'var(--text-muted)', lineHeight: 1.5, wordBreak: 'break-word' }}>
                          {step.text}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Investigation — always pinned at bottom */}
          <div style={{ borderTop: '1px solid var(--border)', padding: '14px', flexShrink: 0 }}>
            <p style={{ ...labelStyle, marginBottom: 10 }}>Investigation</p>
            <textarea
              value={contextNote}
              onChange={e => setContextNote(e.target.value)}
              placeholder="Brief the AI — suspects, recent changes, ruled-out causes…"
              rows={3}
              style={{
                width: '100%',
                background: 'var(--panel-hover)',
                color: 'var(--text)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                padding: '8px 10px',
                fontSize: 11,
                resize: 'none',
                outline: 'none',
                fontFamily: 'inherit',
                lineHeight: 1.6,
                marginBottom: 10,
              }}
              onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border)')}
            />
            <button
              onClick={runAutopsy}
              disabled={isRunning || !incident}
              className="btn-glow"
              style={{
                width: '100%', height: 42, borderRadius: 8,
                background: isRunning ? 'var(--warning-bg)' : !incident ? 'var(--panel-hover)' : 'var(--accent)',
                color: isRunning ? 'var(--warning)' : !incident ? 'var(--text-dim)' : '#0d0f14',
                border: isRunning ? '1px solid rgba(245,158,11,0.3)' : !incident ? '1px solid var(--border)' : 'none',
                fontSize: 13, fontWeight: 700, cursor: isRunning || !incident ? 'not-allowed' : 'pointer',
                boxShadow: !isRunning && incident ? '0 0 24px rgba(0,194,168,0.4), 0 4px 12px rgba(0,0,0,0.3)' : 'none',
                letterSpacing: '0.02em',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
              title={!incident ? 'Load live data first' : undefined}
            >
              {isRunning
                ? <><span className="spin" style={{ display: 'inline-block', fontSize: 13 }}>⟳</span> Analysing…</>
                : done
                ? <><span style={{ fontSize: 12 }}>↺</span> Re-run Reckoning</>
                : <><span style={{ fontSize: 12 }}>▶</span> Run Reckoning</>
              }
            </button>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
              {isRunning ? (
                <span style={{ color: 'var(--warning)', fontSize: 10, fontWeight: 600 }}>{elapsedStr} elapsed</span>
              ) : done && postMortem ? (
                <span style={{ color: 'var(--accent)', fontSize: 10, fontWeight: 600 }}>✓ {postMortem.confidence} confidence</span>
              ) : !incident ? (
                <span style={{ color: 'var(--text-dim)', fontSize: 10 }}>Load live data first</span>
              ) : (
                <span style={{ color: 'var(--text-dim)', fontSize: 10 }}>~4 min end-to-end</span>
              )}
              <span style={{ color: 'var(--text-dim)', fontSize: 10 }}>
                saves <span style={{ color: 'var(--accent)', fontWeight: 700 }}>84 min</span>
              </span>
            </div>
          </div>
        </aside>

        {/* ── MAIN CONTENT ── */}
        <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minWidth: 0, background: 'var(--panel)' }}>

          {/* Live fetch banner */}
          <LiveBanner state={liveFetch} onDismiss={() => setLiveFetch({ status: 'idle' })} />

          {/* View toggle — only shown when report exists */}
          {(postMortem || isRunning) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '0 20px', height: 44, borderBottom: '1px solid var(--border)', background: 'var(--sidebar)', flexShrink: 0 }}>
              <button
                onClick={() => setMainView('evidence')}
                style={{
                  padding: '5px 14px', borderRadius: 6, fontSize: 11, fontWeight: mainView === 'evidence' ? 600 : 400,
                  background: mainView === 'evidence' ? 'var(--panel-hover)' : 'none',
                  color: mainView === 'evidence' ? 'var(--text)' : 'var(--text-dim)',
                  border: mainView === 'evidence' ? '1px solid var(--border)' : '1px solid transparent',
                  cursor: 'pointer',
                }}>
                Evidence
              </button>
              <button
                onClick={() => setMainView('report')}
                style={{
                  padding: '5px 14px', borderRadius: 6, fontSize: 11, fontWeight: mainView === 'report' ? 600 : 400,
                  background: mainView === 'report' ? 'var(--panel-hover)' : 'none',
                  color: mainView === 'report' ? 'var(--accent)' : 'var(--text-dim)',
                  border: mainView === 'report' ? '1px solid var(--accent-border)' : '1px solid transparent',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                Report
                {postMortem?.confidence && (
                  <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3, background: 'var(--accent-bg)', color: 'var(--accent)', border: '1px solid var(--accent-border)' }}>
                    {postMortem.confidence}
                  </span>
                )}
                {isRunning && (
                  <span className="spin" style={{ display: 'inline-block', fontSize: 11, color: 'var(--warning)' }}>⟳</span>
                )}
              </button>
            </div>
          )}

          {/* Content area */}
          <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
            {mainView === 'report' ? (
              <PostMortem data={postMortem} />
            ) : (
              incident ? (
                <InputPanel
                  incident={incident}
                  activeTab={evidenceTab}
                  hideTabs
                  projectId={currentProject?.id}
                  onLogsChange={(logs) => setIncident(prev => prev ? { ...prev, logs } : prev)}
                  onDiffChange={(deployDiff) => setIncident(prev => prev ? { ...prev, deployDiff } : prev)}
                  onBranchSelect={async (branch) => {
                    const proj = currentProject
                    if (!proj) return
                    const params = new URLSearchParams({ repo: proj.githubRepo, base: proj.githubBase || 'main', head: branch })
                    const r = await fetch(`/api/diff/github?${params}`)
                    if (r.ok) {
                      const d = await r.json() as { text?: string }
                      if (d.text) setIncident(prev => prev ? { ...prev, deployDiff: d.text! } : prev)
                    }
                    await fetch(`/api/projects/${proj.id}`, {
                      method: 'PUT', headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ lastBranch: branch }),
                    })
                    setCurrentProject(prev => prev ? { ...prev, lastBranch: branch } : prev)
                  }}
                />
              ) : (
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, opacity: 0.5 }}>
                  <div style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--card)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 22, color: 'var(--text-dim)' }}>⬡</span>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: 13, fontWeight: 600 }}>No data loaded</p>
                    <p style={{ color: 'var(--text-dim)', fontSize: 11, marginTop: 4 }}>Select a service and click Load Live Data</p>
                  </div>
                </div>
              )
            )}
          </div>
        </main>

      </div>
    </div>

    {showSettings && (
      <SettingsPanel
        onClose={() => setShowSettings(false)}
        onSaved={() => {
          setShowSettings(false)
          fetch('/api/projects').then(r => r.json()).then((data: ProjectConfig[]) => setProjects(data)).catch(() => {})
          fetch('/api/config')
            .then(r => r.json())
            .then((cfg: { serviceName?: string | null; lokiConfigured?: boolean; lokiHealthy?: boolean; openaiConfigured?: boolean }) => {
              setAppConfig({
                serviceName: cfg.serviceName ?? null,
                lokiConfigured: !!cfg.lokiConfigured,
                lokiHealthy: !!cfg.lokiHealthy,
                openaiConfigured: !!cfg.openaiConfigured,
              })
              if (cfg.lokiHealthy) loadLiveData()
            })
            .catch(() => {})
        }}
      />
    )}
    {showIntegrations && (
      <IntegrationsPanel
        onClose={() => setShowIntegrations(false)}
        onSaved={() => {
          setShowIntegrations(false)
          fetch('/api/projects').then(r => r.json()).then((data: ProjectConfig[]) => setProjects(data)).catch(() => {})
          fetch('/api/config').then(r => r.json()).then((cfg: { serviceName?: string | null; lokiConfigured?: boolean; lokiHealthy?: boolean; openaiConfigured?: boolean }) => {
            setAppConfig({
              serviceName: cfg.serviceName ?? null,
              lokiConfigured: !!cfg.lokiConfigured,
              lokiHealthy: !!cfg.lokiHealthy,
              openaiConfigured: !!cfg.openaiConfigured,
            })
          }).catch(() => {})
        }}
      />
    )}
    </>
  )
}
