import { loadProjects, saveProject } from '@/lib/config'
import type { ProjectConfig } from '@/lib/types'

export async function GET() {
  return Response.json(loadProjects())
}

export async function POST(request: Request) {
  let body: Partial<ProjectConfig>
  try { body = await request.json() } catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }) }

  if (!body.id || !body.name) return Response.json({ error: 'id and name required' }, { status: 400 })

  const project: ProjectConfig = {
    id: body.id,
    name: body.name,
    services: body.services ?? [],
    channels: body.channels ?? [],
    branchFilter: body.branchFilter ?? [],
    lokiQuery: body.lokiQuery ?? '',
    lokiUrl: body.lokiUrl,
    jenkinsJob: body.jenkinsJob ?? '',
    githubRepo: body.githubRepo ?? '',
    githubBase: body.githubBase ?? 'main',
    lastBranch: body.lastBranch,
  }
  saveProject(project)
  return Response.json({ ok: true, project })
}
