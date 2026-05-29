import { loadProjects } from '@/lib/config'

const cache = new Map<string, { branches: string[]; fetchedAt: number }>()
const TTL = 5 * 60 * 1000

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('projectId')
  const force = searchParams.get('force') === '1'

  let repo = searchParams.get('repo') ?? ''
  let filterParam = searchParams.get('filter') ?? ''

  if (projectId) {
    const project = loadProjects().find(p => p.id === projectId)
    if (project) {
      repo = project.githubRepo
      filterParam = project.branchFilter.join(',')
    }
  }

  if (!repo) return Response.json({ error: 'No repo specified' }, { status: 400 })

  const cacheKey = `${repo}::${filterParam}`
  if (!force) {
    const hit = cache.get(cacheKey)
    if (hit && Date.now() - hit.fetchedAt < TTL) {
      return Response.json({ branches: hit.branches, cached: true })
    }
  }

  const match = repo.match(/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?$/)
  if (!match) return Response.json({ error: 'Invalid GitHub repo URL' }, { status: 400 })

  const [, owner, repoName] = match
  const token = process.env.GH_DIFF_TOKEN || process.env.GITHUB_TOKEN || ''
  const headers: HeadersInit = { 'Accept': 'application/vnd.github.v3+json' }
  if (token) headers['Authorization'] = `Bearer ${token}`

  try {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repoName}/branches?per_page=100`,
      { headers, signal: AbortSignal.timeout(10_000) }
    )
    if (!res.ok) return Response.json({ error: `GitHub API: ${res.status}` }, { status: 502 })

    const data = await res.json() as { name: string }[]
    let branches = data.map(b => b.name)

    const filters = filterParam.split(',').map(f => f.trim()).filter(Boolean)
    if (filters.length > 0) {
      branches = branches.filter(b => filters.some(f => b.toLowerCase().includes(f.toLowerCase())))
    }

    branches.sort()
    cache.set(cacheKey, { branches, fetchedAt: Date.now() })
    return Response.json({ branches, cached: false })
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 })
  }
}
