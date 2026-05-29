import { loadFileConfig } from '@/lib/config'

async function tryAuth(url: string, user: string, secret: string, label: string) {
  const encoded = Buffer.from(`${user}:${secret}`).toString('base64')
  try {
    const res = await fetch(`${url}/me/api/json?tree=id`, {
      headers: { Authorization: `Basic ${encoded}` },
      signal: AbortSignal.timeout(6000),
      redirect: 'manual',   // don't follow — detect context-path redirects
    })
    return { label, status: res.status, ok: res.ok, redirected: res.type === 'opaqueredirect' }
  } catch (e) {
    return { label, status: 0, ok: false, error: (e as Error).message.slice(0, 60) }
  }
}

async function checkUrlReachable(url: string) {
  try {
    const res = await fetch(`${url}/login`, { signal: AbortSignal.timeout(5000), redirect: 'manual' })
    return { status: res.status, type: res.type }
  } catch (e) {
    return { status: 0, error: (e as Error).message.slice(0, 60) }
  }
}

export async function GET() {
  const file  = loadFileConfig()
  const user  = process.env.JENKINS_USER_ID || file.jenkinsUserId || file.jenkinsUser || process.env.JENKINS_USER || ''
  const token = process.env.JENKINS_TOKEN   || ''
  const pass  = process.env.JENKINS_PASSWORD || ''
  const url   = (file.jenkinsUrl || process.env.JENKINS_URL || '').replace(/\/$/, '')

  const meta = {
    userSet: user.length > 0, userLen: user.length,
    tokenSet: token.length > 0, tokenLen: token.length,
    passSet: pass.length > 0,
    urlSet: url.length > 0,
  }

  if (!url) return Response.json({ ...meta, error: 'No Jenkins URL' })

  // Check if URL is reachable at all
  const reach = await checkUrlReachable(url)

  const tests = []
  if (user && token) tests.push(tryAuth(url, user, token, 'token'))
  if (user && pass)  tests.push(tryAuth(url, user, pass, 'password'))

  // Also try with /jenkins context path if base URL fails
  if (user && token && !url.endsWith('/jenkins')) {
    tests.push(tryAuth(`${url}/jenkins`, user, token, 'token+/jenkins-path'))
  }

  const results = await Promise.all(tests)
  return Response.json({ ...meta, urlReachable: reach, authTests: results })
}

export async function POST() {
  const ghSystem = process.env.GITHUB_TOKEN  || ''
  const ghDiff   = process.env.GH_DIFF_TOKEN || ''
  const repoUrl  = process.env.REPO_URL      || ''
  return Response.json({
    GITHUB_TOKEN_len:  ghSystem.length,
    GH_DIFF_TOKEN_len: ghDiff.length,
    REPO_URL_set:      repoUrl.length > 0,
  })
}
