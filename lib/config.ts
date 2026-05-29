import fs from 'fs'
import path from 'path'
import type { ProjectConfig } from './types'

const CONFIG_FILE = path.join(process.cwd(), 'config.json')

// Persisted overrides written by POST /api/config (non-secret values only)
export function loadFileConfig(): Record<string, string> {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'))
  } catch {
    return {}
  }
}

function get(envKey: string, fileKey: string, fallback = ''): string {
  // env vars always win (allows deployment-time overrides)
  if (process.env[envKey]) return process.env[envKey]!
  const file = loadFileConfig()
  return file[fileKey] ?? fallback
}

export const config = {
  loki: {
    url:           get('LOKI_URL',           'lokiUrl'),
    url2:          get('LOKI_URL_2',         'lokiUrl2'),
    token:         process.env.LOKI_TOKEN    ?? '',   // secret — env only
    username:      process.env.LOKI_USERNAME ?? '',   // secret — env only
    password:      process.env.LOKI_PASSWORD ?? '',   // secret — env only
    query:         get('LOKI_QUERY',         'lokiQuery'),
    lookbackHours: Number(get('LOKI_LOOKBACK_HOURS', 'lokiLookbackHours', '2')),
    limit:         Number(get('LOKI_LIMIT',  'lokiLimit', '500')),
  },
  teams: {
    channels:      get('TEAMS_CHANNELS', 'teamsChannels')
                    .split(',').map(s => s.trim()).filter(Boolean),
    webhookSecret: process.env.TEAMS_WEBHOOK_SECRET ?? '',  // secret — env only
  },
  service: {
    name:        get('SERVICE_NAME',        'serviceName'),
    description: get('SERVICE_DESCRIPTION', 'serviceDescription'),
    downstream:  get('DOWNSTREAM_SYSTEMS',  'downstreamSystems'),
    platform:    get('PLATFORM_DESCRIPTION','platformDescription'),
    ciTool:      get('CI_TOOL',             'ciTool'),
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY ?? '',  // secret — env only
    model:  get('OPENAI_MODEL', 'openaiModel', 'gpt-4o'),
  },
  jenkins: {
    url:  get('JENKINS_URL',  'jenkinsUrl'),
    user: get('JENKINS_USER', 'jenkinsUser'),
    job:  get('CI_JOB',       'jenkinsJob'),
    // token + password: secret — env only (JENKINS_TOKEN, JENKINS_PASSWORD)
  },
}

export function lokiConfigured(): boolean {
  return !!(process.env.LOKI_URL || loadFileConfig().lokiUrl)
}

// Writes non-secret values to config.json (called by POST /api/config)
export function saveFileConfig(updates: Record<string, string>): void {
  const existing = loadFileConfig()
  const merged = { ...existing, ...updates }
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(merged, null, 2))
}

function readRaw(): Record<string, unknown> {
  try { return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')) } catch { return {} }
}

export function loadProjects(): ProjectConfig[] {
  const raw = readRaw()
  return Array.isArray(raw.projects) ? (raw.projects as ProjectConfig[]) : []
}

export function saveProject(project: ProjectConfig): void {
  const raw = readRaw()
  const projects = Array.isArray(raw.projects) ? [...(raw.projects as ProjectConfig[])] : []
  const idx = projects.findIndex(p => p.id === project.id)
  if (idx >= 0) projects[idx] = project
  else projects.push(project)
  fs.writeFileSync(CONFIG_FILE, JSON.stringify({ ...raw, projects }, null, 2))
}

export function deleteProject(id: string): void {
  const raw = readRaw()
  const projects = Array.isArray(raw.projects) ? (raw.projects as ProjectConfig[]) : []
  fs.writeFileSync(CONFIG_FILE, JSON.stringify({ ...raw, projects: projects.filter(p => p.id !== id) }, null, 2))
}
