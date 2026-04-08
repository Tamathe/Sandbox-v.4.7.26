'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import PageHeader from '../../../../components/PageHeader'
import StudentModuleViewer from '../../../../components/ai-literacy/StudentModuleViewer'
import { getModuleById } from '../../../../lib/student-ai-literacy-service'

const MODULE = getModuleById('when-not-to-use')!

export default function WhenNotToUsePage() {
  return (
    <>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <nav className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
          <Link href="/ai-literacy" className="hover:text-gray-900">AI Literacy</Link>
          <ChevronRight className="size-3" />
          <Link href="/ai-literacy/student" className="hover:text-gray-900">Student</Link>
          <ChevronRight className="size-3" />
          <span>{MODULE.title}</span>
        </nav>
      </div>
      <PageHeader
        title={MODULE.title}
        subtitle={MODULE.description}
      />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <StudentModuleViewer
          module={MODULE}
          onBack={() => window.history.back()}
        />
      </div>
    </>
  )
}
