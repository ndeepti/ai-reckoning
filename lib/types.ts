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

export interface MockIncident {
  title: string
  version: string
  logs: string
  metrics: MetricPoint[]
  teamsThread: TeamsMessage[]
  deployDiff: string
}

export type DataSource = 'mock' | 'live'

export interface LiveFetchState {
  status: 'idle' | 'loading' | 'done' | 'error'
  source?: string
  error?: string
}
