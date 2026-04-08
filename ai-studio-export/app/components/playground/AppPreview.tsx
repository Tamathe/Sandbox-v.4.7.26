'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, Code2, Loader2 } from 'lucide-react'
import { useAuth } from '../../lib/auth-context'

interface AppPreviewProps {
  appId?: string | null
  code: string
  error: string | null
  runId: number
  onError: (error: string | null) => void
}

function buildSandboxScript(token: string, appId: string) {
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/+$/, '')
  const storageBaseUrl = `${baseUrl}/api/playground/store`

  return `<script>
(function() {
  const TOKEN = ${JSON.stringify(token)};
  const APP_ID = ${JSON.stringify(appId)};
  const BASE = ${JSON.stringify(storageBaseUrl)};

  async function req(method, path, body) {
    const res = await fetch(BASE + path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + TOKEN
      },
      body: body ? JSON.stringify(body) : undefined
    });

    const text = await res.text();
    const payload = text ? JSON.parse(text) : {};

    if (!res.ok) {
      throw new Error(payload.error || text || 'Storage request failed');
    }

    return payload;
  }

  window.SANDBOX = {
    user: {
      get: (key) => req('GET', '/' + APP_ID + '/user/' + encodeURIComponent(key)),
      set: (key, value) => req('PUT', '/' + APP_ID + '/user/' + encodeURIComponent(key), { value })
    },
    collection: (name) => ({
      getAll: (opts = {}) => req('GET', '/' + APP_ID + '/collection/' + encodeURIComponent(name) + '?' + new URLSearchParams(opts)),
      add: (data) => req('POST', '/' + APP_ID + '/collection/' + encodeURIComponent(name), { data }),
      delete: (id) => req('DELETE', '/' + APP_ID + '/collection/' + encodeURIComponent(name) + '/' + encodeURIComponent(id))
    }),
    config: {
      get: (key) => req('GET', '/' + APP_ID + '/config/' + encodeURIComponent(key)),
      set: (key, value) => req('PUT', '/' + APP_ID + '/config/' + encodeURIComponent(key), { value })
    }
  };
})();
<\/script>`
}

function injectSandboxScript(code: string, token: string, appId: string) {
  const sandboxScript = buildSandboxScript(token, appId)

  if (code.includes('</head>')) {
    return code.replace('</head>', `${sandboxScript}\n</head>`)
  }

  if (code.includes('<head>')) {
    return code.replace('<head>', `<head>\n${sandboxScript}`)
  }

  return `${sandboxScript}\n${code}`
}

export default function AppPreview({ appId, code, error, runId, onError }: AppPreviewProps) {
  const { currentUser } = useAuth()
  const [renderedCode, setRenderedCode] = useState(code)
  const [isPreparing, setIsPreparing] = useState(false)

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SANDBOX_ERROR' && typeof event.data.message === 'string') {
        onError(event.data.message)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [onError])

  useEffect(() => {
    if (!code.trim()) {
      setRenderedCode('')
      return
    }

    onError(null)

    if (!appId) {
      setRenderedCode(code)
      return
    }

    let cancelled = false

    const injectToken = async () => {
      setIsPreparing(true)

      try {
        const response = await fetch(`/api/playground/token?appId=${encodeURIComponent(appId)}`, {
          headers: { 'x-demo-user-email': currentUser.email },
        })

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}))
          throw new Error(payload.error || 'Failed to prepare app storage')
        }

        const payload = (await response.json()) as { token: string }

        if (!cancelled) {
          setRenderedCode(injectSandboxScript(code, payload.token, appId))
        }
      } catch (tokenError) {
        if (!cancelled) {
          onError(
            tokenError instanceof Error ? tokenError.message : 'Failed to prepare app storage'
          )
          setRenderedCode(code)
        }
      } finally {
        if (!cancelled) {
          setIsPreparing(false)
        }
      }
    }

    void injectToken()

    return () => {
      cancelled = true
    }
  }, [appId, code, currentUser.email, onError, runId])

  if (!code.trim()) {
    return (
      <div className="flex h-full flex-col overflow-hidden rounded-[28px] border border-dashed border-blue-200 bg-gradient-to-br from-white via-blue-50 to-slate-100">
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-[#0033A0] text-white shadow-lg shadow-blue-200/70">
            <Code2 className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Your app will appear here</h3>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-gray-500">
            Describe a tool in chat, then watch the Playground turn it into a working browser app.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative h-full overflow-hidden rounded-[28px] border border-gray-200 bg-white shadow-sm">
      <iframe
        key={runId}
        title="Playground preview"
        sandbox="allow-scripts"
        srcDoc={renderedCode}
        className="h-full w-full border-0 bg-white"
      />

      {isPreparing ? (
        <div className="pointer-events-none absolute inset-x-3 top-3 rounded-2xl border border-blue-200 bg-white/95 px-4 py-3 text-sm text-[#0033A0] shadow-lg shadow-blue-100">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Preparing SANDBOX storage access...</span>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="pointer-events-none absolute inset-x-3 bottom-3 rounded-2xl border border-red-200 bg-red-50/95 px-4 py-3 text-sm text-red-700 shadow-lg shadow-red-100">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span className="line-clamp-3">{error}</span>
          </div>
        </div>
      ) : null}
    </div>
  )
}
