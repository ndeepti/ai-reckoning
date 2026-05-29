import { loadFileConfig, saveFileConfig } from '@/lib/config'
import { checkLokiHealth } from '@/lib/lokiClient'

// Always read fresh from config.json + env — never use the module-level `config` cache,
// which freezes at startup and won't reflect runtime changes from the service picker.
export async function GET() {
  const file = loadFileConfig()

  const lokiUrl         = file.lokiUrl  || process.env.LOKI_URL  || ''
  const lokiQuery       = file.lokiQuery || process.env.LOKI_QUERY || ''
  const isLokiConfigured = !!lokiUrl
  const lokiHealthy      = isLokiConfigured ? await checkLokiHealth() : false

  const channelsRaw = file.teamsChannels || process.env.TEAMS_CHANNELS || ''
  const channels    = channelsRaw.split(',').map((s: string) => s.trim()).filter(Boolean)

  const serviceName       = file.serviceName || process.env.SERVICE_NAME || null
  const openaiConfigured  = !!process.env.OPENAI_API_KEY

  return Response.json({
    serviceName,
    channels,
    lokiConfigured:  isLokiConfigured,
    lokiHealthy,
    lokiQuery:       isLokiConfigured ? lokiQuery : null,
    openaiConfigured,
    settings: {
      lokiUrl,
      lokiUrl2:            file.lokiUrl2            || process.env.LOKI_URL_2          || '',
      lokiQuery,
      lokiLookbackHours:   file.lokiLookbackHours   || process.env.LOKI_LOOKBACK_HOURS || '2',
      lokiFrom:            file.lokiFrom             ?? '',
      lokiTo:              file.lokiTo               ?? '',
      serviceName:         serviceName               ?? '',
      serviceDescription:  file.serviceDescription   || process.env.SERVICE_DESCRIPTION  || '',
      downstreamSystems:   file.downstreamSystems    || process.env.DOWNSTREAM_SYSTEMS   || '',
      platformDescription: file.platformDescription  || process.env.PLATFORM_DESCRIPTION || '',
      ciTool:              file.ciTool               || process.env.CI_TOOL              || '',
      teamsChannels:       channels.join(', '),
      openaiModel:         file.openaiModel          || process.env.OPENAI_MODEL         || 'gpt-4o',
      // Teams integration
      teamsSource:         file.teamsSource          ?? 'webhook',
      graphTenantId:       file.graphTenantId        ?? '',
      graphClientId:       file.graphClientId        ?? '',
      graphTeamIds:        file.graphTeamIds         ?? '',
      // Diff integration
      diffSource:          file.diffSource           ?? 'manual',
      githubRepoUrl:       file.githubRepoUrl        || process.env.REPO_URL            || '',
      githubBranch:        file.githubBranch         ?? 'main',
      githubHead:          file.githubHead           ?? '',
      jenkinsUrl:          file.jenkinsUrl           || process.env.JENKINS_URL          || '',
      jenkinsJob:          file.jenkinsJob           || process.env.CI_JOB               || '',
      jenkinsUser:         file.jenkinsUser          || process.env.JENKINS_USER         || '',
      jenkinsUserId:       file.jenkinsUserId        || process.env.JENKINS_USER_ID      || '',
    },
  })
}

const ALLOWED_KEYS = new Set([
  'lokiUrl', 'lokiUrl2', 'lokiQuery', 'lokiLookbackHours', 'lokiLimit',
  'lokiFrom', 'lokiTo',
  'serviceName', 'serviceDescription', 'downstreamSystems',
  'platformDescription', 'ciTool', 'teamsChannels', 'openaiModel',
  'teamsSource', 'graphTenantId', 'graphClientId', 'graphTeamIds', 'graphLastPoll',
  'diffSource', 'githubRepoUrl', 'githubBranch', 'githubHead',
  'jenkinsUrl', 'jenkinsJob', 'jenkinsUser', 'jenkinsUserId',
])

export async function POST(request: Request) {
  let body: Record<string, string>
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const updates: Record<string, string> = {}
  for (const [key, val] of Object.entries(body)) {
    if (ALLOWED_KEYS.has(key) && typeof val === 'string') updates[key] = val
  }

  try {
    saveFileConfig(updates)
    return Response.json({ ok: true, saved: Object.keys(updates) })
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 })
  }
}
