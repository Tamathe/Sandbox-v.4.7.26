'use client'

import {
  BookOpen,
  Calendar,
  Clock,
  Star,
} from 'lucide-react'
import ThisWeekCard from './ThisWeekCard'
import CourseTimeline from './CourseTimeline'
import StudyGuideCard from '../../components/StudyGuideCard'
import WeeklyScheduleWidget from './WeeklyScheduleWidget'
import RecentGradesWidget from './RecentGradesWidget'
import { DashboardGrid, WidgetFull, WidgetHalf } from './DashboardGrid'
import DashboardWidget from './DashboardWidget'
import type { Course, TabId } from './course-types'
import type { useCourseDetail } from '../../hooks/useCourseDetail'

interface StudentDashboardProps {
  course: Course
  currentUser: { email: string }
  detail: ReturnType<typeof useCourseDetail>
  onTabChange: (tab: TabId) => void
}

export default function StudentDashboard({
  course,
  currentUser,
  detail,
  onTabChange,
}: StudentDashboardProps) {
  return (
    <DashboardGrid>
      <WidgetFull>
        <DashboardWidget title="This Week" icon={Calendar}>
          <ThisWeekCard
            courseId={course.id}
            userEmail={currentUser.email}
            onSwitchTab={(tab) => onTabChange(tab as TabId)}
          />
        </DashboardWidget>
      </WidgetFull>

      <WidgetFull>
        <DashboardWidget title="Timeline" icon={Clock}>
          <CourseTimeline courseId={course.id} userEmail={currentUser.email} />
        </DashboardWidget>
      </WidgetFull>

      {detail.materials.length > 0 && (
        <WidgetHalf>
          <DashboardWidget title="Study Guide" icon={BookOpen}>
            <StudyGuideCard
              courseId={course.id}
              title={`${course.courseCode} Study Guide`}
              materials={detail.materials}
              onOpenMaterial={(id) => detail.setViewerMaterialId(id)}
            />
          </DashboardWidget>
        </WidgetHalf>
      )}

      <WidgetHalf>
        <DashboardWidget title="Weekly Schedule" icon={Calendar} collapsible={false}>
          <WeeklyScheduleWidget
            courseId={course.id}
            userEmail={currentUser.email}
            onSwitchToAssignments={() => onTabChange('assignments')}
          />
        </DashboardWidget>
      </WidgetHalf>

      <WidgetHalf>
        <DashboardWidget title="Recent Grades" icon={Star} collapsible={false}>
          <RecentGradesWidget
            courseId={course.id}
            userEmail={currentUser.email}
            onSwitchToAssignments={() => onTabChange('assignments')}
          />
        </DashboardWidget>
      </WidgetHalf>

      {detail.hasLinkedTools && (
        <WidgetHalf>
          <DashboardWidget title="Course Tools" icon={BookOpen} collapsible={false}>
            <div className="flex flex-wrap gap-2">
              {detail.linkedTools.slice(0, 4).map((tool) => (
                <a
                  key={tool.id}
                  href={`/hub/tool/${tool.id}`}
                  className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  {tool.name}
                </a>
              ))}
              {detail.linkedTools.length > 4 && (
                <span className="text-xs text-gray-400 self-center">+{detail.linkedTools.length - 4} more</span>
              )}
            </div>
          </DashboardWidget>
        </WidgetHalf>
      )}
    </DashboardGrid>
  )
}
