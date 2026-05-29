'use client'

import { useState, useEffect } from 'react'
import ProjectsSettings from './ProjectsSettings'

type SettingsTab = 'general' | 'projects'

interface Settings {
  lokiUrl: string
  lokiUrl2: string
  lokiQuery: string
  lokiLookbackHours: string
  serviceName: string
  serviceDescription: string
  downstreamSystems: string
  platformDescription: string
  ciTool: string
  teamsChannels: string
  openaiModel: string
}

const EMPTY: Settings = {
  lokiUrl: '', lokiUrl2: '', lokiQuery: '', lokiLookbackHours: '2',
  serviceName: '', serviceDescription: '', downstreamSystems: '',
  platformDescription: '', ciTool: '', teamsChannels: '', openaiModel: 'gpt-4o',
}

const Field = ({ label, hint, value, onChange, placeholder, mono = false }: {
  label: string; hint?: string; value: string; onChange: (v: string) => void
  placeholder?: string; mono?: boolean
}) => (
  <div className="flex flex-col gap-1">
    <label style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--label)' }}>
      {label}
    </label>
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={mono ? 'mono' : ''}
      style={{
        background: 'var(--panel-hover)', color: 'var(--text)',
        border: '1px solid var(--border)', borderRadius: 6,
        padding: '6px 10px', fontSize: 12, outline: 'none', width: '100%',
      }}
      onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
      onBlur={e => (e.target.style.borderColor = 'var(--border)')}
    />
    {hint && <p style={{ color: 'var(--text-dim)', fontSize: 10, marginTop: 1 }}>{hint}</p>}
  </div>
)

export default function SettingsPanel({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general')
  const [settings, setSettings] = useState<Settings>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/config')
      .then(r => r.json())
      .then((cfg: { settings?: Settings }) => {
        if (cfg.settings) setSettings({ ...EMPTY, ...cfg.settings })
      })
      .catch(() => {})
  }, [])

  function set(key: keyof Settings) {
    return (val: string) => setSettings(prev => ({ ...prev, [key]: val }))
  }

  async function save() {
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({ error: 'Save failed' }))
        throw new Error(e.error)
      }
      setSaved(true)
      setTimeout(() => { setSaved(false); onSaved() }, 1200)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="flex flex-col"
        style={{
          background: 'var(--panel)', border: '1px solid var(--border)',
          borderRadius: 12, width: 560, maxHeight: '88vh',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        }}
      >
        {/* Header */}
        <div className="flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between px-6 pt-4 pb-3">
            <div>
              <h2 style={{ color: 'var(--white)', fontSize: 14, fontWeight: 600 }}>Settings</h2>
              <p style={{ color: 'var(--text-dim)', fontSize: 11, marginTop: 2 }}>
                Saved to <code style={{ fontFamily: 'monospace' }}>config.json</code> · secrets stay in <code style={{ fontFamily: 'monospace' }}>.env.local</code>
              </p>
            </div>
            <button onClick={onClose}
              style={{ color: 'var(--text-dim)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>
              ✕
            </button>
          </div>
          {/* Tabs */}
          <div className="flex px-6" style={{ gap: 2 }}>
            {(['general', 'projects'] as SettingsTab[]).map(t => (
              <button key={t} onClick={() => setActiveTab(t)}
                style={{
                  padding: '5px 14px', fontSize: 11, fontWeight: activeTab === t ? 600 : 400, cursor: 'pointer',
                  background: 'none', border: 'none', marginBottom: -1,
                  color: activeTab === t ? 'var(--accent)' : 'var(--text-dim)',
                  borderBottom: activeTab === t ? '2px solid var(--accent)' : '2px solid transparent',
                }}>
                {t === 'general' ? 'General' : 'Projects'}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="scroll overflow-y-auto flex-1 px-6 py-5 space-y-5" style={{ minHeight: 0 }}>
        {activeTab === 'projects' && <ProjectsSettings />}
        {activeTab === 'general' && (<>

          {/* Loki */}
          <div>
            <p className="section-label mb-3">LOKI — LOG SOURCE</p>
            <div className="space-y-3">
              <Field label="Loki URL (chip1 / primary)" value={settings.lokiUrl} onChange={set('lokiUrl')}
                placeholder="https://loki.chip1.info" hint="Primary Loki — chip1-* services via service_name label" />
              <Field label="Loki URL 2 (altir / secondary)" value={settings.lokiUrl2} onChange={set('lokiUrl2')}
                placeholder="https://loki.altir.net" hint="Secondary Loki — fn-* services via app label" />
              <Field label="LogQL Query" value={settings.lokiQuery} onChange={set('lokiQuery')}
                placeholder='{service_name="my-service"}' mono
                hint='LogQL stream selector — must match your service labels in Loki' />
              <Field label="Lookback Hours" value={settings.lokiLookbackHours} onChange={set('lokiLookbackHours')}
                placeholder="2" hint="How far back to fetch logs (default: 2)" />
            </div>
          </div>

          <div style={{ height: 1, background: 'var(--border)' }} />

          {/* Service */}
          <div>
            <p className="section-label mb-3">SERVICE IDENTITY — AI CONTEXT</p>
            <div className="space-y-3">
              <Field label="Service Name" value={settings.serviceName} onChange={set('serviceName')}
                placeholder="my-service" />
              <Field label="Description" value={settings.serviceDescription} onChange={set('serviceDescription')}
                placeholder="Handles order processing and payment validation" />
              <Field label="Downstream Systems" value={settings.downstreamSystems} onChange={set('downstreamSystems')}
                placeholder="Stripe, OrderDB, Notification Service" />
              <Field label="Platform" value={settings.platformDescription} onChange={set('platformDescription')}
                placeholder="Java Spring microservices on Kubernetes" />
              <Field label="CI/CD Tool" value={settings.ciTool} onChange={set('ciTool')}
                placeholder="Jenkins" />
            </div>
          </div>

          <div style={{ height: 1, background: 'var(--border)' }} />

          {/* Teams */}
          <div>
            <p className="section-label mb-3">TEAMS CHANNELS</p>
            <Field label="Channel Names" value={settings.teamsChannels} onChange={set('teamsChannels')}
              placeholder="releases,incidents"
              hint="Comma-separated display names — order sets colour assignment in the UI" />
          </div>

          <div style={{ height: 1, background: 'var(--border)' }} />

          {/* AI model */}
          <div>
            <p className="section-label mb-3">AI MODEL</p>
            <Field label="OpenAI Model" value={settings.openaiModel} onChange={set('openaiModel')}
              placeholder="gpt-4o"
              hint="gpt-4o recommended. API key must be set in .env.local (not configurable here)." />
          </div>

        </>)}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderTop: '1px solid var(--border)' }}>
          <div>
            {error && <p style={{ color: 'var(--error)', fontSize: 11 }}>{error}</p>}
            {!error && <p style={{ color: 'var(--text-dim)', fontSize: 11 }}>
              Changes take effect immediately — reload live data after saving.
            </p>}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose}
              style={{
                background: 'var(--panel-hover)', color: 'var(--text-muted)',
                border: '1px solid var(--border)', borderRadius: 7,
                padding: '6px 16px', fontSize: 12, cursor: 'pointer', fontWeight: 500,
              }}>
              Cancel
            </button>
            <button onClick={save} disabled={saving}
              className="btn-glow"
              style={{
                background: saved ? 'var(--accent)' : 'var(--accent)',
                color: '#0d0f14', border: 'none', borderRadius: 7,
                padding: '6px 20px', fontSize: 12, cursor: saving ? 'not-allowed' : 'pointer',
                fontWeight: 700, opacity: saving ? 0.7 : 1,
                boxShadow: '0 0 16px rgba(0,194,168,0.3)',
              }}>
              {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
