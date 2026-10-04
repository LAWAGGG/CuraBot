/* oxlint-disable react/set-state-in-effect -- data fetching synchronizes with an external system */
import { useCallback, useEffect, useRef, useState } from 'react'

import { errorMessage } from '@/lib/api'

export function useApi(key, fetcher, { enabled = true } = {}) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(Boolean(enabled && key))
  const [error, setError] = useState(null)

  const fetcherRef = useRef(fetcher)
  useEffect(() => {
    fetcherRef.current = fetcher
  })

  const activeRef = useRef(true)

  const load = useCallback(
    async ({ force = false } = {}) => {
      if (!enabled || !key) return undefined
      setLoading(true)
      setError(null)
      try {
        const result = await fetcherRef.current({ force })
        if (activeRef.current) setData(result)
        return result
      } catch (caught) {
        if (activeRef.current) setError(errorMessage(caught))
        return undefined
      } finally {
        if (activeRef.current) setLoading(false)
      }
    },
    [key, enabled],
  )

  useEffect(() => {
    activeRef.current = true
    if (enabled && key) load()
    return () => {
      activeRef.current = false
    }
  }, [load, enabled, key])

  // ponytail: requests are cached and deduped in apiFetch, so unmount does not abort.
  const refresh = useCallback(() => load({ force: true }), [load])

  return { data, setData, loading, error, refresh }
}
