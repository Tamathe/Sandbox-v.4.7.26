import { useState, useEffect } from 'react'

export function useChartData<T>(
  url: string,
  headers?: Record<string, string>
) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    setLoading(true)
    setError(false)
    setData(null)
    fetch(url, { headers })
      .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [url]) // eslint-disable-line react-hooks/exhaustive-deps

  return { data, loading, error }
}
