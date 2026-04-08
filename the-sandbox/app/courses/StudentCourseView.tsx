'use client'

import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import {
  FlaskConical,
  Loader2,
  Star,
} from 'lucide-react'
import { useCourseDetail } from '../hooks/useCourseDetail'
import { useCourseContext } from '../hooks/useCourseContext'
import CourseHeader from '../components/courses/CourseHeader'
import CourseMaterialViewer from '../components/courses/CourseMaterialViewer'
import StudyPlanPanel from '../components/StudyPlanPanel'
import { getDiscussionUnreadKey } from '../components/courses/DiscussionTab'
import type { Course, TabId } from '../components/courses/course-types'
import MicroReviewModal from '../components/micro-review/MicroReviewModal'
import CollapsibleSection from '../components/courses/CollapsibleSection'
import StudentDashboard from '../components/courses/StudentDashboard'

const TabLoader = () => <div className="flex justify-center py-12"><div className="size-6 animate-spin rounded-full border-2 border-[#0033A0] border-t-transparent" /></div>

const DiscussionTab = dynamic(() => import('../components/courses/DiscussionTab').then(m => m.default), { loading: TabLoader })
const CourseMapTab = dynamic(() => import('../components/courses/CourseMapTab'), { loading: TabLoader })
const AssignmentsTab = dynamic(() => import('../components/courses/AssignmentsTab'), { loading: TabLoader })
const CoursePoliciesTab = dynamic(() => import('../components/courses/CoursePoliciesTab'), { loading: TabLoader })
const StudentGradesTab = dynamic(() => import('../components/courses/StudentGradesTab'), { loading: TabLoader })
const ExamForgePanel = dynamic(() => import('../components/exam-forge/ExamForgePanel'), { loading: TabLoader })

interface StudentCourseViewProps {
  course: Course
  currentUser: { email: string; id: string; role: string }
  evaluatorMode: boolean
  tabParam: TabId | null
}

export default function StudentCourseView({
  course,
  currentUser,
  evaluatorMode,
  tabParam,
}: StudentCourseViewProps) {
  const detail = useCourseDetail({
    selectedCourseId: course.id,
    userEmail: currentUser.email,
    isAdmin: false,
    currentUserEmail: currentUser.email,
  })

  useCourseContext(course, detail.materials.length)

  // Tab state
  const TAB_ALIAS: Record<string, TabId> = {
    overview: 'dashboard',
    materials: 'dashboard',
    study: 'dashboard',
    path: 'dashboard',
    map: 'dashboard',
    submissions: 'assignments',
    gradebook: 'assignments',
    mygrades: 'assignments',
    pulse: 'dashboard',
    tools: 'dashboard',
    policies: 'policies',         // hidden tab, still renders
    'course-map': 'course-map',   // hidden tab, still renders
  }

  const [activeTab, setActiveTab] = useState<TabId>(() => {
    const rawTab = (tabParam as TabId) ?? 'dashboard'
    return TAB_ALIAS[rawTab] ?? rawTab
  })

  const [discussionHasUnread, setDiscussionHasUnread] = useState(false)

  // Enrollment
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<Set<string>>(new Set())
  const [enrolling, setEnrolling] = useState(false)

  // Micro-review
  const [showMicroReview, setShowMicroReview] = useState(true)

  // Study plan
  const [showStudyPlan, setShowStudyPlan] = useState(false)

  const EVALUATOR_HIDDEN_TABS = new Set(['discussion'])
  const visibleTabs = useMemo(
    () =>
      [
        { id: 'dashboard' as const, label: 'Dashboard', visible: true },
        { id: 'assignments' as const, label: 'Assignments', visible: detail.hasMaterials },
        {
          id: 'discussion' as const,
          label: 'Discussion',
          visible: detail.hasMaterials || detail.hasLinkedTools,
          unread: discussionHasUnread,
        },
      ].filter((tab) => tab.visible && !(evaluatorMode && EVALUATOR_HIDDEN_TABS.has(tab.id))),
    [discussionHasUnread, detail.hasMaterials, detail.hasLinkedTools, evaluatorMode]
  )

  // Guard active tab
  useEffect(() => {
    // Only reset if tab is not a visible tab AND not a hidden tab (course-map, policies)
    const HIDDEN_TABS = new Set<TabId>(['course-map', 'policies'])
    if (!visibleTabs.some((t) => t.id === activeTab) && !HIDDEN_TABS.has(activeTab)) setActiveTab('dashboard')
  }, [activeTab, visibleTabs])

  // Reset tab on course change
  useEffect(() => {
    const rawTab = (tabParam as TabId) ?? 'dashboard'
    setActiveTab(TAB_ALIAS[rawTab] ?? rawTab)
    setShowMicroReview(true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course.id])

  // Discussion unread
  useEffect(() => {
    try {
      const key = getDiscussionUnreadKey(course.id)
      const lastRead = Number(localStorage.getItem(key) ?? 0)
      setDiscussionHasUnread(lastRead === 0)
    } catch { setDiscussionHasUnread(false) }
  }, [course.id])

  useEffect(() => {
    if (activeTab === 'discussion') setDiscussionHasUnread(false)
  }, [activeTab])

  // Enrollment
  useEffect(() => {
    fetch('/api/enrollment', { headers: { 'x-demo-user-email': currentUser.email } })
      .then((r) => r.json())
      .then((data: { courses?: { courseId: string }[] }) => {
        if (data.courses) setEnrolledCourseIds(new Set(data.courses.map((c) => c.courseId)))
      })
      .catch(() => {})
  }, [currentUser.email])

  async function handleToggleEnrollment() {
    setEnrolling(true)
    const isEnrolled = enrolledCourseIds.has(course.id)
    try {
      await fetch(`/api/courses/${course.id}/enroll`, {
        method: isEnrolled ? 'DELETE' : 'POST',
        headers: { 'x-demo-user-email': currentUser.email },
      })
      setEnrolledCourseIds((prev) => {
        const next = new Set(prev)
        if (isEnrolled) next.delete(course.id)
        else next.add(course.id)
        return next
      })
    } catch { /* ignore */ }
    finally { setEnrolling(false) }
  }

  return (
    <>
      <CourseHeader
        course={course}
        isStudent={true}
        isEducator={false}
        evaluatorMode={evaluatorMode}
        existingBotToolId={null}
        materialsCount={detail.materials.length}
        canManage={false}
        enrolledCourseIds={enrolledCourseIds}
        enrolling={enrolling}
        onToggleEnrollment={() => void handleToggleEnrollment()}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        visibleTabs={visibleTabs}
      />

      {detail.detailsError && (
        <div className="border-b border-red-200 bg-red-50 px-6 py-3 text-sm text-red-700">
          {detail.detailsError}
        </div>
      )}

      <div role="tabpanel" id={`course-panel-${activeTab}`} aria-labelledby={`course-tab-${activeTab}`} className="px-6 py-6">
        {detail.detailLoading ? (
          <div className="flex items-center justify-center py-12 text-sm text-gray-500">
            <Loader2 className="mr-2 size-4 animate-spin" />
            Refreshing course data...
          </div>
        ) : activeTab === 'dashboard' ? (
          <StudentDashboard
            course={course}
            currentUser={currentUser}
            detail={detail}
            onTabChange={setActiveTab}
          />
        ) : activeTab === 'assignments' ? (
          <>
            <AssignmentsTab
              courseId={course.id}
              isEducator={false}
              onSwitchToTools={() => setActiveTab('dashboard')}
            />
            <CollapsibleSection title="Exam Forge" icon={FlaskConical} defaultOpen>
              <ExamForgePanel courseId={course.id} />
            </CollapsibleSection>
            {detail.hasMaterials && (
              <CollapsibleSection title="My Grades" icon={Star} defaultOpen>
                <StudentGradesTab courseId={course.id} />
              </CollapsibleSection>
            )}
          </>
        ) : activeTab === 'discussion' ? (
          <DiscussionTab
            courseId={course.id}
            courseCode={course.courseCode}
            canManage={false}
            userEmail={currentUser.email}
            userId={currentUser.id}
          />
        ) : activeTab === 'course-map' ? (
          <CourseMapTab
            courseId={course.id}
            userEmail={currentUser.email}
            userRole={currentUser.role}
            courseCode={course.courseCode}
            onCourseMapConfirmed={detail.refreshSelectedCourse}
            onSwitchTab={(tab) => setActiveTab(tab as TabId)}
          />
        ) : activeTab === 'policies' ? (
          <CoursePoliciesTab
            courseId={course.id}
            courseCode={course.courseCode}
            userEmail={currentUser.email}
            canManage={false}
          />
        ) : null}
      </div>

      {/* Material viewer overlay */}
      {detail.viewerMaterial && (
        <CourseMaterialViewer
          material={detail.viewerMaterial}
          onClose={() => detail.setViewerMaterialId(null)}
        />
      )}

      {/* Study plan panel */}
      {showStudyPlan && (
        <StudyPlanPanel
          courseId={course.id}
          userEmail={currentUser.email}
          onClose={() => setShowStudyPlan(false)}
        />
      )}

      {/* Micro-review interstitial */}
      {showMicroReview && (
        <MicroReviewModal
          courseId={course.id}
          onDismiss={() => setShowMicroReview(false)}
        />
      )}
    </>
  )
}
