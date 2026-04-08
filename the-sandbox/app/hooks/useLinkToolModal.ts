'use client'

import { useState } from 'react'
import type { CatalogTool } from '../components/courses/course-types'
import { courseHeaders, readJson } from '../components/courses/course-utils'

interface UseLinkToolModalOptions {
  courseId: string
  userEmail: string
  onRefresh: () => Promise<void>
}

export function useLinkToolModal({ courseId, userEmail, onRefresh }: UseLinkToolModalOptions) {
  const [linkModalOpen, setLinkModalOpen] = useState(false)
  const [catalogTools, setCatalogTools] = useState<CatalogTool[]>([])
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [toolSearch, setToolSearch] = useState('')
  const [linkingToolId, setLinkingToolId] = useState<string | null>(null)

  async function fetchCatalogTools() {
    setCatalogLoading(true)
    try {
      const payload = await readJson<{ tools: CatalogTool[] }>('/api/tools?limit=100', {
        headers: courseHeaders(userEmail),
      })
      setCatalogTools(payload.tools)
    } catch { /* ignore */ }
    finally { setCatalogLoading(false) }
  }

  async function handleLinkTool(toolId: string) {
    setLinkingToolId(toolId)
    try {
      await readJson<{ ok: boolean }>(`/api/courses/${courseId}/tools`, {
        method: 'POST',
        headers: courseHeaders(userEmail, true),
        body: JSON.stringify({ toolId }),
      })
      await onRefresh()
    } catch { /* ignore */ }
    finally { setLinkingToolId(null) }
  }

  function openLinkModal() {
    setLinkModalOpen(true)
    void fetchCatalogTools()
  }

  function closeLinkModal() {
    setLinkModalOpen(false)
    setToolSearch('')
  }

  return {
    linkModalOpen,
    catalogTools,
    catalogLoading,
    toolSearch,
    setToolSearch,
    linkingToolId,
    handleLinkTool,
    openLinkModal,
    closeLinkModal,
  }
}
