/**
 * Auto-detect base URL from script src
 */
export function detectBaseUrl(): string | null {
  // Try to find the script tag that loaded this component
  const scripts = document.querySelectorAll('script[src*="prez-vocab"]')
  if (scripts.length > 0) {
    const src = (scripts[scripts.length - 1] as HTMLScriptElement).src
    // Extract base URL (remove /web-components/prez-lite.min.js)
    const url = new URL(src)
    const pathParts = url.pathname.split('/')
    // Remove last two parts (web-components/prez-lite.min.js)
    pathParts.pop() // prez-lite.min.js
    pathParts.pop() // web-components
    url.pathname = pathParts.join('/') || '/'
    return url.origin + url.pathname.replace(/\/$/, '')
  }
  return null
}

/**
 * Resolve vocab URL from slug or direct URL
 */
export function resolveVocabUrl(
  vocab: string | null,
  vocabUrl: string | null,
  baseUrl: string | null
): string | null {
  if (vocabUrl) return vocabUrl
  if (!vocab) return null

  const base = baseUrl || detectBaseUrl()
  if (!base) return null

  return `${base}/export/${vocab}/${vocab}-concepts.json`
}
