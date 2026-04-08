'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  BookOpen,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Loader2,
  Map as MapIcon,
  MessageSquare,
  Settings,
} from 'lucide-react'
import { useCourseDetail } from '../hooks/useCourseDetail'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import { useCourseContext } from '../hooks/useCourseContext'
import { useLinkToolModal } from '../hooks/useLinkToolModal'
import { useSemesterPhase } from '../hooks/useSemesterPhase'
import CourseHeader from '../components/courses/CourseHeader'
import CourseMaterialViewer from '../components/courses/CourseMaterialViewer'
import LinkToolModal from '../components/courses/LinkToolModal'
import EducatorDashboard from '../components/courses/EducatorDashboard'
import SegmentedControl from '../components/SegmentedControl'
import ShortcutHelpTooltip from '../components/courses/ShortcutHelpTooltip'
import { getDiscussionUnreadKey } from '../components/courses/DiscussionTab'
import { SEEDED_COURSE_CODES } from '../components/courses/course-data'
import type { Course, TabId } from '../components/courses/course-types'
import type { CourseSummaryItem } from '../lib/course-summary-service'
import type { LucideIcon } from 'lucide-react'

const TabLoader = () => <div className="flex justify-center py-12"><div className="size-6 animate-spin rounded-full border-2 border-[#0033A0] border-t-transparent" /></div>

const DiscussionTab = dynamic(() => import('../components/courses/DiscussionTab').then(m => m.default), { loading: TabLoader })
const CourseSettingsTab = dynamic(() => import('../components/courses/CourseSettingsTab'), { loading: TabLoader })
const AssignmentsTab = dynamic(() => import('../components/courses/AssignmentsTab'), { loading: TabLoader })
const CoursePoliciesTab = dynamic(() => import('../components/courses/CoursePoliciesTab'), { loading: TabLoader })
const GradebookTab = dynamic(() => import('../components/courses/GradebookTab'), { loading: TabLoader })
const SubmissionsTab = dynamic(() => import('../components/courses/SubmissionsTab'), { loading: TabLoader })
const ExamForgePanel = dynamic(() => import('../components/exam-forge/ExamForgePanel'), { loading: TabLoader })
const CourseMapTab = dynamic(() => import('../components/courses/CourseMapTab'), { loading: TabLoader })
const PulseTab = dynamic(() => import('../components/courses/PulseTab'), { loading: TabLoader })
const MaterialsTab = dynamic(() => import('../components/courses/MaterialsTab'), { loading: TabLoader })
const ToolsTab = dynamic(() => import('../components/courses/ToolsTab'), { loading: TabLoader })
const LearningPathTab = dynamic(() => import('../components/courses/LearningPathTab'), { loading: TabLoader })

type ContentSegment = 'materials' | 'tools' | 'learning-path'

const EVALUATOR_HIDDEN_TABS = new Set(['settings'])

interface EducatorCourseViewProps {
  course: Course
  courses?: Course[]
  currentUser: { email: string; id: string; role: string }
  evaluatorMode: boolean
  tabParam: TabId | null
  courseSummary: CourseSummaryItem | null
  onCourseUpdate: (updated: Course) => void
  onCourseDeleted: () => void
  onSelectCourse?: (courseId: string) => void
}

export default function EducatorCourseView({
  course,
  courses = [],
  currentUser,
  evaluatorMode,
  tabParam,
  courseSummary,
  onCourseUpdate,
  onCourseDeleted,
  onSelectCourse,
}: EducatorCourseViewProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isAdmin = currentUser.role === 'ADMIN'

  const detail = useCourseDetail({
    selectedCourseId: course.id,
    userEmail: currentUser.email,
    isAdmin,
    currentUserEmail: currentUser.email,
  })

  useCourseContext(course, detail.materials.length)

  const canManage = detail.canManageCourse(course)

  const phase = useSemesterPhase({
    courseId: course.id,
    userEmail: currentUser.email,
    materialsCount: detail.materials.length,
    hasCourseMap: detail.hasMaterials,
  })

  const TAB_ALIAS: Record<string, TabId> = {
    dashboard: 'overview',
    analytics: 'grades',
    submissions: 'grades',
    gradebook: 'grades',
    pulse: 'overview',
    map: 'course-map',
    materials: 'content',
    study: 'content',
    path: 'content',
    tools: 'content',
    'weekly-plan': 'overview',
    policies: 'settings',
    mygrades: 'grades',
  }

  const resolveTab = (raw: string | null): TabId => {
    const t = (raw ?? 'overview') as TabId
    return TAB_ALIAS[t] ?? t
  }

  const [activeTab, setActiveTab] = useState<TabId>(() => resolveTab(tabParam))
  const [contentSegment, setContentSegment] = useState<ContentSegment>('materials')
  const [discussionHasUnread, setDiscussionHasUnread] = useState(false)

  // URL sync: update ?tab= when tab changes
  const handleTabChange = useCallback((tab: TabId) => {
    setActiveTab(tab)
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', tab)
    router.replace(`/courses?${params.toString()}`, { scroll: false })
  }, [router, searchParams])

  const linkModal = useLinkToolModal({
    courseId: course.id,
    userEmail: currentUser.email,
    onRefresh: detail.refreshSelectedCourse,
  })

  // Keyboard shortcuts
  const { helpOpen, setHelpOpen } = useKeyboardShortcuts({
    onTabChange: (tabId) => handleTabChange(tabId as TabId),
    onCourseChange: (dir) => {
      if (!onSelectCourse || courses.length === 0) return
      const idx = courses.findIndex((c) => c.id === course.id)
      const next = courses[idx + dir]
      if (next) onSelectCourse(next.id)
    },
  })

  const visibleTabs = useMemo(
    () =>
      ([
        { id: 'overview' as const, label: 'Overview', icon: LayoutDashboard, visible: true },
        { id: 'assignments' as const, label: 'Assignments', icon: FileText, visible: true },
        { id: 'grades' as const, label: 'Grades', icon: GraduationCap, visible: true },
        { id: 'content' as const, label: 'Content', icon: BookOpen, visible: true },
        { id: 'course-map' as const, label: 'Course Map', icon: MapIcon, visible: true },
        { id: 'discussion' as const, label: 'Discussion', icon: MessageSquare, visible: true },
        { id: 'settings' as const, label: 'Settings', icon: Settings, visible: canManage },
      ] as Array<{ id: TabId; label: string; icon: LucideIcon; visible: boolean; unread?: boolean }>).filter(
        (tab) => tab.visible && !(evaluatorMode && EVALUATOR_HIDDEN_TABS.has(tab.id))
      ),
    [canManage, evaluatorMode]
  )

  // Guard active tab
  useEffect(() => {
    if (!visibleTabs.some((t) => t.id === activeTab)) setActiveTab('overview')
  }, [activeTab, visibleTabs])

  // Reset on course change
  useEffect(() => {
    setActiveTab(resolveTab(tabParam))
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

  return (
    <>
      <CourseHeader
        course={course}
        isStudent={false}
        isEducator={true}
        evaluatorMode={evaluatorMode}
        existingBotToolId={detail.existingBotToolId}
        materialsCount={detail.materials.length}
        canManage={canManage}
        enrolledCourseIds={new Set()}
        enrolling={false}
        onToggleEnrollment={() => {}}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        visibleTabs={visibleTabs}
        courseSummary={courseSummary}
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

        ) : activeTab === 'overview' ? (
          <EducatorDashboard
            course={course}
            currentUser={currentUser}
            detail={detail}
            canManage={canManage}
            phase={phase}
            courseSummary={courseSummary}
            onTabChange={handleTabChange}
          />

        ) : activeTab === 'assignments' ? (
          <>
            <AssignmentsTab
              courseId={course.id}
              isEducator={true}
              onSwitchToTools={() => handleTabChange('content')}
            />
            <div className="mt-6 border-t border-gray-100 pt-4">
              <ExamForgePanel courseId={course.id} />
            </div>
          </>

        ) : activeTab === 'grades' ? (
          <>
            {detail.hasMaterials && <GradebookTab courseId={course.id} />}
            {SEEDED_COURSE_CODES.has(course.courseCode) && (
              <div className="mt-6 border-t border-gray-100 pt-4">
                <SubmissionsTab courseCode={course.courseCode} />
              </div>
            )}
          </>

        ) : activeTab === 'content' ? (
          <>
            <SegmentedControl
              value={contentSegment}
              onChange={setContentSegment}
              options={[
                { value: 'materials' as ContentSegment, label: 'Materials' },
                { value: 'tools' as ContentSegment, label: 'Tools' },
                { value: 'learning-path' as ContentSegment, label: 'Learning Path' },
              ]}
              className="mb-6 max-w-md"
            />
            {contentSegment === 'materials' && (
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
            )}
            {contentSegment === 'tools' && (
              <ToolsTab
                courseId={course.id}
                courseCode={course.courseCode}
                canManage={canManage}
                userEmail={currentUser.email}
                linkedTools={detail.linkedTools}
                onRefresh={detail.refreshSelectedCourse}
                onOpenLinkModal={linkModal.openLinkModal}
              />
            )}
            {contentSegment === 'learning-path' && (
              <LearningPathTab
                linkedTools={detail.linkedTools}
                userEmail={currentUser.email}
                isStudent={false}
              />
            )}
          </>

        ) : activeTab === 'course-map' ? (
          <CourseMapTab
            courseId={course.id}
            userEmail={currentUser.email}
            userRole={currentUser.role}
            courseCode={course.courseCode}
            onCourseMapConfirmed={detail.refreshSelectedCourse}
            onSwitchTab={(tab) => handleTabChange(tab as TabId)}
          />

        ) : activeTab === 'discussion' ? (
          <DiscussionTab
            courseId={course.id}
            courseCode={course.courseCode}
            canManage={canManage}
            userEmail={currentUser.email}
            userId={currentUser.id}
          />

        ) : activeTab === 'settings' ? (
          <>
            <CourseSettingsTab
              courseId={course.id}
              course={course}
              canManage={canManage}
              userEmail={currentUser.email}
              onCourseUpdate={onCourseUpdate}
              onCourseDeleted={onCourseDeleted}
            />
            <div className="mt-6 border-t border-gray-100 pt-4">
              <CoursePoliciesTab
                courseId={course.id}
                courseCode={course.courseCode}
                userEmail={currentUser.email}
                canManage={canManage}
              />
            </div>
          </>
        ) : null}
      </div>

      {/* Material viewer overlay */}
      {detail.viewerMaterial && (
        <CourseMaterialViewer
          material={detail.viewerMaterial}
          onClose={() => detail.setViewerMaterialId(null)}
        />
      )}

      {/* Tool link modal */}
      <LinkToolModal
        open={linkModal.linkModalOpen}
        tools={linkModal.catalogTools}
        linkedToolIds={detail.linkedToolIds}
        search={linkModal.toolSearch}
        onSearchChange={linkModal.setToolSearch}
        onClose={linkModal.closeLinkModal}
        onLink={linkModal.handleLinkTool}
        loading={linkModal.catalogLoading}
        linkingToolId={linkModal.linkingToolId}
        courseCode={course.courseCode}
      />

      <ShortcutHelpTooltip open={helpOpen} onClose={() => setHelpOpen(false)} />
    </>
  )
}
