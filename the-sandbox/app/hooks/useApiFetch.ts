'use client'

import useSWR, { type SWRConfiguration, type SWRResponse } from 'swr'
import { useAuth } from '../lib/auth-context'
import { apiFetch } from '../lib/api-client'

/**
 * Thin wrapper around SWR + apiFetch that auto-injects auth.
 * Deduplicates concurrent requests to the same path and caches
 * responses client-side so back-navigations are instant.
 *
 * Usage:
 *   const { data, error, isLoading, mutate } = useApiFetch<MyType>('/api/things')
 *   const { data } = useApiFetch<MyType>(shouldFetch ? '/api/things' : null)
 */
export function useApiFetch<T = unknown>(
  path: string | null,
  config?: SWRConfiguration<T>,
): SWRResponse<T> {
  const { currentUser } = useAuth()
  const email = currentUser.email

  return useSWR<T>(
    path ? [path, email] : null,
    ([url]: [string, string]) => apiFetch<T>(email, url),
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
      ...config,
    },
  )
}
