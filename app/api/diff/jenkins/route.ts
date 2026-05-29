import { config, loadFileConfig } from '@/lib/config'

interface JenkinsBuild {
  number: number
  timestamp: number
  result: string | null
  url: string
  changeSet: {
    kind: string
    items: Array<{
      commitId?: string
      id?: string
      msg: string
      comment?: string
      paths?: Array<{ file: string; editType: string }>
      affectedPaths?: string[]
    }>
  }
}

function jenkinsAuth(): Record<string, string> {
  const file   = loadFileConfig()
  const user   = process.env.JENKINS_USER_ID || file.jenkinsUserId || file.jenkinsUser || process.env.JENKINS_USER || ''
  const secret = process.env.JENKINS_TOKEN || process.env.JENKINS_PASSWORD || ''
  if (user && secret) {
    const encoded = Buffer.from(`${user}:${secret}`).toString('base64')
    return { Authorization: `Basic ${encoded}` }
  }
  return {}
}

async function fetchBuild(
  url: string,
  job: string,
  buildNumber: string | number,
  headers: Record<string, string>
): Promise<JenkinsBuild> {
  // Encode job path — support folder/job format
  const jobPath = job.split('/').map(encodeURIComponent).join('/job/')
  const buildUrl = `${url}/job/${jobPath}/${buildNumber}/api/json?tree=number,timestamp,result,url,changeSet[kind,items[commitId,id,msg,comment,paths[file,editType],affectedPaths]]`

  const res = await fetch(buildUrl, { headers, signal: AbortSignal.timeout(30_000) })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Jenkins ${res.status}: ${body.slice(0, 200)}`)
  }
  return res.json() as Promise<JenkinsBuild>
}

function buildToText(build: JenkinsBuild, job: string): string {
  const date = new Date(build.timestamp).toISOString().replace('T', ' ').slice(0, 19)
  const status = build.result ?? 'IN_PROGRESS'
  const lines: string[] = [
    `# Jenkins changeset — ${job} #${build.number}`,
    `# Date: ${date}  Status: ${status}`,
    `# URL:  ${build.url}`,
    '',
  ]

  const items = build.changeSet?.items ?? []
  if (items.length === 0) {
    lines.push('(no changeSet items — build may not have source changes)')
    return lines.join('\n')
  }

  for (const item of items) {
    const sha = (item.commitId ?? item.id ?? '').slice(0, 10)
    const msg = (item.msg ?? item.comment ?? '').split('\n')[0].trim()
    lines.push(`## commit ${sha}  ${msg}`)

    const paths = item.paths ?? (item.affectedPaths ?? []).map(f => ({ file: f, editType: 'edit' }))
    for (const p of paths) {
      const symbol = p.editType === 'add' ? '+' : p.editType === 'delete' ? '-' : 'M'
      lines.push(`  ${symbol} ${p.file}`)
    }
    lines.push('')
  }

  return lines.join('\n')
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)

  const file2   = loadFileConfig()
  const url     = (file2.jenkinsUrl || process.env.JENKINS_URL || '').trim().replace(/\/+$/, '')
  const job     = searchParams.get('job') || file2.jenkinsJob || config.jenkins.job
  const buildNo = searchParams.get('build') ?? 'lastBuild'

  if (!url) {
    return Response.json({ error: 'Jenkins URL not configured — set in Integrations → Diff or JENKINS_URL in .env.local' }, { status: 400 })
  }
  if (!job) {
    return Response.json({ error: 'No job specified — set in Integrations → Diff → Job Name or pass ?job=' }, { status: 400 })
  }

  try {
    const headers = jenkinsAuth()
    const build = await fetchBuild(url, job, buildNo, headers)
    const text = buildToText(build, job)

    return Response.json({
      ok: true,
      buildNumber: build.number,
      date: new Date(build.timestamp).toISOString(),
      result: build.result,
      changeCount: build.changeSet?.items?.length ?? 0,
      text,
    })
  } catch (err) {
    const e = err as Error
    const msg = e.message === 'fetch failed' && (e as NodeJS.ErrnoException).cause
      ? `fetch failed: ${String((e as NodeJS.ErrnoException).cause)}`
      : e.message
    return Response.json({ error: msg }, { status: 500 })
  }
}
