'use client'

import { useState, useEffect } from 'react'
import { LayoutGrid, Loader2 } from 'lucide-react'
import { useAuth } from '../../../lib/auth-context'
import TemplateCard, { type CommTemplate } from './TemplateCard'

interface TemplateGalleryProps {
  onUseTemplate: (template: CommTemplate) => void
}

export default function TemplateGallery({ onUseTemplate }: TemplateGalleryProps) {
  const { currentUser } = useAuth()
  const [templates, setTemplates] = useState<CommTemplate[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/api/staff/communications/templates', {
          headers: { 'x-demo-user-email': currentUser.email },
        })
        if (!res.ok) throw new Error('Failed to load templates')
        const data = await res.json() as { templates: CommTemplate[] }
        if (!cancelled) setTemplates(data.templates ?? [])
      } catch {
        /* graceful degrade — gallery stays empty */
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [currentUser.email])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="size-5 text-gray-300 animate-spin" />
      </div>
    )
  }

  if (templates.length === 0) {
    return (
      <div className="text-center py-10">
        <LayoutGrid className="size-8 text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-500">No templates available yet.</p>
      </div>
    )
  }

  return (
    <div>
      <h3 className="text-sm font-bold text-gray-700 mb-3">Or start from a template</h3>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {templates.map((t) => (
          <TemplateCard key={t.id} template={t} onUse={onUseTemplate} />
        ))}
      </div>
    </div>
  )
}
