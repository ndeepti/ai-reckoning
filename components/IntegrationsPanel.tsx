'use client'

import { useState, useEffect } from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface IntegrationSettings {
  // Teams
  teamsChannels: string
  teamsSource: 'webhook' | 'graph'
  graphTenantId: string
  graphClientId: string
  graphTeamIds: string
  // Loki
  lokiUrl: string
  lokiUrl2: string
  // Diff
  diffSource: 'manual' | 'github' | 'jenkins'
  githubRepoUrl: string
  githubBranch: string   // base branch (e.g. main)
  githubHead: string     // deployed branch to diff against base
  jenkinsUrl: string
  jenkinsJob: string
  jenkinsUser: string
  jenkinsUserId: string
}

const EMPTY: IntegrationSettings = {
  teamsChannels: '',
  teamsSource: 'webhook',
  graphTenantId: '',
  graphClientId: '',
  graphTeamIds: '',
  lokiUrl: '',
  lokiUrl2: '',
  diffSource: 'manual',
  githubRepoUrl: '',
  githubBranch: 'main',
  githubHead: '',
  jenkinsUrl: '',
  jenkinsJob: '',
  jenkinsUser: '',
  jenkinsUserId: '',
}

type Tab = 'TEAMS' | 'LOGS' | 'DIFF'

const CHANNEL_COLORS = ['var(--accent)', '#60a5fa', '#a78bfa', '#fb923c']

// ---------------------------------------------------------------------------
// Shared Field component (inline, same pattern as SettingsPanel)
// ---------------------------------------------------------------------------

const Field = ({
  label, hint, value, onChange, placeholder, mono = false,
}: {
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

const InfoRow = ({ text }: { text: string }) => (
  <p style={{
    color: 'var(--text-dim)', fontSize: 11, lineHeight: 1.5,
    padding: '6px 10px', background: 'var(--panel-hover)',
    border: '1px solid var(--border)', borderRadius: 6,
  }}>
    {text}
  </p>
)

// ---------------------------------------------------------------------------
// Tab content components
// ---------------------------------------------------------------------------

function ManualChatEntry({
  settings, setSettings,
}: {
  settings: IntegrationSettings
  setSettings: React.Dispatch<React.SetStateAction<IntegrationSettings>>
}) {
  const [chatId, setChatId] = useState('')

  const currentIds = settings.graphTeamIds.split(',').map(s => s.trim()).filter(Boolean)
  const chatIds = currentIds.filter(id => id.startsWith('19:'))

  function addChatId() {
    const id = chatId.trim()
    if (!id) return
    if (!id.startsWith('19:')) {
      alert('Group chat IDs start with 19: — copy from Teams → chat URL')
      return
    }
    if (currentIds.includes(id)) { setChatId(''); return }
    setSettings(prev => ({ ...prev, graphTeamIds: [...currentIds, id].join(', ') }))
    setChatId('')
  }

  if (chatIds.length === 0 && !chatId) {
    return (
      <div>
        <label style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--label)', display: 'block', marginBottom: 6 }}>
          Group Chat IDs (optional)
        </label>
        <div className="flex gap-2">
          <input
            value={chatId}
            onChange={e => setChatId(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addChatId()}
            placeholder="19:xxx@thread.v2"
            style={{
              flex: 1, background: 'var(--panel-hover)', color: 'var(--text)',
              border: '1px solid var(--border)', borderRadius: 6,
              padding: '6px 10px', fontSize: 11, outline: 'none', fontFamily: 'monospace',
            }}
            onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
            onBlur={e => (e.target.style.borderColor = 'var(--border)')}
          />
          <button onClick={addChatId} style={{
            background: 'var(--panel-hover)', color: 'var(--text-muted)',
            border: '1px solid var(--border)', borderRadius: 6,
            padding: '6px 12px', fontSize: 12, cursor: 'pointer', fontWeight: 600,
          }}>Add</button>
        </div>
        <p style={{ color: 'var(--text-dim)', fontSize: 10, marginTop: 3 }}>
          Find the ID in Teams: open the chat → click ⋯ → Get link → copy the thread ID portion
        </p>
      </div>
    )
  }

  return (
    <div>
      <label style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--label)', display: 'block', marginBottom: 6 }}>
        Group Chat IDs
      </label>
      <div className="space-y-1">
        {chatIds.map(id => (
          <div key={id} className="flex items-center gap-2" style={{
            background: 'var(--panel-hover)', border: '1px solid var(--border)',
            borderRadius: 6, padding: '5px 10px',
          }}>
            <span style={{ flex: 1, fontSize: 10, color: 'var(--text)', fontFamily: 'monospace' }}>{id.slice(0, 48)}…</span>
            <button onClick={() => {
              const next = currentIds.filter(i => i !== id)
              setSettings(prev => ({ ...prev, graphTeamIds: next.join(', ') }))
            }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', fontSize: 12 }}>✕</button>
          </div>
        ))}
        <div className="flex gap-2 pt-1">
          <input
            value={chatId}
            onChange={e => setChatId(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addChatId()}
            placeholder="19:xxx@thread.v2"
            style={{
              flex: 1, background: 'var(--panel-hover)', color: 'var(--text)',
              border: '1px solid var(--border)', borderRadius: 6,
              padding: '6px 10px', fontSize: 11, outline: 'none', fontFamily: 'monospace',
            }}
            onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
            onBlur={e => (e.target.style.borderColor = 'var(--border)')}
          />
          <button onClick={addChatId} style={{
            background: 'var(--panel-hover)', color: 'var(--text-muted)',
            border: '1px solid var(--border)', borderRadius: 6,
            padding: '6px 12px', fontSize: 12, cursor: 'pointer', fontWeight: 600,
          }}>Add</button>
        </div>
      </div>
    </div>
  )
}

interface DiscoveredChannel {
  graphId: string  // "teamId:channelId"
  name: string     // "Team / Channel"
  type: string
}

interface DiscoveredTeam {
  teamId: string
  teamName: string
  channels: DiscoveredChannel[]
}

function TeamsTab({
  settings, setSettings,
}: {
  settings: IntegrationSettings
  setSettings: React.Dispatch<React.SetStateAction<IntegrationSettings>>
}) {
  const [newChannel, setNewChannel] = useState('')
  const [discovering, setDiscovering] = useState(false)
  const [discovered, setDiscovered] = useState<DiscoveredTeam[]>([])
  const [discoverError, setDiscoverError] = useState('')
  const [showPicker, setShowPicker] = useState(false)

  const channels = settings.teamsChannels
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)

  // Currently selected Graph source IDs (for pre-checking in picker)
  const selectedGraphIds = new Set(
    settings.graphTeamIds.split(',').map(s => s.trim()).filter(Boolean)
  )

  function addChannel() {
    const ch = newChannel.trim()
    if (!ch) return
    const next = [...channels, ch]
    setSettings(prev => ({ ...prev, teamsChannels: next.join(', ') }))
    setNewChannel('')
  }

  function removeChannel(idx: number) {
    const next = channels.filter((_, i) => i !== idx)
    setSettings(prev => ({ ...prev, teamsChannels: next.join(', ') }))
  }

  async function discover() {
    setDiscovering(true)
    setDiscoverError('')
    try {
      const r = await fetch('/api/teams/graph-discover')
      const d = await r.json() as { teams?: DiscoveredTeam[]; error?: string }
      if (!r.ok || d.error) throw new Error(d.error ?? 'Discover failed')
      setDiscovered(d.teams ?? [])
      setShowPicker(true)
    } catch (e) {
      setDiscoverError((e as Error).message)
    } finally {
      setDiscovering(false)
    }
  }

  function toggleGraphId(graphId: string, displayName: string) {
    const current = settings.graphTeamIds.split(',').map(s => s.trim()).filter(Boolean)
    const currentNames = settings.teamsChannels.split(',').map(s => s.trim()).filter(Boolean)
    let nextIds: string[]
    let nextNames: string[]

    if (current.includes(graphId)) {
      nextIds = current.filter(id => id !== graphId)
      // try to remove associated display name too
      nextNames = currentNames.filter(n => n !== displayName.split(' / ')[1] && n !== displayName)
    } else {
      nextIds = [...current, graphId]
      // add channel display name
      const channelName = displayName.split(' / ')[1] ?? displayName
      if (!currentNames.includes(channelName)) nextNames = [...currentNames, channelName]
      else nextNames = currentNames
    }

    setSettings(prev => ({
      ...prev,
      graphTeamIds: nextIds.join(', '),
      teamsChannels: nextNames.join(', '),
    }))
  }

  return (
    <div className="space-y-5">
      {/* Source type */}
      <div>
        <p className="section-label mb-3">SOURCE TYPE</p>
        <div className="flex gap-2">
          {(['webhook', 'graph'] as const).map(src => (
            <button
              key={src}
              onClick={() => setSettings(prev => ({ ...prev, teamsSource: src }))}
              style={{
                padding: '6px 16px', fontSize: 12, fontWeight: 600, borderRadius: 7,
                cursor: 'pointer',
                background: settings.teamsSource === src ? 'var(--accent)' : 'var(--panel-hover)',
                color: settings.teamsSource === src ? '#0d0f14' : 'var(--text-muted)',
                border: settings.teamsSource === src ? '1px solid var(--accent)' : '1px solid var(--border)',
              }}
            >
              {src === 'webhook' ? 'Power Automate' : 'Graph API'}
            </button>
          ))}
        </div>
      </div>

      <div style={{ height: 1, background: 'var(--border)' }} />

      {/* Channels — display names (always shown) */}
      <div>
        <p className="section-label mb-3">CHANNELS</p>
        <div className="space-y-2">
          {channels.length === 0 && (
            <p style={{ color: 'var(--text-dim)', fontSize: 11 }}>No channels configured yet.</p>
          )}
          {channels.map((ch, idx) => (
            <div key={idx} className="flex items-center gap-2"
              style={{
                background: 'var(--panel-hover)', border: '1px solid var(--border)',
                borderRadius: 6, padding: '6px 10px',
              }}>
              <span style={{
                width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                background: CHANNEL_COLORS[idx % CHANNEL_COLORS.length],
                display: 'inline-block',
              }} />
              <span style={{ flex: 1, fontSize: 12, color: 'var(--text)' }}>{ch}</span>
              <button
                onClick={() => removeChannel(idx)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-dim)', fontSize: 13, lineHeight: 1, padding: '0 2px',
                }}
                title="Remove channel"
              >
                ✕
              </button>
            </div>
          ))}

          {/* Manual add — only for webhook mode */}
          {settings.teamsSource === 'webhook' && (
            <div className="flex gap-2 pt-1">
              <input
                value={newChannel}
                onChange={e => setNewChannel(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addChannel()}
                placeholder="channel-name"
                style={{
                  flex: 1, background: 'var(--panel-hover)', color: 'var(--text)',
                  border: '1px solid var(--border)', borderRadius: 6,
                  padding: '6px 10px', fontSize: 12, outline: 'none',
                }}
                onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                onBlur={e => (e.target.style.borderColor = 'var(--border)')}
              />
              <button
                onClick={addChannel}
                style={{
                  background: 'var(--panel-hover)', color: 'var(--text-muted)',
                  border: '1px solid var(--border)', borderRadius: 6,
                  padding: '6px 14px', fontSize: 12, cursor: 'pointer', fontWeight: 600,
                }}
              >
                Add
              </button>
            </div>
          )}
        </div>
      </div>

      <div style={{ height: 1, background: 'var(--border)' }} />

      {/* Conditional sections */}
      {settings.teamsSource === 'webhook' && (
        <div>
          <p className="section-label mb-3">POWER AUTOMATE</p>
          <div className="space-y-2">
            <InfoRow text="Webhook endpoint: POST /api/teams/webhook" />
            <InfoRow text="Secret: configured in .env.local (TEAMS_WEBHOOK_SECRET)" />
            <InfoRow text="Ensure your PA flow posts to a publicly reachable URL (e.g. via ngrok or your deployed hostname)" />
          </div>
        </div>
      )}

      {settings.teamsSource === 'graph' && (
        <div>
          <p className="section-label mb-3">GRAPH API</p>
          <div className="space-y-3">
            <Field label="Tenant ID" value={settings.graphTenantId}
              onChange={v => setSettings(prev => ({ ...prev, graphTenantId: v }))}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
            <Field label="Client ID" value={settings.graphClientId}
              onChange={v => setSettings(prev => ({ ...prev, graphClientId: v }))}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />

            {/* Channel picker */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--label)' }}>
                  Team Channels to Poll
                </label>
                <button
                  onClick={discover}
                  disabled={discovering || !settings.graphTenantId || !settings.graphClientId}
                  style={{
                    fontSize: 11, fontWeight: 600, padding: '4px 12px', borderRadius: 5,
                    cursor: discovering || !settings.graphTenantId || !settings.graphClientId ? 'not-allowed' : 'pointer',
                    background: 'var(--accent-bg)', color: 'var(--accent)',
                    border: '1px solid var(--accent-border)',
                    opacity: !settings.graphTenantId || !settings.graphClientId ? 0.4 : 1,
                  }}
                >
                  {discovering ? 'Discovering…' : '⟳ Discover'}
                </button>
              </div>

              {discoverError && (
                <div style={{
                  background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,80,80,0.25)',
                  borderRadius: 6, padding: '8px 10px', marginBottom: 6,
                }}>
                  <p style={{ color: 'var(--error)', fontSize: 11, marginBottom: 4 }}>{discoverError}</p>
                  {discoverError.includes('Team.ReadBasic') || discoverError.includes('Forbidden') ? (
                    <p style={{ color: 'var(--text-dim)', fontSize: 10 }}>
                      Add permissions in Azure Portal → App registrations → API permissions:{' '}
                      <strong style={{ color: 'var(--text)' }}>Team.ReadBasic.All</strong> and{' '}
                      <strong style={{ color: 'var(--text)' }}>Channel.ReadBasic.All</strong> (Application type), then grant admin consent.
                    </p>
                  ) : null}
                </div>
              )}

              {/* Selected channels summary */}
              {selectedGraphIds.size > 0 && !showPicker && (
                <div style={{
                  background: 'var(--panel-hover)', border: '1px solid var(--border)',
                  borderRadius: 6, padding: '8px 10px',
                }}>
                  <p style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 4 }}>
                    {selectedGraphIds.size} channel{selectedGraphIds.size !== 1 ? 's' : ''} selected
                  </p>
                  {Array.from(selectedGraphIds).map(id => (
                    <div key={id} className="flex items-center gap-2" style={{ marginBottom: 3 }}>
                      <span style={{ fontSize: 11, color: 'var(--text)', fontFamily: 'monospace' }}>{id.slice(0, 48)}</span>
                      <button
                        onClick={() => {
                          const next = Array.from(selectedGraphIds).filter(i => i !== id)
                          setSettings(prev => ({ ...prev, graphTeamIds: next.join(', ') }))
                        }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', fontSize: 12 }}
                      >✕</button>
                    </div>
                  ))}
                </div>
              )}

              {/* Discover picker overlay */}
              {showPicker && discovered.length > 0 && (
                <div style={{
                  background: 'var(--panel)', border: '1px solid var(--accent-border)',
                  borderRadius: 8, overflow: 'hidden', maxHeight: 280,
                }}>
                  <div style={{
                    padding: '8px 12px', borderBottom: '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}>
                    <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>Select channels to poll</span>
                    <button
                      onClick={() => setShowPicker(false)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', fontSize: 14 }}
                    >✕</button>
                  </div>
                  <div style={{ overflowY: 'auto', maxHeight: 230 }} className="scroll">
                    {discovered.map(team => (
                      <div key={team.teamId}>
                        <div style={{
                          padding: '6px 12px', fontSize: 10, fontWeight: 700,
                          letterSpacing: '0.08em', textTransform: 'uppercase',
                          color: 'var(--text-dim)', background: 'var(--panel-hover)',
                          borderBottom: '1px solid var(--border)',
                        }}>
                          {team.teamName}
                        </div>
                        {team.channels.map(ch => {
                          const selected = selectedGraphIds.has(ch.graphId)
                          return (
                            <button
                              key={ch.graphId}
                              onClick={() => toggleGraphId(ch.graphId, ch.name)}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 10,
                                width: '100%', padding: '7px 16px', textAlign: 'left',
                                background: selected ? 'var(--accent-bg)' : 'transparent',
                                border: 'none', borderBottom: '1px solid var(--border)',
                                cursor: 'pointer',
                              }}
                            >
                              <span style={{
                                width: 14, height: 14, borderRadius: 3, flexShrink: 0,
                                background: selected ? 'var(--accent)' : 'var(--panel-hover)',
                                border: `1px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 9, color: '#0d0f14',
                              }}>
                                {selected ? '✓' : ''}
                              </span>
                              <div>
                                <p style={{ fontSize: 12, color: 'var(--text)' }}>
                                  {ch.name.split(' / ')[1] ?? ch.name}
                                </p>
                                <p style={{ fontSize: 9, color: 'var(--text-dim)', fontFamily: 'monospace' }}>
                                  {ch.graphId.slice(0, 40)}…
                                </p>
                              </div>
                              {ch.type !== 'standard' && (
                                <span style={{
                                  marginLeft: 'auto', fontSize: 9, color: 'var(--text-dim)',
                                  border: '1px solid var(--border)', borderRadius: 3, padding: '1px 5px',
                                }}>
                                  {ch.type}
                                </span>
                              )}
                            </button>
                          )
                        })}
                        {team.channels.length === 0 && (
                          <p style={{ padding: '6px 16px', fontSize: 11, color: 'var(--text-dim)' }}>
                            No channels found
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                  <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border)' }}>
                    <button
                      onClick={() => setShowPicker(false)}
                      style={{
                        width: '100%', padding: '6px', fontSize: 12, fontWeight: 600,
                        background: 'var(--accent)', color: '#0d0f14',
                        border: 'none', borderRadius: 6, cursor: 'pointer',
                      }}
                    >
                      Done ({selectedGraphIds.size} selected)
                    </button>
                  </div>
                </div>
              )}

              {showPicker && discovered.length === 0 && (
                <p style={{ color: 'var(--text-dim)', fontSize: 11 }}>
                  No teams found. Make sure Team.ReadBasic.All and Channel.ReadBasic.All permissions are granted.
                </p>
              )}
            </div>

            {/* Manual chat ID entry for group chats */}
            <ManualChatEntry settings={settings} setSettings={setSettings} />

            <InfoRow text="Client secret must be set in .env.local (GRAPH_CLIENT_SECRET) — never stored in config.json" />
          </div>
        </div>
      )}
    </div>
  )
}

function LogsTab({
  settings, setSettings,
}: {
  settings: IntegrationSettings
  setSettings: React.Dispatch<React.SetStateAction<IntegrationSettings>>
}) {
  return (
    <div className="space-y-5">
      <div>
        <p className="section-label mb-3">LOKI INSTANCES</p>
        <div className="space-y-4">

          {/* Instance 1 — chip1 */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--label)' }}>
                chip1 / primary
              </label>
              <span style={{
                fontSize: 9, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase',
                color: 'var(--accent)', background: 'var(--accent-bg)',
                border: '1px solid var(--accent-border)', borderRadius: 4, padding: '1px 6px',
              }}>
                label: service_name
              </span>
            </div>
            <input
              value={settings.lokiUrl}
              onChange={e => setSettings(prev => ({ ...prev, lokiUrl: e.target.value }))}
              placeholder="https://loki.chip1.info"
              style={{
                background: 'var(--panel-hover)', color: 'var(--text)',
                border: '1px solid var(--border)', borderRadius: 6,
                padding: '6px 10px', fontSize: 12, outline: 'none', width: '100%',
              }}
              onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border)')}
            />
            <p style={{ color: 'var(--text-dim)', fontSize: 10, marginTop: 3 }}>
              chip1-* services · label key: service_name
            </p>
          </div>

          {/* Instance 2 — altir */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--label)' }}>
                altir / secondary
              </label>
              <span style={{
                fontSize: 9, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase',
                color: '#60a5fa', background: 'rgba(96,165,250,0.1)',
                border: '1px solid rgba(96,165,250,0.25)', borderRadius: 4, padding: '1px 6px',
              }}>
                label: app/service_name
              </span>
            </div>
            <input
              value={settings.lokiUrl2}
              onChange={e => setSettings(prev => ({ ...prev, lokiUrl2: e.target.value }))}
              placeholder="https://loki.altir.net"
              style={{
                background: 'var(--panel-hover)', color: 'var(--text)',
                border: '1px solid var(--border)', borderRadius: 6,
                padding: '6px 10px', fontSize: 12, outline: 'none', width: '100%',
              }}
              onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border)')}
            />
            <p style={{ color: 'var(--text-dim)', fontSize: 10, marginTop: 3 }}>
              fn-* services · label key: app/service_name
            </p>
          </div>

          <p style={{ color: 'var(--text-dim)', fontSize: 11, fontStyle: 'italic' }}>
            Add more instances — coming soon
          </p>
        </div>
      </div>

      <div style={{ height: 1, background: 'var(--border)' }} />

      <InfoRow text="Loki auth token / credentials must be set in .env.local (LOKI_TOKEN, LOKI_USERNAME, LOKI_PASSWORD) — never stored in config.json" />
    </div>
  )
}

function JenkinsJobPicker({
  settings, setSettings,
}: {
  settings: IntegrationSettings
  setSettings: React.Dispatch<React.SetStateAction<IntegrationSettings>>
}) {
  const [browsing, setBrowsing] = useState(false)
  const [jobs, setJobs] = useState<string[]>([])
  const [browseError, setBrowseError] = useState('')

  async function browse() {
    setBrowsing(true)
    setBrowseError('')
    try {
      const r = await fetch('/api/diff/jenkins/jobs')
      const d = await r.json() as { jobs?: string[]; error?: string }
      if (!r.ok || d.error) throw new Error(d.error ?? 'Browse failed')
      setJobs(d.jobs ?? [])
    } catch (e) {
      setBrowseError((e as Error).message)
    } finally {
      setBrowsing(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--label)' }}>
          Job Name / Path
        </label>
        <button
          onClick={browse}
          disabled={browsing || !settings.jenkinsUrl}
          style={{
            fontSize: 11, fontWeight: 600, padding: '4px 12px', borderRadius: 5,
            cursor: browsing || !settings.jenkinsUrl ? 'not-allowed' : 'pointer',
            background: 'var(--accent-bg)', color: 'var(--accent)',
            border: '1px solid var(--accent-border)',
            opacity: !settings.jenkinsUrl ? 0.4 : 1,
          }}
        >
          {browsing ? 'Loading…' : '⟳ Browse Jobs'}
        </button>
      </div>

      {/* Current value */}
      <input
        value={settings.jenkinsJob}
        onChange={e => setSettings(prev => ({ ...prev, jenkinsJob: e.target.value }))}
        placeholder="fn-connect/deploy"
        style={{
          width: '100%', background: 'var(--panel-hover)', color: 'var(--text)',
          border: '1px solid var(--border)', borderRadius: 6,
          padding: '6px 10px', fontSize: 12, outline: 'none',
        }}
        onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
        onBlur={e => (e.target.style.borderColor = 'var(--border)')}
      />
      <p style={{ color: 'var(--text-dim)', fontSize: 10, marginTop: 3 }}>
        Use folder/job format for nested jobs — or click Browse to select
      </p>

      {browseError && (
        <p style={{ color: 'var(--error)', fontSize: 11, marginTop: 6 }}>{browseError}</p>
      )}

      {jobs.length > 0 && (
        <div style={{
          marginTop: 8, background: 'var(--panel)', border: '1px solid var(--accent-border)',
          borderRadius: 8, overflow: 'hidden', maxHeight: 220,
        }}>
          <div style={{ padding: '6px 12px', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>Click a job to select</span>
          </div>
          <div style={{ overflowY: 'auto', maxHeight: 170 }} className="scroll">
            {jobs.map(job => (
              <button
                key={job}
                onClick={() => { setSettings(prev => ({ ...prev, jenkinsJob: job })); setJobs([]) }}
                style={{
                  display: 'block', width: '100%', padding: '7px 14px',
                  textAlign: 'left', fontSize: 12,
                  background: settings.jenkinsJob === job ? 'var(--accent-bg)' : 'transparent',
                  color: settings.jenkinsJob === job ? 'var(--accent)' : 'var(--text)',
                  border: 'none', borderBottom: '1px solid var(--border)', cursor: 'pointer',
                  fontFamily: 'monospace',
                }}
              >
                {job}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function DiffTab({
  settings, setSettings,
}: {
  settings: IntegrationSettings
  setSettings: React.Dispatch<React.SetStateAction<IntegrationSettings>>
}) {
  return (
    <div className="space-y-5">
      {/* Source type */}
      <div>
        <p className="section-label mb-3">SOURCE TYPE</p>
        <div className="flex gap-2 flex-wrap">
          {(['manual', 'github', 'jenkins'] as const).map(src => (
            <button
              key={src}
              onClick={() => setSettings(prev => ({ ...prev, diffSource: src }))}
              style={{
                padding: '6px 16px', fontSize: 12, fontWeight: 600, borderRadius: 7,
                cursor: 'pointer',
                background: settings.diffSource === src ? 'var(--accent)' : 'var(--panel-hover)',
                color: settings.diffSource === src ? '#0d0f14' : 'var(--text-muted)',
                border: settings.diffSource === src ? '1px solid var(--accent)' : '1px solid var(--border)',
              }}
            >
              {src === 'manual' ? 'Manual (paste in Diff tab)' : src === 'github' ? 'GitHub / GitLab' : 'Jenkins'}
            </button>
          ))}
        </div>
      </div>

      {settings.diffSource !== 'manual' && <div style={{ height: 1, background: 'var(--border)' }} />}

      {/* GitHub / GitLab */}
      {settings.diffSource === 'github' && (
        <div>
          <p className="section-label mb-3">GITHUB / GITLAB</p>
          <div className="space-y-3">
            <Field label="Repository URL" value={settings.githubRepoUrl}
              onChange={v => setSettings(prev => ({ ...prev, githubRepoUrl: v }))}
              placeholder="https://github.com/org/repo"
              hint="Full URL to the repository" />
            <Field label="Base Branch" value={settings.githubBranch}
              onChange={v => setSettings(prev => ({ ...prev, githubBranch: v }))}
              placeholder="main"
              hint="The stable branch (base of comparison)" />
            <Field label="Deployed Branch / SHA" value={settings.githubHead}
              onChange={v => setSettings(prev => ({ ...prev, githubHead: v }))}
              placeholder="feature/STOCK-CODE-010-fix"
              hint="Branch or commit SHA that was deployed — diff shown against base branch" />
            <InfoRow text="API token: set GITHUB_TOKEN in .env.local — never stored in config.json" />
          </div>
        </div>
      )}

      {/* Jenkins */}
      {settings.diffSource === 'jenkins' && (
        <div>
          <p className="section-label mb-3">JENKINS</p>
          <div className="space-y-3">
            <Field label="Jenkins URL" value={settings.jenkinsUrl}
              onChange={v => setSettings(prev => ({ ...prev, jenkinsUrl: v }))}
              placeholder="https://jenkins.chip1.info" />
            <Field label="Jenkins User ID" value={settings.jenkinsUserId}
              onChange={v => setSettings(prev => ({ ...prev, jenkinsUserId: v }))}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              hint="Internal Jenkins UUID — found in your Jenkins profile URL" />
            <Field label="Username (AD email fallback)" value={settings.jenkinsUser}
              onChange={v => setSettings(prev => ({ ...prev, jenkinsUser: v }))}
              placeholder="yourname@altir.co"
              hint="Used if Jenkins User ID is not set" />
            <JenkinsJobPicker settings={settings} setSettings={setSettings} />
            <div style={{
              background: 'var(--panel-hover)', border: '1px solid var(--border)',
              borderRadius: 6, padding: '10px 12px',
            }}>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--label)', marginBottom: 6 }}>
                Microsoft AD Credentials — set in .env.local
              </p>
              <div className="space-y-1">
                <p style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                  <code style={{ color: 'var(--text)', fontFamily: 'monospace' }}>JENKINS_USER</code>
                  {' '}— your AD username or email (e.g. <code style={{ fontFamily: 'monospace' }}>jsmith@altir.co</code>)
                </p>
                <p style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                  <code style={{ color: 'var(--text)', fontFamily: 'monospace' }}>JENKINS_TOKEN</code>
                  {' '}— Jenkins API token{' '}
                  <span style={{ color: 'var(--accent)', fontSize: 10 }}>(recommended)</span>
                  {' '}— generate at Jenkins → your profile → Configure → Add new Token
                </p>
                <p style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                  <code style={{ color: 'var(--text)', fontFamily: 'monospace' }}>JENKINS_PASSWORD</code>
                  {' '}— AD password fallback if API token is not available
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {settings.diffSource === 'manual' && (
        <InfoRow text="Paste your diff directly in the Diff tab of the Input Data panel. No external integration needed." />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function IntegrationsPanel({
  onClose,
  onSaved,
}: {
  onClose: () => void
  onSaved: () => void
}) {
  const [activeTab, setActiveTab] = useState<Tab>('TEAMS')
  const [settings, setSettings] = useState<IntegrationSettings>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/config')
      .then(r => r.json())
      .then((cfg: { settings?: Partial<IntegrationSettings> }) => {
        if (cfg.settings) setSettings(prev => ({ ...prev, ...cfg.settings }))
      })
      .catch(() => {})
  }, [])

  async function save() {
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamsChannels:  settings.teamsChannels,
          teamsSource:    settings.teamsSource,
          graphTenantId:  settings.graphTenantId,
          graphClientId:  settings.graphClientId,
          graphTeamIds:   settings.graphTeamIds,
          lokiUrl:        settings.lokiUrl,
          lokiUrl2:       settings.lokiUrl2,
          diffSource:     settings.diffSource,
          githubRepoUrl:  settings.githubRepoUrl,
          githubBranch:   settings.githubBranch,
          githubHead:     settings.githubHead,
          jenkinsUrl:     settings.jenkinsUrl,
          jenkinsJob:     settings.jenkinsJob,
          jenkinsUser:    settings.jenkinsUser,
          jenkinsUserId:  settings.jenkinsUserId,
        }),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({ error: 'Save failed' }))
        throw new Error((e as { error?: string }).error ?? 'Save failed')
      }
      setSaved(true)
      setTimeout(() => { setSaved(false); onSaved() }, 1200)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const TABS: Tab[] = ['TEAMS', 'LOGS', 'DIFF']

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="flex flex-col"
        style={{
          background: 'var(--panel)', border: '1px solid var(--border)',
          borderRadius: 12, width: 580, maxHeight: '88vh',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div>
            <h2 style={{ color: 'var(--white)', fontSize: 14, fontWeight: 600 }}>Integrations</h2>
            <p style={{ color: 'var(--text-dim)', fontSize: 11, marginTop: 2 }}>
              Saved to <code style={{ fontFamily: 'monospace' }}>config.json</code> · secrets stay in <code style={{ fontFamily: 'monospace' }}>.env.local</code>
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ color: 'var(--text-dim)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}
          >
            ✕
          </button>
        </div>

        {/* Tab bar */}
        <div
          className="flex flex-shrink-0 px-6"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '10px 16px', fontSize: 11, fontWeight: 700,
                letterSpacing: '0.08em',
                color: activeTab === tab ? 'var(--accent)' : 'var(--text-dim)',
                borderBottom: activeTab === tab ? '2px solid var(--accent)' : '2px solid transparent',
                marginBottom: -1,
                transition: 'color 0.15s',
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Body */}
        <div
          className="scroll overflow-y-auto flex-1 px-6 py-5"
          style={{ minHeight: 0 }}
        >
          {activeTab === 'TEAMS' && (
            <TeamsTab settings={settings} setSettings={setSettings} />
          )}
          {activeTab === 'LOGS' && (
            <LogsTab settings={settings} setSettings={setSettings} />
          )}
          {activeTab === 'DIFF' && (
            <DiffTab settings={settings} setSettings={setSettings} />
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <div>
            {error && <p style={{ color: 'var(--error)', fontSize: 11 }}>{error}</p>}
            {!error && (
              <p style={{ color: 'var(--text-dim)', fontSize: 11 }}>
                Changes take effect immediately — reload live data after saving.
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              style={{
                background: 'var(--panel-hover)', color: 'var(--text-muted)',
                border: '1px solid var(--border)', borderRadius: 7,
                padding: '6px 16px', fontSize: 12, cursor: 'pointer', fontWeight: 500,
              }}
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="btn-glow"
              style={{
                background: 'var(--accent)',
                color: '#0d0f14', border: 'none', borderRadius: 7,
                padding: '6px 20px', fontSize: 12,
                cursor: saving ? 'not-allowed' : 'pointer',
                fontWeight: 700, opacity: saving ? 0.7 : 1,
                boxShadow: '0 0 16px rgba(0,194,168,0.3)',
              }}
            >
              {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
