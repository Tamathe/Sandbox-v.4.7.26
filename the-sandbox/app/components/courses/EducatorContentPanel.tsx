'use client'

import dynamic from 'next/dynamic'
import { Route } from 'lucide-react'
import SyllabusStatusCard from './SyllabusStatusCard'
import CollapsibleSection from './CollapsibleSection'
import type { Course } from './course-types'
import type { useCourseDetail } from '../../hooks/useCourseDetail'

const MaterialsTab = dynamic(() => import('./MaterialsTab'), { ssr: false })
const ToolsTab = dynamic(() => import('./ToolsTab'), { ssr: false })
const LearningPathTab = dynamic(() => import('./LearningPathTab'), { ssr: false })

interface EducatorContentPanelProps {
  course: Course
  currentUser: { email: string }
  detail: ReturnType<typeof useCourseDetail>
  canManage: boolean
  onOpenLinkModal: () => void
}

export default function EducatorContentPanel({
  course,
  currentUser,
  detail,
  canManage,
  onOpenLinkModal,
}: EducatorContentPanelProps) {
  return (
    <>
      {/* Materials */}
      <MaterialsTab
        courseId={course.id}
        courseCode={course.courseCode}
        selectedCourse={course}
        canManage={canManage}
        isEducator={true}
        userEmail={currentUser.email}
        materials={detail.materials}
        onRefresh={detail.refreshSelectedCourse}
        onOpenViewer={(id) => detail.setViewerMaterialId(id)}
        suggestionsByModule={detail.suggestionsByModule}
        onSuggestionsFetched={(key, suggestions) =>
          detail.setSuggestionsByModule((p) => ({ ...p, [key]: suggestions }))
        }
      />

      {/* Tools */}
      <div className="mt-6 border-t border-gray-100 pt-4">
        <ToolsTab
          courseId={course.id}
          courseCode={course.courseCode}
          canManage={canManage}
          userEmail={currentUser.email}
          linkedTools={detail.linkedTools}
          onRefresh={detail.refreshSelectedCourse}
          onOpenLinkModal={onOpenLinkModal}
        />
      </div>

      {/* Syllabus status */}
      <div className="mt-6 border-t border-gray-100 pt-4">
        <SyllabusStatusCard courseId={course.id} userEmail={currentUser.email} />
      </div>

      {/* Learning Path */}
      {detail.linkedTools.length > 0 && (
        <div className="mt-6 border-t border-gray-100 pt-4">
          <CollapsibleSection title="Learning Path" icon={Route} defaultOpen>
            <LearningPathTab
              linkedTools={detail.linkedTools}
              userEmail={currentUser.email}
              isStudent={false}
            />
          </CollapsibleSection>
        </div>
      )}
    </>
  )
}
