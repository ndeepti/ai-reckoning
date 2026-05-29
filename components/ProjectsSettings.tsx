'use client'

import { useState, useEffect, KeyboardEvent } from 'react'
import type { ProjectConfig } from '@/lib/types'

function ChipInput({ values, onChange, placeholder }: {
  values: string[]
  onChange: (v: string[]) => void
  placeholder?: string
}) {
  const [input, setInput] = useState('')

  function add() {
    const v = input.trim()
    if (v && !values.includes(v)) onChange([...values, v])
    setInput('')
  }

  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', gap: 5, alignItems: 'center',
      padding: '5px 8px', background: 'var(--panel-hover)',
      border: '1px solid var(--border)', borderRadius: 6, minHeight: 34,
    }}>
      {values.map(v => (
        <span key={v} style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '2px 7px', borderRadius: 4,
          background: 'var(--accent-bg)', color: 'var(--accent)',
          border: '1px solid var(--accent-border)', fontSize: 11,
        }}>
          {v}
          <button onClick={() => onChange(values.filter(x => x !== v))}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', padding: 0, fontSize: 13, lineHeight: 1 }}>
            ×
          </button>
        </span>
      ))}
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
        placeholder={values.length === 0 ? (placeholder ?? 'Type and press Enter…') : ''}
        style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--text)', fontSize: 11, flex: 1, minWidth: 100 }}
      />
    </div>
  )
}

const fieldLabel: React.CSSProperties = {
  fontSize: 10, fontWeight: 600, letterSpacing: '0.08em',
  textTransform: 'uppercase', color: 'var(--label)', marginBottom: 5, display: 'block',
}

function Field({ label, value, onChange, placeholder, mono }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; mono?: boolean
}) {
  return (
    <div>
      <label style={fieldLabel}>{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className={mono ? 'mono' : ''}
        style={{ background: 'var(--panel-hover)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 9px', fontSize: 11, outline: 'none', width: '100%' }}
        onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
        onBlur={e => (e.target.style.borderColor = 'var(--border)')} />
    </div>
  )
}

const EMPTY_PROJECT: Omit<ProjectConfig, 'id' | 'name'> = {
  services: [], channels: [], branchFilter: [],
  lokiQuery: '', lokiUrl: '', jenkinsJob: '',
  githubRepo: '', githubBase: 'main',
}

function ProjectForm({ initial, onSave, onCancel, isNew }: {
  initial: ProjectConfig
  onSave: (p: ProjectConfig) => Promise<void>
  onCancel: () => void
  isNew?: boolean
}) {
  const [form, setForm] = useState<ProjectConfig>(initial)
  const [saving, setSaving] = useState(false)

  function set<K extends keyof ProjectConfig>(key: K, val: ProjectConfig[K]) {
    setForm(prev => ({ ...prev, [key]: val }))
  }

  async function submit() {
    if (!form.id.trim() || !form.name.trim()) return
    setSaving(true)
    await onSave(form)
    setSaving(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <Field label="ID" value={form.id} onChange={v => set('id', v)} placeholder="fn" mono />
        </div>
        <div style={{ flex: 2 }}>
          <Field label="Display Name" value={form.name} onChange={v => set('name', v)} placeholder="fn (altir)" />
        </div>
      </div>

      <div>
        <label style={fieldLabel}>Services (dropdown options)</label>
        <ChipInput values={form.services} onChange={v => set('services', v)} placeholder="fn-connect · press Enter" />
      </div>

      <div>
        <label style={fieldLabel}>Teams Channels</label>
        <ChipInput values={form.channels} onChange={v => set('channels', v)} placeholder="prod-health-alerts · press Enter" />
      </div>

      <div>
        <label style={fieldLabel}>GitHub Branch Filter (keywords)</label>
        <ChipInput values={form.branchFilter} onChange={v => set('branchFilter', v)} placeholder="chip1, release · press Enter" />
        <p style={{ color: 'var(--text-dim)', fontSize: 10, marginTop: 4 }}>Branches shown in picker must contain at least one keyword</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field label="Loki URL" value={form.lokiUrl ?? ''} onChange={v => set('lokiUrl', v)} placeholder="https://loki.altir.net" mono />
        <Field label="Loki Query" value={form.lokiQuery} onChange={v => set('lokiQuery', v)} placeholder='{service_name="fn-connect"}' mono />
        <Field label="Jenkins Job" value={form.jenkinsJob} onChange={v => set('jenkinsJob', v)} placeholder="fn-connect-pipeline" />
        <Field label="GitHub Repo" value={form.githubRepo} onChange={v => set('githubRepo', v)} placeholder="https://github.com/org/repo" />
        <Field label="GitHub Base Branch" value={form.githubBase} onChange={v => set('githubBase', v)} placeholder="main" />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4 }}>
        <button onClick={onCancel}
          style={{ padding: '5px 14px', borderRadius: 6, fontSize: 11, cursor: 'pointer', background: 'var(--panel-hover)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
          Cancel
        </button>
        <button onClick={submit} disabled={saving || !form.id.trim() || !form.name.trim()}
          style={{ padding: '5px 14px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', background: 'var(--accent)', color: '#0d0f14', border: 'none', opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Saving…' : isNew ? 'Create Project' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}

export default function ProjectsSettings() {
  const [projects, setProjects] = useState<ProjectConfig[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/projects')
      .then(r => r.json())
      .then((data: ProjectConfig[]) => { setProjects(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  async function saveProject(project: ProjectConfig) {
    const existing = projects.find(p => p.id === project.id)
    const method = existing ? 'PUT' : 'POST'
    const url = existing ? `/api/projects/${project.id}` : '/api/projects'
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(project) })
    if (!res.ok) throw new Error('Save failed')
    const data = await res.json() as { project: ProjectConfig }
    setProjects(prev => {
      const idx = prev.findIndex(p => p.id === project.id)
      if (idx >= 0) { const next = [...prev]; next[idx] = data.project; return next }
      return [...prev, data.project]
    })
    setEditingId(null)
    setCreating(false)
  }

  async function deleteProject(id: string) {
    await fetch(`/api/projects/${id}`, { method: 'DELETE' })
    setProjects(prev => prev.filter(p => p.id !== id))
  }

  if (loading) return <div style={{ padding: 24, color: 'var(--text-dim)', fontSize: 12 }}>Loading projects…</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: 11 }}>
          {projects.length} project{projects.length !== 1 ? 's' : ''} · services, channels, branch filters per project
        </p>
        {!creating && (
          <button onClick={() => setCreating(true)}
            style={{ padding: '5px 14px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', background: 'var(--accent)', color: '#0d0f14', border: 'none' }}>
            + New Project
          </button>
        )}
      </div>

      {/* Create form */}
      {creating && (
        <div style={{ border: '1px solid var(--accent-border)', borderRadius: 8, padding: '16px', background: 'rgba(0,194,168,0.04)' }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', marginBottom: 12 }}>New Project</p>
          <ProjectForm
            initial={{ id: '', name: '', ...EMPTY_PROJECT }}
            onSave={saveProject}
            onCancel={() => setCreating(false)}
            isNew
          />
        </div>
      )}

      {/* Existing projects */}
      {projects.map(project => (
        <div key={project.id} style={{ border: `1px solid ${editingId === project.id ? 'var(--accent-border)' : 'var(--border)'}`, borderRadius: 8, padding: '14px 16px', background: 'var(--card)' }}>
          {editingId === project.id ? (
            <>
              <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', marginBottom: 12 }}>Editing: {project.name}</p>
              <ProjectForm
                initial={project}
                onSave={saveProject}
                onCancel={() => setEditingId(null)}
              />
            </>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                <div>
                  <span style={{ color: 'var(--white)', fontSize: 13, fontWeight: 600 }}>{project.name}</span>
                  <span style={{ color: 'var(--text-dim)', fontSize: 10, marginLeft: 8, fontFamily: 'monospace' }}>{project.id}</span>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => setEditingId(project.id)}
                    style={{ padding: '3px 10px', borderRadius: 5, fontSize: 10, cursor: 'pointer', background: 'var(--panel-hover)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                    Edit
                  </button>
                  <button onClick={() => deleteProject(project.id)}
                    style={{ padding: '3px 10px', borderRadius: 5, fontSize: 10, cursor: 'pointer', background: 'var(--error-bg)', color: 'var(--error)', border: '1px solid var(--error-border)' }}>
                    Delete
                  </button>
                </div>
              </div>

              {/* Summary row */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {project.services.length > 0 && (
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <span style={{ fontSize: 9, color: 'var(--label)', fontWeight: 600, letterSpacing: '0.08em' }}>SERVICES</span>
                    {project.services.map(s => (
                      <span key={s} style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, background: 'var(--panel-hover)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>{s}</span>
                    ))}
                  </div>
                )}
                {project.channels.length > 0 && (
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <span style={{ fontSize: 9, color: 'var(--label)', fontWeight: 600, letterSpacing: '0.08em' }}>CHANNELS</span>
                    {project.channels.map(c => (
                      <span key={c} style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, background: 'var(--accent-bg)', color: 'var(--accent)', border: '1px solid var(--accent-border)' }}>{c}</span>
                    ))}
                  </div>
                )}
                {project.branchFilter.length > 0 && (
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <span style={{ fontSize: 9, color: 'var(--label)', fontWeight: 600, letterSpacing: '0.08em' }}>BRANCH FILTER</span>
                    {project.branchFilter.map(f => (
                      <span key={f} style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, background: 'rgba(167,139,250,0.1)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.25)' }}>{f}</span>
                    ))}
                  </div>
                )}
              </div>

              {(project.lokiQuery || project.jenkinsJob || project.githubRepo) && (
                <div style={{ marginTop: 8, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {project.lokiQuery && <span style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'monospace' }}>{project.lokiQuery}</span>}
                  {project.jenkinsJob && <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>⚙ {project.jenkinsJob}</span>}
                  {project.githubRepo && <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>⑂ {project.githubRepo.replace('https://github.com/', '')}</span>}
                </div>
              )}
            </>
          )}
        </div>
      ))}

      {projects.length === 0 && !creating && (
        <div style={{ textAlign: 'center', padding: '32px 0', opacity: 0.5 }}>
          <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>No projects yet</p>
          <p style={{ color: 'var(--text-dim)', fontSize: 11, marginTop: 4 }}>Create a project to configure services, channels, and branch filters</p>
        </div>
      )}
    </div>
  )
}
