/**
 * Build status polling composable
 *
 * After a save, polls the GitHub Actions API to detect when the
 * data-processing workflow has finished rebuilding exports.
 */

import { clearCaches } from '~/composables/useVocabData'

export function useBuildStatus(owner: string, repo: string) {
  const { token } = useGitHubAuth()

  const status = ref<'idle' | 'running' | 'completed' | 'failed'>('idle')
  const runUrl = ref<string | null>(null)

  let intervalId: ReturnType<typeof setInterval> | null = null
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  let pollStartedAt: number | null = null

  const POLL_INTERVAL = 15_000 // 15 seconds
  const MAX_POLL_DURATION = 5 * 60_000 // 5 minutes safety timeout

  async function poll() {
    if (!token.value) return

    try {
      const res = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/actions/workflows/process-data.yml/runs?per_page=1`,
        { headers: { Authorization: `Bearer ${token.value}` } },
      )

      if (!res.ok) {
        // Workflow might not exist or no permission — reset and stop
        status.value = 'idle'
        stopPolling()
        return
      }

      const data = await res.json()
      const run = data.workflow_runs?.[0]
      if (!run) return

      runUrl.value = run.html_url

      if (run.status === 'in_progress' || run.status === 'queued') {
        status.value = 'running'
      } else if (run.status === 'completed') {
        // Only treat as our build if it started after we began polling
        if (pollStartedAt && new Date(run.created_at).getTime() < pollStartedAt) {
          // This is a previous run — keep waiting for the new one
          return
        }
        if (run.conclusion === 'success') {
          status.value = 'completed'
          clearCaches()
          // Auto-dismiss after 5 seconds
          setTimeout(() => {
            status.value = 'idle'
            runUrl.value = null
          }, 5000)
        } else {
          status.value = 'failed'
        }
        stopPolling()
      }
    } catch {
      // Network error — ignore, will retry next interval
    }
  }

  function startPolling() {
    stopPolling()
    status.value = 'running'
    pollStartedAt = Date.now()

    // Initial poll after a short delay (give GitHub time to trigger the workflow)
    setTimeout(() => poll(), 3000)

    intervalId = setInterval(poll, POLL_INTERVAL)

    // Safety timeout
    timeoutId = setTimeout(() => {
      stopPolling()
      if (status.value === 'running') {
        status.value = 'idle'
      }
    }, MAX_POLL_DURATION)
  }

  function stopPolling() {
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
  }

  // Clean up on component unmount
  onUnmounted(stopPolling)

  return { status: readonly(status), runUrl: readonly(runUrl), startPolling, stopPolling }
}
