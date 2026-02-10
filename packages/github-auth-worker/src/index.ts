interface Env {
  GITHUB_CLIENT_ID: string
  GITHUB_CLIENT_SECRET: string
  ALLOWED_ORIGINS: string
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname === '/health') {
      return new Response('ok', { status: 200 })
    }

    if (url.pathname === '/callback') {
      return handleCallback(url, env)
    }

    return new Response('Not found', { status: 404 })
  },
}

async function handleCallback(url: URL, env: Env): Promise<Response> {
  const code = url.searchParams.get('code')
  const stateParam = url.searchParams.get('state')

  if (!code || !stateParam) {
    return new Response('Missing code or state', { status: 400 })
  }

  // Decode state: base64({ origin, nonce })
  let origin: string
  let nonce: string
  try {
    const state = JSON.parse(atob(stateParam))
    origin = state.origin
    nonce = state.nonce
  } catch {
    return new Response('Invalid state', { status: 400 })
  }

  // Validate origin against allowlist
  const allowed = env.ALLOWED_ORIGINS.split(',').map((s) => s.trim())
  if (!allowed.includes(origin)) {
    return new Response('Origin not allowed', { status: 403 })
  }

  // Exchange code for token
  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
    }),
  })

  const tokenData = (await tokenRes.json()) as { access_token?: string; error?: string }

  if (!tokenData.access_token) {
    return new Response(`Token exchange failed: ${tokenData.error || 'unknown'}`, { status: 502 })
  }

  // Redirect back to origin with token in URL fragment (never hits server)
  const redirectUrl = `${origin}/#gh_token=${tokenData.access_token}&gh_nonce=${nonce}`
  return Response.redirect(redirectUrl, 302)
}
