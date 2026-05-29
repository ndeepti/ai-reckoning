import { loadFileConfig } from '@/lib/config'

function githubHeaders(): Record<string, string> {
  // GH_DIFF_TOKEN avoids clash with system GITHUB_TOKEN (set by GitHub CLI)
  const token = process.env.GH_DIFF_TOKEN || process.env.GITHUB_TOKEN || ''
  return {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

// Parse repo URL into { owner, repo }
function parseRepoUrl(url: string): { owner: string; repo: string } | null {
  const m = url.match(/github\.com[/:]([^/]+)\/([^/.\s]+?)(?:\.git)?$/)
  if (!m) return null
  return { owner: m[1], repo: m[2] }
}

function formatCompareDiff(data: GithubCompare, base: string, head: string): string {
  const lines: string[] = [
    `# GitHub diff — ${base}...${head}`,
    `# Commits: ${data.commits?.length ?? 0}  Files: ${data.files?.length ?? 0}`,
    '',
  ]

  for (const commit of data.commits ?? []) {
    const sha = commit.sha.slice(0, 8)
    const msg = commit.commit.message.split('\n')[0].slice(0, 100)
    lines.push(`## ${sha}  ${msg}`)
  }
  lines.push('')

  for (const file of data.files ?? []) {
    const symbol = file.status === 'added' ? '+' : file.status === 'removed' ? '-' : 'M'
    lines.push(`${symbol} ${file.filename}  (+${file.additions} -${file.deletions})`)
    if (file.patch) {
      // Include first 20 lines of each patch to keep token budget reasonable
      const patchLines = file.patch.split('\n').slice(0, 20)
      lines.push(...patchLines.map(l => '  ' + l))
      if (file.patch.split('\n').length > 20) lines.push('  ...(truncated)')
    }
    lines.push('')
  }

  return lines.join('\n')
}

interface GithubCommit {
  sha: string
  commit: { message: string }
}

interface GithubFile {
  filename: string
  status: string
  additions: number
  deletions: number
  patch?: string
}

interface GithubCompare {
  commits?: GithubCommit[]
  files?: GithubFile[]
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const file = loadFileConfig()

  const repoUrl = searchParams.get('repo') || file.githubRepoUrl || process.env.REPO_URL || ''
  const base    = searchParams.get('base') ?? file.githubBranch ?? 'main'
  const head    = searchParams.get('head') ?? searchParams.get('branch') ?? file.githubHead ?? ''

  if (!repoUrl) {
    return Response.json({ error: 'No repo URL — set in Integrations → Diff → GitHub' }, { status: 400 })
  }
  if (!head) {
    return Response.json({ error: 'No branch/head specified — pass ?head=branch-name or ?head=SHA' }, { status: 400 })
  }

  const parsed = parseRepoUrl(repoUrl)
  if (!parsed) {
    return Response.json({ error: `Cannot parse repo URL: ${repoUrl}` }, { status: 400 })
  }

  const { owner, repo } = parsed
  // First verify the repo is accessible at all
  const repoCheckRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers: githubHeaders(), signal: AbortSignal.timeout(5000) })
  if (!repoCheckRes.ok) {
    const body = await repoCheckRes.text()
    return Response.json({ error: `Repo ${owner}/${repo} not accessible (${repoCheckRes.status}): ${body.slice(0, 100)}`, parsedOwner: owner, parsedRepo: repo }, { status: repoCheckRes.status })
  }
  const repoInfo = await repoCheckRes.json() as { default_branch?: string }
  const defaultBranch = repoInfo.default_branch ?? 'main'

  // Use default branch if caller passed 'main' but repo uses something else
  const resolvedBase = base === 'main' && defaultBranch !== 'main' ? defaultBranch : base
  const resolvedHead = head === 'main' && defaultBranch !== 'main' ? defaultBranch : head

  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/compare/${encodeURIComponent(resolvedBase)}...${encodeURIComponent(resolvedHead)}`

  try {
    const res = await fetch(apiUrl, { headers: githubHeaders(), signal: AbortSignal.timeout(10_000) })
    if (!res.ok) {
      const body = await res.text()
      return Response.json({ error: `GitHub ${res.status}: ${body.slice(0, 200)}` }, { status: res.status })
    }

    const data = await res.json() as GithubCompare
    const text = formatCompareDiff(data, base, head)

    return Response.json({
      ok: true,
      base,
      head,
      commits: data.commits?.length ?? 0,
      files: data.files?.length ?? 0,
      text,
    })
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 })
  }
}
