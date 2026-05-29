'use client'

import { useState } from 'react'
import { IncidentReport } from '@/lib/types'

const TABS = [
  { id: 'Root Cause',  icon: '⬡', label: 'Root Cause'  },
  { id: 'Timeline',   icon: '⏱', label: 'Timeline'    },
  { id: 'Insights',   icon: '◈', label: 'Insights'    },
  { id: 'Actionables',icon: '✦', label: 'Actionables' },
] as const
type Tab = typeof TABS[number]['id']

const conf = {
  HIGH:   { color: 'var(--accent)',  bg: 'var(--accent-bg)',  border: 'var(--accent-border)' },
  MEDIUM: { color: 'var(--warning)', bg: 'var(--warning-bg)', border: 'rgba(245,158,11,0.25)' },
  LOW:    { color: 'var(--error)',   bg: 'var(--error-bg)',   border: 'var(--error-border)'  },
}

const ttMeta: Record<string, { color: string; label: string; dot: string }> = {
  deploy:     { color: '#f59e0b', label: 'DEPLOY',      dot: '#f59e0b' },
  alert:      { color: '#f04f5e', label: 'ALERT',       dot: '#f04f5e' },
  escalation: { color: '#fb923c', label: 'ESCALATION',  dot: '#fb923c' },
  resolution: { color: '#00c2a8', label: 'RESOLVED',    dot: '#00c2a8' },
}

const actionPriority = ['Deploy fix now', 'Monitor', 'Implement', 'Review', 'Add', 'Update', 'Ensure']
function getActionBadge(action: string) {
  const lower = action.toLowerCase()
  if (lower.startsWith('deploy') || lower.startsWith('rollback')) return { label: 'URGENT', color: '#f04f5e', bg: 'rgba(240,79,94,0.12)' }
  if (lower.startsWith('monitor')) return { label: 'WATCH', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' }
  return { label: 'TODO', color: '#6b7585', bg: 'rgba(107,117,133,0.12)' }
}

function formatMarkdown(data: IncidentReport): string {
  return [
    `# Incident Report`,
    ``,
    `**Confidence:** ${data.confidence}`,
    ``,
    `## Root Cause`,
    ``,
    data.rootCause,
    ``,
    `**File:** \`${data.file}\``,
    `**Location:** ${data.lineRef}`,
    ``,
    `## Causal Chain`,
    ``,
    ...data.causalChain.map((s, i) => `${i + 1}. ${s}`),
    ``,
    `## Timeline`,
    ``,
    ...data.timeline.map(t => `- **${t.time}** [${t.type.toUpperCase()}] ${t.event}`),
    ``,
    `## Contributing Factors`,
    ``,
    ...data.contributingFactors.map(f => `- ${f}`),
    ``,
    `## Actions`,
    ``,
    ...data.actions.map(a => `- [ ] ${a}`),
  ].join('\n')
}

export default function PostMortem({ data }: { data: IncidentReport | null }) {
  const [tab, setTab] = useState<Tab>('Root Cause')
  const [copied, setCopied] = useState(false)

  function copyMarkdown() {
    if (!data) return
    navigator.clipboard.writeText(formatMarkdown(data))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--panel)' }}>
      {/* Tab bar */}
      <div className="flex items-center flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex flex-1">
        {TABS.map(({ id, icon, label }) => {
          const active = tab === id
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              className="flex items-center gap-1.5 px-3 py-2.5 transition-colors"
              style={{
                color: active ? 'var(--accent)' : 'var(--text-dim)',
                borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
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
              <span style={{ fontSize: 10, opacity: active ? 1 : 0.5 }}>{icon}</span>
              {label}
            </button>
          )
        })}
        </div>
        {data && (
          <button
            onClick={copyMarkdown}
            className="flex-shrink-0 px-3 flex items-center gap-1"
            style={{
              color: copied ? 'var(--accent)' : 'var(--text-muted)',
              background: 'none', border: 'none', cursor: 'pointer', fontSize: 11,
              whiteSpace: 'nowrap',
            }}
          >
            {copied ? '✓ Copied' : '⬇ Export'}
          </button>
        )}
      </div>

      <div className="flex-1 scroll overflow-y-auto p-3 space-y-2" style={{ minHeight: 0 }}>
        {!data ? (
          <div className="h-full flex flex-col items-center justify-center gap-3" style={{ opacity: 0.4 }}>
            <div style={{ fontSize: 32, opacity: 0.3 }}>⬡</div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 500 }}>Analysis not yet generated</p>
              <p style={{ color: 'var(--text-dim)', fontSize: 11, marginTop: 3 }}>Root cause report will appear here</p>
            </div>
          </div>
        ) : (
          <>
            {/* Root Cause */}
            {tab === 'Root Cause' && (
              <div className="space-y-3 fade-in">
                <div className="flex items-center justify-between">
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                    style={{ background: conf[data.confidence].bg, color: conf[data.confidence].color, border: `1px solid ${conf[data.confidence].border}` }}
                  >
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: conf[data.confidence].color, display: 'inline-block' }} />
                    {data.confidence} CONFIDENCE
                  </span>
                </div>

                <div className="p-3 rounded-lg" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderLeft: `3px solid ${conf[data.confidence].color}` }}>
                  <p style={{ color: 'var(--white)', fontSize: 13, lineHeight: 1.7, fontWeight: 500 }}>{data.rootCause}</p>
                </div>

                <div className="p-3.5 rounded-lg" style={{ background: 'rgba(0,194,168,0.06)', border: '1px solid var(--accent-border)' }}>
                  <p className="section-label mb-2">LOCATION</p>
                  <p style={{ color: 'var(--accent)', fontSize: 13, fontWeight: 700 }} className="mono">{data.file}</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 4 }} className="mono">{data.lineRef}</p>
                </div>

                <div>
                  <p className="section-label mb-2">CAUSAL CHAIN</p>
                  <div className="space-y-1">
                    {data.causalChain.map((step, i) => (
                      <div key={i} className="flex items-start gap-2.5 fade-in" style={{ position: 'relative' }}>
                        {i < data.causalChain.length - 1 && (
                          <div style={{
                            position: 'absolute', left: 8, top: 22, bottom: -4,
                            width: 1, background: 'var(--border)', zIndex: 0
                          }} />
                        )}
                        <span
                          className="flex-shrink-0 flex items-center justify-center rounded-full text-xs font-bold"
                          style={{
                            width: 18, height: 18, zIndex: 1, flexShrink: 0, marginTop: 9,
                            background: i === 0 ? 'var(--warning)' : i === data.causalChain.length - 1 ? 'var(--error)' : 'var(--panel)',
                            color: i === 0 ? '#000' : i === data.causalChain.length - 1 ? '#fff' : 'var(--text-muted)',
                            border: '1px solid var(--border)', fontSize: 9
                          }}
                        >{i + 1}</span>
                        <div className="flex-1 p-2.5 rounded-lg mb-1"
                          style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                          <span style={{ color: 'var(--text)', fontSize: 12, lineHeight: 1.5 }}>{step}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Timeline */}
            {tab === 'Timeline' && (
              <div className="space-y-1 fade-in">
                {data.timeline.map((event, i) => {
                  const meta = ttMeta[event.type] ?? ttMeta.alert
                  const isLast = i === data.timeline.length - 1
                  return (
                    <div key={i} className="flex gap-3">
                      <div className="flex flex-col items-center" style={{ paddingTop: 12, width: 20, flexShrink: 0 }}>
                        <div className="rounded-full flex-shrink-0"
                          style={{ width: 9, height: 9, background: meta.dot, boxShadow: `0 0 6px ${meta.dot}60` }} />
                        {!isLast && (
                          <div style={{ width: 1, flex: 1, background: 'var(--border)', minHeight: 16, margin: '4px 0' }} />
                        )}
                      </div>
                      <div className="flex-1 p-3 rounded-lg mb-2 fade-in"
                        style={{ background: 'var(--card)', border: '1px solid var(--border)', borderLeft: `2px solid ${meta.color}` }}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="mono" style={{ color: meta.color, fontSize: 13, fontWeight: 700 }}>{event.time}</span>
                          <span
                            className="px-1.5 py-0.5 rounded text-xs font-semibold"
                            style={{ background: `${meta.color}18`, color: meta.color, fontSize: 9, letterSpacing: '0.08em' }}
                          >{meta.label}</span>
                        </div>
                        <p style={{ color: 'var(--text)', fontSize: 12, lineHeight: 1.5 }}>{event.event}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Insights */}
            {tab === 'Insights' && (
              <div className="space-y-2 fade-in">
                <p className="section-label mb-2">CONTRIBUTING FACTORS</p>
                {data.contributingFactors.map((f, i) => {
                  const colors = ['var(--error)', 'var(--warning)', '#a78bfa', 'var(--accent)']
                  const c = colors[i % colors.length]
                  return (
                    <div key={i} className="flex items-start gap-3 p-2.5 rounded-lg fade-in"
                      style={{ background: 'var(--card)', border: '1px solid var(--border)', borderLeft: `2px solid ${c}` }}>
                      <div className="flex-shrink-0 rounded-full mt-1.5"
                        style={{ width: 6, height: 6, background: c }} />
                      <p style={{ color: 'var(--text)', fontSize: 12, lineHeight: 1.65 }}>{f}</p>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Actionables */}
            {tab === 'Actionables' && (
              <div className="space-y-2 fade-in">
                <p className="section-label mb-2">RECOMMENDED ACTIONS</p>
                {data.actions.map((a, i) => {
                  const badge = getActionBadge(a)
                  return (
                    <div key={i} className="flex items-start gap-3 p-2.5 rounded-lg fade-in"
                      style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                      <div className="flex-shrink-0 rounded flex items-center justify-center"
                        style={{ width: 16, height: 16, border: '1.5px solid var(--border-light)', borderRadius: 4, marginTop: 1 }} />
                      <div className="flex-1">
                        <p style={{ color: 'var(--text)', fontSize: 12, lineHeight: 1.65 }}>{a}</p>
                      </div>
                      <span className="flex-shrink-0 px-1.5 py-0.5 rounded text-xs font-semibold"
                        style={{ background: badge.bg, color: badge.color, fontSize: 9, letterSpacing: '0.06em', marginTop: 2 }}>
                        {badge.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
