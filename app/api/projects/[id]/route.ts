import { loadProjects, saveProject, deleteProject } from '@/lib/config'
import type { ProjectConfig } from '@/lib/types'

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  let body: Partial<ProjectConfig>
  try { body = await request.json() } catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const projects = loadProjects()
  const existing = projects.find(p => p.id === id)
  if (!existing) return Response.json({ error: 'Not found' }, { status: 404 })

  const updated: ProjectConfig = { ...existing, ...body, id }
  saveProject(updated)
  return Response.json({ ok: true, project: updated })
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  deleteProject(id)
  return Response.json({ ok: true })
}
