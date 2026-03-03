/**
 * Shared authenticated GitHub API fetch helper.
 *
 * Used by useWorkspace and usePromotion to avoid duplicating auth header logic.
 */

import type { Ref } from 'vue'

export function createGithubFetch(token: Ref<string | null>, logPrefix = 'github') {
  return async function githubFetch<T>(url: string, options?: RequestInit): Promise<T | null> {
    if (!token.value) {
      console.warn(`[${logPrefix}] No token available for GitHub API call`)
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
        console.error(`[${logPrefix}] GitHub API ${options?.method ?? 'GET'} ${url} → ${res.status}: ${body}`)
        return null
      }
      if (res.status === 204) return null
      return await res.json()
    } catch (e) {
      console.error(`[${logPrefix}] GitHub API fetch error:`, e)
      return null
    }
  }
}
