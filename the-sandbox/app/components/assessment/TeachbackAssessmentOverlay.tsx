'use client'

import TeachBackOverlay from '../commons/TeachBackOverlay'

interface TeachbackAssessmentOverlayProps {
  roomId: string
  onClose: () => void
}

export default function TeachbackAssessmentOverlay({
  roomId,
  onClose,
}: TeachbackAssessmentOverlayProps) {
  return <TeachBackOverlay roomId={roomId} onClose={onClose} />
}
