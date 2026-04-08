import type { FacultyHomepageV2Data } from '../../lib/faculty/homepage-types'
import AssessmentDeadlines from './AssessmentDeadlines'
import CommitteeCard from './CommitteeCard'

interface ServiceZoneProps {
  data: Pick<
    FacultyHomepageV2Data,
    'committees' | 'departmentFeed' | 'assessmentDeadlines'
  >
}

export default function ServiceZone({ data }: ServiceZoneProps) {
  return (
    <section id="faculty-service-zone" className="space-y-4">
      <h2 className="text-sm font-semibold text-gray-500">Committees &amp; Deadlines</h2>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <CommitteeCard committees={data.committees} />
        <AssessmentDeadlines assessmentDeadlines={data.assessmentDeadlines} />
      </div>
    </section>
  )
}
