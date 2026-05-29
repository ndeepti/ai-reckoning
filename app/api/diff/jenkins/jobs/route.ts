import { config, loadFileConfig } from '@/lib/config'

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

interface JenkinsJob {
  name: string
  url: string
  color?: string
  jobs?: JenkinsJob[]  // folders contain nested jobs
}

async function fetchJobs(url: string, headers: Record<string, string>, folderPath = ''): Promise<string[]> {
  const apiUrl = folderPath
    ? `${url}/job/${folderPath.split('/').map(encodeURIComponent).join('/job/')}/api/json?tree=jobs[name,url,color,jobs[name]]`
    : `${url}/api/json?tree=jobs[name,url,color,jobs[name]]`

  const res = await fetch(apiUrl, { headers, signal: AbortSignal.timeout(8_000) })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Jenkins ${res.status}: ${body.slice(0, 200)}`)
  }

  const data = await res.json() as { jobs?: JenkinsJob[] }
  const paths: string[] = []

  for (const job of data.jobs ?? []) {
    const jobPath = folderPath ? `${folderPath}/${job.name}` : job.name
    if (job.jobs) {
      // It's a folder — expand one level
      for (const nested of job.jobs) {
        paths.push(`${jobPath}/${nested.name}`)
      }
    } else {
      paths.push(jobPath)
    }
  }

  return paths
}

export async function GET() {
  const url = config.jenkins.url
  if (!url) {
    return Response.json({ error: 'Jenkins URL not configured' }, { status: 400 })
  }

  try {
    const headers = jenkinsAuth()
    const jobs = await fetchJobs(url, headers)
    return Response.json({ jobs, url })
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 })
  }
}
