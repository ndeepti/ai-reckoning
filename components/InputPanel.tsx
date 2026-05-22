'use client'

import { useState, useEffect, useRef } from 'react'
import { MockIncident } from '@/lib/types'
import MetricsChart from './MetricsChart'

const TABS = [
  { id: 'Logs',    icon: '≡'  },
  { id: 'Metrics', icon: '∿'  },
  { id: 'Teams',   icon: '⊛'  },
  { id: 'Diff',    icon: '⊕'  },
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

function DiffTab({ diff, onDiffChange }: { diff: string; onDiffChange?: (d: string) => void }) {
  const [editing, setEditing] = useState(false)

  return (
    <div className="flex flex-col h-full">
      {onDiffChange && (
        <div className="flex justify-end px-3 py-1 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          <button
            onClick={() => setEditing(!editing)}
            style={{
              background: 'var(--card)', color: editing ? 'var(--accent)' : 'var(--text-muted)',
              border: `1px solid ${editing ? 'var(--accent-border)' : 'var(--border)'}`,
              cursor: 'pointer', fontSize: 10, padding: '2px 8px', borderRadius: 4,
            }}
          >
            {editing ? '✓ Done' : '✎ Paste your own diff'}
          </button>
        </div>
      )}
      {editing ? (
        <textarea
          className="flex-1 p-4 mono scroll"
          style={{
            background: 'transparent', color: 'var(--text-muted)', resize: 'none',
            outline: 'none', border: 'none', fontSize: 12, lineHeight: 1.75,
          }}
          value={diff}
          onChange={(e) => onDiffChange?.(e.target.value)}
          spellCheck={false}
          placeholder="Paste a unified diff here..."
        />
      ) : (
        <div className="flex-1 overflow-hidden">
          <pre className="scroll overflow-y-auto h-full p-4 text-xs leading-[1.75] mono">
            {diff.split('\n').map((line, i) => {
              if (line.startsWith('+++') || line.startsWith('---')) return <span key={i} className="diff-meta">{line + '\n'}</span>
              if (line.startsWith('@@')) return <span key={i} className="diff-hunk">{line + '\n'}</span>
              if (line.startsWith('+')) return <span key={i} className="diff-add">{line + '\n'}</span>
              if (line.startsWith('-')) return <span key={i} className="diff-remove">{line + '\n'}</span>
              return <span key={i} style={{ color: 'var(--text-muted)' }}>{line + '\n'}</span>
            })}
          </pre>
        </div>
      )}
    </div>
  )
}

const CHANNEL_COLORS: Record<string, { color: string; bg: string; border: string }> = {
  'chip1-releases':    { color: 'var(--accent)',  bg: 'var(--accent-bg)',  border: 'var(--accent-border)' },
  'Chip1-Integration': { color: 'var(--blue)',    bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.25)' },
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

function TeamsView({ messages }: { messages: MockIncident['teamsThread'] }) {
  let lastChannel = ''
  return (
    <div className="scroll overflow-y-auto h-full p-4 space-y-2">
      {messages.map((msg, i) => {
        const showChannelHeader = msg.channel && msg.channel !== lastChannel
        if (msg.channel) lastChannel = msg.channel
        const ch = msg.channel ? CHANNEL_COLORS[msg.channel] : null
        return (
          <div key={i}>
            {showChannelHeader && msg.channel && (
              <div className="flex items-center gap-2 pt-2 pb-1.5">
                <span
                  className="px-2 py-0.5 rounded text-xs font-semibold mono"
                  style={{ background: ch?.bg, color: ch?.color, border: `1px solid ${ch?.border}`, fontSize: 10 }}
                >
                  # {msg.channel}
                </span>
                <div style={{ flex: 1, height: 1, background: ch?.border }} />
              </div>
            )}
            <div
              className="rounded-lg p-3.5 fade-in"
              style={{
                background: msg.isAlert ? 'var(--error-bg)' : 'var(--card)',
                border: `1px solid ${msg.isAlert ? 'var(--error-border)' : 'var(--border)'}`,
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="flex items-center justify-center rounded-full text-xs font-bold flex-shrink-0"
                  style={{
                    width: 26, height: 26,
                    background: msg.isAlert ? 'var(--error-bg)' : 'var(--accent-bg)',
                    border: `1px solid ${msg.isAlert ? 'var(--error-border)' : 'var(--accent-border)'}`,
                    color: msg.isAlert ? 'var(--error)' : 'var(--accent)',
                    fontSize: 11,
                  }}
                >
                  {(msg.role || 'Engineer')[0]}
                </div>
                <div className="flex-1">
                  <span style={{ color: 'var(--white)', fontSize: 12, fontWeight: 600 }}>{msg.role || 'Engineer'}</span>
                </div>
                <span
                  className="mono px-2 py-0.5 rounded text-xs"
                  style={{ background: 'var(--panel)', color: 'var(--text-muted)', border: '1px solid var(--border)', fontSize: 10 }}
                >
                  {msg.time}
                </span>
              </div>
              <p style={{ color: 'var(--text)', fontSize: 12, lineHeight: 1.65 }}>{linkifyText(msg.text)}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function LiveTeamsView() {
  const [messages, setMessages] = useState<any[]>([])
  const [connected, setConnected] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const es = new EventSource('/api/teams/stream')
    es.onopen = () => setConnected(true)
    es.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data)
        setMessages((prev) => {
          const exists = prev.find((m) => m.id === msg.id)
          if (exists) return prev
          // insert sorted by receivedAt ascending
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
  const CHANNEL_COLORS: Record<string, { color: string; bg: string; border: string }> = {
    'chip1-releases':    { color: 'var(--accent)',  bg: 'var(--accent-bg)',      border: 'var(--accent-border)' },
    'Chip1-Integration': { color: 'var(--blue)',    bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.25)' },
  }
  const getChannelColor = (ch: string) =>
    CHANNEL_COLORS[ch] ?? { color: 'var(--text-muted)', bg: 'var(--card)', border: 'var(--border)' }

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

export default function InputPanel({ incident, onLogsChange, onDiffChange }: {
  incident: MockIncident | null
  onLogsChange?: (logs: string) => void
  onDiffChange?: (diff: string) => void
}) {
  const [tab, setTab] = useState<Tab>('Logs')

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--panel)' }}>
      <div className="flex flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        {TABS.map(({ id, icon }) => {
          const active = tab === id
          const isLive = id === 'Live'
          const activeColor = isLive ? 'var(--error)' : 'var(--accent)'
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              className="flex items-center gap-1.5 px-3 py-2.5 transition-colors"
              style={{
                color: active ? activeColor : 'var(--text-dim)',
                borderBottom: active ? `2px solid ${activeColor}` : '2px solid transparent',
                background: 'none',
                cursor: 'pointer',
                fontSize: 11,
                fontWeight: active ? 600 : 400,
                marginBottom: -1,
                flex: 1,
                justifyContent: 'center',
                letterSpacing: '0.03em',
              }}
            >
              {isLive
                ? <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--error)', display: 'inline-block', animation: 'pulse 1.5s ease-in-out infinite', flexShrink: 0 }} />
                : <span style={{ fontSize: 10, opacity: active ? 1 : 0.5 }}>{icon}</span>
              }
              {id}
            </button>
          )
        })}
      </div>
      <div className="flex-1 overflow-hidden" style={{ minHeight: 0 }}>
        {!incident ? (
          <div className="h-full flex items-center justify-center">
            <p style={{ color: 'var(--text-dim)', fontSize: 12 }}>No incident loaded</p>
          </div>
        ) : (
          <>
            {tab === 'Logs'    && <LogDropZone logs={incident.logs} onLogsChange={onLogsChange} />}
            {tab === 'Metrics' && <div className="h-full p-5"><MetricsChart data={incident.metrics} /></div>}
            {tab === 'Teams'   && <TeamsView messages={incident.teamsThread} />}
            {tab === 'Diff'    && <DiffTab diff={incident.deployDiff} onDiffChange={onDiffChange} />}
            {tab === 'Live'    && <LiveTeamsView />}

          </>
        )}
      </div>
    </div>
  )
}
