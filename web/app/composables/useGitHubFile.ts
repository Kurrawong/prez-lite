/**
 * GitHub Contents API wrapper
 *
 * Load and save files via the GitHub REST API.
 * Uses the token from useGitHubAuth().
 */

export function useGitHubFile(
  owner: string,
  repo: string,
  rawPath: string,
  branch: string,
) {
  // GitHub API rejects paths starting with /
  const path = rawPath.replace(/^\/+/, '')
  const { token } = useGitHubAuth()

  const content = ref('')
  const sha = ref('')
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function load() {
    if (!token.value) {
      error.value = 'Not authenticated'
      return
    }

    loading.value = true
    error.value = null

    try {
      const res = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,
        { headers: { Authorization: `Bearer ${token.value}` } },
      )

      if (!res.ok) {
        error.value = res.status === 404 ? 'File not found' : `GitHub API error: ${res.status}`
        return
      }

      const data = await res.json()
      sha.value = data.sha
      content.value = decodeBase64(data.content)
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
            branch,
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

  return { content, sha, loading, error, load, save }
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
