import { AlertTriangle } from 'lucide-react'
import type { FacultyHomepageV2Data } from '../../lib/faculty/homepage-types'
import AdviseeSnapshot from './AdviseeSnapshot'
import OfficeHoursCard from './OfficeHoursCard'
import RecommendationTable from './RecommendationTable'

interface MyStudentsZoneProps {
  data: Pick<
    FacultyHomepageV2Data,
    'advisees' | 'officeHours' | 'flaggedStudents' | 'recommendations'
  >
  onSendNudge?: (student: { name: string; flag: string; course: string; detail: string }) => void
}

export default function MyStudentsZone({ data, onSendNudge }: MyStudentsZoneProps) {
  // Unified student attention count — one number across all signals
  const flaggedCount = data.flaggedStudents.length
  const ohFlaggedCount = data.officeHours.flaggedForOfficeHours?.length ?? 0
  const holdCount = data.advisees.withHolds
  const totalAttention = flaggedCount + ohFlaggedCount + holdCount

  return (
    <section id="faculty-my-students" className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-500">Students</h2>
        {totalAttention > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700">
            <AlertTriangle className="size-3" />
            {totalAttention} need{totalAttention === 1 ? 's' : ''} attention
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <AdviseeSnapshot advisees={data.advisees} />
        <OfficeHoursCard
          officeHours={data.officeHours}
          flaggedStudents={data.flaggedStudents}
          onSendNudge={onSendNudge}
        />
      </div>

      <RecommendationTable recommendations={data.recommendations} />
    </section>
  )
}
