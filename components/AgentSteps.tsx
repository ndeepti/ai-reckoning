'use client'

import { AgentStep } from '@/lib/types'

export default function AgentSteps({ steps, isRunning }: { steps: AgentStep[]; isRunning: boolean }) {
  const doneCount = steps.filter(s => s.done).length
  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--panel)' }}>
      <div className="flex-1 scroll overflow-y-auto p-4 space-y-2" style={{ minHeight: 0 }}>

        {steps.length === 0 && !isRunning && (
          <div className="h-full flex flex-col items-center justify-center gap-3" style={{ opacity: 0.5 }}>
            <div
              className="flex items-center justify-center rounded-xl"
              style={{ width: 48, height: 48, background: 'var(--card)', border: '1px solid var(--border)' }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'var(--text-muted)' }}>
                <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
              </svg>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 500 }}>Waiting for run</p>
              <p style={{ color: 'var(--text-dim)', fontSize: 11, marginTop: 3 }}>Agent reasoning will stream here</p>
            </div>
          </div>
        )}

        {isRunning && steps.length === 0 && (
          <div className="flex items-start gap-3 p-3 rounded-lg fade-in"
            style={{ background: 'var(--warning-bg)', border: '1px solid rgba(245,158,11,0.2)' }}>
            <span className="spin mt-0.5 flex-shrink-0" style={{ color: 'var(--warning)', fontSize: 13, display: 'inline-block' }}>⟳</span>
            <span style={{ color: 'var(--text)', fontSize: 12 }}>
              Initializing AI Reckoning agent<span className="cursor" />
            </span>
          </div>
        )}

        {steps.map((step, i) => {
          const isLast = i === steps.length - 1
          const isActive = isLast && isRunning
          return (
            <div
              key={step.id}
              className="flex items-start gap-3 p-3 rounded-lg fade-in"
              style={{
                background: isActive ? 'var(--warning-bg)' : 'var(--card)',
                border: `1px solid ${isActive ? 'rgba(245,158,11,0.2)' : 'var(--border)'}`,
                transition: 'all 0.15s ease',
              }}
            >
              <div className="flex-shrink-0 mt-0.5">
                {step.done ? (
                  <div
                    className="flex items-center justify-center rounded-full"
                    style={{ width: 18, height: 18, background: 'var(--accent-bg)', border: '1px solid var(--accent-border)' }}
                  >
                    <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                ) : (
                  <span className="spin flex-shrink-0" style={{ color: 'var(--warning)', fontSize: 14, display: 'inline-block' }}>⟳</span>
                )}
              </div>
              <span style={{ color: step.done ? 'var(--text-muted)' : 'var(--text)', fontSize: 12, lineHeight: 1.65 }}>
                {step.text}
                {isActive && <span className="cursor" />}
              </span>
            </div>
          )
        })}
      </div>

      {steps.length > 0 && (
        <div
          className="flex items-center justify-between px-4 py-2 flex-shrink-0"
          style={{ borderTop: '1px solid var(--border)', background: 'var(--panel)' }}
        >
          <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>
            {isRunning ? `${doneCount} of ${steps.length} complete` : `${steps.length} steps`}
          </span>
          {!isRunning && (
            <span
              className="px-2 py-0.5 rounded text-xs font-semibold"
              style={{ background: 'var(--accent-bg)', color: 'var(--accent)', border: '1px solid var(--accent-border)', fontSize: 10 }}
            >
              COMPLETE
            </span>
          )}
          {isRunning && (
            <span style={{ color: 'var(--warning)', fontSize: 10, fontWeight: 600 }}>STREAMING</span>
          )}
        </div>
      )}
    </div>
  )
}
