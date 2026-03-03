/**
 * GitHub Contents API wrapper
 *
 * Load and save files via the GitHub REST API.
 * Uses the token from useGitHubAuth().
 * Path and branch are reactive so the same instance stays in sync when they change.
 */

export function useGitHubFile(
  owner: string,
  repo: string,
  rawPath: Ref<string>,
  branch: Ref<string>,
  /** Fallback branches for loading, tried in order when primary branch 404s */
  fallbackBranches?: Ref<string>[],
) {
  const { token } = useGitHubAuth()

  const content = ref('')
  const sha = ref('')
  const loading = ref(false)
  const error = ref<string | null>(null)
  /** Which branch was actually loaded from (may differ from branch if fallback was used) */
  const loadedFromBranch = ref<string | null>(null)

  function getPath(): string {
    return rawPath.value.replace(/^\/+/, '')
  }

  async function load() {
    if (!token.value) {
      error.value = 'Not authenticated'
      return
    }

    const path = getPath()
    loading.value = true
    error.value = null

    try {
      // Build ordered list of branches to try: primary, then fallbacks
      const tried = new Set<string>()
      const branches = [branch.value]
      if (fallbackBranches) {
        for (const fb of fallbackBranches) {
          if (fb.value) branches.push(fb.value)
        }
      }

      let branchRef = ''
      let res: Response | null = null

      for (const candidate of branches) {
        if (tried.has(candidate)) continue
        tried.add(candidate)
        branchRef = candidate
        res = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${encodeURIComponent(candidate)}`,
          { headers: { Authorization: `Bearer ${token.value}` } },
        )
        if (res.status !== 404) break
      }

      if (!res || !res.ok) {
        const status = res?.status ?? 0
        error.value = status === 404 ? `File not found: ${path}` : `GitHub API error ${status}: ${path}`
        return
      }

      const data = await res.json()
      sha.value = data.sha
      content.value = decodeBase64(data.content)
      loadedFromBranch.value = branchRef
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load file'
    } finally {
      loading.value = false
    }
  }

  async function save(newContent: string, message?: string): Promise<boolean> {
    if (!token.value) {
      error.value = 'Not authenticated'
      return false
    }

    const path = getPath()
    const ref = branch.value

    loading.value = true
    error.value = null

    try {
      const res = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token.value}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: message || `Update ${path}`,
            content: encodeBase64(newContent),
            sha: sha.value,
            branch: ref,
          }),
        },
      )

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        error.value = (body as { message?: string }).message || `Save failed: ${res.status}`
        return false
      }

      const data = await res.json()
      sha.value = data.content.sha
      content.value = newContent
      return true
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to save file'
      return false
    } finally {
      loading.value = false
    }
  }

  return { content, sha, loading, error, loadedFromBranch, load, save }
}

/** Decode base64-encoded content (GitHub returns base64 with newlines) */
function decodeBase64(encoded: string): string {
  return new TextDecoder().decode(
    Uint8Array.from(atob(encoded.replace(/\n/g, '')), (c) => c.charCodeAt(0)),
  )
}

/** Encode string content to base64 for GitHub API */
function encodeBase64(text: string): string {
  return btoa(
    Array.from(new TextEncoder().encode(text), (b) => String.fromCharCode(b)).join(''),
  )
}
