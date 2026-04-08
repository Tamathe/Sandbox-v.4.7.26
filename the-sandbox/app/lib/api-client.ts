/**
 * Shared client-side fetch wrapper.
 * Auto-injects the x-demo-user-email auth header and provides
 * consistent error handling so every component doesn't re-implement it.
 *
 * Usage:
 *   const { currentUser } = useAuth()
 *   const data = await apiFetch<MyType>(currentUser.email, '/api/things')
 *   const created = await apiFetch<MyType>(currentUser.email, '/api/things', {
 *     method: 'POST',
 *     body: JSON.stringify(payload),
 *   })
 */

export class ApiFetchError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown,
  ) {
    super(message)
    this.name = 'ApiFetchError'
  }
}

/** Build the standard auth + content-type headers. */
export function buildAuthHeaders(
  email: string,
  extra?: Record<string, string>,
): Record<string, string> {
  return {
    'x-demo-user-email': email,
    ...extra,
  }
}

/**
 * Thin wrapper around `fetch()` that:
 * 1. Injects `x-demo-user-email` header automatically
 * 2. Adds `Content-Type: application/json` when a body is present
 * 3. Throws `ApiFetchError` on non-ok responses
 * 4. Returns parsed JSON (or null for 204)
 */
export async function apiFetch<T = unknown>(
  email: string,
  path: string,
  options?: RequestInit & { rawResponse?: boolean },
): Promise<T> {
  const { rawResponse, ...fetchOptions } = options ?? {}

  const hasBody =
    fetchOptions.body !== undefined && fetchOptions.body !== null

  const headers: Record<string, string> = {
    'x-demo-user-email': email,
    ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
    ...(fetchOptions.headers as Record<string, string> | undefined),
  }

  const res = await fetch(path, {
    ...fetchOptions,
    headers,
  })

  if (rawResponse) {
    return res as unknown as T
  }

  if (!res.ok) {
    let body: unknown
    try {
      body = await res.json()
    } catch {
      body = await res.text().catch(() => null)
    }
    const msg =
      (body && typeof body === 'object' && 'error' in body
        ? (body as { error: string }).error
        : null) ?? `Request failed: ${res.status}`
    throw new ApiFetchError(msg, res.status, body)
  }

  if (res.status === 204) return null as T

  return res.json() as Promise<T>
}
