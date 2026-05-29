'use client'

import { useState, useEffect, useRef } from 'react'
import { MockIncident, JenkinsBuild } from '@/lib/types'
import MetricsChart from './MetricsChart'

const CHANNEL_PALETTE = [
  { color: 'var(--accent)', bg: 'var(--accent-bg)',       border: 'var(--accent-border)' },
  { color: 'var(--blue)',   bg: 'rgba(59,130,246,0.08)',  border: 'rgba(59,130,246,0.25)' },
  { color: '#a78bfa',       bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.25)' },
  { color: '#fb923c',       bg: 'rgba(251,146,60,0.08)',  border: 'rgba(251,146,60,0.25)' },
]

function useChannelColors() {
  const [colors, setColors] = useState<Record<string, { color: string; bg: string; border: string }>>({})
  useEffect(() => {
    fetch('/api/config')
      .then(r => r.json())
      .then((cfg: { channels?: string[] }) => {
        const map: Record<string, { color: string; bg: string; border: string }> = {}
        ;(cfg.channels ?? []).forEach((ch, i) => {
          map[ch] = CHANNEL_PALETTE[i % CHANNEL_PALETTE.length]
        })
        setColors(map)
      })
      .catch(() => {/* use empty map — messages still render, just no colour coding */})
  }, [])
  return colors
}

const TABS = [
  { id: 'Logs',    icon: '≡'  },
  { id: 'Metrics', icon: '∿'  },
  { id: 'Teams',   icon: '⊛'  },
  { id: 'Jenkins', icon: '⚙'  },
  { id: 'GitHub',  icon: '⑂'  },
  { id: 'Live',    icon: null },
] as const
type Tab = typeof TABS[number]['id']

function LogView({ logs }: { logs: string }) {
  return (
    <pre className="scroll overflow-y-auto h-full p-4 text-xs leading-[1.75] mono"
      style={{ color: 'var(--text-muted)', whiteSpace: 'pre', overflowX: 'auto' }}>
      {logs.split('\n').map((line, i) => {
        let cls = 'log-info'
        if (line.startsWith('═') || line.startsWith(' PATTERN') || line.startsWith(' transaction')) cls = 'log-section'
        else if (line.startsWith('──')) cls = 'log-section'
        else if (line.includes('ALERT') || line.includes('P1 ALERT')) cls = 'log-alert'
        else if (line.includes('ERROR')) cls = 'log-error'
        else if (line.includes('WARN')) cls = 'log-warn'
        else if (line.includes('DEPLOYMENT EVENT') || line.includes('FIRST FAILURE') || line.includes('Starting') || line.includes('Deployment v')) cls = 'log-deploy'
        return <span key={i} className={cls}>{line + '\n'}</span>
      })}
    </pre>
  )
}

function LogDropZone({ logs, onLogsChange }: { logs: string; onLogsChange?: (l: string) => void }) {
  const [dragging, setDragging]   = useState(false)
  const [parsing,  setParsing]    = useState(false)
  const [loadInfo, setLoadInfo]   = useState<string | null>(null)

  async function handleFile(file: File) {
    if (!onLogsChange) return
    setParsing(true)
    setLoadInfo(null)
    try {
      const raw = await file.text()
      const res = await fetch('/api/logs/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: raw,
      })
      if (!res.ok) throw new Error(`Parse failed: ${res.status}`)
      const { lines, count, total } = await res.json()
      onLogsChange((lines as string[]).join('\n'))
      setLoadInfo(
        `Loaded ${count} lines from ${file.name}` +
        (total > count ? ` (${total.toLocaleString()} total — filtered to fit context)` : '')
      )
    } catch (e) {
      setLoadInfo(`Error: ${(e as Error).message}`)
    } finally {
      setParsing(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {loadInfo && (
        <div className="flex items-center justify-between px-3 py-1 flex-shrink-0"
          style={{ background: 'var(--accent-bg)', borderBottom: '1px solid var(--accent-border)' }}>
          <span style={{ color: 'var(--accent)', fontSize: 10, fontWeight: 600 }}>{loadInfo}</span>
          <button onClick={() => setLoadInfo(null)}
            style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12 }}>✕</button>
        </div>
      )}
      <div
        className="relative flex-1"
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false) }}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          const file = e.dataTransfer.files[0]
          if (file) handleFile(file)
        }}
      >
        {(dragging || parsing) && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 pointer-events-none"
            style={{ background: 'rgba(0,194,168,0.06)', border: '2px dashed var(--accent)', borderRadius: 6 }}>
            {parsing
              ? <><span className="spin" style={{ fontSize: 22, color: 'var(--accent)', display: 'inline-block' }}>⟳</span>
                  <p style={{ color: 'var(--accent)', fontWeight: 600, fontSize: 13 }}>Filtering logs…</p></>
              : <><span style={{ fontSize: 22, color: 'var(--accent)' }}>⬇</span>
                  <p style={{ color: 'var(--accent)', fontWeight: 600, fontSize: 13 }}>Drop log file to load</p></>
            }
          </div>
        )}
        <LogView logs={logs} />
      </div>
    </div>
  )
}

function JenkinsBuildCard({ build }: { build: JenkinsBuild }) {
  const resultColor = build.result === 'SUCCESS' ? 'var(--accent)'
    : build.result === 'FAILURE' ? 'var(--error)'
    : 'var(--warning)'
  const resultBg = build.result === 'SUCCESS' ? 'var(--accent-bg)'
    : build.result === 'FAILURE' ? 'var(--error-bg)'
    : 'var(--warning-bg)'
  const resultBorder = build.result === 'SUCCESS' ? 'var(--accent-border)'
    : build.result === 'FAILURE' ? 'var(--error-border)'
    : 'rgba(245,158,11,0.25)'

  const dateStr = build.date ? new Date(build.date).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : ''
  const lines = build.text.split('\n').filter(Boolean)

  return (
    <div className="p-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
      {/* Header row */}
      <div className="flex items-center gap-3 mb-3">
        <div style={{ flex: 1 }}>
          <div className="flex items-center gap-2">
            <span style={{ color: 'var(--white)', fontSize: 13, fontWeight: 700 }}>
              ⚙ Jenkins Build #{build.buildNumber}
            </span>
            <span className="px-2 py-0.5 rounded text-xs font-bold"
              style={{ background: resultBg, color: resultColor, border: `1px solid ${resultBorder}`, fontSize: 10 }}>
              {build.result ?? 'IN PROGRESS'}
            </span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 3 }}>
            {dateStr} · {build.changeCount} commit{build.changeCount !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Changeset lines */}
      <div className="flex flex-col gap-1">
        {lines.filter(l => l.startsWith('##') || l.startsWith('  ')).map((line, i) => {
          if (line.startsWith('##')) {
            const parts = line.slice(3).split('  ')
            const sha = parts[0]?.trim()
            const msg = parts.slice(1).join('  ').trim()
            return (
              <div key={i} className="flex items-start gap-2 pt-1">
                <span className="mono" style={{ color: 'var(--accent)', fontSize: 10, flexShrink: 0, marginTop: 1 }}>{sha}</span>
                <span style={{ color: 'var(--text)', fontSize: 12 }}>{msg}</span>
              </div>
            )
          }
          const symbol = line.trimStart()[0]
          const file   = line.trimStart().slice(2)
          const color  = symbol === '+' ? 'var(--accent)' : symbol === '-' ? 'var(--error)' : 'var(--warning)'
          return (
            <div key={i} className="flex items-center gap-2 ml-4">
              <span style={{ color, fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{symbol}</span>
              <span className="mono" style={{ color: 'var(--text-muted)', fontSize: 10 }}>{file}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function JenkinsTab({ build }: { build: JenkinsBuild | null }) {
  if (!build) {
    return (
      <div className="h-full flex items-center justify-center" style={{ opacity: 0.4 }}>
        <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>No Jenkins data loaded</p>
      </div>
    )
  }
  return (
    <div className="scroll overflow-y-auto h-full">
      <JenkinsBuildCard build={build} />
    </div>
  )
}

function GithubDiffTab({ diff, onDiffChange, projectId, onBranchSelect }: {
  diff: string
  onDiffChange?: (d: string) => void
  projectId?: string
  onBranchSelect?: (branch: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [branches, setBranches] = useState<string[]>([])
  const [selectedBranch, setSelectedBranch] = useState('')
  const [loadingBranches, setLoadingBranches] = useState(false)

  useEffect(() => {
    if (!projectId) return
    setLoadingBranches(true)
    fetch(`/api/diff/github/branches?projectId=${encodeURIComponent(projectId)}`)
      .then(r => r.json())
      .then((d: { branches?: string[] }) => { setBranches(d.branches ?? []); setLoadingBranches(false) })
      .catch(() => setLoadingBranches(false))
  }, [projectId])

  return (
    <div className="flex flex-col h-full">
      {/* Branch picker — only when projectId + branches available */}
      {projectId && (
        <div className="flex items-center gap-2 px-3 py-2 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)', background: 'var(--panel)' }}>
          <span style={{ fontSize: 10, color: 'var(--label)', fontWeight: 600, letterSpacing: '0.08em', flexShrink: 0 }}>BRANCH</span>
          {loadingBranches ? (
            <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>Loading…</span>
          ) : branches.length > 0 ? (
            <>
              <select
                value={selectedBranch}
                onChange={e => setSelectedBranch(e.target.value)}
                style={{ flex: 1, background: 'var(--panel-hover)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 5, padding: '3px 7px', fontSize: 11, outline: 'none' }}>
                <option value="">— pick a branch —</option>
                {branches.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
              <button
                disabled={!selectedBranch}
                onClick={() => { if (selectedBranch && onBranchSelect) onBranchSelect(selectedBranch) }}
                style={{ padding: '3px 10px', borderRadius: 5, fontSize: 10, fontWeight: 600, cursor: selectedBranch ? 'pointer' : 'not-allowed', background: selectedBranch ? 'var(--accent)' : 'var(--panel-hover)', color: selectedBranch ? '#0d0f14' : 'var(--text-dim)', border: 'none', flexShrink: 0 }}>
                Load Diff
              </button>
              <button
                onClick={() => {
                  setLoadingBranches(true)
                  fetch(`/api/diff/github/branches?projectId=${encodeURIComponent(projectId)}&force=1`)
                    .then(r => r.json())
                    .then((d: { branches?: string[] }) => { setBranches(d.branches ?? []); setLoadingBranches(false) })
                    .catch(() => setLoadingBranches(false))
                }}
                title="Refresh branch list"
                style={{ fontSize: 12, color: 'var(--text-dim)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px' }}>
                ↻
              </button>
            </>
          ) : (
            <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>No matching branches — check branch filter in Settings → Projects</span>
          )}
          {onDiffChange && (
            <button onClick={() => setEditing(!editing)}
              style={{ background: 'none', color: editing ? 'var(--accent)' : 'var(--text-dim)', border: `1px solid ${editing ? 'var(--accent-border)' : 'var(--border)'}`, cursor: 'pointer', fontSize: 10, padding: '2px 8px', borderRadius: 4, flexShrink: 0 }}>
              {editing ? '✓ Done' : '✎ Override'}
            </button>
          )}
        </div>
      )}

      {!projectId && onDiffChange && (
        <div className="flex justify-end px-3 py-1 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          <button onClick={() => setEditing(!editing)}
            style={{ background: 'var(--card)', color: editing ? 'var(--accent)' : 'var(--text-muted)', border: `1px solid ${editing ? 'var(--accent-border)' : 'var(--border)'}`, cursor: 'pointer', fontSize: 10, padding: '2px 8px', borderRadius: 4 }}>
            {editing ? '✓ Done' : '✎ Override'}
          </button>
        </div>
      )}

      {!diff && !editing ? (
        <div className="h-full flex items-center justify-center" style={{ opacity: 0.4 }}>
          <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>No GitHub diff loaded · pick a branch above or load live data</p>
        </div>
      ) : editing ? (
        <textarea className="flex-1 p-4 mono scroll"
          style={{ background: 'transparent', color: 'var(--text-muted)', resize: 'none', outline: 'none', border: 'none', fontSize: 12, lineHeight: 1.75 }}
          value={diff} onChange={e => onDiffChange?.(e.target.value)} spellCheck={false} placeholder="Paste a unified diff here..." />
      ) : (
        <div className="flex-1 overflow-hidden">
          <pre className="scroll overflow-y-auto h-full p-4 text-xs leading-[1.75] mono">
            {diff.split('\n').map((line, i) => {
              if (line.startsWith('+++') || line.startsWith('---')) return <span key={i} className="diff-meta">{line + '\n'}</span>
              if (line.startsWith('@@'))  return <span key={i} className="diff-hunk">{line + '\n'}</span>
              if (line.startsWith('+'))   return <span key={i} className="diff-add">{line + '\n'}</span>
              if (line.startsWith('-'))   return <span key={i} className="diff-remove">{line + '\n'}</span>
              return <span key={i} style={{ color: 'var(--text-muted)' }}>{line + '\n'}</span>
            })}
          </pre>
        </div>
      )}
    </div>
  )
}

function linkifyText(text: string) {
  const urlRe = /(https?:\/\/[^\s]+)/g
  const parts = text.split(urlRe)
  return parts.map((part, i) =>
    urlRe.test(part)
      ? <a key={i} href={part} target="_blank" rel="noopener noreferrer"
          style={{ color: 'var(--accent)', textDecoration: 'underline', textDecorationColor: 'var(--accent-border)' }}
        >{part}</a>
      : part
  )
}

function TeamsView({ messages, channelColors }: { messages: MockIncident['teamsThread']; channelColors: Record<string, { color: string; bg: string; border: string }> }) {
  const [activeChannel, setActiveChannel] = useState<string>('all')

  const uniqueChannels = Array.from(new Set(messages.map(m => m.channel).filter((c): c is string => !!c)))
  const getColor = (ch: string) =>
    channelColors[ch] ?? { color: 'var(--text-muted)', bg: 'var(--card)', border: 'var(--border)' }

  const filtered = activeChannel === 'all' ? messages : messages.filter(m => m.channel === activeChannel)

  if (messages.length === 0) {
    return (
      <div className="h-full flex items-center justify-center" style={{ opacity: 0.45 }}>
        <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>No Teams messages loaded</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Channel filter bar */}
      <div className="flex items-center gap-2 px-4 py-2.5 flex-shrink-0 flex-wrap"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--panel)' }}>
        <button
          onClick={() => setActiveChannel('all')}
          style={{
            fontSize: 10, fontWeight: 600, padding: '3px 10px', borderRadius: 20, cursor: 'pointer',
            background: activeChannel === 'all' ? 'var(--accent-bg)' : 'transparent',
            color: activeChannel === 'all' ? 'var(--accent)' : 'var(--text-dim)',
            border: `1px solid ${activeChannel === 'all' ? 'var(--accent-border)' : 'var(--border)'}`,
          }}
        >
          All · {messages.length}
        </button>
        {uniqueChannels.map(ch => {
          const c = getColor(ch)
          const count = messages.filter(m => m.channel === ch).length
          return (
            <button key={ch}
              onClick={() => setActiveChannel(ch)}
              style={{
                fontSize: 10, fontWeight: 600, padding: '3px 10px', borderRadius: 20, cursor: 'pointer',
                background: activeChannel === ch ? c.bg : 'transparent',
                color: activeChannel === ch ? c.color : 'var(--text-dim)',
                border: `1px solid ${activeChannel === ch ? c.border : 'var(--border)'}`,
              }}
            >
              # {ch} · {count}
            </button>
          )
        })}
      </div>

      {/* Unified message feed */}
      <div className="scroll overflow-y-auto flex-1 p-4 space-y-2">
        {filtered.map((msg, i) => {
          const ch = msg.channel ? getColor(msg.channel) : null
          return (
            <div key={i} className="rounded-lg p-3 fade-in" style={{
              background: msg.isAlert ? 'var(--error-bg)' : 'var(--card)',
              border: `1px solid ${msg.isAlert ? 'var(--error-border)' : 'var(--border)'}`,
            }}>
              <div className="flex items-center gap-2 mb-1.5">
                {/* Channel pill */}
                {msg.channel && activeChannel === 'all' && (
                  <span style={{
                    fontSize: 9, fontWeight: 700, padding: '1px 7px', borderRadius: 20,
                    background: ch?.bg, color: ch?.color, border: `1px solid ${ch?.border}`,
                    letterSpacing: '0.05em', flexShrink: 0,
                  }}>
                    #{msg.channel}
                  </span>
                )}
                <span style={{ color: 'var(--white)', fontSize: 12, fontWeight: 600, flex: 1 }}>
                  {msg.role || 'Engineer'}
                </span>
                <span className="mono" style={{ color: 'var(--text-dim)', fontSize: 10 }}>{msg.time}</span>
              </div>
              <p style={{ color: msg.isAlert ? 'var(--text)' : 'var(--text-muted)', fontSize: 11.5, lineHeight: 1.6 }}>
                {linkifyText(msg.text)}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function LiveTeamsView() {
  const [messages, setMessages] = useState<any[]>([])
  const [connected, setConnected] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  // Must be called unconditionally before any early return
  const channelColors = useChannelColors()

  useEffect(() => {
    const es = new EventSource('/api/teams/stream')
    es.onopen = () => setConnected(true)
    es.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data)
        setMessages((prev) => {
          const exists = prev.find((m) => m.id === msg.id)
          if (exists) return prev
          const next = [...prev, msg].sort((a, b) => a.receivedAt - b.receivedAt)
          return next
        })
      } catch { /* ignore parse errors */ }
    }
    es.onerror = () => setConnected(false)
    return () => es.close()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (messages.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3" style={{ opacity: 0.5 }}>
        <div className="flex items-center justify-center rounded-xl"
          style={{ width: 48, height: 48, background: 'var(--card)', border: '1px solid var(--border)' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'var(--text-muted)' }}>
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 500 }}>
            {connected ? 'Waiting for messages…' : 'Connecting…'}
          </p>
          <p style={{ color: 'var(--text-dim)', fontSize: 11, marginTop: 3 }}>
            Power Automate will push here when messages arrive
          </p>
        </div>
      </div>
    )
  }

  let lastChannel = ''
  const getChannelColor = (ch: string) =>
    channelColors[ch] ?? { color: 'var(--text-muted)', bg: 'var(--card)', border: 'var(--border)' }

  return (
    <div className="scroll overflow-y-auto h-full p-4 space-y-2">
      <div className="flex items-center gap-2 mb-3">
        <div className="rounded-full" style={{ width: 6, height: 6, background: connected ? 'var(--accent)' : 'var(--text-dim)', animation: connected ? 'pulse 2s ease-in-out infinite' : 'none' }} />
        <span style={{ color: connected ? 'var(--accent)' : 'var(--text-dim)', fontSize: 10, fontWeight: 600, letterSpacing: '0.08em' }}>
          {connected ? 'LIVE' : 'CONNECTING'} · {messages.length} messages
        </span>
      </div>
      {messages.map((msg, i) => {
        const showHeader = msg.channel !== lastChannel
        if (showHeader) lastChannel = msg.channel
        const ch = getChannelColor(msg.channel)
        return (
          <div key={msg.id}>
            {showHeader && ch && (
              <div className="flex items-center gap-2 pt-2 pb-1.5">
                <span className="px-2 py-0.5 rounded mono" style={{ background: ch.bg, color: ch.color, border: `1px solid ${ch.border}`, fontSize: 10, fontWeight: 600 }}>
                  # {msg.channel}
                </span>
                <div style={{ flex: 1, height: 1, background: ch.border }} />
              </div>
            )}
            <div className="rounded-lg p-3.5 fade-in" style={{
              background: msg.isAlert ? 'var(--error-bg)' : 'var(--card)',
              border: `1px solid ${msg.isAlert ? 'var(--error-border)' : 'var(--border)'}`,
            }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center justify-center rounded-full text-xs font-bold flex-shrink-0"
                  style={{ width: 26, height: 26, background: msg.isAlert ? 'var(--error-bg)' : 'var(--accent-bg)', border: `1px solid ${msg.isAlert ? 'var(--error-border)' : 'var(--accent-border)'}`, color: msg.isAlert ? 'var(--error)' : 'var(--accent)', fontSize: 11 }}>
                  {(msg.role || 'Engineer')[0]}
                </div>
                <div className="flex-1">
                  <span style={{ color: 'var(--white)', fontSize: 12, fontWeight: 600 }}>{msg.role || 'Engineer'}</span>
                </div>
                <span className="mono px-2 py-0.5 rounded" style={{ background: 'var(--panel)', color: 'var(--text-muted)', border: '1px solid var(--border)', fontSize: 10 }}>
                  {msg.time}
                </span>
              </div>
              <p style={{ color: 'var(--text)', fontSize: 12, lineHeight: 1.65 }}>{linkifyText(msg.text)}</p>
            </div>
          </div>
        )
      })}
      <div ref={bottomRef} />
    </div>
  )
}

export default function InputPanel({ incident, onLogsChange, onDiffChange, activeTab: externalTab, hideTabs, projectId, onBranchSelect }: {
  incident: MockIncident | null
  onLogsChange?: (logs: string) => void
  onDiffChange?: (diff: string) => void
  activeTab?: Tab
  hideTabs?: boolean
  projectId?: string
  onBranchSelect?: (branch: string) => void
}) {
  const [tab, setTab] = useState<Tab>('Logs')
  const channelColors = useChannelColors()

  const activeTab = externalTab ?? tab

  const tabBadge: Record<string, string | null> = {
    Logs:    incident?.logs ? String(incident.logs.split('\n').filter(Boolean).length) : null,
    Metrics: incident?.metrics?.length ? String(incident.metrics.length) : null,
    Teams:   incident?.teamsThread?.length ? String(incident.teamsThread.length) : null,
    Jenkins: incident?.jenkinsBuild ? `#${incident.jenkinsBuild.buildNumber}` : null,
    GitHub:  incident?.deployDiff ? '✓' : null,
    Live:    null,
  }

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--panel)' }}>
      {!hideTabs && (
        <div className="flex flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          {TABS.map(({ id, icon }) => {
            const active = tab === id
            const isLive = id === 'Live'
            const activeColor = isLive ? 'var(--error)' : 'var(--accent)'
            const badge  = tabBadge[id]
            return (
              <button
                key={id}
                onClick={() => setTab(id)}
                className="flex flex-col items-center justify-center px-2 py-2 transition-colors"
                style={{
                  color: active ? activeColor : 'var(--text-dim)',
                  borderBottom: active ? `2px solid ${activeColor}` : '2px solid transparent',
                  background: 'none',
                  cursor: 'pointer',
                  fontSize: 11,
                  fontWeight: active ? 600 : 400,
                  marginBottom: -1,
                  flex: 1,
                  gap: 2,
                  letterSpacing: '0.03em',
                  minWidth: 0,
                }}
              >
                <div className="flex items-center gap-1">
                  {isLive
                    ? <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--error)', display: 'inline-block', animation: 'pulse 1.5s ease-in-out infinite', flexShrink: 0 }} />
                    : <span style={{ fontSize: 10, opacity: active ? 1 : 0.5 }}>{icon}</span>
                  }
                  <span>{id}</span>
                </div>
                {badge ? (
                  <span style={{
                    fontSize: 9, fontWeight: 700, lineHeight: '13px',
                    padding: '0 5px', borderRadius: 3,
                    background: active
                      ? (isLive ? 'rgba(240,79,94,0.15)' : 'var(--accent-bg)')
                      : 'rgba(255,255,255,0.06)',
                    color: active ? activeColor : 'var(--text-dim)',
                    border: `1px solid ${active ? (isLive ? 'rgba(240,79,94,0.3)' : 'var(--accent-border)') : 'rgba(255,255,255,0.08)'}`,
                  }}>
                    {badge}
                  </span>
                ) : (
                  <span style={{ height: 13 }} />
                )}
              </button>
            )
          })}
        </div>
      )}
      <div className="flex-1 overflow-hidden" style={{ minHeight: 0 }}>
        {!incident ? (
          <div className="h-full flex items-center justify-center">
            <p style={{ color: 'var(--text-dim)', fontSize: 12 }}>No incident loaded</p>
          </div>
        ) : (
          <>
            {activeTab === 'Logs'    && <LogDropZone logs={incident.logs} onLogsChange={onLogsChange} />}
            {activeTab === 'Metrics' && <div className="h-full p-5"><MetricsChart data={incident.metrics} /></div>}
            {activeTab === 'Teams'   && <TeamsView messages={incident.teamsThread} channelColors={channelColors} />}
            {activeTab === 'Jenkins' && <JenkinsTab build={incident.jenkinsBuild ?? null} />}
            {activeTab === 'GitHub'  && <GithubDiffTab diff={incident.deployDiff} onDiffChange={onDiffChange} projectId={projectId} onBranchSelect={onBranchSelect} />}
            {activeTab === 'Live'    && <LiveTeamsView />}
          </>
        )}
      </div>
    </div>
  )
}
