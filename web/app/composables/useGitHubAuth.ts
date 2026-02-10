/**
 * GitHub OAuth composable
 *
 * Handles the full OAuth lifecycle:
 * 1. Redirect to GitHub for authorization
 * 2. Handle callback (token in URL fragment via Worker)
 * 3. Validate + persist token in localStorage
 * 4. Fetch authenticated user profile
 */

export interface GitHubUser {
  login: string
  avatar_url: string
  name: string | null
}

const TOKEN_KEY = 'gh_token'
const NONCE_KEY = 'gh_auth_nonce'

export function useGitHubAuth() {
  const { githubClientId, githubAuthWorkerUrl } = useRuntimeConfig().public

  const token = useState<string | null>('gh_token', () => null)
  const user = useState<GitHubUser | null>('gh_user', () => null)
  const loading = useState('gh_auth_loading', () => false)

  const isAuthenticated = computed(() => !!token.value && !!user.value)
  const isEnabled = computed(() => !!githubClientId && !!githubAuthWorkerUrl)

  /** Redirect to GitHub OAuth authorize endpoint */
  function login() {
    if (!githubClientId || !githubAuthWorkerUrl) return

    const nonce = crypto.randomUUID()
    sessionStorage.setItem(NONCE_KEY, nonce)

    const state = btoa(JSON.stringify({
      origin: window.location.origin,
      nonce,
    }))

    const params = new URLSearchParams({
      client_id: githubClientId as string,
      redirect_uri: `${githubAuthWorkerUrl}/callback`,
      state,
      scope: 'repo',
    })

    window.location.href = `https://github.com/login/oauth/authorize?${params}`
  }

  /** Clear token and user state */
  function logout() {
    token.value = null
    user.value = null
    localStorage.removeItem(TOKEN_KEY)
  }

  /** Fetch user profile from GitHub API */
  async function fetchUser(accessToken: string): Promise<GitHubUser | null> {
    try {
      const res = await fetch('https://api.github.com/user', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (!res.ok) return null
      const data = await res.json()
      return { login: data.login, avatar_url: data.avatar_url, name: data.name }
    } catch {
      return null
    }
  }

  /** Handle OAuth callback — extract token from URL hash */
  function handleCallback(): boolean {
    if (typeof window === 'undefined') return false

    const hash = window.location.hash
    if (!hash.includes('gh_token=')) return false

    const params = new URLSearchParams(hash.slice(1))
    const incomingToken = params.get('gh_token')
    const incomingNonce = params.get('gh_nonce')

    // Verify nonce to prevent CSRF
    const storedNonce = sessionStorage.getItem(NONCE_KEY)
    if (!incomingToken || !incomingNonce || incomingNonce !== storedNonce) {
      // Clear hash even on failure
      history.replaceState(null, '', window.location.pathname + window.location.search)
      return false
    }

    sessionStorage.removeItem(NONCE_KEY)
    token.value = incomingToken
    localStorage.setItem(TOKEN_KEY, incomingToken)

    // Clear hash from URL
    history.replaceState(null, '', window.location.pathname + window.location.search)
    return true
  }

  /** Initialize auth state — call once on app mount */
  async function init() {
    if (typeof window === 'undefined') return
    if (!isEnabled.value) return

    loading.value = true

    // Check for OAuth callback first
    const wasCallback = handleCallback()

    // If not a callback, try restoring from localStorage
    if (!wasCallback && !token.value) {
      const stored = localStorage.getItem(TOKEN_KEY)
      if (stored) token.value = stored
    }

    // Validate token by fetching user
    if (token.value) {
      const fetched = await fetchUser(token.value)
      if (fetched) {
        user.value = fetched
      } else {
        // Token invalid — clear it
        logout()
      }
    }

    loading.value = false
  }

  return {
    isAuthenticated,
    isEnabled,
    user,
    token,
    loading,
    login,
    logout,
    init,
  }
}
