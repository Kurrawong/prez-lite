/**
 * Shared authenticated GitHub API fetch helper.
 *
 * Used by useWorkspace and usePromotion to avoid duplicating auth header logic.
 */

import type { Ref } from 'vue'

/**
 * Structured error info captured on the last failing GitHub API call. Pass a
 * Ref of this type as the `lastError` arg to `createGithubFetch` and the
 * helper will populate it on every non-OK response or thrown fetch error.
 * Callers can then surface a human-readable message in the UI instead of
 * the current silent-null failure mode.
 */
export interface GithubFetchError {
  status: number
  /** Short summary: "403 Forbidden" or "Network error" */
  message: string
  /** Parsed `message` from GitHub's JSON error body when present */
  githubMessage?: string
  /** Raw response body (truncated) for debugging */
  body?: string
  /** Original URL that failed */
  url: string
  /** HTTP method (GET/POST/...) */
  method: string
}

/** Try to extract GitHub's `message` field from a JSON error body */
function parseGithubMessage(body: string): string | undefined {
  try {
    const parsed = JSON.parse(body)
    if (parsed && typeof parsed.message === 'string') return parsed.message
  } catch {
    /* not JSON */
  }
  return undefined
}

export function createGithubFetch(
  token: Ref<string | null>,
  logPrefix = 'github',
  lastError?: Ref<GithubFetchError | null>,
) {
  return async function githubFetch<T>(url: string, options?: RequestInit): Promise<T | null> {
    const method = options?.method ?? 'GET'
    if (!token.value) {
      console.warn(`[${logPrefix}] No token available for GitHub API call`)
      if (lastError) {
        lastError.value = {
          status: 0,
          message: 'Not authenticated',
          url,
          method,
        }
      }
      return null
    }
    try {
      const res = await fetch(url, {
        ...options,
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${token.value}`,
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      })
      if (!res.ok) {
        const body = await res.text().catch(() => '')
        console.error(`[${logPrefix}] GitHub API ${method} ${url} → ${res.status}: ${body}`)
        if (lastError) {
          lastError.value = {
            status: res.status,
            message: `${res.status} ${res.statusText}`,
            githubMessage: parseGithubMessage(body),
            body: body.slice(0, 400),
            url,
            method,
          }
        }
        return null
      }
      // Successful call — clear any prior error
      if (lastError) lastError.value = null
      if (res.status === 204) return null
      return await res.json()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Network error'
      console.error(`[${logPrefix}] GitHub API fetch error:`, e)
      if (lastError) {
        lastError.value = {
          status: 0,
          message: msg,
          url,
          method,
        }
      }
      return null
    }
  }
}
