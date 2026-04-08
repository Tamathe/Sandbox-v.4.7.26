'use client'

import dynamic from 'next/dynamic'
import {
  FileText,
  FlaskConical,
  Map as MapIcon,
} from 'lucide-react'
import CollapsibleSection from './CollapsibleSection'
import { SEEDED_COURSE_CODES } from './course-data'
import type { Course, TabId } from './course-types'
import type { useCourseDetail } from '../../hooks/useCourseDetail'

const CourseMapTab = dynamic(() => import('./CourseMapTab'), { ssr: false })
const PulseTab = dynamic(() => import('./PulseTab'), { ssr: false })
const GradebookTab = dynamic(() => import('./GradebookTab'), { ssr: false })
const SubmissionsTab = dynamic(() => import('./SubmissionsTab'), { ssr: false })
const ExamForgePanel = dynamic(() => import('../exam-forge/ExamForgePanel'), { ssr: false })

interface EducatorAnalyticsPanelProps {
  course: Course
  currentUser: { email: string; role: string }
  detail: ReturnType<typeof useCourseDetail>
  onTabChange: (tab: TabId) => void
}

export default function EducatorAnalyticsPanel({
  course,
  currentUser,
  detail,
  onTabChange,
}: EducatorAnalyticsPanelProps) {
  return (
    <>
      {/* Course Map */}
      <CourseMapTab
        courseId={course.id}
        userEmail={currentUser.email}
        userRole={currentUser.role}
        courseCode={course.courseCode}
        onCourseMapConfirmed={detail.refreshSelectedCourse}
        onSwitchTab={(tab) => onTabChange(tab as TabId)}
      />

      {/* Pulse */}
      <div className="mt-6 border-t border-gray-100 pt-4">
        <CollapsibleSection title="Student Activity" icon={MapIcon} defaultOpen>
          <PulseTab courseCode={course.courseCode} courseCodeForBuilder={course.courseCode} materials={detail.materials} />
        </CollapsibleSection>
      </div>

      {/* Gradebook */}
      {detail.hasMaterials && (
        <div className="mt-6 border-t border-gray-100 pt-4">
          <CollapsibleSection title="Gradebook" icon={FileText} defaultOpen>
            <GradebookTab courseId={course.id} />
          </CollapsibleSection>
        </div>
      )}

      {/* Submissions */}
      {SEEDED_COURSE_CODES.has(course.courseCode) && (
        <div className="mt-6 border-t border-gray-100 pt-4">
          <CollapsibleSection title="Submissions" icon={FileText} defaultOpen={false}>
            <SubmissionsTab courseCode={course.courseCode} />
          </CollapsibleSection>
        </div>
      )}

      {/* AI Assessment Builder */}
      <div className="mt-6 border-t border-gray-100 pt-4">
        <CollapsibleSection title="AI Assessment Builder" icon={FlaskConical} defaultOpen={false}>
          <ExamForgePanel courseId={course.id} />
        </CollapsibleSection>
      </div>
    </>
  )
}
