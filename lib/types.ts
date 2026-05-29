export interface AgentStep {
  id: number
  text: string
  done: boolean
}

export interface TimelineEvent {
  time: string
  event: string
  type: 'deploy' | 'alert' | 'escalation' | 'resolution'
}

export interface IncidentReport {
  rootCause: string
  file: string
  lineRef: string
  confidence: 'HIGH' | 'MEDIUM' | 'LOW'
  causalChain: string[]
  timeline: TimelineEvent[]
  contributingFactors: string[]
  actions: string[]
}

export interface MetricPoint {
  time: string
  errorRate: number
}

export interface TeamsMessage {
  author: string
  role: string
  time: string
  text: string
  isAlert?: boolean
  channel?: string
}

export interface JenkinsBuild {
  buildNumber: number
  date: string
  result: string | null
  changeCount: number
  text: string
}

export interface MockIncident {
  title: string
  version: string
  logs: string
  metrics: MetricPoint[]
  teamsThread: TeamsMessage[]
  deployDiff: string
  jenkinsBuild?: JenkinsBuild
}

export interface ProjectConfig {
  id: string
  name: string
  services: string[]
  channels: string[]
  branchFilter: string[]
  lokiQuery: string
  lokiUrl?: string
  jenkinsJob: string
  githubRepo: string
  githubBase: string
  lastBranch?: string
}

export type DataSource = 'mock' | 'live'

export interface LiveFetchState {
  status: 'idle' | 'loading' | 'done' | 'error'
  source?: string
  error?: string
}
