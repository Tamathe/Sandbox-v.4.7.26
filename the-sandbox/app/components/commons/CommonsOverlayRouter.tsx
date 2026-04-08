'use client'

import ChallengeOverlay from './ChallengeOverlay'
import StudyOverlay from './StudyOverlay'
import WatchOverlay from './WatchOverlay'
import SimulationOverlay from './SimulationOverlay'
import OfficeHoursOverlay from './OfficeHoursOverlay'
import PeerReviewOverlay from './PeerReviewOverlay'
import ProblemLabOverlay from './ProblemLabOverlay'
import SpeedMentoringOverlay from './SpeedMentoringOverlay'
import FishbowlOverlay from './FishbowlOverlay'
import DebateOverlay from './DebateOverlay'
import ImprovOverlay from './ImprovOverlay'
import CaseStudyOverlay from './CaseStudyOverlay'
import TeachbackAssessmentOverlay from '../assessment/TeachbackAssessmentOverlay'

interface CommonsOverlayRouterProps {
  type: string
  roomId: string
  onClose: () => void
}

export default function CommonsOverlayRouter({ type, roomId, onClose }: CommonsOverlayRouterProps) {
  switch (type) {
    case 'CHALLENGE':
      return <ChallengeOverlay roomId={roomId} onClose={onClose} />
    case 'STUDY':
      return <StudyOverlay roomId={roomId} onClose={onClose} />
    case 'WATCH':
      return <WatchOverlay roomId={roomId} onClose={onClose} />
    case 'TEACHBACK':
      return <TeachbackAssessmentOverlay roomId={roomId} onClose={onClose} />
    case 'SIMULATION':
      return <SimulationOverlay roomId={roomId} onClose={onClose} />
    case 'OFFICE_HOURS':
      return <OfficeHoursOverlay roomId={roomId} onClose={onClose} />
    case 'PEER_REVIEW':
      return <PeerReviewOverlay roomId={roomId} onClose={onClose} />
    case 'PROBLEM_LAB':
      return <ProblemLabOverlay roomId={roomId} onClose={onClose} />
    case 'SPEED_MENTORING':
      return <SpeedMentoringOverlay roomId={roomId} onClose={onClose} />
    case 'FISHBOWL':
      return <FishbowlOverlay roomId={roomId} onClose={onClose} />
    case 'DEBATE':
      return <DebateOverlay roomId={roomId} onClose={onClose} />
    case 'IMPROV':
      return <ImprovOverlay roomId={roomId} onClose={onClose} />
    case 'CASE_STUDY':
      return <CaseStudyOverlay roomId={roomId} onClose={onClose} />
    default:
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/80">
          <div className="rounded-2xl bg-white p-8 text-center">
            <p className="text-lg font-extrabold text-gray-900">Coming Soon</p>
            <p className="mt-2 text-sm text-gray-500">This experience type is not yet available.</p>
            <button onClick={onClose} className="mt-4 rounded-xl bg-gray-100 px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200">
              Close
            </button>
          </div>
        </div>
      )
  }
}
