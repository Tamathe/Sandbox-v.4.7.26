'use client'

import dynamic from 'next/dynamic'
import {
  BarChart3,
  BookOpen,
  Calendar,
  ClipboardCheck,
  FileText,
  HelpCircle,
  Map as MapIcon,
} from 'lucide-react'
import SyllabusStatusCard from './SyllabusStatusCard'
import CoursePolicySummaryCard from './CoursePolicySummaryCard'
import { DashboardGrid, WidgetFull, WidgetHalf } from './DashboardGrid'
import DashboardWidget from './DashboardWidget'
import SetupChecklist from './SetupChecklist'
import EngagementSnapshot from './EngagementSnapshot'
import ThisWeekCard from './ThisWeekCard'
import QuickActionsWidget from './QuickActionsWidget'
import FinalGradesCTA from './FinalGradesCTA'
import ActionRequiredCard from './ActionRequiredCard'
import type { Course, TabId } from './course-types'
import type { CourseSummaryItem } from '../../lib/course-summary-service'
import type { SemesterPhase } from '../../hooks/useSemesterPhase'
import type { useCourseDetail } from '../../hooks/useCourseDetail'

const SandyInsightsCard = dynamic(() => import('./SandyInsightsCard'), { ssr: false })
const LearningMapTab = dynamic(() => import('./LearningMapTab'), { ssr: false })
const LectureDebriefSection = dynamic(() => import('../lecture-debrief/LectureDebriefSection'), { ssr: false })
const OfficeHoursSection = dynamic(() => import('../office-hours/OfficeHoursSection'), { ssr: false })

interface EducatorDashboardProps {
  course: Course
  currentUser: { email: string; role: string }
  detail: ReturnType<typeof useCourseDetail>
  canManage: boolean
  phase: SemesterPhase
  courseSummary: CourseSummaryItem | null
  onTabChange: (tab: TabId) => void
}

export default function EducatorDashboard({
  course,
  currentUser,
  detail,
  canManage,
  phase,
  courseSummary,
  onTabChange,
}: EducatorDashboardProps) {
  return (
    <DashboardGrid>
      {/* Action Required — from course summary data */}
      {courseSummary && (
        <WidgetFull>
          <ActionRequiredCard summary={courseSummary} onTabChange={onTabChange} />
        </WidgetFull>
      )}

      {/* Sandy Insights */}
      <WidgetFull>
        <SandyInsightsCard
          courseId={course.id}
          userEmail={currentUser.email}
          onTabChange={onTabChange}
        />
      </WidgetFull>

      {/* Setup phase: checklist is prominent */}
      {phase === 'setup' && (
        <WidgetFull>
          <DashboardWidget title="Course Setup" icon={ClipboardCheck} collapsible={false}>
            <SetupChecklist
              courseId={course.id}
              userEmail={currentUser.email}
              materialsCount={detail.materials.length}
              linkedToolsCount={detail.linkedTools.length}
              onSwitchTab={(tab) => onTabChange(tab as TabId)}
            />
          </DashboardWidget>
        </WidgetFull>
      )}

      {/* Setup phase: Quick Actions */}
      {phase === 'setup' && (
        <WidgetFull>
          <DashboardWidget title="Quick Actions" icon={ClipboardCheck} collapsible={false}>
            <QuickActionsWidget onSwitchTab={(tab) => onTabChange(tab as TabId)} />
          </DashboardWidget>
        </WidgetFull>
      )}

      {/* Late phase: Final Grades CTA at top */}
      {phase === 'late' && (
        <WidgetFull>
          <FinalGradesCTA onSwitchTab={(tab) => onTabChange(tab as TabId)} />
        </WidgetFull>
      )}

      {/* Late phase: Progress promoted to position 2 */}
      {phase === 'late' && detail.hasMaterials && (
        <WidgetFull>
          <DashboardWidget title="Progress" icon={MapIcon}>
            <LearningMapTab
              courseId={course.id}
              canManage={canManage}
              userEmail={currentUser.email}
              isStudent={false}
              onOpenViewer={(id) => detail.setViewerMaterialId(id)}
            />
          </DashboardWidget>
        </WidgetFull>
      )}

      {/* Active/Late: This Week (NEW for educator) */}
      {phase !== 'setup' && (
        <WidgetFull>
          <DashboardWidget title="This Week" icon={Calendar}>
            <ThisWeekCard
              courseId={course.id}
              userEmail={currentUser.email}
              onSwitchTab={(tab) => onTabChange(tab as TabId)}
            />
          </DashboardWidget>
        </WidgetFull>
      )}

      {/* Active/Late: Engagement snapshot */}
      {phase !== 'setup' && (
        <WidgetFull>
          <DashboardWidget title="Engagement" icon={BarChart3} collapsible={false}>
            <EngagementSnapshot
              courseId={course.id}
              userEmail={currentUser.email}
              materialsCount={detail.materials.length}
              linkedToolsCount={detail.linkedTools.length}
            />
          </DashboardWidget>
        </WidgetFull>
      )}

      {/* Active/Late: Lecture Debriefs + Office Hours */}
      {phase !== 'setup' && (
        <>
          <WidgetHalf>
            <DashboardWidget title="Lecture Debriefs" icon={BookOpen} defaultOpen={false}>
              <LectureDebriefSection courseId={course.id} />
            </DashboardWidget>
          </WidgetHalf>

          <WidgetHalf>
            <DashboardWidget title="Office Hours" icon={HelpCircle} defaultOpen={false}>
              <OfficeHoursSection courseId={course.id} />
            </DashboardWidget>
          </WidgetHalf>
        </>
      )}

      {/* Demoted: Syllabus Status + Policy Summary */}
      <WidgetHalf>
        <DashboardWidget title="Syllabus Status" icon={FileText}>
          <SyllabusStatusCard courseId={course.id} userEmail={currentUser.email} />
        </DashboardWidget>
      </WidgetHalf>

      <WidgetHalf>
        <DashboardWidget title="Policy Summary" icon={BookOpen}>
          <CoursePolicySummaryCard
            courseId={course.id}
            userEmail={currentUser.email}
            onSwitchTab={(tab) => onTabChange(tab)}
          />
        </DashboardWidget>
      </WidgetHalf>

      {/* Active phase: Progress at bottom (Late has it at top instead) */}
      {phase === 'active' && detail.hasMaterials && (
        <WidgetFull>
          <DashboardWidget title="Progress" icon={MapIcon}>
            <LearningMapTab
              courseId={course.id}
              canManage={canManage}
              userEmail={currentUser.email}
              isStudent={false}
              onOpenViewer={(id) => detail.setViewerMaterialId(id)}
            />
          </DashboardWidget>
        </WidgetFull>
      )}
    </DashboardGrid>
  )
}
