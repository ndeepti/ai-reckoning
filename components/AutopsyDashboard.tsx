'use client'

import { useState, useRef, useEffect } from 'react'
import { AgentStep, IncidentReport, MockIncident, LiveFetchState } from '@/lib/types'
import { mockIncident } from '@/lib/mockData'
import { liveDeployDiff, liveMetrics } from '@/lib/liveData'
import InputPanel from './InputPanel'
import AgentSteps from './AgentSteps'
import PostMortem from './PostMortem'

const SidebarItem = ({ label, value, accent }: { label: string; value: string; accent?: boolean }) => (
  <div className="px-4 py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
    <p className="section-label mb-1">{label}</p>
    <p style={{ color: accent ? 'var(--accent)' : 'var(--text)', fontSize: 12, fontWeight: 500 }}>{value}</p>
  </div>
)

const StatCard = ({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) => (
  <div
    className="flex flex-col gap-1 px-4 py-3 rounded-lg"
    style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
  >
    <p className="section-label">{label}</p>
    <p style={{ color, fontSize: 22, fontWeight: 700, lineHeight: 1 }}>{value}</p>
    <p style={{ color: 'var(--text-muted)', fontSize: 11 }}>{sub}</p>
  </div>
)

function LiveBanner({ state, onDismiss }: { state: LiveFetchState; onDismiss: () => void }) {
  if (state.status === 'idle') return null
  const colors = {
    loading: { bg: 'var(--warning-bg)', border: 'rgba(245,158,11,0.25)', text: 'var(--warning)' },
    done:    { bg: 'var(--accent-bg)',  border: 'var(--accent-border)',   text: 'var(--accent)' },
    error:   { bg: 'var(--error-bg)',   border: 'var(--error-border)',    text: 'var(--error)' },
  }[state.status] ?? { bg: 'var(--card)', border: 'var(--border)', text: 'var(--text)' }

  return (
    <div
      className="flex items-center gap-3 px-6 py-2 flex-shrink-0 fade-in"
      style={{ background: colors.bg, borderBottom: `1px solid ${colors.border}` }}
    >
      {state.status === 'loading' && <span className="spin flex-shrink-0" style={{ color: colors.text, fontSize: 13 }}>⟳</span>}
      {state.status === 'done'    && <span style={{ color: colors.text }}>✓</span>}
      {state.status === 'error'   && <span style={{ color: colors.text }}>✗</span>}
      <span style={{ color: colors.text, fontSize: 12, flex: 1 }}>
        {state.status === 'loading' && `Fetching live data from ${state.source}…`}
        {state.status === 'done'    && `Live data loaded from ${state.source}`}
        {state.status === 'error'   && `${state.source}: ${state.error}`}
      </span>
      <button onClick={onDismiss} style={{ color: 'var(--text-dim)', fontSize: 14, background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
    </div>
  )
}

export default function AutopsyDashboard() {
  const [incident, setIncident] = useState<MockIncident | null>(mockIncident)
  const [steps, setSteps] = useState<AgentStep[]>([])
  const [postMortem, setPostMortem] = useState<IncidentReport | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [done, setDone] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [liveFetch, setLiveFetch] = useState<LiveFetchState>({ status: 'idle' })
  const [dataMode, setDataMode] = useState<'mock' | 'live'>('mock')
  const [contextNote, setContextNote] = useState('')
  const stepIdRef = useRef(0)
  const startTimeRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  async function loadLiveData() {
    setLiveFetch({ status: 'loading', source: 'Logs + Teams…' })

    try {
      const [logsRes, teamsRes] = await Promise.all([
        fetch('/api/logs'),
        fetch('/api/teams'),
      ])

      const liveIncident = { ...mockIncident }

      // Always use live diff + metrics — they match the real fn-connect-service incident
      liveIncident.deployDiff = liveDeployDiff
      liveIncident.metrics    = liveMetrics

      if (logsRes.ok) {
        const { lines } = await logsRes.json()
        if (lines?.length) liveIncident.logs = lines.join('\n')
      }

      if (teamsRes.ok) {
        const messages: any[] = await teamsRes.json()
        if (messages?.length) {
          liveIncident.teamsThread = messages
            .sort((a, b) => a.receivedAt - b.receivedAt)
            .map((m) => ({
              author:  m.role    || 'Engineer',
              role:    m.role    || 'Engineer',
              time:    m.time    || '',
              text:    m.text    || '',
              channel: m.channel || 'TestChannel1',
              isAlert: m.isAlert ?? false,
            }))
        }
      }

      setIncident(liveIncident)
      setDataMode('live')
      setLiveFetch({ status: 'done', source: 'fn-connect logs + Teams live' })
    } catch (e) {
      setLiveFetch({ status: 'error', source: 'Live', error: (e as Error).message })
    }
  }

  async function runAutopsy() {
    if (!incident || isRunning) return
    setSteps([])
    setPostMortem(null)
    setDone(false)
    setIsRunning(true)
    setElapsed(0)
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
      if (!res.ok || !res.body) throw new Error('Stream failed')

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
    } catch (e) { console.error(e) }
    finally {
      setIsRunning(false)
      setDone(true)
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    }
  }

  const status = isRunning ? 'live' : done ? 'complete' : 'standby'
  const statusColor = { live: 'var(--error)', complete: 'var(--accent)', standby: 'var(--text-muted)' }[status]
  const elapsedStr = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')}`
  const timeSaved = done ? `${Math.max(0, 88 - elapsed)} min` : '84 min'

  const metrics = incident?.metrics ?? []
  const peakCount = metrics.length ? Math.max(...metrics.map(m => m.errorRate)) : 0
  const baselineCount = metrics.length
    ? Math.round(metrics.slice(0, 6).reduce((s, m) => s + m.errorRate, 0) / Math.min(6, metrics.length))
    : 0
  const peakDisplay = peakCount ? peakCount.toLocaleString() : '—'
  const peakSub = baselineCount ? `baseline ~${baselineCount.toLocaleString()} / 2min` : 'errors per 2min window'

  return (
    <div className="flex h-screen" style={{ background: 'var(--bg)' }}>

      {/* ── Sidebar ── */}
      <aside
        className="flex flex-col flex-shrink-0"
        style={{ width: 200, background: 'var(--sidebar)', borderRight: '1px solid var(--border)' }}
      >
        {/* Logo */}
        <div
          className="flex items-center gap-2.5 px-4"
          style={{ height: 52, borderBottom: '1px solid var(--border)' }}
        >
          <div
            className="flex items-center justify-center rounded-md"
            style={{ width: 28, height: 28, background: 'var(--accent-bg)', border: '1px solid var(--accent-border)' }}
          >
            <span style={{ color: 'var(--accent)', fontSize: 13, fontWeight: 800 }}>R</span>
          </div>
          <span style={{ color: 'var(--white)', fontSize: 14, fontWeight: 700, letterSpacing: '-0.01em' }}>
            AI Reckoning
          </span>
        </div>

        {/* Status */}
        <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2">
            <div
              className="rounded-full flex-shrink-0"
              style={{ width: 7, height: 7, background: statusColor, animation: isRunning ? 'pulse 1.5s ease-in-out infinite' : 'none' }}
            />
            <span style={{ color: statusColor, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {status}
            </span>
          </div>
        </div>

        {/* Incident meta */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 pt-4 pb-2">
            <p className="section-label">INCIDENT</p>
          </div>
          <SidebarItem label="Severity"  value={postMortem ? `P1 — ${postMortem.confidence}` : '—'} accent={!!postMortem} />
          <SidebarItem label="Root Cause" value={postMortem ? postMortem.rootCause.slice(0, 40) + (postMortem.rootCause.length > 40 ? '…' : '') : '—'} />
          <SidebarItem label="File"      value={postMortem?.file ?? '—'} />
          <SidebarItem label="Confidence" value={postMortem?.confidence ?? '—'} />

          <div className="px-4 pt-5 pb-2">
            <p className="section-label">TIMELINE</p>
          </div>
          {postMortem?.timeline?.slice(0, 3).map((t, i) => (
            <SidebarItem key={i} label={t.time} value={t.event.slice(0, 36) + (t.event.length > 36 ? '…' : '')} />
          )) ?? <SidebarItem label="—" value="Run analysis to populate" />}

          <div className="px-4 pt-5 pb-2">
            <p className="section-label">DATA SOURCE</p>
          </div>
          <div className="px-4 pb-3 flex flex-col gap-2">
            <span
              className="px-2 py-1 rounded text-xs font-semibold self-start"
              style={{
                background: dataMode === 'live' ? 'var(--accent-bg)' : 'var(--panel-hover)',
                color: dataMode === 'live' ? 'var(--accent)' : 'var(--text-muted)',
                border: `1px solid ${dataMode === 'live' ? 'var(--accent-border)' : 'var(--border)'}`,
                fontSize: 10,
              }}
            >
              {dataMode === 'live' ? '⬤ LIVE' : '◯ MOCK'}
            </span>
            <button
              onClick={loadLiveData}
              disabled={liveFetch.status === 'loading'}
              className="w-full flex items-center justify-center gap-2 py-1.5 rounded-lg font-semibold transition-all"
              style={{
                background: 'var(--panel-hover)',
                color: 'var(--text-muted)',
                fontSize: 11,
                cursor: liveFetch.status === 'loading' ? 'not-allowed' : 'pointer',
                border: '1px solid var(--border)',
              }}
            >
              {liveFetch.status === 'loading'
                ? <><span className="spin" style={{ display: 'inline-block', fontSize: 10 }}>⟳</span> Fetching...</>
                : <><span style={{ fontSize: 10 }}>⬇</span> Load Live Data</>
              }
            </button>
          </div>
        </div>

      </aside>

      {/* ── Main content ── */}
      <div className="flex flex-col flex-1 overflow-hidden">

        {/* Header */}
        <header
          className="flex items-center justify-between px-6 flex-shrink-0"
          style={{ height: 52, borderBottom: '1px solid var(--border)', background: 'var(--sidebar)' }}
        >
          <div>
            <h1 style={{ color: 'var(--white)', fontSize: 15, fontWeight: 600 }}>
              {postMortem ? `P1 — ${postMortem.rootCause.slice(0, 60)}${postMortem.rootCause.length > 60 ? '…' : ''}` : 'AI Reckoning — Incident Investigation'}
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 1 }}>
              {dataMode === 'live' ? 'Live · Chip1-Integration + chip1-releases' : 'Mock incident data'} · {new Date().toISOString().slice(0, 10)}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="https://grafana.altir.net"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-opacity hover:opacity-80"
              style={{ background: 'var(--panel-hover)', color: 'var(--text-muted)', border: '1px solid var(--border)', textDecoration: 'none' }}
            >
              <span style={{ fontSize: 10 }}>↗</span> Grafana
            </a>
            {postMortem?.confidence && (
              <span className="px-3 py-1 rounded-md text-xs font-semibold"
                style={{ background: 'var(--accent-bg)', color: 'var(--accent)', border: '1px solid var(--accent-border)' }}>
                {postMortem.confidence} confidence
              </span>
            )}
          </div>
        </header>

        {/* Live fetch status banner */}
        <LiveBanner state={liveFetch} onDismiss={() => setLiveFetch({ status: 'idle' })} />

        {/* Stat cards */}
        <div
          className="grid grid-cols-4 gap-3 px-6 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--border)', background: 'var(--sidebar)' }}
        >
          <StatCard label="Peak Error Count" value={peakDisplay} sub={peakSub} color="var(--error)" />
          <StatCard label="Deploy Event"   value={postMortem?.timeline?.find(t => t.type === 'deploy')?.time ?? '—'} sub="From timeline" color="var(--warning)" />
          <StatCard label="First Failure"  value={postMortem?.timeline?.find(t => t.type === 'alert')?.time  ?? '—'} sub="Error spike detected" color="var(--warning)" />
          <StatCard
            label="Time Saved"
            value={isRunning ? elapsedStr : timeSaved}
            sub={isRunning ? 'AI analysis in progress...' : 'vs. manual (88 min avg)'}
            color={isRunning ? 'var(--warning)' : 'var(--accent)'}
          />
        </div>

        {/* Panel header row */}
        <div
          className="grid flex-shrink-0"
          style={{ gridTemplateColumns: '1fr 1fr 1fr', borderBottom: '1px solid var(--border)' }}
        >
          {[
            { label: 'INPUT DATA',      sub: dataMode === 'live' ? 'Live · fn-connect-service' : 'Mock incident data' },
            { label: 'AGENT REASONING', sub: isRunning ? `${steps.length} steps streaming...` : done ? `${steps.length} steps complete` : 'Waiting for run' },
            { label: 'ANALYSIS REPORT', sub: done ? `${postMortem?.confidence ?? ''} confidence · ${postMortem?.causalChain?.length ?? 0} causal steps` : 'Not yet generated' },
          ].map(({ label, sub }, i) => (
            <div
              key={label}
              className="px-5 py-3"
              style={{ borderRight: i < 2 ? '1px solid var(--border)' : 'none', background: 'var(--panel)' }}
            >
              <p className="section-label">{label}</p>
              <p style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 2 }}>{sub}</p>
            </div>
          ))}
        </div>

        {/* 3 panels */}
        <div className="grid flex-1 overflow-hidden" style={{ gridTemplateColumns: '1fr 1fr 1fr', minHeight: 0 }}>
          <div style={{ borderRight: '1px solid var(--border)', overflow: 'hidden' }}>
            <InputPanel
              incident={incident}
              onLogsChange={(logs) => setIncident((prev) => prev ? { ...prev, logs } : prev)}
              onDiffChange={(deployDiff) => setIncident((prev) => prev ? { ...prev, deployDiff } : prev)}
            />
          </div>
          <div style={{ borderRight: '1px solid var(--border)', overflow: 'hidden' }}>
            <AgentSteps steps={steps} isRunning={isRunning} />
          </div>
          <div style={{ overflow: 'hidden' }}>
            <PostMortem data={postMortem} />
          </div>
        </div>

        {/* Footer — action bar */}
        <div
          className="flex items-stretch gap-0 flex-shrink-0"
          style={{ borderTop: '1px solid var(--border)', background: 'var(--sidebar)', minHeight: 60 }}
        >
          {/* Left: branding */}
          <div className="flex items-center px-6 flex-shrink-0" style={{ borderRight: '1px solid var(--border)' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: 11, whiteSpace: 'nowrap' }}>
              Manual&nbsp;<span style={{ color: 'var(--error)', fontWeight: 600 }}>88 min</span>
              &nbsp;→&nbsp;<span style={{ color: 'var(--accent)', fontWeight: 600 }}>~4 min</span>
            </p>
          </div>

          {/* Center: context input */}
          <div className="flex items-center gap-2 px-4 flex-1" style={{ borderRight: '1px solid var(--border)' }}>
            <span style={{ color: 'var(--text-dim)', fontSize: 11, flexShrink: 0 }}>✎</span>
            <textarea
              value={contextNote}
              onChange={(e) => setContextNote(e.target.value)}
              placeholder="Add context for AI — known infra changes, suspects, ruled-out causes..."
              rows={1}
              style={{
                flex: 1,
                background: 'transparent',
                color: 'var(--text)',
                border: 'none',
                padding: '4px 0',
                fontSize: 12,
                resize: 'none',
                outline: 'none',
                fontFamily: 'inherit',
                lineHeight: 1.5,
              }}
            />
          </div>

          {/* Right: primary action */}
          <button
            onClick={runAutopsy}
            disabled={isRunning}
            className="btn-glow flex items-center justify-center gap-2 px-8 font-bold transition-all flex-shrink-0"
            style={{
              background: isRunning ? 'var(--panel-hover)' : 'var(--accent)',
              color: isRunning ? 'var(--text-muted)' : '#0d0f14',
              fontSize: 14,
              cursor: isRunning ? 'not-allowed' : 'pointer',
              border: 'none',
              borderRadius: 0,
              minWidth: 180,
              boxShadow: isRunning ? 'none' : '0 0 24px rgba(0,194,168,0.4)',
              letterSpacing: '0.01em',
            }}
          >
            {isRunning
              ? <><span className="spin" style={{ display: 'inline-block', fontSize: 13 }}>⟳</span> Analysing... {elapsedStr}</>
              : done
              ? <><span style={{ fontSize: 15 }}>↺</span> Re-run</>
              : <><span style={{ fontSize: 15 }}>▶</span> Run Reckoning</>
            }
          </button>
        </div>
      </div>
    </div>
  )
}
